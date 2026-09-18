import { BLOCK_CATALOG } from "./blockCatalog";
import {
  isDocumentedContentSnapshot,
  isNewBlockBasedInternalSession,
} from "./documentedContent";
import { parseFrozenBlocks } from "./frozenBlocks";
import { resolveInternalWorkflow } from "./internalWorkflowRegistry";
import type { PdfRenderOptions, PdfSessionInput } from "./pdfRenderer";
import { resolveQuestionnaireDocumentLabels } from "./questionnaireDocumentLabel";
import { buildQuestionnaireExportFilename } from "./questionnaireExportFilename";
import { normalizeXComfortPatientReference } from "./patientReference";
import { formatDigitalRequestSnapshot } from "./digitalRequestSnapshot";

export type QuestionnaireExportSession = PdfSessionInput & {
  session_kind: string;
  internal_workflow_id: unknown;
};

export function resolveQuestionnairePdfOptions(
  session: QuestionnaireExportSession,
): PdfRenderOptions {
  const frozenBlocks = parseFrozenBlocks(session.frozen_blocks);
  const isNewBlockBased = isNewBlockBasedInternalSession({
    sessionKind: session.session_kind,
    internalWorkflowId: session.internal_workflow_id,
    frozenBlocks,
  });
  const workflow = session.session_kind === "internal_documentation" && !isNewBlockBased
    ? resolveInternalWorkflow(session.internal_workflow_id)
    : null;
  if (session.session_kind === "internal_documentation" && !isNewBlockBased && !workflow) {
    throw new Error("Unbekannter interner Workflow.");
  }

  return {
    title: isNewBlockBased ? "Interne Dokumentation" : workflow?.title ?? "Fragebogen – Patientenangaben",
    referenceLabel: "Patientenreferenz",
    blockCatalog: workflow?.blockCatalog ?? BLOCK_CATALOG,
    ...(!isDocumentedContentSnapshot(frozenBlocks) && workflow
      ? { omitUnanswered: workflow.legacyOutputPolicy.omitUnansweredInPdf }
      : {}),
    ...(!isNewBlockBased && !isDocumentedContentSnapshot(frozenBlocks) && workflow?.legacyOutputPolicy.omitEmptyBlocksInPdf
      ? { omitEmptyBlocksInPdf: true }
      : {}),
    ...(isNewBlockBased
      ? { filenameLabel: "Interne Dokumentation" }
      : workflow ? { filenameLabel: workflow.filenameLabel } : {}),
  };
}

export function resolveQuestionnaireGdtExport(session: QuestionnaireExportSession): {
  patientReference: string;
  filename: string;
  documentationText: string;
} | null {
  if (session.session_kind !== "patient_communication") return null;
  const patientReference = normalizeXComfortPatientReference(session.patient_reference);
  if (!patientReference) return null;

  const pdfOptions = resolveQuestionnairePdfOptions(session);
  const filename = buildQuestionnaireExportFilename(session, {
    blockCatalog: pdfOptions.blockCatalog,
    ...(pdfOptions.filenameLabel ? { filenameLabel: pdfOptions.filenameLabel } : {}),
    extension: "gdt",
  });
  const selectedBlockIds = Array.isArray(session.selected_block_ids)
    ? session.selected_block_ids.filter((id): id is string => typeof id === "string")
    : [];
  const documentLabels = resolveQuestionnaireDocumentLabels({
    selectedBlockIds,
    blockCatalog: pdfOptions.blockCatalog,
    source: session.source,
    practiceFormTitle: session.practice_form?.title,
    ...(pdfOptions.filenameLabel ? { filenameLabel: pdfOptions.filenameLabel } : {}),
  });
  const digitalRequestSnapshot = formatDigitalRequestSnapshot(session.digital_request_snapshot);
  const systemText = `System: ${documentLabels.gdtLabel} eingegangen`;
  return {
    patientReference,
    filename,
    documentationText: digitalRequestSnapshot
      ? [
          `${digitalRequestSnapshot.heading}: ${digitalRequestSnapshot.fields
            .map(({ label, value }) => `${label}: ${value}`)
            .join("; ")}`,
          systemText,
        ].join("\n")
      : systemText,
  };
}