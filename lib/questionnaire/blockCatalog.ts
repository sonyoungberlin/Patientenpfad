/**
 * Statischer Fragebogen-Block-Katalog.
 *
 * Vollständig isoliert von CaseSession, InquirySession und Checkpoint-Logik.
 *
 * Jede QuestionDefinition hat eine stabile, globale questionId, die
 * über alle Blöcke hinweg eindeutig ist. Die Deduplizierung in
 * buildQuestionnaireQuestions() nutzt diese IDs, sodass z.B.
 * CONTACT_PHONE auch dann nur einmal erscheint, wenn mehrere Blöcke
 * gemeinsam gewählt werden.
 *
 * Blöcke (in Anzeigereihenfolge):
 *   10 KONTAKT          – Telefon, E-Mail, Doctolib
 *   20 ADRESSE          – Postanschrift
 *   30 KURZANAMNESE     – Allgemeine Gesundheitsangaben
 *   40 ARBEITSUNFAEHIGKEIT – AU-Bescheinigung
 *   50 REZEPT           – Medikamentenrezept
 *   60 UEBERWEISUNG     – Facharztüberweisung
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QuestionType =
  | "text"
  | "date"
  | "yes_no"
  | "select"
  | "multi_select"
  | "textarea";

export type QuestionDefinition = {
  /** Globale, stabile ID – darf nie geändert werden. */
  id: string;
  /** Patientenformulierung. */
  text: string;
  /** Interaktionstyp des Feldes. */
  type: QuestionType;
  /** Ob das Feld Pflichtfeld ist. */
  required: boolean;
  /** Auswahloptionen für select / multi_select. */
  options?: string[];
  /** Erläuternder Hilfetext unterhalb des Feldes. */
  helperText?: string;
};

export type QuestionnaireBlock = {
  /** Stabile Block-ID, z.B. "KONTAKT". */
  id: string;
  /** Anzeigename für die UI. */
  label: string;
  /** Kurze Beschreibung des Blocks (optional). */
  description?: string;
  /** Hinweistext, der unterhalb des Blocks angezeigt wird (optional, keine Logik). */
  hint?: string;
  /** Reihenfolge beim Kombinieren (niedrig = zuerst). */
  displayOrder: number;
  /** Geordnete Fragen-IDs aus QUESTION_CATALOG. */
  questionIds: string[];
};

// ---------------------------------------------------------------------------
// Question Catalog
// ---------------------------------------------------------------------------

/**
 * Globaler Fragenkatalog mit stabilen IDs.
 *
 * CONTACT_*      – Kontaktdaten
 * ADDRESS_*      – Adressdaten
 * ANAMNESE_*     – Kurzanamnese
 * AU_*           – Arbeitsunfähigkeitsbescheinigung
 * PRESCRIPTION_* – Rezept
 * REF_*          – Überweisung
 */
