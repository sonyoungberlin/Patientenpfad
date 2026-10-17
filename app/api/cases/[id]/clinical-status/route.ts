import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCasesAccess } from "@/lib/authz";
import { canAccessCaseSession } from "@/lib/cases/practiceScope";
import {
  isPrefillChangedClinicalStatus,
} from "@/lib/server/prefillRuns";

const ALLOWED_STATUSES = ["prepared", "confirmed"] as const;
type ClinicalStatus = (typeof ALLOWED_STATUSES)[number];

function isClinicalStatus(value: unknown): value is ClinicalStatus {
  return typeof value === "string" && (ALLOWED_STATUSES as readonly string[]).includes(value);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { account, error } = await requireCasesAccess(req);
    if (error) return error;

    const { id } = await params;

    let body: unknown = null;
    try {
      body = await req.json();
    } catch {
      body = null;
    }
    const status = (body as { status?: unknown } | null)?.status;
    if (!isClinicalStatus(status)) {
      return NextResponse.json(
        { ok: false, error: "Ungültiger clinical_status." },
        { status: 400 },
      );
    }

    for (let attempt = 0; ; attempt += 1) {
      try {
        return await prisma.$transaction(async (tx): Promise<NextResponse> => {
          const session = await tx.caseSession.findUnique({
            where: { id },
            select: {
              owner_account_id: true,
              owner_practice_id: true,
              clinical_status: true,
            },
          });

          if (!session || !canAccessCaseSession(account, session)) {
            return NextResponse.json({ ok: false, error: "Fall nicht gefunden." }, { status: 404 });
          }

          // Eine tatsächliche M2-Änderung muss bis zur Endbestätigung als
          // Phase-6-Signal erhalten bleiben, auch wenn M1 erneut "prepared" setzt.
          const nextStatus =
            status === "prepared" && isPrefillChangedClinicalStatus(session.clinical_status)
              ? session.clinical_status
              : status;
          await tx.caseSession.update({
            where: { id },
            data: { clinical_status: nextStatus },
          });

          return NextResponse.json({ ok: true, clinical_status: nextStatus });
        }, { isolationLevel: "Serializable" });
      } catch (err) {
        const code = (err as { code?: unknown } | null)?.code;
        if (code === "P2034" && attempt < 2) continue;
        throw err;
      }
    }
    throw new Error("Clinical status transaction retries exhausted");
  } catch (err) {
    if (err instanceof Error) {
      console.error("[cases/[id]/clinical-status]", { name: err.name, message: err.message });
    } else {
      console.error("[cases/[id]/clinical-status]", "UnknownError");
    }
    return NextResponse.json(
      { ok: false, error: "Failed to update clinical_status" },
      { status: 500 },
    );
  }
}
