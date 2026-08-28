/**
 * Statischer Block-Katalog für Office-/Bewerbungsfragebögen.
 *
 * Vollständig getrennt vom patientenseitigen BLOCK_CATALOG.
 * Verwendet dieselben Typen (QuestionnaireBlock, QuestionDefinition),
 * aber komplett eigene IDs und Inhalte.
 *
 * Blöcke (Startmenge v1):
 *   10 BEWERBER_KONTAKT          – Vorname, Nachname, E-Mail, Telefon
 *   20 BEWERBER_AUSBILDUNG       – Abschluss, Institution, Jahr, Zusatzqualifikationen
 *   30 BEWERBER_BERUFSERFAHRUNG  – Jahre, Bereiche, Beschreibung
 *   40 BEWERBER_SPRACHKENNTNISSE – Sprache + Niveau (repeatable_group)
 *   50 BEWERBER_FUEHRERSCHEIN    – Führerschein ja/nein + Klassen (conditional)
 *   60 BEWERBER_ARBEITSZEITEN    – Modell, Einschränkungen, Frühestbeginn
 */

import type { QuestionnaireBlock, QuestionDefinition } from "./blockCatalog";

// ---------------------------------------------------------------------------
// Question Catalog
// ---------------------------------------------------------------------------

export const OFFICE_QUESTION_CATALOG: Record<string, QuestionDefinition> = {
  // BEWERBER_KONTAKT
  OFF_VORNAME: {
    id: "OFF_VORNAME",
    text: "Vorname",
    type: "text",
    required: true,
  },
  OFF_NACHNAME: {
    id: "OFF_NACHNAME",
    text: "Nachname",
    type: "text",
    required: true,
  },
  OFF_EMAIL: {
    id: "OFF_EMAIL",
    text: "E-Mail-Adresse",
    type: "text",
    required: false,
    helperText: "Für Rückfragen",
  },
  OFF_TELEFON: {
    id: "OFF_TELEFON",
    text: "Telefonnummer",
    type: "text",
    required: false,
  },

  // BEWERBER_AUSBILDUNG
  OFF_ABSCHLUSS: {
    id: "OFF_ABSCHLUSS",
    text: "Berufsabschluss",
    type: "select",
    required: true,
    options: [
      "MFA (Medizinische Fachangestellte)",
      "ZFA (Zahnmedizinische Fachangestellte)",
      "Arzthelfer/in",
      "Pflegefachkraft",
      "Krankenpfleger/in",
      "Altenpfleger/in",
      "Rettungssanitäter/in",
      "Notfallsanitäter/in",
      "Sonstiges",
    ],
  },
  OFF_INSTITUTION: {
    id: "OFF_INSTITUTION",
    text: "Ausbildungsstätte",
    type: "text",
    required: false,
  },
  OFF_ABSCHLUSSJAHR: {
    id: "OFF_ABSCHLUSSJAHR",
    text: "Jahr des Abschlusses",
    type: "number",
    required: false,
    step: 1,
  },
  OFF_ZUSATZQUALIFIKATIONEN: {
    id: "OFF_ZUSATZQUALIFIKATIONEN",
    text: "Weiterbildungen / Zusatzqualifikationen",
    type: "textarea",
    required: false,
    helperText: "z. B. Wundmanagement, EKG, Notfallkurs",
  },

  // BEWERBER_BERUFSERFAHRUNG
  OFF_BERUFSJAHRE: {
    id: "OFF_BERUFSJAHRE",
    text: "Berufserfahrung (Jahre)",
    type: "number",
    required: false,
    step: 1,
    unit: "Jahre",
  },
  OFF_TAETIGKEITSBEREICHE: {
    id: "OFF_TAETIGKEITSBEREICHE",
    text: "Bisherige Tätigkeitsbereiche",
    type: "multi_select",
    required: false,
    options: [
      "Hausarztpraxis / Allgemeinmedizin",
      "Facharztpraxis",
      "Krankenhaus / Klinik",
      "Pflegeeinrichtung",
      "Ambulanter Pflegedienst",
      "Labor",
      "Sonstiges",
    ],
  },
  OFF_BERUF_BESCHREIBUNG: {
    id: "OFF_BERUF_BESCHREIBUNG",
    text: "Kurze Beschreibung der bisherigen Tätigkeit",
    type: "textarea",
    required: false,
  },

  // BEWERBER_SPRACHKENNTNISSE
  OFF_SPRACHKENNTNISSE: {
    id: "OFF_SPRACHKENNTNISSE",
    text: "Sprachkenntnisse",
    type: "repeatable_group",
    required: false,
    addEntryLabel: "+ Weitere Sprache hinzufügen",
    groupSchema: [
      {
        key: "sprache",
        label: "Sprache",
        type: "text",
        required: true,
      },
      {
        key: "niveau",
        label: "Niveau",
        type: "select",
        required: true,
        options: ["Muttersprache", "Verhandlungssicher (C1/C2)", "Gut (B1/B2)", "Grundkenntnisse (A1/A2)"],
      },
    ],
  },

  // BEWERBER_FUEHRERSCHEIN
  OFF_FUEHRERSCHEIN: {
    id: "OFF_FUEHRERSCHEIN",
    text: "Führerschein vorhanden",
    type: "yes_no",
    required: false,
  },
  OFF_FUEHRERSCHEIN_KLASSEN: {
    id: "OFF_FUEHRERSCHEIN_KLASSEN",
    text: "Führerscheinklassen",
    type: "multi_select",
    required: false,
    options: ["Klasse B", "Klasse BE", "Klasse C", "Klasse CE", "Klasse D", "Sonstige"],
  },

  // BEWERBER_ARBEITSZEITEN
  OFF_ARBEITSZEITMODELL: {
    id: "OFF_ARBEITSZEITMODELL",
    text: "Gewünschtes Arbeitszeitmodell",
    type: "multi_select",
    required: false,
    options: ["Vollzeit", "Teilzeit", "Geringfügige Beschäftigung", "Vertretung / Aushilfe"],
  },
  OFF_ZEITEINSCHRAENKUNGEN: {
    id: "OFF_ZEITEINSCHRAENKUNGEN",
    text: "Zeitliche Einschränkungen oder Wünsche",
    type: "textarea",
    required: false,
    helperText: "z. B. keine Abendschichten, kein Wochenende",
  },
  OFF_FRUEHESTBEGINN: {
    id: "OFF_FRUEHESTBEGINN",
    text: "Frühestmöglicher Arbeitsbeginn",
    type: "date",
    required: false,
  },
};

