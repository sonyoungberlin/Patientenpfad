import type { QuestionnaireBlock, QuestionDefinition } from "./blockCatalog";

export const VACCINATION_STATUS_OPTIONS = [
  "Vollständig vorhanden",
  "Teilweise vorhanden",
  "Nicht vorhanden",
  "Unklar",
] as const;

export const VACCINATION_ACTION_OPTIONS = [
  "Impfung ärztlich empfohlen",
  "Durchführung geplant / vereinbart",
  "Derzeit kein weiteres Vorgehen",
] as const;

export const VACCINATION_DOSE_OPTIONS = [
  "1. Dosis",
  "2. Dosis",
  "3. Dosis",
  "weitere",
  "unklar",
] as const;

export const VACCINATION_ITEMS = [
  { id: "tdap", label: "Tetanus / Diphtherie / Pertussis" },
  { id: "polio", label: "Poliomyelitis" },
  { id: "mmr", label: "Masern / MMR" },
  { id: "influenza", label: "Influenza" },
  { id: "covid19", label: "COVID-19" },
  { id: "pneumococcal", label: "Pneumokokken" },
  { id: "zoster", label: "Herpes zoster" },
  { id: "rsv", label: "RSV" },
  { id: "hpv", label: "HPV", optional: true },
  { id: "hepatitis_a", label: "Hepatitis A", optional: true },
  { id: "hepatitis_b", label: "Hepatitis B", optional: true },
  { id: "fsme", label: "FSME", optional: true },
  { id: "varicella", label: "Varizellen", optional: true },
  { id: "meningococcal", label: "Meningokokken", optional: true },
  { id: "other", label: "Weitere Impfung", optional: true },
] as const;

const VACCINATION_QUESTION: QuestionDefinition = {
  id: "VACCINATION_REVIEW_ITEMS",
  text: "Impfungen",
  type: "repeatable_group",
  required: false,
  maxEntries: VACCINATION_ITEMS.length,
  addEntryLabel: "Weitere Impfung",
  presentation: "vaccination_matrix",
  vaccinationItems: VACCINATION_ITEMS.map((item) => ({
    ...item,
    doseOptions: [...VACCINATION_DOSE_OPTIONS],
  })),
  groupSchema: [
    { key: "vaccination_id", label: "Impfung", type: "text", required: true },
    { key: "custom_label", label: "Bezeichnung", type: "text", required: false, conditionalOn: "vaccination_id", conditionalValue: "other" },
    { key: "documented_status", label: "Dokumentierter Impfstatus", type: "select", required: true, options: [...VACCINATION_STATUS_OPTIONS] },
    { key: "documented_doses", label: "Dokumentierte Dosen", type: "multi_select", required: false, options: [...VACCINATION_DOSE_OPTIONS], conditionalOn: "documented_status", conditionalValue: "Teilweise vorhanden" },
    { key: "further_action", label: "Weiteres Vorgehen", type: "select", required: false, options: [...VACCINATION_ACTION_OPTIONS], conditionalOn: "documented_status", conditionalValues: ["Teilweise vorhanden", "Nicht vorhanden", "Unklar"] },
    { key: "note", label: "Bemerkung", type: "textarea", required: false, conditionalOn: "further_action", conditionalValues: ["Impfung ärztlich empfohlen", "Durchführung geplant / vereinbart"] },
    { key: "reference_date", label: "Bezugsdatum", type: "date", required: false, conditionalOn: "further_action", conditionalValues: ["Impfung ärztlich empfohlen", "Durchführung geplant / vereinbart"] },
    { key: "interval_value", label: "Nächste Dosis nach", type: "text", required: false, conditionalOn: "further_action", conditionalValues: ["Impfung ärztlich empfohlen", "Durchführung geplant / vereinbart"] },
    { key: "interval_unit", label: "Einheit", type: "select", required: false, options: ["Tage", "Wochen", "Monate"], conditionalOn: "further_action", conditionalValues: ["Impfung ärztlich empfohlen", "Durchführung geplant / vereinbart"] },
    { key: "next_date", label: "Nächste Impfung ab", type: "date", required: false, conditionalOn: "further_action", conditionalValues: ["Impfung ärztlich empfohlen", "Durchführung geplant / vereinbart"] },
  ],
};

export const VACCINATION_REVIEW_QUESTION_CATALOG: Record<string, QuestionDefinition> = {
  [VACCINATION_QUESTION.id]: VACCINATION_QUESTION,
};

export const VACCINATION_REVIEW_BLOCK_CATALOG: Record<string, QuestionnaireBlock> = {
  VACCINATION_REVIEW: {
    id: "VACCINATION_REVIEW",
    label: "Impfpassprüfung und Beratung",
    displayOrder: 10,
    questionIds: [VACCINATION_QUESTION.id],
  },
};