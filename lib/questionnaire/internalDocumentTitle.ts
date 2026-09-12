export const INTERNAL_DOCUMENT_TITLE_OPTIONS = [
  { value: "arztbrief", label: "Arztbrief" },
  { value: "stellungnahme", label: "Stellungnahme" },
  { value: "bescheinigung", label: "Bescheinigung" },
  { value: "attest", label: "Attest" },
  { value: "bericht", label: "Bericht" },
  { value: "rueckmeldung", label: "Rückmeldung" },
  { value: "patienteninformation", label: "Patienteninformation" },
  { value: "andere", label: "Andere" },
] as const;

export type InternalDocumentTitleOption =
  (typeof INTERNAL_DOCUMENT_TITLE_OPTIONS)[number]["value"];

export type InternalDocumentTitleMetadata = {
  documentTitleOption: InternalDocumentTitleOption;
  documentTitle: string;
};

export const INTERNAL_DOCUMENT_TITLE_MAX_LENGTH = 120;
export const INTERNAL_DOCUMENT_TITLE_FALLBACK = "Interne Dokumentation";

const LABEL_BY_OPTION = new Map<InternalDocumentTitleOption, string>(
  INTERNAL_DOCUMENT_TITLE_OPTIONS.map((option) => [option.value, option.label]),
);

export class InternalDocumentTitleValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InternalDocumentTitleValidationError";
  }
}

export function resolveInternalDocumentTitle(
  option: unknown,
  customTitle: unknown,
): InternalDocumentTitleMetadata {
  if (typeof option !== "string" || !LABEL_BY_OPTION.has(option as InternalDocumentTitleOption)) {
    throw new InternalDocumentTitleValidationError("Bitte einen gültigen Dokumenttitel auswählen.");
  }

  const documentTitleOption = option as InternalDocumentTitleOption;
  const normalizedCustomTitle = typeof customTitle === "string" ? customTitle.trim() : "";

  if (documentTitleOption !== "andere") {
    if (normalizedCustomTitle) {
      throw new InternalDocumentTitleValidationError(
        "Ein individueller Dokumenttitel ist nur bei „Andere“ zulässig.",
      );
    }
    return {
      documentTitleOption,
      documentTitle: LABEL_BY_OPTION.get(documentTitleOption)!,
    };
  }

  if (!normalizedCustomTitle) {
    throw new InternalDocumentTitleValidationError(
      "Bitte einen individuellen Dokumenttitel eingeben.",
    );
  }
  if (normalizedCustomTitle.length > INTERNAL_DOCUMENT_TITLE_MAX_LENGTH) {
    throw new InternalDocumentTitleValidationError(
      `Der Dokumenttitel darf höchstens ${INTERNAL_DOCUMENT_TITLE_MAX_LENGTH} Zeichen lang sein.`,
    );
  }
  if (/\r|\n/.test(normalizedCustomTitle) || /[\u0000-\u001F\u007F]/.test(normalizedCustomTitle)) {
    throw new InternalDocumentTitleValidationError(
      "Der Dokumenttitel darf keine Zeilenumbrüche oder Steuerzeichen enthalten.",
    );
  }

  return { documentTitleOption, documentTitle: normalizedCustomTitle };
}