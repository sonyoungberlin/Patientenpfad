import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireQuestionnaireInboxAccess } from "@/lib/authz";
import { ownsSession } from "@/lib/questionnaire/practiceScope";
import { isPatientSession } from "@/lib/questionnaire/contextFilter";
import { buildQuestionnairePdfBytes } from "@/lib/questionnaire/pdfRenderer";
import { resolveQuestionnairePdfOptions } from "@/lib/questionnaire/questionnaireExportService";
import { buildInternalDocumentationPdfArtifact } from "@/lib/questionnaire/internalDocumentationArtifacts";
import {
  isQuestionnaireExportFinal,
  QUESTIONNAIRE_EXPORT_FINALITY_FILTER,
} from "@/lib/questionnaire/exportFinality";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { account, error } = await requireQuestionnaireInboxAccess(req);
  if (error) return error;

  const session = await prisma.patientQuestionnaireSession.findUnique({
    where: { id },
    select: {
      id: true,
      owner_account_id: true,
      owner_practice_id: true,
      status: true,
      patient_reference: true,
      submitted_at: true,
      submitted_by: true,
      selected_block_ids: true,
      deduplicated_questions: true,
      answers: true,
      frozen_blocks: true,
      source: true,
      practice_form: {
        select: {
          title: true,
        },
      },
      deleted_at: true,
      pdf_downloaded_at: true,
      context: true,
      session_kind: true,
      internal_workflow_id: true,
      kiosk_handoff_status: true,
      kiosk_follow_up_session: { select: { status: true } },
      public_check_in_handoff: {
        select: {
          status: true,
          follow_up_session: { select: { status: true } },
        },
      },
    },
  });

  if (!session || session.deleted_at != null || !isPatientSession(session)) {
    return new Response(JSON.stringify({ ok: false, error: "Session nicht gefunden." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!ownsSession(account, session)) {
    return new Response(JSON.stringify({ ok: false, error: "Keine Berechtigung." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!isQuestionnaireExportFinal(session)) {
    return new Response(
      JSON.stringify({ ok: false, error: "PDF nur für abgeschlossene Fragebögen verfügbar." }),
      { status: 409, headers: { "Content-Type": "application/json" } },
    );
  }

  let pdfOptions;
  try {
    pdfOptions = resolveQuestionnairePdfOptions(session);
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Unbekannter interner Workflow." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  let pdf;
  if (session.session_kind === "internal_documentation") {
    if (!session.submitted_at) {
      return new Response(JSON.stringify({ ok: false, error: "Abschlussdatum fehlt." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    pdf = await buildInternalDocumentationPdfArtifact({
      ...session,
      session_kind: "internal_documentation",
      submitted_at: session.submitted_at,
    }, pdfOptions);
  } else {
    pdf = await buildQuestionnairePdfBytes(session, pdfOptions);
  }
  const { bytes, filename } = pdf;

  if (session.pdf_downloaded_at == null) {
    try {
      await prisma.patientQuestionnaireSession.updateMany({
        where: { id, AND: [QUESTIONNAIRE_EXPORT_FINALITY_FILTER] },
        data: { pdf_downloaded_at: new Date() },
      });
    } catch (err) {
      console.error("[GET questionnaire/[id]/pdf] mark_downloaded_failed", {
        sessionId: id,
        message: err instanceof Error ? err.message : "UnknownError",
      });
    }
  }

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

