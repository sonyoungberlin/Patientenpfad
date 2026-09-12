import { buildStructuredAppXml } from "./appTextXml";
import { buildQuestionnaireGdtBytes } from "./gdtRenderer";
import { buildQuestionnaireInboxDetail } from "./inboxDetail";
import { resolveInternalDocumentationExportMetadata } from "./internalDocumentationExport";
import {
  buildQuestionnairePdfBytes,
  type PdfRenderOptions,
} from "./pdfRenderer";
import { resolveQuestionnairePdfOptions } from "./questionnaireExportService";

export type InternalDocumentationArtifactSession = {
  patient_reference: string | null;
  submitted_at: Date;
  submitted_by: string;
  selected_block_ids: unknown;
  deduplicated_questions: unknown;
  answers: unknown;
  frozen_blocks: unknown;
  source: string;
  session_kind: "internal_documentation";
  internal_workflow_id: string | null;
  practice_form: { title: string } | null;
};

export type InternalDocumentationArtifact = {
  bytes: Uint8Array;
  filename: string;
  mimeType: string;
};

export async function buildInternalDocumentationPdfArtifact(
  session: InternalDocumentationArtifactSession,
  options: PdfRenderOptions = resolveQuestionnairePdfOptions(session),
): Promise<InternalDocumentationArtifact> {
  const metadata = resolveInternalDocumentationExportMetadata(session);
  const pdf = await buildQuestionnairePdfBytes(session, {
    ...options,
    filename: `${metadata.baseFilename}.pdf`,
  });

  return {
    bytes: pdf.bytes,
    filename: pdf.filename,
    mimeType: "application/pdf",
  };
}

export function buildInternalDocumentationXmlArtifact(
  session: InternalDocumentationArtifactSession,
): InternalDocumentationArtifact {
  const metadata = resolveInternalDocumentationExportMetadata(session);
  const detail = buildQuestionnaireInboxDetail(session);
  if (!detail.semanticDocument) {
    throw new Error("Strukturiertes Dokument für internen XML-Export fehlt.");
  }
  const content = buildStructuredAppXml(detail.semanticDocument);

  return {
    bytes: new TextEncoder().encode(content),
    filename: `${metadata.baseFilename}.xml`,
    mimeType: "application/xml; charset=utf-8",
  };
}

export function buildInternalDocumentationGdtArtifact(
  session: InternalDocumentationArtifactSession,
): InternalDocumentationArtifact | null {
  const metadata = resolveInternalDocumentationExportMetadata(session);
  if (!metadata.patientReference) return null;

  return {
    bytes: buildQuestionnaireGdtBytes({
      patientReference: metadata.patientReference,
      documentationText: metadata.gdtText,
    }),
    filename: `${metadata.baseFilename}.gdt`,
    mimeType: "application/octet-stream",
  };
}
