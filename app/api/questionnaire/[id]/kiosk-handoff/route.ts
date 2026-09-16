import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireQuestionnaireInboxAccess } from "@/lib/authz";
import { ownsSession } from "@/lib/questionnaire/practiceScope";
import { BLOCK_CATALOG } from "@/lib/questionnaire/blockCatalog";
import { createQuestionnaireSession } from "@/lib/questionnaire/createSession";
import { isKioskCheckInSession } from "@/lib/questionnaire/kioskCheckIn";

class KioskHandoffConflictError extends Error {}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { account, error } = await requireQuestionnaireInboxAccess(req);
  if (error) return error;
  const { id } = await params;
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || (body.action !== "close" && body.action !== "start_questionnaire")) {
    return NextResponse.json({ ok: false, error: "Ungültige Aktion." }, { status: 400 });
  }

  const parent = await prisma.patientQuestionnaireSession.findUnique({
    where: { id },
    select: {
      owner_account_id: true,
      owner_practice_id: true,
      created_by_kiosk_device_id: true,
      patient_reference: true,
      patient_language: true,
      selected_block_ids: true,
      source: true,
      session_kind: true,
      status: true,
      deleted_at: true,
      kiosk_handoff_status: true,
    },
  });
  if (
    !parent ||
    !ownsSession(account, parent) ||
    !isKioskCheckInSession(parent) ||
    parent.status !== "completed" ||
    parent.deleted_at !== null ||
    parent.kiosk_handoff_status !== "waiting" ||
    !parent.patient_reference ||
    !parent.owner_practice_id ||
    !parent.created_by_kiosk_device_id
  ) {
    return NextResponse.json({ ok: false, error: "Check-in nicht verfügbar." }, { status: 404 });
  }

  if (body.action === "close") {
    const result = await prisma.patientQuestionnaireSession.updateMany({
      where: {
        id,
        status: "completed",
        deleted_at: null,
        patient_reference: { not: null },
        kiosk_handoff_status: "waiting",
        kiosk_follow_up_session_id: null,
      },
      data: { kiosk_handoff_status: "closed" },
    });
    if (result.count !== 1) {
      return NextResponse.json({ ok: false, error: "Check-in wurde bereits bearbeitet." }, { status: 409 });
    }
    return NextResponse.json({ ok: true, status: "closed" });
  }

  const rawBlockIds = body.selected_block_ids;
  if (!Array.isArray(rawBlockIds) || rawBlockIds.length === 0 ||
      !rawBlockIds.every((value) => typeof value === "string")) {
    return NextResponse.json({ ok: false, error: "Bitte mindestens einen Block auswählen." }, { status: 400 });
  }
  const selectedBlockIds = [...new Set(rawBlockIds)].filter(
    (blockId) => blockId in BLOCK_CATALOG && BLOCK_CATALOG[blockId].selectable !== false,
  );
  if (selectedBlockIds.length !== rawBlockIds.length) {
    return NextResponse.json({ ok: false, error: "Ungültige Blockauswahl." }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const child = await createQuestionnaireSession({
        selectedBlockIds,
        patientReference: parent.patient_reference,
        patientLanguage: parent.patient_language,
        ownerPracticeId: parent.owner_practice_id!,
        createdByKioskDeviceId: parent.created_by_kiosk_device_id!,
        source: "kiosk_direct",
        origin: req.nextUrl.origin,
        databaseClient: transaction,
      });
      const result = await transaction.patientQuestionnaireSession.updateMany({
        where: {
          id,
          status: "completed",
          deleted_at: null,
          patient_reference: parent.patient_reference,
          kiosk_handoff_status: "waiting",
          kiosk_follow_up_session_id: null,
        },
        data: {
          kiosk_handoff_status: "questionnaire_ready",
          kiosk_follow_up_session_id: child.sessionId,
        },
      });
      if (result.count !== 1) throw new KioskHandoffConflictError();
    });
  } catch (transactionError) {
    if (transactionError instanceof KioskHandoffConflictError) {
      return NextResponse.json({ ok: false, error: "Check-in wurde bereits bearbeitet." }, { status: 409 });
    }
    throw transactionError;
  }

  return NextResponse.json({ ok: true, status: "questionnaire_ready" });
}