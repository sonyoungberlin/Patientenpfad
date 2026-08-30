import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCasesAccess } from "@/lib/authz";
import { canAccessCaseSession } from "@/lib/cases/practiceScope";

const ALLOWED_STATUSES = ["prepared", "confirmed"] as const;
type ClinicalStatus = (typeof ALLOWED_STATUSES)[number];

function isClinicalStatus(value: unknown): value is ClinicalStatus {
  return typeof value === "string" && (ALLOWED_STATUSES as readonly string[]).includes(value);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const session = await prisma.caseSession.findUnique({
      where: { id },
      select: { owner_account_id: true, owner_practice_id: true },
    });

    if (!session || !canAccessCaseSession(account, session)) {
      return NextResponse.json({ ok: false, error: "Fall nicht gefunden." }, { status: 404 });
    }

    await prisma.caseSession.update({
      where: { id },
      data: { clinical_status: status },
    });

    return NextResponse.json({ ok: true, clinical_status: status });
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
