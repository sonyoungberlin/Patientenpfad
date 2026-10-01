import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireQuestionnaireInboxAccess } from "@/lib/authz";
import { ownsSession } from "@/lib/questionnaire/practiceScope";
import { BLOCK_CATALOG } from "@/lib/questionnaire/blockCatalog";
import { createQuestionnaireSession } from "@/lib/questionnaire/createSession";
import { isPublicCheckInSession } from "@/lib/questionnaire/publicCheckIn";

class PublicHandoffConflictError extends Error {}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (req.headers.get("origin") !== req.nextUrl.origin) {
    return NextResponse.json({ ok: false, error: "Check-in nicht verfügbar." }, { status: 404 });
  }
  const { account, error } = await requireQuestionnaireInboxAccess(req);
  if (error) return error;
  const { id } = await params;
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || (body.action !== "close" && body.action !== "start_questionnaire" && body.action !== "discard")) {
    return NextResponse.json({ ok: false, error: "Ungültige Aktion." }, { status: 400 });
  }
  const requestedSession = await prisma.patientQuestionnaireSession.findUnique({
    where: { id },
    select: {
      owner_account_id: true, owner_practice_id: true, created_by_kiosk_device_id: true,
      patient_reference: true, patient_language: true, selected_block_ids: true,
      frozen_blocks: true, source: true, session_kind: true, context: true,
      status: true, deleted_at: true,
      public_check_in_handoff: { select: { status: true, expires_at: true, follow_up_session_id: true } },
      public_follow_up_handoff: {
        select: {
          parent_session_id: true,
          parent_session: {
            select: {
              owner_account_id: true, owner_practice_id: true, created_by_kiosk_device_id: true,
              patient_reference: true, patient_language: true, selected_block_ids: true,
              frozen_blocks: true, source: true, session_kind: true, context: true,
              status: true, deleted_at: true,
              public_check_in_handoff: { select: { status: true, expires_at: true, follow_up_session_id: true } },
            },
          },
        },
      },
    },
  });
  const parentHandoff = requestedSession?.public_follow_up_handoff;
  const parent = parentHandoff?.parent_session ?? requestedSession;
  const parentSessionId = parentHandoff?.parent_session_id ?? id;
  const handoff = parent?.public_check_in_handoff;
  if (!parent || !ownsSession(account, parent) || !isPublicCheckInSession(parent) ||
      parent.status !== "completed" || parent.deleted_at !== null || !parent.owner_practice_id || !handoff) {
    return NextResponse.json({ ok: false, error: "Check-in nicht verfügbar." }, { status: 404 });
  }

  if (body.action === "discard") {
    const isParentRequest = parentHandoff === undefined || parentHandoff === null;
    const isOpenChildRequest = !isParentRequest &&
      handoff.follow_up_session_id === id &&
      requestedSession?.status === "pending" &&
      requestedSession.deleted_at === null &&
      requestedSession.source === "public_check_in" &&
      requestedSession.session_kind === "patient_communication" &&
      requestedSession.context === "patient" &&
      requestedSession.owner_account_id === null &&
      requestedSession.owner_practice_id === parent.owner_practice_id &&
      requestedSession.created_by_kiosk_device_id === null;
    if (!isParentRequest && !isOpenChildRequest) {
      return NextResponse.json({ ok: false, error: "Check-in nicht verfügbar." }, { status: 404 });
    }

    try {
      await prisma.$transaction(async (transaction) => {
        const now = new Date();
        if (handoff.status === "waiting" && handoff.follow_up_session_id === null) {
          const handoffClaim = await transaction.publicQuestionnaireHandoff.updateMany({
            where: { parent_session_id: parentSessionId, status: "waiting", follow_up_session_id: null },
            data: { status: "closed" },
          });
          if (handoffClaim.count !== 1) throw new PublicHandoffConflictError();
        } else if (handoff.status === "questionnaire_ready" && handoff.follow_up_session_id) {
          if (isParentRequest && requestedSession?.status !== "completed") {
            throw new PublicHandoffConflictError();
          }
          const childClaim = await transaction.patientQuestionnaireSession.updateMany({
            where: {
              id: handoff.follow_up_session_id,
              owner_account_id: null,
              owner_practice_id: parent.owner_practice_id,
              created_by_kiosk_device_id: null,
              source: "public_check_in",
              session_kind: "patient_communication",
              context: "patient",
              status: "pending",
              deleted_at: null,
            },
            data: { deleted_at: now },
          });
          if (childClaim.count !== 1) throw new PublicHandoffConflictError();
          const handoffClaim = await transaction.publicQuestionnaireHandoff.updateMany({
            where: {
              parent_session_id: parentSessionId,
              status: "questionnaire_ready",
              follow_up_session_id: handoff.follow_up_session_id,
            },
            data: { status: "closed", follow_up_session_id: null },
          });
          if (handoffClaim.count !== 1) throw new PublicHandoffConflictError();
        } else {
          throw new PublicHandoffConflictError();
        }

        const parentClaim = await transaction.patientQuestionnaireSession.updateMany({
          where: {
            id: parentSessionId,
            source: "public_check_in",
            session_kind: "patient_communication",
            context: "patient",
            owner_account_id: null,
            owner_practice_id: parent.owner_practice_id,
            created_by_kiosk_device_id: null,
            status: "completed",
            deleted_at: null,
          },
          data: { deleted_at: now },
        });
        if (parentClaim.count !== 1) throw new PublicHandoffConflictError();
      });
    } catch (transactionError) {
      if (transactionError instanceof PublicHandoffConflictError) {
        return NextResponse.json({ ok: false, error: "Check-in wurde bereits bearbeitet." }, { status: 409 });
      }
      throw transactionError;
    }
    return NextResponse.json({ ok: true, status: "closed" });
  }

  if (handoff.status !== "waiting" || handoff.expires_at <= new Date() || handoff.follow_up_session_id !== null || !parent.patient_reference) {
    return NextResponse.json({ ok: false, error: "Check-in nicht verfügbar." }, { status: 404 });
  }

  if (body.action === "close") {
    const result = await prisma.publicQuestionnaireHandoff.updateMany({
      where: { parent_session_id: id, status: "waiting", expires_at: { gt: new Date() }, follow_up_session_id: null },
      data: { status: "closed" },
    });
    return result.count === 1
      ? NextResponse.json({ ok: true, status: "closed" })
      : NextResponse.json({ ok: false, error: "Check-in wurde bereits bearbeitet." }, { status: 409 });
  }

  const rawBlockIds = body.selected_block_ids;
  if (!Array.isArray(rawBlockIds) || rawBlockIds.length === 0 || !rawBlockIds.every((value) => typeof value === "string")) {
    return NextResponse.json({ ok: false, error: "Bitte mindestens einen Block auswählen." }, { status: 400 });
  }
  const selectedBlockIds = [...new Set(rawBlockIds)].filter((blockId) => blockId in BLOCK_CATALOG && BLOCK_CATALOG[blockId].selectable !== false);
  if (selectedBlockIds.length !== rawBlockIds.length) {
    return NextResponse.json({ ok: false, error: "Ungültige Blockauswahl." }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const parentClaim = await transaction.patientQuestionnaireSession.updateMany({
        where: {
          id,
          source: "public_check_in",
          session_kind: "patient_communication",
          context: "patient",
          owner_account_id: null,
          owner_practice_id: parent.owner_practice_id,
          created_by_kiosk_device_id: null,
          patient_reference: parent.patient_reference,
          selected_block_ids: { equals: ["KONTAKT", "CHECK_IN"] },
          status: "completed",
          deleted_at: null,
          public_check_in_handoff: {
            is: {
              status: "waiting",
              expires_at: { gt: new Date() },
              follow_up_session_id: null,
            },
          },
        },
        data: { updatedAt: new Date() },
      });
      if (parentClaim.count !== 1) throw new PublicHandoffConflictError();
      const child = await createQuestionnaireSession({
        selectedBlockIds,
        patientReference: parent.patient_reference,
        patientLanguage: parent.patient_language,
        ownerPracticeId: parent.owner_practice_id!,
        source: "public_check_in",
        origin: req.nextUrl.origin,
        databaseClient: transaction,
      });
      const claim = await transaction.publicQuestionnaireHandoff.updateMany({
        where: { parent_session_id: id, status: "waiting", expires_at: { gt: new Date() }, follow_up_session_id: null },
        data: { status: "questionnaire_ready", follow_up_session_id: child.sessionId },
      });
      if (claim.count !== 1) throw new PublicHandoffConflictError();
    });
  } catch (transactionError) {
    if (transactionError instanceof PublicHandoffConflictError) {
      return NextResponse.json({ ok: false, error: "Check-in wurde bereits bearbeitet." }, { status: 409 });
    }
    throw transactionError;
  }
  return NextResponse.json({ ok: true, status: "questionnaire_ready" });
}