// ---------------------------------------------------------------------------
// Block Catalog
// ---------------------------------------------------------------------------

export const OFFICE_BLOCK_CATALOG: Record<string, QuestionnaireBlock> = {
  BEWERBER_KONTAKT: {
    id: "BEWERBER_KONTAKT",
    label: "Kontaktdaten",
    displayOrder: 10,
    questionIds: ["OFF_VORNAME", "OFF_NACHNAME", "OFF_EMAIL", "OFF_TELEFON"],
  },
  BEWERBER_AUSBILDUNG: {
    id: "BEWERBER_AUSBILDUNG",
    label: "Ausbildung / Qualifikation",
    displayOrder: 20,
    questionIds: [
      "OFF_ABSCHLUSS",
      "OFF_INSTITUTION",
      "OFF_ABSCHLUSSJAHR",
      "OFF_ZUSATZQUALIFIKATIONEN",
    ],
  },
  BEWERBER_BERUFSERFAHRUNG: {
    id: "BEWERBER_BERUFSERFAHRUNG",
    label: "Berufserfahrung",
    displayOrder: 30,
    questionIds: [
      "OFF_BERUFSJAHRE",
      "OFF_TAETIGKEITSBEREICHE",
      "OFF_BERUF_BESCHREIBUNG",
    ],
  },
  BEWERBER_SPRACHKENNTNISSE: {
    id: "BEWERBER_SPRACHKENNTNISSE",
    label: "Sprachkenntnisse",
    displayOrder: 40,
    questionIds: ["OFF_SPRACHKENNTNISSE"],
  },
  BEWERBER_FUEHRERSCHEIN: {
    id: "BEWERBER_FUEHRERSCHEIN",
    label: "Führerschein",
    displayOrder: 50,
    questionIds: ["OFF_FUEHRERSCHEIN", "OFF_FUEHRERSCHEIN_KLASSEN"],
    conditionalRules: [
      {
        action: "showQuestion" as const,
        targetId: "OFF_FUEHRERSCHEIN_KLASSEN",
        condition: {
          target: { kind: "question" as const, questionId: "OFF_FUEHRERSCHEIN" },
          operator: "equals" as const,
          value: "Ja",
        },
      },
    ],
  },
  BEWERBER_ARBEITSZEITEN: {
    id: "BEWERBER_ARBEITSZEITEN",
    label: "Arbeitszeiten",
    displayOrder: 60,
    questionIds: [
      "OFF_ARBEITSZEITMODELL",
      "OFF_ZEITEINSCHRAENKUNGEN",
      "OFF_FRUEHESTBEGINN",
    ],
  },
};

export const OFFICE_BLOCK_IDS_SORTED: string[] = Object.values(OFFICE_BLOCK_CATALOG)
  .sort((a, b) => a.displayOrder - b.displayOrder)
  .map((b) => b.id);
