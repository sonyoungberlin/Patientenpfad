import type { QuestionnaireBlock, QuestionDefinition, VaccinationItemDefinition } from "./blockCatalog";

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

export const VACCINATION_ITEMS: readonly VaccinationItemDefinition[] = [
  {
    id: "tdap_ipv_group",
    label: "Tetanus / Diphtherie / Pertussis / Poliomyelitis",
    categoryId: "combination",
    documentationMode: "component_group",
    componentFields: [
      { key: "tetanus_doses", label: "Tetanus", options: ["Grunddosis 1", "Grunddosis 2", "Grunddosis 3", "Auffrischung", "unklar"] },
      { key: "diphtheria_doses", label: "Diphtherie", options: ["Grunddosis 1", "Grunddosis 2", "Grunddosis 3", "Auffrischung", "unklar"] },
      { key: "pertussis_doses", label: "Pertussis", options: ["Impfung dokumentiert", "Weitere Impfung dokumentiert", "unklar"] },
      { key: "polio_doses", label: "Poliomyelitis", options: ["Grunddosis 1", "Grunddosis 2", "Grunddosis 3", "Auffrischung", "unklar"] },
    ],
  },
  { id: "influenza", label: "Influenza", categoryId: "seasonal", documentationMode: "season" },
  { id: "covid19", label: "COVID-19", categoryId: "seasonal", documentationMode: "season" },
  { id: "pneumococcal", label: "Pneumokokken", categoryId: "indication", documentationMode: "dose_count", doseOptions: ["1 Dosis dokumentiert", "2 oder mehr Dosen dokumentiert", "unklar"] },
  { id: "zoster", label: "Herpes zoster", categoryId: "indication", documentationMode: "dose_stages", doseOptions: ["Dosis 1", "Dosis 2", "unklar"] },
  { id: "rsv", label: "RSV", categoryId: "indication", documentationMode: "single", doseOptions: ["Impfung dokumentiert", "unklar"] },
  { id: "mmr", label: "Masern / MMR", categoryId: "catch_up", documentationMode: "dose_stages", doseOptions: ["Dosis 1", "Dosis 2", "unklar"] },
  { id: "hpv", label: "HPV", categoryId: "catch_up", documentationMode: "dose_stages", doseOptions: ["Dosis 1", "Dosis 2", "Dosis 3", "unklar"] },
  { id: "varicella", label: "Varizellen", categoryId: "catch_up", documentationMode: "dose_stages", doseOptions: ["Dosis 1", "Dosis 2", "unklar"] },
  { id: "hepatitis_a", label: "Hepatitis A", categoryId: "frequent", documentationMode: "dose_count", doseOptions: ["1 Dosis dokumentiert", "2 oder mehr Dosen dokumentiert", "unklar"] },
  { id: "hepatitis_b", label: "Hepatitis B", categoryId: "frequent", documentationMode: "dose_count", doseOptions: ["1 Dosis dokumentiert", "2 Dosen dokumentiert", "3 oder mehr Dosen dokumentiert", "unklar"] },
  { id: "fsme", label: "FSME", categoryId: "frequent", documentationMode: "dose_stages", doseOptions: ["Grunddosis 1", "Grunddosis 2", "Grunddosis 3", "Auffrischung", "unklar"] },
  { id: "meningococcal", label: "Meningokokken", categoryId: "frequent", documentationMode: "subtype", subtypeOptions: ["ACWY", "B", "C", "Serogruppe unklar"] },
  { id: "other", label: "Weitere Impfung", categoryId: "other", documentationMode: "free_text" },
];

