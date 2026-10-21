import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCasesAccess } from "@/lib/authz";
import { canAccessCaseSession } from "@/lib/cases/practiceScope";
import {
  sanitizePrefillForMode,
  withDefaultOffenForCheckpoints,
} from "@/lib/logic/m2Questions";
import { ensureSelectionConditionalCheckpoints } from "@/lib/logic/checkpointCatalog";
import type { ActiveCheckpoint } from "@/lib/types";
import {
  saveCurrentRun,
  type PrefillRunAnswers,
} from "@/lib/server/prefillRuns";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { account, error } = await requireCasesAccess(req);
    if (error) return error;

    const { id } = await params;
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Malformed JSON body" },
        { status: 400 },
      );
    }

    if (
      !body?.prefill ||
      typeof body.prefill !== "object" ||
      Array.isArray(body.prefill)
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid input" },
        { status: 400 },
      );
    }

    // Optionaler Modus für nicht-asynchrone M2-Wege:
    // - "mfa"          → MFA-Vorbereitung (Default, rückwärtskompatibel)
    // - "conversation" → Patientengespräch in der Praxis (Patientenfragen-Katalog)
    // Andere Werte werden ignoriert und auf "mfa" zurückgesetzt.
    const preparationMode: "mfa" | "conversation" =
      body?.mode === "conversation" ? "conversation" : "mfa";
    const isDraft = body.draft === true;

    // Strikte Mode-Sanitisierung: Es werden ausschließlich Antworten
    // akzeptiert, deren IDs zum Katalog des aktiven Vorbereitungswegs gehören.
    // Damit kann `ctx_prefill` strukturell nie mehr eine Mischung aus
    // MFA- und Patientenantworten enthalten.
    const sanitizedPrefill = sanitizePrefillForMode(
      body.prefill,
      preparationMode,
    );

    const session = await prisma.caseSession.findUnique({
      where: { id },
      select: {
        owner_account_id: true,
        owner_practice_id: true,
        m2_status: true,
        active_checkpoints: true,
        doctor_confirmed: true,
        clinical_status: true,
      },
    });

    if (!session || !canAccessCaseSession(account, session)) {
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 },
      );
    }

    // Defensive Server-Absicherung: Auch wenn der Client weniger schickt,
    // werden alle Fragen gemäß Katalog ergänzt. Das endgültige Fill erfolgt
    // aber weiter unten nach Bestimmung des Runs (Fehler-1-Fix).
    //
    // ensureSelectionConditionalCheckpoints ergänzt transiente Checkpoints
    // (K14/K15 für Reha bzw. beruflichen Kontext, K16/K17 für Pflege)
    // analog zu M2/page.tsx und M3/page.tsx. Ohne diese Erweiterung würden
    // Antworten für die bedingt eingeblendeten Zusatzblöcke durch den
    // Scope-Filter weiter unten herausgefiltert.
    const expandedCheckpoints = ensureSelectionConditionalCheckpoints(
      Array.isArray(session.active_checkpoints)
        ? (session.active_checkpoints as ActiveCheckpoint[])
        : [],
    );
    const activeCheckpointIds: string[] = expandedCheckpoints.map((cp) => cp.id);
    const activeCheckpointsSnapshot = expandedCheckpoints as unknown[];

    // M2 muss auch ältere, bereits beantwortete Checkpoints korrigieren können.
    // Der Client sendet nur die aktuelle Quelle; der aktive Fall-Snapshot ist
    // daher der korrekte Scope, auch wenn ein offener Run ursprünglich ein Delta war.
    const runCheckpointIdSet = new Set(activeCheckpointIds);
    const scopedPrefill = Object.fromEntries(
      Object.entries(sanitizedPrefill).filter(([cpId]) => runCheckpointIdSet.has(cpId)),
    );

    const filledPrefill = withDefaultOffenForCheckpoints(
      scopedPrefill,
      activeCheckpointIds,
      preparationMode,
    );

    // M2 speichert den effektiven Quellstand atomar mit dem Run. Ein offener
    // Run anderer Quelle bleibt dabei unverändert; ältere eingefrorene
    // Delta-Runs derselben Quelle werden vom Service verlustfrei einbezogen.
    const caseSessionUpdate: Omit<Prisma.CaseSessionUpdateInput, "ctx_prefill"> = {
      preparation_mode: preparationMode,
    };

    if (!isDraft && session.m2_status === "waiting_for_patient") {
      caseSessionUpdate.m2_status = "none";
      caseSessionUpdate.m2_token = null;
      caseSessionUpdate.m2_token_expires_at = null;
    }

    await saveCurrentRun({
      caseId: id,
      source: preparationMode,
      activeCheckpoints: activeCheckpointsSnapshot,
      answers: filledPrefill as unknown as PrefillRunAnswers,
      createdByAccountId: account.id,
      caseSessionUpdate,
      resetM3RatingsOnChange: true,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (
      err instanceof Error &&
      (err as Error & { code?: string }).code === "case_confirmed"
    ) {
      return NextResponse.json(
        { ok: false, error: "Fall ist bereits ärztlich bestätigt." },
        { status: 403 },
      );
    }
    if (err instanceof Error) {
      console.error("[cases/[id]/m2/prefill]", {
        name: err.name,
        message: err.message,
      });
    } else {
      console.error("[cases/[id]/m2/prefill]", "UnknownError");
    }
    return NextResponse.json(
      { ok: false, error: "Failed to save prefill" },
      { status: 500 },
    );
  }
}
