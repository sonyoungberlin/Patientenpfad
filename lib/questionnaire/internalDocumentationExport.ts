import { getInternalDocumentTitle } from "./frozenBlocks";
import { normalizeXComfortPatientReference } from "./patientReference";
import {
  formatDateYyyyMmDd,
  sanitizeFilenamePart,
} from "./questionnaireExportFilename";

export type InternalDocumentationExportSession = {
  patient_reference: unknown;
  submitted_at: Date;
  frozen_blocks: unknown;
};

export type InternalDocumentationExportMetadata = {
  patientReference: string | null;
  documentTitle: string;
  baseFilename: string;
  gdtText: string;
};

export function resolveInternalDocumentationExportMetadata(
  session: InternalDocumentationExportSession,
): InternalDocumentationExportMetadata {
  const patientReference = normalizeXComfortPatientReference(
    session.patient_reference,
  );
  const documentTitle = getInternalDocumentTitle(session.frozen_blocks);
  const datePart = formatDateYyyyMmDd(session.submitted_at);
  const titlePart = sanitizeFilenamePart(documentTitle);
  const baseFilename = patientReference
    ? `${datePart}_${sanitizeFilenamePart(patientReference)}_${titlePart}`
    : `${datePart}_${titlePart}`;

  return {
    patientReference,
    documentTitle,
    baseFilename,
    gdtText: `System: ${documentTitle} dokumentiert`,
  };
}