const VACCINATION_QUESTION: QuestionDefinition = {
  id: "VACCINATION_REVIEW_ITEMS",
  text: "Impfungen",
  type: "repeatable_group",
  required: false,
  maxEntries: VACCINATION_ITEMS.length,
  addEntryLabel: "Weitere Impfung",
  presentation: "vaccination_matrix",
  vaccinationSchemaVersion: 2,
  vaccinationCategories: [
    { id: "combination", label: "Kombinationsschutz" },
    { id: "seasonal", label: "Saisonal / wiederkehrend" },
    { id: "indication", label: "Alters- / indikationsbezogen" },
    { id: "catch_up", label: "Grundschutz / Nachholen" },
    { id: "frequent", label: "Weitere häufig relevante Impfungen" },
    { id: "other", label: "Weitere Impfung" },
  ],
  vaccinationItems: VACCINATION_ITEMS.map((item) => ({
    ...item,
    ...(item.doseOptions ? { doseOptions: [...item.doseOptions] } : {}),
    ...(item.subtypeOptions ? { subtypeOptions: [...item.subtypeOptions] } : {}),
    ...(item.componentFields ? {
      componentFields: item.componentFields.map((field) => ({ ...field, options: [...field.options] })),
    } : {}),
  })),
  groupSchema: [
    { key: "vaccination_id", label: "Impfung", type: "text", required: true },
    { key: "custom_label", label: "Bezeichnung", type: "text", required: false, maxLength: 200, conditionalOn: "vaccination_id", conditionalValue: "other" },
    { key: "documented_status", label: "Dokumentierter Impfstatus", type: "select", required: true, options: [...VACCINATION_STATUS_OPTIONS] },
    { key: "documented_doses", label: "Dokumentierte Dosen", type: "multi_select", required: false, options: [...VACCINATION_DOSE_OPTIONS], conditionalOn: "documented_status", conditionalValue: "Teilweise vorhanden" },
    { key: "documented_subtypes", label: "Dokumentierte Serogruppen", type: "multi_select", required: false, options: ["ACWY", "B", "C", "Serogruppe unklar"], conditionalOn: "documented_status", conditionalValue: "Teilweise vorhanden" },
    { key: "documented_season", label: "Dokumentierte Saison", type: "text", required: false, maxLength: 200, conditionalOn: "documented_status", conditionalValue: "Teilweise vorhanden" },
    { key: "documented_date", label: "Dokumentiertes Impfdatum", type: "date", required: false, conditionalOn: "documented_status", conditionalValue: "Teilweise vorhanden" },
    { key: "tetanus_doses", label: "Tetanus", type: "multi_select", required: false, options: ["Grunddosis 1", "Grunddosis 2", "Grunddosis 3", "Auffrischung", "unklar"], conditionalOn: "documented_status", conditionalValue: "Teilweise vorhanden" },
    { key: "diphtheria_doses", label: "Diphtherie", type: "multi_select", required: false, options: ["Grunddosis 1", "Grunddosis 2", "Grunddosis 3", "Auffrischung", "unklar"], conditionalOn: "documented_status", conditionalValue: "Teilweise vorhanden" },
    { key: "pertussis_doses", label: "Pertussis", type: "multi_select", required: false, options: ["Impfung dokumentiert", "Weitere Impfung dokumentiert", "unklar"], conditionalOn: "documented_status", conditionalValue: "Teilweise vorhanden" },
    { key: "polio_doses", label: "Poliomyelitis", type: "multi_select", required: false, options: ["Grunddosis 1", "Grunddosis 2", "Grunddosis 3", "Auffrischung", "unklar"], conditionalOn: "documented_status", conditionalValue: "Teilweise vorhanden" },
    { key: "further_action", label: "Weiteres Vorgehen", type: "select", required: false, options: [...VACCINATION_ACTION_OPTIONS], conditionalOn: "documented_status", conditionalValues: ["Teilweise vorhanden", "Nicht vorhanden", "Unklar"] },
    { key: "note", label: "Bemerkung", type: "textarea", required: false, maxLength: 200, conditionalOn: "further_action", conditionalValues: ["Impfung ärztlich empfohlen", "Durchführung geplant / vereinbart"] },
    { key: "reference_date", label: "Bezugsdatum", type: "date", required: false, conditionalOn: "further_action", conditionalValues: ["Impfung ärztlich empfohlen", "Durchführung geplant / vereinbart"] },
    { key: "interval_value", label: "Nächste Dosis nach", type: "text", required: false, maxLength: 200, conditionalOn: "further_action", conditionalValues: ["Impfung ärztlich empfohlen", "Durchführung geplant / vereinbart"] },
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