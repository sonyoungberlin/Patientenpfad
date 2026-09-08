import type { QuestionnaireBlock, QuestionDefinition } from "./blockCatalog";

const INTERVAL_OPTIONS = ["1x im Quartal", "halbjährlich", "jährlich", "individuell"];

const QUESTIONS: Record<string, QuestionDefinition> = {
  CARE_PLAN_HA_DATE: { id: "CARE_PLAN_HA_DATE", text: "Datum des Gesprächs", type: "date", required: false },
  CARE_PLAN_HA_REASON: { id: "CARE_PLAN_HA_REASON", text: "Anlass / Diagnose", type: "textarea", required: false, maxLength: 200 },
  CARE_PLAN_HA_MEDICAL_INTERVAL: { id: "CARE_PLAN_HA_MEDICAL_INTERVAL", text: "Ärztliche Kontrolle", type: "select", required: false, options: INTERVAL_OPTIONS },
  CARE_PLAN_HA_LAB_INTERVAL: { id: "CARE_PLAN_HA_LAB_INTERVAL", text: "Laborkontrolle", type: "select", required: false, options: INTERVAL_OPTIONS },
  CARE_PLAN_HA_NOTES: { id: "CARE_PLAN_HA_NOTES", text: "Notizen / Vereinbarungen", type: "textarea", required: false, maxLength: 200 },
  CARE_PLAN_SPECIALISTS: {
    id: "CARE_PLAN_SPECIALISTS", text: "Fachärztliche Betreuung", type: "repeatable_group", required: false,
    maxEntries: 3, addEntryLabel: "+ Facharzt hinzufügen",
    groupSchema: [
      { key: "specialty", label: "Fachrichtung", type: "text", required: false, maxLength: 200 },
      { key: "practice", label: "Praxis / Arzt", type: "text", required: false, maxLength: 200 },
      { key: "interval", label: "Kontrollintervall", type: "select", required: false, options: INTERVAL_OPTIONS },
    ],
  },
  CARE_PLAN_SUPPLY: { id: "CARE_PLAN_SUPPLY", text: "Versorgung und Organisation", type: "multi_select", required: false, options: [
    "Rezepte digital möglich", "Überweisungen digital möglich", "Facharztberichte werden regelmäßig nachgereicht oder angefordert.",
    "Medikamentenplan wird regelmäßig aktualisiert.", "Digitale Praxiswege werden bevorzugt genutzt.",
  ] },
  CARE_PLAN_SUPPLY_NOTES: { id: "CARE_PLAN_SUPPLY_NOTES", text: "Notizen / Offene Punkte", type: "textarea", required: false, maxLength: 200 },
  CARE_PLAN_SUPPORT: { id: "CARE_PLAN_SUPPORT", text: "Unterstützende Personen", type: "multi_select", required: false, options: [
    "Angehörige / Bezugsperson informiert", "Sozialberatung empfohlen", "Selbsthilfegruppe empfohlen",
  ] },
  CARE_PLAN_SUPPORT_NOTES: { id: "CARE_PLAN_SUPPORT_NOTES", text: "Notizen", type: "textarea", required: false, maxLength: 200 },
  CARE_PLAN_AGREEMENT: { id: "CARE_PLAN_AGREEMENT", text: "Gemeinsame Vereinbarung", type: "multi_select", required: false, options: [
    "Warnsymptome erklärt", "Notfallplan besprochen", "Eigenverantwortung und Mitwirkung besprochen",
  ] },
  CARE_PLAN_AGREEMENT_TEXT: { id: "CARE_PLAN_AGREEMENT_TEXT", text: "Individuelle Vereinbarung", type: "textarea", required: false, maxLength: 200 },
  CARE_PLAN_AGREEMENT_DATE: { id: "CARE_PLAN_AGREEMENT_DATE", text: "Datum der Vereinbarung", type: "date", required: false },
};

export const INTERNAL_DOCUMENTATION_BLOCK_CATALOG: Record<string, QuestionnaireBlock> = {
  CARE_PLAN_HA: { id: "CARE_PLAN_HA", label: "Hausärztliche Betreuung", displayOrder: 10, questionIds: ["CARE_PLAN_HA_DATE", "CARE_PLAN_HA_REASON", "CARE_PLAN_HA_MEDICAL_INTERVAL", "CARE_PLAN_HA_LAB_INTERVAL", "CARE_PLAN_HA_NOTES"] },
  CARE_PLAN_SPECIALIST: { id: "CARE_PLAN_SPECIALIST", label: "Fachärztliche Betreuung", displayOrder: 20, questionIds: ["CARE_PLAN_SPECIALISTS"] },
  CARE_PLAN_SUPPLY_BLOCK: { id: "CARE_PLAN_SUPPLY_BLOCK", label: "Versorgung und Organisation", displayOrder: 30, questionIds: ["CARE_PLAN_SUPPLY", "CARE_PLAN_SUPPLY_NOTES"] },
  CARE_PLAN_SUPPORT_BLOCK: { id: "CARE_PLAN_SUPPORT_BLOCK", label: "Unterstützende Personen", displayOrder: 40, questionIds: ["CARE_PLAN_SUPPORT", "CARE_PLAN_SUPPORT_NOTES"] },
  CARE_PLAN_AGREEMENT_BLOCK: { id: "CARE_PLAN_AGREEMENT_BLOCK", label: "Gemeinsame Vereinbarung", displayOrder: 50, questionIds: ["CARE_PLAN_AGREEMENT", "CARE_PLAN_AGREEMENT_TEXT", "CARE_PLAN_AGREEMENT_DATE"] },
};

export const INTERNAL_DOCUMENTATION_QUESTION_CATALOG = QUESTIONS;
