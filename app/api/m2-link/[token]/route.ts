import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sanitizePrefillForMode } from "@/lib/logic/m2Questions";
import {
  appendFrozenRun,
  type PrefillRunAnswers,
} from "@/lib/server/prefillRuns";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    const session = await prisma.caseSession.findUnique({
      where: { m2_token: token },
      select: {
        id: true,
        m2_token_expires_at: true,
        active_checkpoints: true,
      },
    });

    if (!session || !session.m2_token_expires_at) {
      return NextResponse.json(
        { ok: false, error: "Link ungültig oder abgelaufen." },
        { status: 404 },
      );
    }

    if (session.m2_token_expires_at < new Date()) {
      return NextResponse.json(
        { ok: false, error: "Link ungültig oder abgelaufen." },
        { status: 410 },
      );
    }

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

    // Patientenlink-Rücklauf gehört eindeutig zum Patienten-Weg.
    // - `preparation_mode` wird hier explizit auf "patient" gesetzt
    //   (vorher unverändert gelassen → konnte zu Mischzuständen führen).
    // - Antworten werden strikt gegen den Patientenkatalog sanitisiert.
    const sanitizedPrefill = sanitizePrefillForMode(body.prefill, "patient");

    // Patientenrücklauf erzeugt **immer** einen eigenständigen, sofort
    // eingefrorenen Run (Regel 1). Ein eventuell offener MFA-/Gesprächs-Run
    // wird dabei bewusst NICHT angetastet, gemerged oder überschrieben.
    const activeCheckpointsSnapshot = Array.isArray(session.active_checkpoints)
      ? (session.active_checkpoints as unknown[])
      : [];
    await appendFrozenRun({
      caseId: session.id,
      source: "patient",
      activeCheckpoints: activeCheckpointsSnapshot,
      answers: sanitizedPrefill as unknown as PrefillRunAnswers,
      patientTokenUsed: token,
      // Schritt 2: Außenverhalten identisch.
      allowConfirmed: true,
    });

    // Cache / Kompatibilitätsschicht synchron halten. `ctx_prefill` enthält
    // die Antworten dieses neuen Runs (Patient-Reader lesen ausschließlich
    // den Patientenkatalog); `preparation_mode = "patient"`, `m2_status =
    // "completed"` und die Token-Invalidierung verhalten sich identisch
    // zur bisherigen Implementierung.
    await prisma.caseSession.update({
      where: { id: session.id },
      data: {
        ctx_prefill: sanitizedPrefill as unknown as Prisma.InputJsonValue,
        preparation_mode: "patient",
        m2_token: null,
        m2_token_expires_at: null,
        m2_status: "completed",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/m2-link/[token]]", err);
    return NextResponse.json(
      { ok: false, error: "Angaben konnten nicht gespeichert werden." },
      { status: 500 },
    );
  }
}
