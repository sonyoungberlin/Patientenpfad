import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";

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
    const checkpointsToSave =
      Array.isArray(rawCheckpoints) &&
      (rawCheckpoints as unknown[]).every(
        (cp) => cp !== null && typeof cp === "object" && typeof (cp as Record<string, unknown>).id === "string",
      )
        ? (rawCheckpoints as unknown[])
        : null;

    const session = await prisma.caseSession.findUnique({
      where: { id },
      select: { owner_account_id: true, doctor_confirmed: true },
    });

    if (!session || session.owner_account_id !== account.id) {
      return NextResponse.json({ ok: false, error: "Fall nicht gefunden." }, { status: 404 });
    }

    if (session.doctor_confirmed) {
      // Already confirmed – idempotent OK, do not overwrite the timestamp.
      return NextResponse.json({ ok: true, already_confirmed: true });
    }

    await prisma.caseSession.update({
      where: { id },
      data: {
        stage_status: "CLOSED",
        doctor_confirmed: true,
        doctor_confirmed_at: new Date(),
        ...(checkpointsToSave !== null ? { active_checkpoints: checkpointsToSave } : {}),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error) {
      console.error("[cases/[id]/close]", { name: err.name, message: err.message });
    } else {
      console.error("[cases/[id]/close]", "UnknownError");
    }
    return NextResponse.json({ ok: false, error: "Failed to close case" }, { status: 500 });
  }
}
