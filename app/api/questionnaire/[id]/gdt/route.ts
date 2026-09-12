import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireQuestionnaireInboxAccess } from "@/lib/authz";
import { isPatientSession } from "@/lib/questionnaire/contextFilter";
import { buildQuestionnaireGdtBytes } from "@/lib/questionnaire/gdtRenderer";
import { ownsSession } from "@/lib/questionnaire/practiceScope";
import { resolveQuestionnaireGdtExport } from "@/lib/questionnaire/questionnaireExportService";
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
      gdt_download_claimed_at: true,
      practice_form: { select: { title: true } },
    },
  });

  if (
    !session ||
    session.deleted_at != null ||
    session.status !== "completed" ||
    !isPatientSession(session) ||
    !ownsSession(account, session) ||
    !isQuestionnaireVisibleToPractice(session)
  ) {
    return Response.json({ ok: false, error: "Session nicht gefunden." }, { status: 404 });
  }

  const gdt = resolveQuestionnaireGdtExport(session);
  if (!gdt) {
    return Response.json({ ok: false, error: "GDT für diese Session nicht verfügbar." }, { status: 409 });
  }
  if (session.gdt_download_claimed_at != null) return new Response(null, { status: 204 });

  let bytes: Uint8Array;
  try {
    bytes = buildQuestionnaireGdtBytes(gdt);
  } catch (buildError) {
    console.error("[GET questionnaire/[id]/gdt] build_failed", {
      sessionId: id,
      message: buildError instanceof Error ? buildError.message : "UnknownError",
    });
    return Response.json({ ok: false, error: "GDT konnte nicht erstellt werden." }, { status: 500 });
  }

  const claim = await prisma.patientQuestionnaireSession.updateMany({
    where: {
      id,
      owner_account_id: session.owner_account_id,
      owner_practice_id: session.owner_practice_id,
      status: "completed",
      deleted_at: null,
      context: "patient",
      session_kind: "patient_communication",
      patient_reference: gdt.patientReference,
      gdt_download_claimed_at: null,
    },
    data: { gdt_download_claimed_at: new Date() },
  });
  if (claim.count !== 1) return new Response(null, { status: 204 });

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${gdt.filename}"`,
    },
  });
}