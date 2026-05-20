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
 *    5 IDENTITAET       – Vorname, Nachname, Geburtsdatum, Versicherungsart
 *    7 VERSICHERUNG     – Versicherungsdaten
 *    9 HEILMITTELVERORDNUNG – Heilmittelverordnung
 *   10 KONTAKT          – Telefon, E-Mail, Doctolib
 *   20 ADRESSE          – Postanschrift
 *   30 KURZANAMNESE     – Allgemeine Gesundheitsangaben
 *   40 ARBEITSUNFAEHIGKEIT – AU-Bescheinigung
 *   50 REZEPT           – Medikamentenrezept
 *   60 UEBERWEISUNG     – Facharztüberweisung
 *   70 HOSPITAL_ADMISSION – Krankenhauseinweisung
 *   80 TRANSPORT        – Krankenbeförderung / Krankentransport
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
  /** Patientenformulierung (Deutsch, kanonisch). */
  text: string;
  /** Interaktionstyp des Feldes. */
  type: QuestionType;
  /** Ob das Feld Pflichtfeld ist. */
  required: boolean;
  /** Auswahloptionen für select / multi_select (Deutsch, kanonisch). */
  options?: string[];
  /** Erläuternder Hilfetext unterhalb des Feldes (Deutsch, kanonisch). */
  helperText?: string;
  /** Optionale englische Übersetzung der Patientenformulierung. */
  text_en?: string;
  /**
   * Optionale englische Auswahloptionen.
   * MUSS exakt dieselbe Länge und Reihenfolge wie `options` haben, damit das
   * Reverse-Mapping in `sanitizeAnswers` (EN → DE) eindeutig bleibt.
   */
  options_en?: string[];
  /** Optionale englische Übersetzung des Hilfetextes. */
  helperText_en?: string;
};

export type QuestionnaireBlock = {
  /** Stabile Block-ID, z.B. "KONTAKT". */
  id: string;
  /** Anzeigename für die UI (Deutsch, kanonisch). */
  label: string;
  /** Kurze Beschreibung des Blocks (optional, Deutsch). */
  description?: string;
  /** Hinweistext, der unterhalb des Blocks angezeigt wird (optional, Deutsch). */
  hint?: string;
  /** Reihenfolge beim Kombinieren (niedrig = zuerst). */
  displayOrder: number;
  /** Geordnete Fragen-IDs aus QUESTION_CATALOG. */
  questionIds: string[];
  /** Optionale englische Übersetzung des Anzeigenamens. */
  label_en?: string;
  /** Optionale englische Übersetzung der Kurzbeschreibung. */
  description_en?: string;
  /** Optionale englische Übersetzung des Hinweistextes. */
  hint_en?: string;
};

// ---------------------------------------------------------------------------
// Question Catalog
// ---------------------------------------------------------------------------

/**
 * Globaler Fragenkatalog mit stabilen IDs.
 *
 * IDENTITY_*     – Identitätsdaten
 * CONTACT_*      – Kontaktdaten
 * ADDRESS_*      – Adressdaten
 * ANAMNESE_*     – Kurzanamnese
 * AU_*           – Arbeitsunfähigkeitsbescheinigung
 * PRESCRIPTION_* – Rezept
 * REF_*          – Überweisung
 * HOSP_*         – Krankenhauseinweisung
 * TRANSPORT_*    – Krankenbeförderung / Krankentransport
 */
