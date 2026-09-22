import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireQuestionnaireInboxAccess } from "@/lib/authz";
import { ownsSession } from "@/lib/questionnaire/practiceScope";
import { isPatientSession } from "@/lib/questionnaire/contextFilter";
import { buildInternalDocumentationXmlArtifact } from "@/lib/questionnaire/internalDocumentationArtifacts";
import { isQuestionnaireExportFinal } from "@/lib/questionnaire/exportFinality";
import { isQuestionnaireVisibleToPractice } from "@/lib/websiteForms/practiceVisibility";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { account, error } = await requireQuestionnaireInboxAccess(req);
  if (error) return error;
  const { id } = await params;

  const session = await prisma.patientQuestionnaireSession.findUnique({
    where: { id },
    select: {
      id: true,
      owner_account_id: true,
      owner_practice_id: true,
      status: true,
      confirmed_at: true,
      deleted_at: true,
      context: true,
      patient_reference: true,
      submitted_at: true,
      submitted_by: true,
      selected_block_ids: true,
      deduplicated_questions: true,
      frozen_blocks: true,
      answers: true,
      source: true,
      session_kind: true,
      internal_workflow_id: true,
      practice_form: { select: { title: true } },
    },
  });

  if (
    !session ||
    session.session_kind !== "internal_documentation" ||
    session.deleted_at != null ||
    !isQuestionnaireExportFinal(session) ||
    !isPatientSession(session) ||
    !ownsSession(account, session) ||
    !isQuestionnaireVisibleToPractice(session) ||
    !session.submitted_at
  ) {
    return Response.json({ ok: false, error: "Session nicht gefunden." }, { status: 404 });
  }

  const xml = buildInternalDocumentationXmlArtifact({
    ...session,
    submitted_at: session.submitted_at,
    submitted_by: session.submitted_by,
    session_kind: "internal_documentation",
  });

  return new Response(Buffer.from(xml.bytes), {
    headers: {
      "Content-Type": xml.mimeType,
      "Content-Disposition": `attachment; filename="${xml.filename}"`,
    },
  });
}