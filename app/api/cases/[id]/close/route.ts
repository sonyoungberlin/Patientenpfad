import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCasesAccess } from "@/lib/authz";
import { canAccessCaseSession } from "@/lib/cases/practiceScope";
import { isPrefillChangedClinicalStatus } from "@/lib/server/prefillRuns";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { account, error } = await requireCasesAccess(req);
    if (error) return error;

    const { id } = await params;

    // Optionaler Body: Checkpoints für den Batch-Save (Fachregel: nur
    // „Ärztlich bestätigt" friert den finalen M3-Stand dauerhaft ein).
    let body: Record<string, unknown> | null = null;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      body = null;
    }
    const rawCheckpoints = body?.checkpoints;
    // Minimalvalidierung: Array von Objekten mit string-ID. Eine vollständige
    // Typprüfung aller Checkpoint-Felder (Standard vs. MULTI_SELECT) wird
    // bewusst nicht durchgeführt – die Daten stammen aus dem typisierten
    // M3ChecklistClient und sind bereits durch das Frontend validiert.
    const checkpointsToSave: Prisma.InputJsonValue | null =
      Array.isArray(rawCheckpoints) &&
      (rawCheckpoints as unknown[]).every(
        (cp) => cp !== null && typeof cp === "object" && typeof (cp as Record<string, unknown>).id === "string",
      )
        ? (rawCheckpoints as Prisma.InputJsonValue)
        : null;
    const expectedClinicalStatus =
      typeof body?.expected_clinical_status === "string"
        ? body.expected_clinical_status
        : undefined;

    for (let attempt = 0; ; attempt += 1) {
      try {
        const result = await prisma.$transaction(async (tx) => {
          const session = await tx.caseSession.findUnique({
            where: { id },
            select: {
              owner_account_id: true,
              owner_practice_id: true,
              doctor_confirmed: true,
              clinical_status: true,
            },
          });

          if (!session || !canAccessCaseSession(account, session)) {
            return NextResponse.json({ ok: false, error: "Fall nicht gefunden." }, { status: 404 });
          }

          if (session.doctor_confirmed) {
            // Already confirmed – idempotent OK, do not overwrite the timestamp.
            return NextResponse.json({ ok: true, already_confirmed: true });
          }

          const currentClinicalStatus =
            typeof session.clinical_status === "string" ? session.clinical_status : "none";
          if (
            (expectedClinicalStatus !== undefined ||
              isPrefillChangedClinicalStatus(session.clinical_status)) &&
            (expectedClinicalStatus ?? "none") !== currentClinicalStatus
          ) {
            return NextResponse.json(
              {
                ok: false,
                error: "Prefill wurde geändert; M3 muss neu geladen werden.",
                clinical_status: currentClinicalStatus,
                prefill_reset: isPrefillChangedClinicalStatus(currentClinicalStatus),
              },
              { status: 409 },
            );
          }

          await tx.caseSession.update({
            where: { id },
            data: {
              stage_status: "CLOSED",
              doctor_confirmed: true,
              doctor_confirmed_at: new Date(),
              ...(checkpointsToSave !== null ? { active_checkpoints: checkpointsToSave } : {}),
            },
          });

          return NextResponse.json({ ok: true });
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

        return result;
      } catch (err) {
        const code = (err as { code?: unknown } | null)?.code;
        if (code === "P2034" && attempt < 2) continue;
        throw err;
      }
    }
  } catch (err) {
    if (err instanceof Error) {
      console.error("[cases/[id]/close]", { name: err.name, message: err.message });
    } else {
      console.error("[cases/[id]/close]", "UnknownError");
    }
    return NextResponse.json({ ok: false, error: "Failed to close case" }, { status: 500 });
  }
}
