import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import {
  sanitizePrefillForMode,
  withDefaultOffenForCheckpoints,
} from "@/lib/logic/m2Questions";
import {
  createOpenRun,
  freezeRun,
  getOpenRun,
  type PrefillRunAnswers,
} from "@/lib/server/prefillRuns";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const account = await getSessionAccount(req);
    if (!account) {
      return NextResponse.json({ ok: false, error: "Nicht angemeldet." }, { status: 401 });
    }
    if (!account.is_approved) {
      return NextResponse.json({ ok: false, error: "Account nicht freigeschaltet." }, { status: 403 });
    }

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
        m2_status: true,
        active_checkpoints: true,
      },
    });

    if (!session || session.owner_account_id !== account.id) {
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 },
      );
    }

    // Defensive Server-Absicherung: Auch wenn der Client weniger schickt,
    // werden alle Fragen aller aktiven Checkpoints gemäß Katalog ergänzt –
    // fehlende Antworten landen als "offen" im Prefill.
    const activeCheckpointIds: string[] = Array.isArray(session.active_checkpoints)
      ? (session.active_checkpoints as Array<{ id?: unknown }>)
          .map((cp) => (typeof cp?.id === "string" ? cp.id : null))
          .filter((id): id is string => id !== null)
      : [];
    const filledPrefill = withDefaultOffenForCheckpoints(
      sanitizedPrefill,
      activeCheckpointIds,
      preparationMode,
    );
    const activeCheckpointsSnapshot = Array.isArray(session.active_checkpoints)
      ? (session.active_checkpoints as unknown[])
      : [];

    // Schreibpfad: vorhandenen offenen Run weiterführen, sonst einen neuen
    // anlegen; in beiden Fällen anschließend einfrieren. Der partielle
    // Unique-Index `(case_id) WHERE frozen_at IS NULL` stellt sicher, dass
    // pro Fall maximal ein offener Run existiert.
    const existingOpen = await getOpenRun(id);
    const run =
      existingOpen ??
      (await createOpenRun({
        caseId: id,
        source: preparationMode,
        activeCheckpoints: activeCheckpointsSnapshot,
        createdByAccountId: account.id,
        // Schritt 2: Außenverhalten identisch; Confirm-Guard wird in einem
        // späteren Schritt aktiviert.
        allowConfirmed: true,
      }));
    await freezeRun({
      caseId: id,
      runId: run.id,
      answers: filledPrefill as unknown as PrefillRunAnswers,
      activeCheckpoints: activeCheckpointsSnapshot,
      allowConfirmed: true,
    });

    // Cache / Kompatibilitätsschicht: `ctx_prefill` und `preparation_mode`
    // werden parallel gesetzt, damit bestehende Lesepfade und die M3-Lock-
    // Logik unverändert weiterarbeiten. `m2_status` bleibt unangetastet,
    // außer wenn zuvor auf den Patientenrücklauf gewartet wurde – dann
    // identisch zur bisherigen Route auf "none" zurücksetzen und den
    // offenen Token invalidieren (M3-Lock-Verhalten unverändert).
    const data: Prisma.CaseSessionUpdateInput = {
      ctx_prefill: filledPrefill as unknown as Prisma.InputJsonValue,
      preparation_mode: preparationMode,
    };

    if (session.m2_status === "waiting_for_patient") {
      data.m2_status = "none";
      data.m2_token = null;
      data.m2_token_expires_at = null;
    }

    await prisma.caseSession.update({
      where: { id },
      data,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
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
