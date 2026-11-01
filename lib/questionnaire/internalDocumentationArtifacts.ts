import { buildStructuredAppXml } from "./appTextXml";
import { buildQuestionnaireGdtBytes } from "./gdtRenderer";
import { buildQuestionnaireInboxDetail } from "./inboxDetail";
import { resolveInternalDocumentationExportMetadata } from "./internalDocumentationExport";
import {
  buildQuestionnairePdfBytes,
  type PdfRenderOptions,
} from "./pdfRenderer";
import { resolveQuestionnairePdfOptions } from "./questionnaireExportService";
import { getInternalDocumentOutputVariantIds } from "./frozenBlocks";

export type InternalDocumentationLetterVariantId = "facharztbrief" | "patientenbrief";

export class InternalDocumentationVariantError extends Error {
  constructor(message: string, readonly status: 400 | 409) {
    super(message);
    this.name = "InternalDocumentationVariantError";
  }
}

function resolveLetterVariant(
  session: InternalDocumentationArtifactSession,
  outputVariantId: string,
) {
  if (outputVariantId !== "facharztbrief" && outputVariantId !== "patientenbrief") {
    throw new InternalDocumentationVariantError("Unbekannte Dokumentausgabe.", 400);
  }
  if (!getInternalDocumentOutputVariantIds(session.frozen_blocks).includes(outputVariantId)) {
    throw new InternalDocumentationVariantError("Diese Ausgabe ist in der Sitzung nicht aktiviert.", 409);
  }
  const output = buildQuestionnaireInboxDetail(session).outputVariants?.find(({ id }) => id === outputVariantId);
  if (!output || !output.noteText.trim()) {
    throw new InternalDocumentationVariantError("Für diese Ausgabe ist kein Text vorhanden.", 409);
  }
  return output;
}

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
  outputVariantId?: string,
): Promise<InternalDocumentationArtifact> {
  const metadata = resolveInternalDocumentationExportMetadata(session);
  const output = outputVariantId ? resolveLetterVariant(session, outputVariantId) : undefined;
  const variantSuffix = outputVariantId ? `-${outputVariantId}` : "";
  const pdf = await buildQuestionnairePdfBytes(session, {
    ...options,
    filename: `${metadata.baseFilename}${variantSuffix}.pdf`,
    ...(output ? { semanticDocument: output.semanticDocument } : {}),
  });

  return {
    bytes: pdf.bytes,
    filename: pdf.filename,
    mimeType: "application/pdf",
  };
}

export function buildInternalDocumentationXmlArtifact(
  session: InternalDocumentationArtifactSession,
  outputVariantId?: string,
): InternalDocumentationArtifact {
  const metadata = resolveInternalDocumentationExportMetadata(session);
  const output = outputVariantId ? resolveLetterVariant(session, outputVariantId) : undefined;
  const variantSuffix = outputVariantId ? `-${outputVariantId}` : "";
  if (output) {
    return {
      bytes: new TextEncoder().encode(buildStructuredAppXml(output.semanticDocument)),
      filename: `${metadata.baseFilename}${variantSuffix}.xml`,
      mimeType: "application/xml; charset=utf-8",
    };
  }
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
  outputVariantId?: string,
): InternalDocumentationArtifact | null {
  const metadata = resolveInternalDocumentationExportMetadata(session);
  if (!metadata.patientReference) return null;
  const output = outputVariantId ? resolveLetterVariant(session, outputVariantId) : undefined;
  const variantSuffix = outputVariantId ? `-${outputVariantId}` : "";

  return {
    bytes: buildQuestionnaireGdtBytes({
      patientReference: metadata.patientReference,
      documentationText: output?.noteText ?? metadata.gdtText,
    }),
    filename: `${metadata.baseFilename}${variantSuffix}.gdt`,
    mimeType: "application/octet-stream",
  };
}