export const QUESTION_CATALOG: Record<string, QuestionDefinition> = {
  // --- Identität ---
  IDENTITY_FIRST_NAME: {
    id: "IDENTITY_FIRST_NAME",
    text: "Vorname",
    text_en: "First name",
    type: "text",
    required: true,
  },
  IDENTITY_LAST_NAME: {
    id: "IDENTITY_LAST_NAME",
    text: "Nachname",
    text_en: "Last name",
    type: "text",
    required: true,
  },
  IDENTITY_BIRTHDATE: {
    id: "IDENTITY_BIRTHDATE",
    text: "Geburtsdatum",
    text_en: "Date of birth",
    type: "date",
    required: true,
  },
  // Historische, bereits persistierte ID für die Versicherungsart.
  // Wird für Rückwärtskompatibilität unverändert weiterverwendet und
  // im Block VERSICHERUNG referenziert.
  IDENTITY_INSURANCE_TYPE: {
    id: "IDENTITY_INSURANCE_TYPE",
    text: "Versicherungsart",
    text_en: "Type of insurance",
    type: "select",
    required: true,
    options: [
      "gesetzlich versichert",
      "privat versichert",
      "Selbstzahler / sonstiges",
    ],
    options_en: [
      "statutory insurance",
      "private insurance",
      "self-pay / other",
    ],
  },

  // --- Versicherung ---
  INSURANCE_PROVIDER_NAME: {
    id: "INSURANCE_PROVIDER_NAME",
    text: "Krankenkasse / Versicherung",
    text_en: "Health insurance provider",
    type: "text",
    required: false,
  },
  INSURANCE_MEMBER_NUMBER: {
    id: "INSURANCE_MEMBER_NUMBER",
    text: "Versicherungsnummer",
    text_en: "Insurance member number",
    type: "text",
    required: false,
  },
  INSURANCE_CARD_IDENTIFIER: {
    id: "INSURANCE_CARD_IDENTIFIER",
    text: "Krankenkassen-Kennung / IK-Nummer",
    text_en: "Health insurance fund identifier / provider institution number (IK number)",
    type: "text",
    required: false,
    helperText:
      "Meist 9-stellig, beginnt häufig mit 10. Nicht die Kartenkennung der Gesundheitskarte.",
    helperText_en:
      "Usually 9 digits and often starts with 10. Not the identifier of the health insurance card.",
  },
  INSURANCE_CARD_VALID_UNTIL: {
    id: "INSURANCE_CARD_VALID_UNTIL",
    text: "gültig bis / Ablaufdatum der Karte",
    text_en: "Valid until / card expiry date",
    type: "date",
    required: false,
  },

  // --- Kontakt ---
  CONTACT_PHONE: {
    id: "CONTACT_PHONE",
    text: "Wie lautet Ihre Telefonnummer (Mobil oder Festnetz)?",
    text_en: "What is your phone number (mobile or landline)?",
    type: "text",
    required: true,
  },
  CONTACT_EMAIL: {
    id: "CONTACT_EMAIL",
    text: "Wie lautet Ihre E-Mail-Adresse?",
    text_en: "What is your email address?",
    type: "text",
    required: false,
  },
  CONTACT_DOCTOLIB: {
    id: "CONTACT_DOCTOLIB",
    text: "Haben Sie einen Doctolib-Account?",
    text_en: "Do you have a Doctolib account?",
    type: "yes_no",
    required: false,
  },

  // --- Adresse ---
  ADDRESS_POSTAL: {
    id: "ADDRESS_POSTAL",
    text: "Wie lautet Ihre Postanschrift (Straße, PLZ, Ort)?",
    text_en: "What is your postal address (street, postcode, city)?",
    type: "textarea",
    required: true,
    helperText: "Wird für Abrechnung und Dokumente benötigt.",
    helperText_en: "Required for billing and documents.",
  },

  // --- Kurzanamnese ---
  ANAMNESE_GP: {
    id: "ANAMNESE_GP",
    text: "Haben Sie einen anderen Hausarzt?",
    text_en: "Do you have a different general practitioner?",
    type: "yes_no",
    required: false,
  },
  ANAMNESE_GP_NAME: {
    id: "ANAMNESE_GP_NAME",
    text: "Name Ihres Hausarztes",
    text_en: "Name of your general practitioner",
    type: "text",
    required: false,
    helperText: "Nur ausfüllen, wenn Sie einen anderen Hausarzt haben.",
    helperText_en: "Only fill in if you have a different general practitioner.",
  },
  ANAMNESE_HEIGHT: {
    id: "ANAMNESE_HEIGHT",
    text: "Wie groß sind Sie? (z.B. 175 cm)",
    text_en: "How tall are you? (e.g. 175 cm)",
    type: "text",
    required: true,
  },
  ANAMNESE_WEIGHT: {
    id: "ANAMNESE_WEIGHT",
    text: "Wie viel wiegen Sie? (z.B. 70 kg)",
    text_en: "How much do you weigh? (e.g. 70 kg)",
    type: "text",
    required: true,
  },
  ANAMNESE_CHRONIC: {
    id: "ANAMNESE_CHRONIC",
    text: "Leiden Sie an chronischen Erkrankungen? Falls ja, welchen?",
    text_en: "Do you suffer from any chronic illnesses? If yes, which ones?",
    type: "textarea",
    required: false,
  },
  ANAMNESE_HEREDITARY: {
    id: "ANAMNESE_HEREDITARY",
    text: "Gibt es bekannte Erbkrankheiten in Ihrer Familie?",
    text_en: "Are there any known hereditary diseases in your family?",
    type: "textarea",
    required: false,
  },
  ANAMNESE_ALLERGIES: {
    id: "ANAMNESE_ALLERGIES",
    text: "Haben Sie Allergien oder Unverträglichkeiten?",
    text_en: "Do you have any allergies or intolerances?",
    type: "textarea",
    required: false,
  },
  ANAMNESE_MEDICATIONS: {
    id: "ANAMNESE_MEDICATIONS",
    text: "Nehmen Sie regelmäßig Medikamente? Falls ja, welche?",
    text_en: "Do you take any medication regularly? If yes, which ones?",
    type: "textarea",
    required: false,
  },
  ANAMNESE_SMOKING: {
    id: "ANAMNESE_SMOKING",
    text: "Rauchen Sie?",
    text_en: "Do you smoke?",
    type: "yes_no",
    required: false,
  },
  ANAMNESE_ALCOHOL: {
    id: "ANAMNESE_ALCOHOL",
    text: "Trinken Sie Alkohol?",
    text_en: "Do you drink alcohol?",
    type: "yes_no",
    required: false,
  },
  ANAMNESE_SUBSTANCES: {
    id: "ANAMNESE_SUBSTANCES",
    text: "Nehmen Sie sonstige Substanzen?",
    text_en: "Do you take any other substances?",
    type: "textarea",
    required: false,
  },
  ANAMNESE_VACCINATION: {
    id: "ANAMNESE_VACCINATION",
    text: "Ist Ihr Impfstatus bekannt?",
    text_en: "Is your vaccination status known?",
    type: "yes_no",
    required: false,
  },
  ANAMNESE_OCCUPATION: {
    id: "ANAMNESE_OCCUPATION",
    text: "Was ist Ihr Beruf?",
    text_en: "What is your occupation?",
    type: "text",
    required: false,
  },

  // --- Arbeitsunfähigkeit ---
  AU_SYMPTOMS: {
    id: "AU_SYMPTOMS",
    text: "Welche Beschwerden haben Sie?",
    text_en: "What symptoms do you have?",
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
      "Stress / Überlastung",
      "Zustand nach Unfall",
      "Zustand nach Operation",
      "Sonstiges",
    ],
    options_en: [
      "Cough",
      "Runny nose",
      "Fever",
      "Headache",
      "Back pain",
      "Abdominal pain",
      "Dizziness",
      "Nausea",
      "Exhaustion",
      "Stress / overload",
      "Condition after accident",
      "Condition after surgery",
      "Other",
    ],
  },
  AU_SYMPTOMS_OTHER_TEXT: {
    id: "AU_SYMPTOMS_OTHER_TEXT",
    text: "Bitte beschreiben Sie Ihre Beschwerden:",
    text_en: "Please describe your symptoms:",
    type: "textarea",
    required: false,
    helperText:
      "Nur ausfüllen, wenn Sie oben „Sonstiges“ ausgewählt haben oder Ihre Beschwerden nicht in der Liste enthalten sind.",
    helperText_en:
      "Only fill in if you selected “Other” above or your symptoms are not listed.",
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
  AU_IS_FOLLOWUP: {
    id: "AU_IS_FOLLOWUP",
    text: "Handelt es sich um eine Folge-AU (Verlängerung einer bestehenden Krankschreibung)?",
    type: "yes_no",
    required: false,
    helperText:
      "Eine Folge-AU liegt vor, wenn Sie für dieselbe Erkrankung bereits eine Krankschreibung erhalten haben.",
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

  // --- Krankenhauseinweisung ---
  HOSP_ADMISSION_REASON: {
    id: "HOSP_ADMISSION_REASON",
    text: "Wofür wird die Krankenhauseinweisung benötigt?",
    type: "text",
    required: true,
    helperText: "Bitte nennen Sie den geplanten Krankenhausaufenthalt oder den konkreten Anlass.",
  },
  HOSP_ADMISSION_IS_CONTROL: {
    id: "HOSP_ADMISSION_IS_CONTROL",
    text: "Geht es um eine Kontrolluntersuchung oder einen bereits geplanten Krankenhaus-Termin?",
    type: "yes_no",
    required: false,
  },
  HOSP_ADMISSION_DATE: {
    id: "HOSP_ADMISSION_DATE",
    text: "Falls bereits bekannt: Wann ist der Krankenhaus-Termin?",
    type: "date",
    required: false,
  },
  HOSP_TRANSPORT_NEEDED: {
    id: "HOSP_TRANSPORT_NEEDED",
    text: "Wird ein Krankentransport oder eine Krankenfahrt benötigt?",
    type: "yes_no",
    required: false,
  },
  HOSP_TRANSPORT_REASON: {
    id: "HOSP_TRANSPORT_REASON",
    text: "Warum können Sie nicht selbstständig zur Klinik fahren?",
    type: "text",
    required: false,
    helperText:
      "Zum Beispiel: starke Mobilitätseinschränkung, Rollstuhl, liegender Transport, medizinische Überwachung während der Fahrt.",
  },

  // --- Heilmittelverordnung ---
  HMV_CATEGORY: {
    id: "HMV_CATEGORY",
    text: "Für welches Heilmittel benötigen Sie eine Verordnung?",
    type: "select",
    required: true,
    options: [
      "Physiotherapie",
      "Ergotherapie",
      "Logopädie",
      "Podologie",
      "Lymphdrainage",
      "Sonstiges Heilmittel",
    ],
  },
  HMV_REQUEST_TYPE: {
    id: "HMV_REQUEST_TYPE",
    text: "Handelt es sich um eine neue Verordnung oder eine Folgeverordnung?",
    type: "select",
    required: true,
    options: ["Folgeverordnung", "Neue Beschwerden"],
  },
  HMV_CURRENT_COMPLAINT: {
    id: "HMV_CURRENT_COMPLAINT",
    text: "Bitte beschreiben Sie Ihre aktuellen Beschwerden.",
    type: "textarea",
    required: true,
  },
  HMV_PREVIOUS_ORDER_EXISTS: {
    id: "HMV_PREVIOUS_ORDER_EXISTS",
    text: "Liegt eine frühere Heilmittelverordnung vor?",
    type: "yes_no",
    required: true,
  },
  HMV_PREVIOUS_ORDER_END_DATE: {
    id: "HMV_PREVIOUS_ORDER_END_DATE",
    text: "Wann endete die letzte Heilmittelverordnung?",
    type: "date",
    required: false,
  },
  HMV_LAST_PRACTICE_CONTACT_AT: {
    id: "HMV_LAST_PRACTICE_CONTACT_AT",
    text: "Wann hatten Sie zuletzt Kontakt mit uns wegen dieser Verordnung?",
    type: "date",
    required: false,
  },
  HMV_THERAPY_PROVIDER_NAME: {
    id: "HMV_THERAPY_PROVIDER_NAME",
    text: "Bei welcher Praxis / Einrichtung erfolgt die Therapie? (falls bekannt)",
    type: "text",
    required: false,
  },
  HMV_LAST_THERAPY_DATE: {
    id: "HMV_LAST_THERAPY_DATE",
    text: "Wann fand die letzte Therapieeinheit statt? (falls bekannt)",
    type: "date",
    required: false,
  },
  HMV_ADDITIONAL_NOTES: {
    id: "HMV_ADDITIONAL_NOTES",
    text: "Weitere Hinweise oder Anmerkungen (optional)",
    type: "textarea",
    required: false,
  },

  // --- Krankenbeförderung ---
  TRANSPORT_NEEDED: {
    id: "TRANSPORT_NEEDED",
    text: "Benötigen Sie eine Krankenbeförderung oder einen Krankentransport?",
    type: "yes_no",
    required: true,
  },
  TRANSPORT_DESTINATION: {
    id: "TRANSPORT_DESTINATION",
    text: "Wohin soll die Fahrt gehen?",
    type: "text",
    required: false,
  },
  TRANSPORT_REASON: {
    id: "TRANSPORT_REASON",
    text: "Warum können Sie nicht selbstständig zur Praxis oder Klinik kommen?",
    type: "text",
    required: true,
    helperText: "Bitte beschreiben Sie Ihre Mobilitätseinschränkung oder den medizinischen Grund.",
  },
  TRANSPORT_MOBILITY: {
    id: "TRANSPORT_MOBILITY",
    text: "Welche Einschränkung liegt vor?",
    type: "multi_select",
    required: false,
    options: [
      "Gehen nur wenige Schritte möglich",
      "Rollstuhl erforderlich",
      "Liegender Transport erforderlich",
      "Medizinische Betreuung während der Fahrt erforderlich",
      "Starkes Übergewicht / besondere Transportanforderung",
      "Andere Einschränkung",
    ],
  },
  TRANSPORT_DATE: {
    id: "TRANSPORT_DATE",
    text: "Falls bekannt: Für welches Datum wird die Fahrt benötigt?",
    type: "date",
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
  IDENTITAET: {
    id: "IDENTITAET",
    label: "Identität",
    label_en: "Identity",
    displayOrder: 5,
    questionIds: ["IDENTITY_FIRST_NAME", "IDENTITY_LAST_NAME", "IDENTITY_BIRTHDATE"],
  },
  VERSICHERUNG: {
    id: "VERSICHERUNG",
    label: "Versicherungsdaten",
    label_en: "Insurance details",
    displayOrder: 7,
    questionIds: [
      "IDENTITY_INSURANCE_TYPE",
      "INSURANCE_PROVIDER_NAME",
      "INSURANCE_MEMBER_NUMBER",
      "INSURANCE_CARD_IDENTIFIER",
      "INSURANCE_CARD_VALID_UNTIL",
    ],
  },
  HEILMITTELVERORDNUNG: {
    id: "HEILMITTELVERORDNUNG",
    label: "Heilmittelverordnung",
    displayOrder: 9,
    questionIds: [
      "HMV_CATEGORY",
      "HMV_REQUEST_TYPE",
      "HMV_CURRENT_COMPLAINT",
      "HMV_PREVIOUS_ORDER_EXISTS",
      "HMV_PREVIOUS_ORDER_END_DATE",
      "HMV_LAST_PRACTICE_CONTACT_AT",
      "HMV_THERAPY_PROVIDER_NAME",
      "HMV_LAST_THERAPY_DATE",
      "HMV_ADDITIONAL_NOTES",
    ],
  },
  KONTAKT: {
    id: "KONTAKT",
    label: "Kontaktdaten",
    label_en: "Contact details",
    displayOrder: 10,
    questionIds: ["CONTACT_PHONE", "CONTACT_EMAIL", "CONTACT_DOCTOLIB"],
  },
  ADRESSE: {
    id: "ADRESSE",
    label: "Adresse",
    label_en: "Address",
    displayOrder: 20,
    questionIds: ["ADDRESS_POSTAL"],
  },
  KURZANAMNESE: {
    id: "KURZANAMNESE",
    label: "Kurzanamnese",
    label_en: "Brief medical history",
    displayOrder: 30,
    questionIds: [
      "ANAMNESE_GP",
      "ANAMNESE_GP_NAME",
      "ANAMNESE_HEIGHT",
      "ANAMNESE_WEIGHT",
      "ANAMNESE_OCCUPATION",
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
    label_en: "Sick leave certificate",
    displayOrder: 40,
    hint: "Bitte beachten Sie: Die maximale rückwirkende Ausstellungsdauer ist gesetzlich begrenzt.",
    hint_en: "Please note: the maximum retroactive issuance period is limited by law.",
    questionIds: ["AU_SYMPTOMS", "AU_SYMPTOMS_OTHER_TEXT", "AU_START_DATE", "AU_END_DATE", "AU_IS_FOLLOWUP"],
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
  HOSPITAL_ADMISSION: {
    id: "HOSPITAL_ADMISSION",
    label: "Krankenhauseinweisung",
    displayOrder: 70,
    questionIds: [
      "HOSP_ADMISSION_REASON",
      "HOSP_ADMISSION_IS_CONTROL",
      "HOSP_ADMISSION_DATE",
    ],
  },
  TRANSPORT: {
    id: "TRANSPORT",
    label: "Krankenbeförderung / Krankentransport",
    displayOrder: 80,
    // Conditional visibility (TRANSPORT_DESTINATION, TRANSPORT_REASON, TRANSPORT_MOBILITY
    // und TRANSPORT_DATE nur anzeigen wenn TRANSPORT_NEEDED = ja) wird vom aktuellen
    // Fragebogen-System nicht unterstützt – alle Felder sind immer sichtbar.
    questionIds: [
      "TRANSPORT_NEEDED",
      "TRANSPORT_DESTINATION",
      "TRANSPORT_REASON",
      "TRANSPORT_MOBILITY",
      "TRANSPORT_DATE",
    ],
  },
};

/** Sortierte Block-IDs nach displayOrder. */
export const BLOCK_IDS_SORTED: string[] = Object.values(BLOCK_CATALOG)
  .sort((a, b) => a.displayOrder - b.displayOrder)
  .map((b) => b.id);