export const QUESTION_CATALOG: Record<string, QuestionDefinition> = {
  // --- Kontakt ---
  CONTACT_PHONE: {
    id: "CONTACT_PHONE",
    text: "Wie lautet Ihre Telefonnummer (Mobil oder Festnetz)?",
    type: "text",
    required: true,
  },
  CONTACT_EMAIL: {
    id: "CONTACT_EMAIL",
    text: "Wie lautet Ihre E-Mail-Adresse?",
    type: "text",
    required: false,
  },
  CONTACT_DOCTOLIB: {
    id: "CONTACT_DOCTOLIB",
    text: "Haben Sie einen Doctolib-Account?",
    type: "yes_no",
    required: false,
  },

  // --- Adresse ---
  ADDRESS_POSTAL: {
    id: "ADDRESS_POSTAL",
    text: "Wie lautet Ihre Postanschrift (Straße, PLZ, Ort)?",
    type: "textarea",
    required: true,
    helperText: "Wird für Abrechnung und Dokumente benötigt.",
  },

  // --- Kurzanamnese ---
  ANAMNESE_GP: {
    id: "ANAMNESE_GP",
    text: "Haben Sie einen Hausarzt?",
    type: "yes_no",
    required: false,
  },
  ANAMNESE_HEIGHT: {
    id: "ANAMNESE_HEIGHT",
    text: "Wie groß sind Sie? (z.B. 175 cm)",
    type: "text",
    required: false,
  },
  ANAMNESE_WEIGHT: {
    id: "ANAMNESE_WEIGHT",
    text: "Wie viel wiegen Sie? (z.B. 70 kg)",
    type: "text",
    required: false,
  },
  ANAMNESE_CHRONIC: {
    id: "ANAMNESE_CHRONIC",
    text: "Leiden Sie an chronischen Erkrankungen? Falls ja, welchen?",
    type: "textarea",
    required: false,
  },
  ANAMNESE_HEREDITARY: {
    id: "ANAMNESE_HEREDITARY",
    text: "Gibt es bekannte Erbkrankheiten in Ihrer Familie?",
    type: "textarea",
    required: false,
  },
  ANAMNESE_ALLERGIES: {
    id: "ANAMNESE_ALLERGIES",
    text: "Haben Sie Allergien oder Unverträglichkeiten?",
    type: "textarea",
    required: false,
  },
  ANAMNESE_MEDICATIONS: {
    id: "ANAMNESE_MEDICATIONS",
    text: "Nehmen Sie regelmäßig Medikamente? Falls ja, welche?",
    type: "textarea",
    required: false,
  },
  ANAMNESE_SMOKING: {
    id: "ANAMNESE_SMOKING",
    text: "Rauchen Sie?",
    type: "yes_no",
    required: false,
  },
  ANAMNESE_ALCOHOL: {
    id: "ANAMNESE_ALCOHOL",
    text: "Trinken Sie Alkohol?",
    type: "yes_no",
    required: false,
  },
  ANAMNESE_SUBSTANCES: {
    id: "ANAMNESE_SUBSTANCES",
    text: "Nehmen Sie sonstige Substanzen?",
    type: "textarea",
    required: false,
  },
  ANAMNESE_VACCINATION: {
    id: "ANAMNESE_VACCINATION",
    text: "Ist Ihr Impfstatus bekannt?",
    type: "yes_no",
    required: false,
  },

  // --- Arbeitsunfähigkeit ---
  AU_SYMPTOMS: {
    id: "AU_SYMPTOMS",
    text: "Welche Beschwerden haben Sie?",
    type: "multi_select",
    required: true,
    options: [
      "Husten",
      "Schnupfen",
      "Fieber",
      "Kopfschmerzen",
      "Rückenschmerzen",
      "Bauchschmerzen",
      "Schwindel",
      "Übelkeit",
      "Erschöpfung",
      "Sonstiges",
    ],
  },
  AU_START_DATE: {
    id: "AU_START_DATE",
    text: "Seit wann bestehen die Beschwerden?",
    type: "date",
    required: true,
  },
  AU_END_DATE: {
    id: "AU_END_DATE",
    text: "Bis wann sind Sie voraussichtlich arbeitsunfähig? (optional)",
    type: "date",
    required: false,
  },

  // --- Rezept ---
  PRESCRIPTION_TYPE: {
    id: "PRESCRIPTION_TYPE",
    text: "Welche Art von Rezept benötigen Sie?",
    type: "select",
    required: true,
    options: ["Dauermedikation", "Einzelmedikament"],
  },
  PRESCRIPTION_MEDICATION: {
    id: "PRESCRIPTION_MEDICATION",
    text: "Für welches Medikament benötigen Sie ein Rezept? (Name und Dosierung, falls bekannt)",
    type: "textarea",
    required: false,
  },
  PRESCRIPTION_REPEAT_KNOWN: {
    id: "PRESCRIPTION_REPEAT_KNOWN",
    text: "Ich benötige meine bekannten Dauermedikamente.",
    type: "yes_no",
    required: false,
  },

  // --- Überweisung ---
  REF_SPECIALTY: {
    id: "REF_SPECIALTY",
    text: "Zu welcher Fachrichtung benötigen Sie eine Überweisung?",
    type: "text",
    required: true,
  },
  REF_DOCTOR_NAME: {
    id: "REF_DOCTOR_NAME",
    text: "Name des Arztes (falls bereits bekannt)",
    type: "text",
    required: false,
  },
  REF_ADDRESS: {
    id: "REF_ADDRESS",
    text: "Adresse der Praxis (falls bereits bekannt)",
    type: "text",
    required: false,
  },
  REF_APPOINTMENT_EXISTS: {
    id: "REF_APPOINTMENT_EXISTS",
    text: "Haben Sie bereits einen Termin beim Facharzt vereinbart?",
    type: "yes_no",
    required: false,
  },
  REF_APPOINTMENT_DATE: {
    id: "REF_APPOINTMENT_DATE",
    text: "Datum des Termins",
    type: "date",
    required: false,
  },
  REF_REASON: {
    id: "REF_REASON",
    text: "Grund der Überweisung",
    type: "textarea",
    required: false,
  },
};

