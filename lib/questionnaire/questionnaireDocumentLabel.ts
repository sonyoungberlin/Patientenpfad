import {
  VOLLSTAENDIGE_ANAMNESE_PRESET,
  type QuestionnaireBlock,
} from "./blockCatalog";

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
const VOLLSTAENDIGE_ANAMNESE_BLOCK_IDS = new Set(VOLLSTAENDIGE_ANAMNESE_PRESET);
const VOLLSTAENDIGE_ANAMNESE_LABEL = "Vollständige Anamnese";

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
  const fachlicheBlockIds = selectedBlockIds.filter((id) => !BASIS_BLOCK_IDS.has(id));
  const gdtLabels = fachlicheBlockIds
    .map((id) => getBlockExportLabel(id, input.blockCatalog))
    .filter((label): label is string => label !== null);
  const isVollstaendigeAnamnese = VOLLSTAENDIGE_ANAMNESE_PRESET.every(
    (id) => selectedBlockIds.includes(id),
  );
  let vollstaendigeAnamneseAdded = false;
  const filenameLabels = fachlicheBlockIds
    .map((id) => {
      if (isVollstaendigeAnamnese && VOLLSTAENDIGE_ANAMNESE_BLOCK_IDS.has(id)) {
        if (vollstaendigeAnamneseAdded) return null;
        vollstaendigeAnamneseAdded = true;
        return VOLLSTAENDIGE_ANAMNESE_LABEL;
      }
      return getBlockExportLabel(id, input.blockCatalog);
    })
    .filter((label): label is string => label !== null);

  if (explicitLabel) {
    return {
      filenameLabel: explicitLabel,
      gdtLabel: gdtLabels.length > 1 ? "Patientenfragebogen" : explicitLabel,
    };
  }

  if (filenameLabels.length > 0) {
    return {
      filenameLabel: filenameLabels.join("_"),
      gdtLabel: gdtLabels.length === 1
        ? gdtLabels[0]
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