import type { QuestionnaireBlock } from "./blockCatalog";
import { resolveQuestionnaireDocumentLabels } from "./questionnaireDocumentLabel";

export type QuestionnaireExportFilenameInput = {
  patient_reference: string | null;
  submitted_at: Date | null;
  selected_block_ids: unknown;
  answers: unknown;
  source: string;
  practice_form: { title: string } | null;
};

export type QuestionnaireExportFilenameOptions = {
  blockCatalog: Record<string, QuestionnaireBlock>;
  filenameLabel?: string;
  extension: "pdf" | "xml" | "gdt";
};

function formatDateYyyyMmDd(date: Date): string {
  const formatter = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return `${year}${month}${day}`;
}

export function sanitizeFilenamePart(value: string): string {
  return value
    .replaceAll("Ä", "Ae")
    .replaceAll("Ö", "Oe")
    .replaceAll("Ü", "Ue")
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function prioritizeContactBlock(
  questionnairePart: string | null,
  selectedBlockIds: string[],
  blockCatalog: Record<string, QuestionnaireBlock>,
): string | null {
  if (!selectedBlockIds.includes("KONTAKT")) return questionnairePart;

  const contactPart = sanitizeFilenamePart(blockCatalog.KONTAKT?.label ?? "");
  if (!contactPart || questionnairePart === contactPart) return questionnairePart ?? contactPart;
  return questionnairePart ? `${contactPart}_${questionnairePart}` : contactPart;
}

export function buildQuestionnaireExportFilename(
  session: QuestionnaireExportFilenameInput,
  options: QuestionnaireExportFilenameOptions,
): string {
  const selectedBlockIds = Array.isArray(session.selected_block_ids)
    ? session.selected_block_ids.filter((id): id is string => typeof id === "string")
    : [];
  const answers = session.answers !== null && typeof session.answers === "object" && !Array.isArray(session.answers)
    ? session.answers as Record<string, string>
    : {};
  const datePart = formatDateYyyyMmDd(session.submitted_at ?? new Date());
  const documentLabels = resolveQuestionnaireDocumentLabels({
    selectedBlockIds,
    blockCatalog: options.blockCatalog,
    source: session.source,
    practiceFormTitle: session.practice_form?.title,
    ...(options.filenameLabel ? { filenameLabel: options.filenameLabel } : {}),
  });
  const sanitizedDocumentLabel = documentLabels.filenameLabel
    ? sanitizeFilenamePart(documentLabels.filenameLabel)
    : null;
  const questionnairePartWithoutContact = sanitizedDocumentLabel || null;
  const questionnairePart = prioritizeContactBlock(
    questionnairePartWithoutContact,
    selectedBlockIds,
    options.blockCatalog,
  );

  if (session.patient_reference) {
    const referencePart = sanitizeFilenamePart(session.patient_reference);
    return questionnairePart
      ? `${datePart}_${referencePart}_${questionnairePart}.${options.extension}`
      : `${datePart}_${referencePart}.${options.extension}`;
  }

  const lastName = sanitizeFilenamePart(answers.IDENTITY_LAST_NAME ?? "");
  const firstName = sanitizeFilenamePart(answers.IDENTITY_FIRST_NAME ?? "");
  if (lastName && firstName) {
    const namePart = `${lastName}_${firstName}`;
    return questionnairePart
      ? `${datePart}_${namePart}_${questionnairePart}.${options.extension}`
      : `${datePart}_${namePart}.${options.extension}`;
  }

  return questionnairePart
    ? `${datePart}_Fragebogen_${questionnairePart}.${options.extension}`
    : `${datePart}_Fragebogen.${options.extension}`;
}