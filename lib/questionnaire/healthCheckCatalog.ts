import type { QuestionnaireBlock, QuestionDefinition } from "./blockCatalog";

const CLINICAL_STATUS_OPTIONS = ["unauffällig", "auffällig"];
const LAB_STATUS_OPTIONS = ["unauffällig", "auffällig", "ausstehend"];
const FOLLOW_UP_OPTIONS = ["nein", "ja"];
const NEXT_STEP_OPTIONS = [
  "Verlaufskontrolle in unserer Praxis",
  "Weitere Untersuchung in unserer Praxis geplant",
  "Weitere Abklärung beim zuständigen Hausarzt empfohlen",
  "Fachärztliche Abklärung empfohlen",
];

const QUESTIONS: Record<string, QuestionDefinition> = {
  HEALTH_CHECK_GENERAL_STATUS: { id: "HEALTH_CHECK_GENERAL_STATUS", text: "Allgemeinzustand", type: "yes_no", required: false, options: CLINICAL_STATUS_OPTIONS },
  HEALTH_CHECK_HEART_STATUS: { id: "HEALTH_CHECK_HEART_STATUS", text: "Herz", type: "yes_no", required: false, options: CLINICAL_STATUS_OPTIONS },
  HEALTH_CHECK_LUNG_STATUS: { id: "HEALTH_CHECK_LUNG_STATUS", text: "Lunge", type: "yes_no", required: false, options: CLINICAL_STATUS_OPTIONS },
  HEALTH_CHECK_ABDOMEN_STATUS: { id: "HEALTH_CHECK_ABDOMEN_STATUS", text: "Abdomen", type: "yes_no", required: false, options: CLINICAL_STATUS_OPTIONS },
  HEALTH_CHECK_VESSELS_PULSES_STATUS: { id: "HEALTH_CHECK_VESSELS_PULSES_STATUS", text: "Gefäße / Pulse", type: "yes_no", required: false, options: CLINICAL_STATUS_OPTIONS },
  HEALTH_CHECK_MUSCULOSKELETAL_STATUS: { id: "HEALTH_CHECK_MUSCULOSKELETAL_STATUS", text: "Bewegungsapparat", type: "yes_no", required: false, options: CLINICAL_STATUS_OPTIONS },
  HEALTH_CHECK_NEUROLOGICAL_STATUS: { id: "HEALTH_CHECK_NEUROLOGICAL_STATUS", text: "Neurologisch", type: "yes_no", required: false, options: CLINICAL_STATUS_OPTIONS },
  HEALTH_CHECK_SKIN_STATUS: { id: "HEALTH_CHECK_SKIN_STATUS", text: "Haut", type: "yes_no", required: false, options: CLINICAL_STATUS_OPTIONS },
  HEALTH_CHECK_PSYCH_STATUS: { id: "HEALTH_CHECK_PSYCH_STATUS", text: "Psychisch", type: "yes_no", required: false, options: CLINICAL_STATUS_OPTIONS },
  HEALTH_CHECK_CLINICAL_NOTE: { id: "HEALTH_CHECK_CLINICAL_NOTE", text: "Kurzer Hinweis", type: "textarea", required: false, maxLength: 120 },

  HEALTH_CHECK_BP_SYSTOLIC: { id: "HEALTH_CHECK_BP_SYSTOLIC", text: "RR systolisch", type: "number", required: false, unit: "mmHg", step: 1 },
  HEALTH_CHECK_BP_DIASTOLIC: { id: "HEALTH_CHECK_BP_DIASTOLIC", text: "RR diastolisch", type: "number", required: false, unit: "mmHg", step: 1 },
  HEALTH_CHECK_WEIGHT_KG: { id: "HEALTH_CHECK_WEIGHT_KG", text: "Gewicht", type: "number", required: false, unit: "kg", step: 0.1 },
  HEALTH_CHECK_HEIGHT_CM: { id: "HEALTH_CHECK_HEIGHT_CM", text: "Größe", type: "number", required: false, unit: "cm", step: 0.1 },

  HEALTH_CHECK_LIPID_PROFILE_STATUS: { id: "HEALTH_CHECK_LIPID_PROFILE_STATUS", text: "Lipidprofil", type: "select", required: false, options: LAB_STATUS_OPTIONS },
  HEALTH_CHECK_FASTING_GLUCOSE_STATUS: { id: "HEALTH_CHECK_FASTING_GLUCOSE_STATUS", text: "Nüchternplasmaglukose", type: "select", required: false, options: LAB_STATUS_OPTIONS },
  HEALTH_CHECK_LAB_NOTE: { id: "HEALTH_CHECK_LAB_NOTE", text: "Kurzer Hinweis", type: "textarea", required: false, maxLength: 120 },

  HEALTH_CHECK_URINE_STATUS: { id: "HEALTH_CHECK_URINE_STATUS", text: "Urinstatus", type: "select", required: false, options: LAB_STATUS_OPTIONS },
  HEALTH_CHECK_URINE_NOTE: { id: "HEALTH_CHECK_URINE_NOTE", text: "Kurzer Hinweis", type: "textarea", required: false, maxLength: 120 },

  HEALTH_CHECK_PREVENTION_TOPICS: {
    id: "HEALTH_CHECK_PREVENTION_TOPICS",
    text: "Besprochene Themen",
    type: "multi_select",
    required: false,
    options: ["Herz-Kreislauf", "Gewicht", "Ernährung", "Bewegung", "Nikotin", "Alkohol", "Psychische / psychosoziale Belastung", "Familiäre Risiken", "Vorsorge / Früherkennung", "Impfstatus", "Sonstiges"],
  },
  HEALTH_CHECK_OTHER_NOTE: { id: "HEALTH_CHECK_OTHER_NOTE", text: "Sonstiger Hinweis", type: "textarea", required: false, maxLength: 120 },

  HEALTH_CHECK_FOLLOW_UP_REQUIRED: { id: "HEALTH_CHECK_FOLLOW_UP_REQUIRED", text: "Weiteres Vorgehen erforderlich", type: "yes_no", required: true, options: FOLLOW_UP_OPTIONS },
  HEALTH_CHECK_NEXT_STEPS: { id: "HEALTH_CHECK_NEXT_STEPS", text: "Maßnahmen", type: "multi_select", required: false, options: NEXT_STEP_OPTIONS },
  HEALTH_CHECK_NEXT_STEPS_NOTE: { id: "HEALTH_CHECK_NEXT_STEPS_NOTE", text: "Kurzer Hinweis", type: "textarea", required: false, maxLength: 120 },
};

