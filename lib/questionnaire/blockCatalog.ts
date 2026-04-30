/**
 * Statischer Fragebogen-Block-Katalog.
 *
 * Vollständig isoliert von CaseSession, InquirySession und Checkpoint-Logik.
 *
 * Jede QuestionDefinition hat eine stabile, globale questionId, die
 * über alle Blöcke hinweg eindeutig ist. Die Deduplizierung in
 * buildQuestionnaireQuestions() nutzt diese IDs, sodass z.B.
 * CONTACT_PHONE auch dann nur einmal erscheint, wenn AU + REZEPT
 * gemeinsam gewählt werden.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QuestionType = "text" | "date" | "yes_no" | "select" | "textarea";

export type QuestionDefinition = {
  /** Globale, stabile ID – darf nie geändert werden. */
  id: string;
  /** Patientenformulierung. */
  text: string;
  /** Interaktionstyp des Feldes. */
  type: QuestionType;
  /** Ob das Feld Pflichtfeld ist. */
  required: boolean;
};

export type QuestionnaireBlock = {
  /** Stabile Block-ID, z.B. "KONTAKT". */
  id: string;
  /** Anzeigename für die UI. */
  label: string;
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
 * CONTACT_*  – Kontaktdaten (können in mehreren Blöcken vorkommen)
 * ADDRESS_*  – Adressdaten
 * DOB        – Geburtsdatum
 * AU_*       – Fragen spezifisch für Arbeitsunfähigkeitsbescheinigung
 * PRESCRIPTION_* – Fragen spezifisch für Rezept
 * REF_*      – Fragen spezifisch für Überweisung
 * MISSING_*  – Fragen für fehlende Informationen
 */
export const QUESTION_CATALOG: Record<string, QuestionDefinition> = {
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
  ADDRESS_POSTAL: {
    id: "ADDRESS_POSTAL",
    text: "Wie lautet Ihre aktuelle Postanschrift (Straße, PLZ, Ort)?",
    type: "textarea",
    required: false,
  },
  DOB: {
    id: "DOB",
    text: "Wie lautet Ihr Geburtsdatum?",
    type: "date",
    required: true,
  },
  AU_SYMPTOMS: {
    id: "AU_SYMPTOMS",
    text: "Welche Beschwerden haben Sie? (Bitte kurz beschreiben)",
    type: "textarea",
    required: true,
  },
  AU_START_DATE: {
    id: "AU_START_DATE",
    text: "Seit wann bestehen die Beschwerden?",
    type: "date",
    required: true,
  },
  AU_END_DATE: {
    id: "AU_END_DATE",
    text: "Bis wann sind Sie voraussichtlich arbeitsunfähig?",
    type: "date",
    required: false,
  },
  PRESCRIPTION_MEDICATION: {
    id: "PRESCRIPTION_MEDICATION",
    text: "Für welches Medikament benötigen Sie ein Rezept? (Bitte Name und Dosierung angeben)",
    type: "textarea",
    required: true,
  },
  PRESCRIPTION_IS_REPEAT: {
    id: "PRESCRIPTION_IS_REPEAT",
    text: "Handelt es sich um eine Folge-/Dauerverordnung?",
    type: "yes_no",
    required: true,
  },
  REF_SPECIALTY: {
    id: "REF_SPECIALTY",
    text: "Zu welcher Fachrichtung benötigen Sie eine Überweisung?",
    type: "text",
    required: true,
  },
  REF_APPOINTMENT_EXISTS: {
    id: "REF_APPOINTMENT_EXISTS",
    text: "Haben Sie bereits einen Termin beim Facharzt vereinbart?",
    type: "yes_no",
    required: true,
  },
  REF_APPOINTMENT_DATE: {
    id: "REF_APPOINTMENT_DATE",
    text: "Für welches Datum benötigen Sie die Überweisung?",
    type: "date",
    required: false,
  },
  MISSING_INFO_FREETEXT: {
    id: "MISSING_INFO_FREETEXT",
    text: "Welche Information möchten Sie uns mitteilen oder nachreichen?",
    type: "textarea",
    required: true,
  },
};

// ---------------------------------------------------------------------------
// Block Catalog
// ---------------------------------------------------------------------------

/**
 * Statischer Block-Katalog.
 *
 * Die Reihenfolge innerhalb eines Blocks entspricht der Anzeigereihenfolge
 * im Patientenformular. Die Reihenfolge beim Kombinieren mehrerer Blöcke
 * steuert displayOrder.
 */
export const BLOCK_CATALOG: Record<string, QuestionnaireBlock> = {
  KONTAKT: {
    id: "KONTAKT",
    label: "Kontaktdaten",
    displayOrder: 10,
    questionIds: ["CONTACT_PHONE", "CONTACT_EMAIL", "ADDRESS_POSTAL"],
  },
  KURZANAMNESE: {
    id: "KURZANAMNESE",
    label: "Kurzanamnese",
    displayOrder: 20,
    questionIds: ["CONTACT_PHONE", "CONTACT_EMAIL", "DOB", "ADDRESS_POSTAL"],
  },
  AU: {
    id: "AU",
    label: "Arbeitsunfähigkeitsbescheinigung (AU)",
    displayOrder: 30,
    questionIds: [
      "CONTACT_PHONE",
      "CONTACT_EMAIL",
      "DOB",
      "AU_SYMPTOMS",
      "AU_START_DATE",
      "AU_END_DATE",
    ],
  },
  REZEPT: {
    id: "REZEPT",
    label: "Rezept",
    displayOrder: 40,
    questionIds: [
      "CONTACT_PHONE",
      "CONTACT_EMAIL",
      "DOB",
      "PRESCRIPTION_MEDICATION",
      "PRESCRIPTION_IS_REPEAT",
    ],
  },
  UEBERWEISUNG: {
    id: "UEBERWEISUNG",
    label: "Überweisung",
    displayOrder: 50,
    questionIds: [
      "CONTACT_PHONE",
      "CONTACT_EMAIL",
      "DOB",
      "REF_SPECIALTY",
      "REF_APPOINTMENT_EXISTS",
      "REF_APPOINTMENT_DATE",
    ],
  },
  FEHLENDE_INFO: {
    id: "FEHLENDE_INFO",
    label: "Fehlende Informationen",
    displayOrder: 60,
    questionIds: ["CONTACT_PHONE", "MISSING_INFO_FREETEXT"],
  },
};

/** Sortierte Block-IDs nach displayOrder. */
export const BLOCK_IDS_SORTED: string[] = Object.values(BLOCK_CATALOG)
  .sort((a, b) => a.displayOrder - b.displayOrder)
  .map((b) => b.id);