// ---------------------------------------------------------------------------
// Block Catalog
// ---------------------------------------------------------------------------

/**
 * Statischer Block-Katalog.
 *
 * Telefonnummer, E-Mail und Adresse erscheinen nur in KONTAKT bzw. ADRESSE
 * und werden durch buildQuestionnaireQuestions() dedupliziert.
 * Die Blöcke KONTAKT (10) und ADRESSE (20) haben den niedrigsten displayOrder,
 * damit Kontaktfelder immer zuerst erscheinen.
 */
export const BLOCK_CATALOG: Record<string, QuestionnaireBlock> = {
  KONTAKT: {
    id: "KONTAKT",
    label: "Kontaktdaten",
    displayOrder: 10,
    questionIds: ["CONTACT_PHONE", "CONTACT_EMAIL", "CONTACT_DOCTOLIB"],
  },
  ADRESSE: {
    id: "ADRESSE",
    label: "Adresse",
    displayOrder: 20,
    questionIds: ["ADDRESS_POSTAL"],
  },
  KURZANAMNESE: {
    id: "KURZANAMNESE",
    label: "Kurzanamnese",
    displayOrder: 30,
    questionIds: [
      "ANAMNESE_GP",
      "ANAMNESE_HEIGHT",
      "ANAMNESE_WEIGHT",
      "ANAMNESE_CHRONIC",
      "ANAMNESE_HEREDITARY",
      "ANAMNESE_ALLERGIES",
      "ANAMNESE_MEDICATIONS",
      "ANAMNESE_SMOKING",
      "ANAMNESE_ALCOHOL",
      "ANAMNESE_SUBSTANCES",
      "ANAMNESE_VACCINATION",
    ],
  },
  ARBEITSUNFAEHIGKEIT: {
    id: "ARBEITSUNFAEHIGKEIT",
    label: "Arbeitsunfähigkeitsbescheinigung",
    displayOrder: 40,
    hint: "Bitte beachten Sie: Die maximale rückwirkende Ausstellungsdauer ist gesetzlich begrenzt.",
    questionIds: ["AU_SYMPTOMS", "AU_START_DATE", "AU_END_DATE"],
  },
  REZEPT: {
    id: "REZEPT",
    label: "Rezept",
    displayOrder: 50,
    questionIds: [
      "PRESCRIPTION_TYPE",
      "PRESCRIPTION_MEDICATION",
      "PRESCRIPTION_REPEAT_KNOWN",
    ],
  },
  UEBERWEISUNG: {
    id: "UEBERWEISUNG",
    label: "Überweisung",
    displayOrder: 60,
    questionIds: [
      "REF_SPECIALTY",
      "REF_DOCTOR_NAME",
      "REF_ADDRESS",
      "REF_APPOINTMENT_EXISTS",
      "REF_APPOINTMENT_DATE",
      "REF_REASON",
    ],
  },
};

/** Sortierte Block-IDs nach displayOrder. */
export const BLOCK_IDS_SORTED: string[] = Object.values(BLOCK_CATALOG)
  .sort((a, b) => a.displayOrder - b.displayOrder)
  .map((b) => b.id);
