import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireQuestionnaireInboxAccess } from "@/lib/authz";
import { ownsSession } from "@/lib/questionnaire/practiceScope";
import { isQuestionnaireVisibleToPractice } from "@/lib/websiteForms/practiceVisibility";
import { isPatientSession } from "@/lib/questionnaire/contextFilter";
import { getOwnershipFilter } from "@/lib/questionnaire/practiceScope";
import { PRACTICE_VISIBLE_SESSION_FILTER } from "@/lib/websiteForms/practiceVisibility";
import {
  activeQuestionnaireLifecycleFilter,
  trashQuestionnaireLifecycleFilter,
} from "@/lib/questionnaire/lifecycle";
import { buildQuestionnaireInboxDetail } from "@/lib/questionnaire/inboxDetail";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { account, error } = await requireQuestionnaireInboxAccess(req);
    if (error) return error;

    const { id } = await params;
    const now = new Date();
    const session = await prisma.patientQuestionnaireSession.findFirst({
      where: {
        AND: [
          { id },
          getOwnershipFilter(account),
          { context: "patient" },
          PRACTICE_VISIBLE_SESSION_FILTER,
          { status: "completed" },
          {
            OR: [
              {
                deleted_at: null,
                AND: [activeQuestionnaireLifecycleFilter(now)],
              },
              trashQuestionnaireLifecycleFilter(now),
            ],
          },
        ],
      },
      select: {
        selected_block_ids: true,
        deduplicated_questions: true,
        answers: true,
        frozen_blocks: true,
        session_kind: true,
        internal_workflow_id: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Fragebogen nicht gefunden." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      detail: buildQuestionnaireInboxDetail(session),
    });
  } catch (err) {
    console.error("[GET questionnaire/[id]]", {
      message: err instanceof Error ? err.message : "UnknownError",
    });
    return NextResponse.json(
      { ok: false, error: "Antworten konnten nicht geladen werden." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { account, error } = await requireQuestionnaireInboxAccess(req);
    if (error) return error;

    const { id } = await params;
    let body: Record<string, unknown>;
    try {
      const parsedBody: unknown = await req.json();
      if (parsedBody === null || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
        return NextResponse.json({ ok: false, error: "Ungültiges JSON." }, { status: 400 });
      }
      body = parsedBody as Record<string, unknown>;
    } catch {
      return NextResponse.json({ ok: false, error: "Ungültiges JSON." }, { status: 400 });
    }

    if (typeof body.patient_reference !== "string") {
      return NextResponse.json(
        { ok: false, error: "Patientennummer muss ein nicht-leerer String sein." },
        { status: 400 },
      );
    }
    const patientReference = body.patient_reference.trim();
    if (!patientReference) {
      return NextResponse.json(
        { ok: false, error: "Patientennummer muss ein nicht-leerer String sein." },
        { status: 400 },
      );
    }

    const session = await prisma.patientQuestionnaireSession.findUnique({
      where: { id },
      select: {
        owner_account_id: true,
        owner_practice_id: true,
        source: true,
        status: true,
        confirmed_at: true,
        deleted_at: true,
        context: true,
        patient_reference: true,
      },
    });

    if (
      !session ||
      session.deleted_at != null ||
      !isPatientSession(session) ||
      !ownsSession(account, session) ||
      !isQuestionnaireVisibleToPractice(session) ||
      session.source !== "website" ||
      session.status !== "completed" ||
      session.confirmed_at == null ||
      session.patient_reference != null
    ) {
      return NextResponse.json({ ok: false, error: "Fragebogen nicht gefunden." }, { status: 404 });
    }

    const result = await prisma.patientQuestionnaireSession.updateMany({
      where: {
        id,
        source: "website",
        context: "patient",
        status: "completed",
        confirmed_at: { not: null },
        deleted_at: null,
        patient_reference: null,
      },
      data: { patient_reference: patientReference },
    });

    if (result.count !== 1) {
      return NextResponse.json(
        { ok: false, error: "Der Fragebogen wurde bereits einem Patienten zugeordnet." },
        { status: 409 },
      );
    }

    return NextResponse.json({ ok: true, patient_reference: patientReference });
  } catch (err) {
    console.error("[PATCH questionnaire/[id]]", {
      message: err instanceof Error ? err.message : "UnknownError",
    });
    return NextResponse.json(
      { ok: false, error: "Patient konnte nicht zugeordnet werden." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { account, error } = await requireQuestionnaireInboxAccess(req);
    if (error) return error;

    const { id } = await params;

    const session = await prisma.patientQuestionnaireSession.findUnique({
      where: { id },
      select: {
        owner_account_id: true,
        owner_practice_id: true,
        source: true,
        status: true,
        submitted_at: true,
        confirmed_at: true,
        deleted_at: true,
        context: true,
      },
    });

    if (
      !session ||
      session.deleted_at != null ||
      !isPatientSession(session) ||
      !ownsSession(account, session) ||
      !isQuestionnaireVisibleToPractice(session) ||
      session.status !== "completed" ||
      session.submitted_at == null
    ) {
      return NextResponse.json({ ok: false, error: "Fragebogen nicht gefunden." }, { status: 404 });
    }

    // Soft Delete: den Datensatz nur als archiviert markieren, damit ein
    // versehentliches Löschen kurzfristig durch eine DB-Korrektur
    // (`UPDATE ... SET deleted_at = NULL`) rückgängig gemacht werden kann.
    // Antworten und alle anderen Felder bleiben unverändert.
    await prisma.patientQuestionnaireSession.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error) {
      console.error("[DELETE questionnaire/[id]]", { name: err.name, message: err.message });
    } else {
      console.error("[DELETE questionnaire/[id]]", "UnknownError");
    }
    return NextResponse.json(
      { ok: false, error: "Fragebogen konnte nicht gelöscht werden." },
      { status: 500 },
    );
  }
}
