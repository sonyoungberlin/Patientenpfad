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
    // werden alle Fragen gemäß Katalog ergänzt. Das endgültige Fill erfolgt
    // aber weiter unten nach Bestimmung des Runs (Fehler-1-Fix).
    const activeCheckpointIds: string[] = Array.isArray(session.active_checkpoints)
      ? (session.active_checkpoints as Array<{ id?: unknown }>)
          .map((cp) => (typeof cp?.id === "string" ? cp.id : null))
          .filter((id): id is string => id !== null)
      : [];
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

    // Fehler-1-Fix: Im Ergänzungs-Flow speichert der offene Run nur das Delta
    // (neue Checkpoints). Die Default-Fill-Logik soll daher ausschließlich für
    // die Checkpoints des Runs arbeiten – nicht für den Gesamtfall-Stand aus
    // `session.active_checkpoints`. Bei neuen Runs (kein existingOpen) enthält
    // `run.active_checkpoints` den vollen Snapshot, was dem bisherigen
    // Verhalten entspricht.
    const runCheckpointIds: string[] =
      Array.isArray(run.active_checkpoints) && run.active_checkpoints.length > 0
        ? (run.active_checkpoints as Array<{ id?: unknown }>)
            .map((cp) => (typeof cp?.id === "string" ? cp.id : null))
            .filter((cpId): cpId is string => cpId !== null)
        : activeCheckpointIds;

    // Scope-Fix: sanitizedPrefill auf runCheckpointIds begrenzen, bevor Defaults
    // gesetzt werden. withDefaultOffenForCheckpoints kopiert alle Einträge aus
    // `prefill` blind in das Ergebnis – auch solche außerhalb des Run-Scopes.
    // Ohne diesen Filter würden Checkpoints, die der Client mit "offen" befüllt
    // hat (weil sie im DB-Stand existieren, aber nicht zum Delta gehören), in
    // den eingefrorenen Run übernommen und in M3 fälschlicherweise als "offen"
    // angezeigt, obwohl dieser Run für sie nicht zuständig ist.
    const runCheckpointIdSet = new Set(runCheckpointIds);
    const scopedPrefill = Object.fromEntries(
      Object.entries(sanitizedPrefill).filter(([cpId]) => runCheckpointIdSet.has(cpId)),
    );

    const filledPrefill = withDefaultOffenForCheckpoints(
      scopedPrefill,
      runCheckpointIds,
      preparationMode,
    );

    await freezeRun({
      caseId: id,
      runId: run.id,
      answers: filledPrefill as unknown as PrefillRunAnswers,
      // `activeCheckpoints` wird NICHT überschrieben: der bei createOpenRun
      // oder createOpenRun-Supplement gespeicherte Snapshot (Delta oder voll)
      // bleibt erhalten. Dadurch bleibt der Ergänzungs-Run ein Delta-Snapshot.
      // Fehler-2-Fix: source des Runs auf den tatsächlich genutzten Weg
      // korrigieren, falls der Run ursprünglich mit einer anderen Quelle
      // angelegt wurde (z. B. MFA-Ergänzungs-Run, aber Nutzer wählt Gespräch).
      source: preparationMode,
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
