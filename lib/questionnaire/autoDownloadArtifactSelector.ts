import { prisma } from "@/lib/prisma";
import { PATIENT_CONTEXT_FILTER } from "@/lib/questionnaire/contextFilter";
import { buildQuestionnaireGdtBytes } from "@/lib/questionnaire/gdtRenderer";
import {
  buildInternalDocumentationGdtArtifact,
  buildInternalDocumentationPdfArtifact,
  buildInternalDocumentationXmlArtifact,
  type InternalDocumentationArtifact,
} from "@/lib/questionnaire/internalDocumentationArtifacts";
import { claimInternalDocumentationXml } from "@/lib/questionnaire/internalDocumentationXmlClaim";
import { buildQuestionnairePdfBytes } from "@/lib/questionnaire/pdfRenderer";
import {
  resolveQuestionnaireGdtExport,
  resolveQuestionnairePdfOptions,
} from "@/lib/questionnaire/questionnaireExportService";
import { PRACTICE_VISIBLE_SESSION_FILTER } from "@/lib/websiteForms/practiceVisibility";

export type AutoDownloadArtifact = InternalDocumentationArtifact;

export class AutoDownloadArtifactBuildError extends Error {
  constructor(
    public readonly responseMessage: string,
    options: ErrorOptions,
  ) {
    super("auto_download_artifact_build_failed", options);
    this.name = "AutoDownloadArtifactBuildError";
  }
}

type SelectNextAutoDownloadArtifactInput = {
  practiceId: string;
  deviceHash: string;
  enabledAt: Date;
};

export async function selectNextAutoDownloadArtifact({
  practiceId,
  deviceHash,
  enabledAt,
}: SelectNextAutoDownloadArtifactInput): Promise<AutoDownloadArtifact | null> {
  const baseEligibility = {
    AND: [
      { owner_practice_id: practiceId },
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
      throw new AutoDownloadArtifactBuildError(
        "GDT konnte nicht erstellt werden.",
        { cause: buildError },
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
    if (claim.count !== 1) return null;

    return {
      bytes,
      filename: gdtCandidate.gdt.filename,
      mimeType: "application/octet-stream",
    };
  }

  const internalSessions = await prisma.patientQuestionnaireSession.findMany({
    where: {
      AND: [
        ...baseEligibility.AND,
        { session_kind: "internal_documentation" },
        {
          OR: [
            { auto_pdf_download_claimed_at: null },
            { auto_xml_download_claimed_at: null },
            { gdt_download_claimed_at: null },
          ],
        },
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
      auto_pdf_download_claimed_at: true,
      auto_xml_download_claimed_at: true,
      gdt_download_claimed_at: true,
      practice_form: { select: { title: true } },
    },
  });
  const deviceEligibility = [
    ...baseEligibility.AND,
    {
      owner_practice: {
        is: {
          questionnaire_auto_pdf_device_hash: deviceHash,
          questionnaire_auto_pdf_enabled_at: enabledAt,
        },
      },
    },
  ];

  for (const session of internalSessions) {
    if (!session.submitted_at) continue;
    const internalSession = {
      ...session,
      submitted_at: session.submitted_at,
      session_kind: "internal_documentation" as const,
    };

    if (session.auto_pdf_download_claimed_at === null) {
      try {
        const artifact = await buildInternalDocumentationPdfArtifact(internalSession);
        const claim = await prisma.patientQuestionnaireSession.updateMany({
          where: {
            id: session.id,
            AND: [
              ...deviceEligibility,
              { session_kind: "internal_documentation" },
              { auto_pdf_download_claimed_at: null },
            ],
          },
          data: { auto_pdf_download_claimed_at: new Date() },
        });
        if (claim.count === 1) return artifact;
      } catch (buildError) {
        console.error("[questionnaire auto-download] internal_pdf_build_failed", {
          sessionId: session.id,
          message: buildError instanceof Error ? buildError.message : "UnknownError",
        });
      }
    }

    if (session.auto_xml_download_claimed_at === null) {
      try {
        const artifact = buildInternalDocumentationXmlArtifact(internalSession);
        const claimed = await claimInternalDocumentationXml(
          session.id,
          new Date(),
          deviceEligibility,
        );
        if (claimed) return artifact;
      } catch (buildError) {
        console.error("[questionnaire auto-download] internal_xml_build_failed", {
          sessionId: session.id,
          message: buildError instanceof Error ? buildError.message : "UnknownError",
        });
      }
    }

    if (session.gdt_download_claimed_at === null) {
      try {
        const artifact = buildInternalDocumentationGdtArtifact(internalSession);
        if (!artifact) continue;
        const claim = await prisma.patientQuestionnaireSession.updateMany({
          where: {
            id: session.id,
            AND: [
              ...deviceEligibility,
              { session_kind: "internal_documentation" },
              { gdt_download_claimed_at: null },
            ],
          },
          data: { gdt_download_claimed_at: new Date() },
        });
        if (claim.count === 1) return artifact;
      } catch (buildError) {
        console.error("[questionnaire auto-download] internal_gdt_build_failed", {
          sessionId: session.id,
          message: buildError instanceof Error ? buildError.message : "UnknownError",
        });
      }
    }
  }

  const session = await prisma.patientQuestionnaireSession.findFirst({
    where: {
      AND: [
        ...baseEligibility.AND,
        { session_kind: { not: "internal_documentation" } },
        { auto_pdf_download_claimed_at: null },
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
      auto_pdf_download_claimed_at: true,
      gdt_download_claimed_at: true,
      practice_form: { select: { title: true } },
    },
  });
  if (!session) return null;

  let pdf: Awaited<ReturnType<typeof buildQuestionnairePdfBytes>>;
  try {
    pdf = await buildQuestionnairePdfBytes(
      session,
      resolveQuestionnairePdfOptions(session),
    );
  } catch (buildError) {
    console.error("[questionnaire auto-download] pdf_build_failed", {
      sessionId: session.id,
      message: buildError instanceof Error ? buildError.message : "UnknownError",
    });
    throw new AutoDownloadArtifactBuildError(
      "PDF konnte nicht erstellt werden.",
      { cause: buildError },
    );
  }

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
    data: { auto_pdf_download_claimed_at: new Date() },
  });
  if (claim.count !== 1) return null;

  return {
    bytes: pdf.bytes,
    filename: pdf.filename,
    mimeType: "application/pdf",
  };
}
