import type { QuestionnaireBlock } from "./blockCatalog";

const EXPORT_LABELS: Readonly<Record<string, string>> = {
  ARBEITSUNFAEHIGKEIT: "AU-Anfrage",
  REZEPT: "Rezeptanfrage",
  HEILMITTELVERORDNUNG: "Anfrage HMV",
  UEBERWEISUNG: "Überweisungsanfrage",
  HOSPITAL_ADMISSION: "Anfrage Krankenhauseinweisung",
  TRANSPORT: "Anfrage Krankenbeförderung",
};

const BASIS_BLOCK_IDS = new Set([
  "IDENTITAET",
  "KONTAKT",
  "KONTAKTPERSON",
  "ADRESSE",
  "VERSICHERUNG",
]);

export type QuestionnaireDocumentLabels = {
  filenameLabel: string | null;
  gdtLabel: string;
};

type ResolveQuestionnaireDocumentLabelsInput = {
  selectedBlockIds: string[];
  blockCatalog: Record<string, QuestionnaireBlock>;
  source: string;
  practiceFormTitle?: string | null;
  filenameLabel?: string;
};

function getBlockExportLabel(
  blockId: string,
  blockCatalog: Record<string, QuestionnaireBlock>,
): string | null {
  return EXPORT_LABELS[blockId] ?? blockCatalog[blockId]?.label ?? null;
}

export function resolveQuestionnaireDocumentLabels(
  input: ResolveQuestionnaireDocumentLabelsInput,
): QuestionnaireDocumentLabels {
  const explicitLabel = input.filenameLabel
    ?? (input.source === "website" ? input.practiceFormTitle?.trim() || null : null);
  const selectedBlockIds = input.selectedBlockIds.filter((id) => id in input.blockCatalog);
  const fachlicheLabels = selectedBlockIds
    .filter((id) => !BASIS_BLOCK_IDS.has(id))
    .map((id) => getBlockExportLabel(id, input.blockCatalog))
    .filter((label): label is string => label !== null);

  if (explicitLabel) {
    return {
      filenameLabel: explicitLabel,
      gdtLabel: fachlicheLabels.length > 1 ? "Patientenfragebogen" : explicitLabel,
    };
  }

  if (fachlicheLabels.length > 0) {
    return {
      filenameLabel: fachlicheLabels.join("_"),
      gdtLabel: fachlicheLabels.length === 1
        ? fachlicheLabels[0]
        : "Patientenfragebogen",
    };
  }

  const firstBlockLabel = selectedBlockIds.length > 0
    ? getBlockExportLabel(selectedBlockIds[0], input.blockCatalog)
    : null;
  return {
    filenameLabel: firstBlockLabel,
    gdtLabel: firstBlockLabel ?? "Patientenfragebogen",
  };
}