export const HEALTH_CHECK_BLOCK_CATALOG: Record<string, QuestionnaireBlock> = {
  HEALTH_CHECK_CLINICAL_STATUS: { id: "HEALTH_CHECK_CLINICAL_STATUS", label: "Klinischer Status", displayOrder: 10, questionIds: ["HEALTH_CHECK_GENERAL_STATUS", "HEALTH_CHECK_HEART_STATUS", "HEALTH_CHECK_LUNG_STATUS", "HEALTH_CHECK_ABDOMEN_STATUS", "HEALTH_CHECK_VESSELS_PULSES_STATUS", "HEALTH_CHECK_MUSCULOSKELETAL_STATUS", "HEALTH_CHECK_NEUROLOGICAL_STATUS", "HEALTH_CHECK_SKIN_STATUS", "HEALTH_CHECK_PSYCH_STATUS", "HEALTH_CHECK_CLINICAL_NOTE"] },
  HEALTH_CHECK_MEASUREMENTS: { id: "HEALTH_CHECK_MEASUREMENTS", label: "Messwerte", displayOrder: 20, questionIds: ["HEALTH_CHECK_BP_SYSTOLIC", "HEALTH_CHECK_BP_DIASTOLIC", "HEALTH_CHECK_WEIGHT_KG", "HEALTH_CHECK_HEIGHT_CM"] },
  HEALTH_CHECK_LAB: { id: "HEALTH_CHECK_LAB", label: "Labor", displayOrder: 30, questionIds: ["HEALTH_CHECK_LIPID_PROFILE_STATUS", "HEALTH_CHECK_FASTING_GLUCOSE_STATUS", "HEALTH_CHECK_LAB_NOTE"] },
  HEALTH_CHECK_URINE: { id: "HEALTH_CHECK_URINE", label: "Urinstatus", displayOrder: 40, questionIds: ["HEALTH_CHECK_URINE_STATUS", "HEALTH_CHECK_URINE_NOTE"] },
  HEALTH_CHECK_PREVENTION: { id: "HEALTH_CHECK_PREVENTION", label: "Prävention / Empfehlungen", displayOrder: 50, questionIds: ["HEALTH_CHECK_PREVENTION_TOPICS", "HEALTH_CHECK_OTHER_NOTE"] },
  HEALTH_CHECK_NEXT_STEPS: { id: "HEALTH_CHECK_NEXT_STEPS", label: "Weiteres Vorgehen", displayOrder: 60, questionIds: ["HEALTH_CHECK_FOLLOW_UP_REQUIRED", "HEALTH_CHECK_NEXT_STEPS", "HEALTH_CHECK_NEXT_STEPS_NOTE"] },
};

export const HEALTH_CHECK_QUESTION_CATALOG = QUESTIONS;
export const HEALTH_CHECK_NEXT_STEP_OPTIONS = NEXT_STEP_OPTIONS;