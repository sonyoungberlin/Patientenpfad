import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireQuestionnaireInboxAccess } from "@/lib/authz";
import { PATIENT_CONTEXT_FILTER } from "@/lib/questionnaire/contextFilter";
import { buildQuestionnairePdfBytes } from "@/lib/questionnaire/pdfRenderer";
import { buildQuestionnaireGdtBytes } from "@/lib/questionnaire/gdtRenderer";
import {
  resolveQuestionnaireGdtExport,
  resolveQuestionnairePdfOptions,
} from "@/lib/questionnaire/questionnaireExportService";
import {
  hashQuestionnaireAutoDeviceId,
  isValidQuestionnaireAutoDeviceId,
  QUESTIONNAIRE_AUTO_DEVICE_HEADER,
} from "@/lib/questionnaire/autoDownloadDevice";
import { PRACTICE_VISIBLE_SESSION_FILTER } from "@/lib/websiteForms/practiceVisibility";

export async function GET(req: NextRequest) {
  const { account, error } = await requireQuestionnaireInboxAccess(req);
  if (error) return error;
  const practice = account.current_practice;
  if (!practice) {
    return Response.json(
      { ok: false, error: "Kein Praxiszugriff." },
      { status: 403 },
    );
  }

  const deviceId = req.headers.get(QUESTIONNAIRE_AUTO_DEVICE_HEADER);
  if (!isValidQuestionnaireAutoDeviceId(deviceId)) {
    return Response.json(
      { ok: false, error: "Ungültige Gerätekennung." },
      { status: 400 },
    );
  }
  const deviceHash = hashQuestionnaireAutoDeviceId(deviceId);

  const settings = await prisma.practice.findUnique({
    where: { id: practice.id },
    select: {
      questionnaire_auto_pdf_device_hash: true,
      questionnaire_auto_pdf_enabled_at: true,
    },
  });
  const enabledAt = settings?.questionnaire_auto_pdf_enabled_at ?? null;
  if (
    !enabledAt ||
    settings?.questionnaire_auto_pdf_device_hash !== deviceHash
  ) {
    return Response.json(
      { ok: false, error: "Gerät nicht für Auto-Download freigegeben." },
      { status: 403 },
    );
  }

  const baseEligibility = {
    AND: [
      { owner_practice_id: practice.id },
      PATIENT_CONTEXT_FILTER,
      PRACTICE_VISIBLE_SESSION_FILTER,
      { deleted_at: null },
      { status: "completed" },
      { submitted_at: { gte: enabledAt } },
    ],
  };

  const gdtCandidates = await prisma.patientQuestionnaireSession.findMany({
    where: {
      AND: [
        ...baseEligibility.AND,
        { session_kind: "patient_communication" },
        { patient_reference: { not: null } },
        { auto_pdf_download_claimed_at: { not: null } },
        { gdt_download_claimed_at: null },
      ],
    },
    orderBy: [{ submitted_at: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
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
  const gdtCandidate = gdtCandidates
    .map((item) => ({ session: item, gdt: resolveQuestionnaireGdtExport(item) }))
    .find((item) => item.gdt !== null);
  if (gdtCandidate?.gdt) {
    let bytes: Uint8Array;
    try {
      bytes = buildQuestionnaireGdtBytes(gdtCandidate.gdt);
    } catch (buildError) {
      console.error("[questionnaire auto-download] gdt_build_failed", {
        sessionId: gdtCandidate.session.id,
        message: buildError instanceof Error ? buildError.message : "UnknownError",
      });
      return Response.json(
        { ok: false, error: "GDT konnte nicht erstellt werden." },
        { status: 500 },
      );
    }

    const claim = await prisma.patientQuestionnaireSession.updateMany({
      where: {
        id: gdtCandidate.session.id,
        AND: [
          ...baseEligibility.AND,
          { session_kind: "patient_communication" },
          { patient_reference: gdtCandidate.gdt.patientReference },
          { auto_pdf_download_claimed_at: { not: null } },
          { gdt_download_claimed_at: null },
          {
            owner_practice: {
              is: {
                questionnaire_auto_pdf_device_hash: deviceHash,
                questionnaire_auto_pdf_enabled_at: enabledAt,
              },
            },
          },
        ],
      },
      data: { gdt_download_claimed_at: new Date() },
    });
    if (claim.count !== 1) return new Response(null, { status: 204 });

    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${gdtCandidate.gdt.filename}"`,
      },
    });
  }

  const session = await prisma.patientQuestionnaireSession.findFirst({
    where: { AND: [...baseEligibility.AND, { auto_pdf_download_claimed_at: null }] },
    orderBy: [{ submitted_at: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
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
      auto_pdf_download_claimed_at: true,
      gdt_download_claimed_at: true,
      practice_form: { select: { title: true } },
    },
  });
  if (!session) return new Response(null, { status: 204 });

  let pdf: Awaited<ReturnType<typeof buildQuestionnairePdfBytes>>;
  try {
    pdf = await buildQuestionnairePdfBytes(session, resolveQuestionnairePdfOptions(session));
  } catch (buildError) {
    console.error("[questionnaire auto-download] pdf_build_failed", {
      sessionId: session.id,
      message:
        buildError instanceof Error ? buildError.message : "UnknownError",
    });
    return Response.json(
      { ok: false, error: "PDF konnte nicht erstellt werden." },
      { status: 500 },
    );
  }

  const claimedAt = new Date();
  const claim = await prisma.patientQuestionnaireSession.updateMany({
    where: {
      id: session.id,
      AND: [
        ...baseEligibility.AND,
        { auto_pdf_download_claimed_at: null },
        {
          owner_practice: {
            is: {
              questionnaire_auto_pdf_device_hash: deviceHash,
              questionnaire_auto_pdf_enabled_at: enabledAt,
            },
          },
        },
      ],
    },
    data: { auto_pdf_download_claimed_at: claimedAt },
  });
  if (claim.count !== 1) return new Response(null, { status: 204 });

  return new Response(Buffer.from(pdf.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${pdf.filename}"`,
    },
  });
}