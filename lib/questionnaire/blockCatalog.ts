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
 *   10 IDENTITAET          – Vorname, Nachname, Geburtsdatum
 *   20 KONTAKT             – Telefon, E-Mail, Doctolib
 *   30 KONTAKTPERSON       – Notfallkontakt
 *   40 ADRESSE             – Postanschrift
 *   50 VERSICHERUNG        – Versicherungsdaten
 *   60 KURZANAMNESE        – Allgemeine Gesundheitsangaben
 *   70 ARBEITSUNFAEHIGKEIT – AU-Bescheinigung
 *   80 REZEPT              – Medikamentenrezept
 *   90 UEBERWEISUNG        – Facharztüberweisung
 *  100 HEILMITTELVERORDNUNG – Heilmittelverordnung
 *  110 HOSPITAL_ADMISSION  – Krankenhauseinweisung
 *  120 TRANSPORT           – Krankenbeförderung / Krankentransport
 *  130 FACHAERZTE          – Behandelnde Fachärzte
 *  135 VOLLST_BASISDATEN    – Vollst. Anamnese: Basisdaten
 *  140 VOLLST_ERKRANKUNGEN     – Vollst. Anamnese: Erkrankungen & Medikamente
 *  150 VOLLST_ALLERGIEN        – Vollst. Anamnese: Allergien & Unverträglichkeiten
 *  160 VOLLST_INFEKTIONEN      – Vollst. Anamnese: Infektionskrankheiten
 *  170 VOLLST_FAMILIENANAMNESE – Vollst. Anamnese: Familienanamnese
 *  180 VOLLST_IMPFSTATUS       – Vollst. Anamnese: Impfstatus
 *  190 VOLLST_VERSORGUNGSSTATUS – Vollst. Anamnese: Versorgungsstatus
 *  200 VOLLST_NIKOTIN          – Vollst. Anamnese: Nikotin / Tabak
 *  210 VOLLST_ALKOHOL          – Vollst. Anamnese: Alkohol
 *  220 VOLLST_SUBSTANZEN       – Vollst. Anamnese: Andere Substanzen / Drogen
 *  230 VOLLST_PRAEVENTION      – Vollst. Anamnese: Prävention und Beratungswünsche
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

import { type ConditionalRule } from "./conditionalLogic";

export type QuestionType =
  | "text"
  | "date"
  | "yes_no"
  | "select"
  | "multi_select"
  | "textarea"
  | "repeatable_group"
  | "number"; // Phase 5: strukturierte numerische Eingabe (Wert als String gespeichert)

/** Ein Unterfeld innerhalb eines repeatable_group-Eintrags. */
export type RepeatableGroupFieldDef = {
  key: string;
  label: string;
  type: "text" | "select" | "yes_no" | "textarea" | "checkbox" | "multi_select";
  required: boolean;
  options?: string[];
  helperText?: string;
  /** Dieses Feld nur anzeigen, wenn `conditionalOn`-Feld gleich `conditionalValue` ist. */
  conditionalOn?: string;
  conditionalValue?: string;
  /** Alternativ: Feld sichtbar, wenn `conditionalOn`-Feld einen der angegebenen Werte hat. */
  conditionalValues?: string[];
};

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
  /** Felddefinitionen für repeatable_group-Fragen. */
  groupSchema?: RepeatableGroupFieldDef[];
  /** Maximale Anzahl Einträge für repeatable_group (Default 20). */
  maxEntries?: number;
  /** Beschriftung des „Eintrag hinzufügen"-Buttons. Default: \"+ Weiteren Eintrag hinzufügen\". */
  addEntryLabel?: string;
  /** Schrittweite für type "number"-Eingaben (HTML step-Attribut). Default 1. */
  step?: number;
  /** Anzeigeeinheit für type "number"-Felder, z. B. "cm" oder "kg". */
  unit?: string;
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
  /** Conditional Rules, die beim Einfrieren der Session gesammelt werden. */
  conditionalRules?: ConditionalRule[];
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

  // --- Kontaktperson ---
  KONTAKTPERSON_NAME: {
    id: "KONTAKTPERSON_NAME",
    text: "Vollständiger Name der Kontaktperson",
    type: "text",
    required: true,
  },
  KONTAKTPERSON_BIRTHDATE: {
    id: "KONTAKTPERSON_BIRTHDATE",
    text: "Geburtsdatum der Kontaktperson",
    type: "date",
    required: true,
  },
  KONTAKTPERSON_RELATIONSHIP: {
    id: "KONTAKTPERSON_RELATIONSHIP",
    text: "Beziehung zum Patienten",
    type: "text",
    required: true,
  },
  KONTAKTPERSON_CONFIRMATION: {
    id: "KONTAKTPERSON_CONFIRMATION",
    text: "Diese Person darf organisatorische Anliegen für mich übernehmen (z. B. Rezepte oder Unterlagen abholen).",
    type: "yes_no",
    required: true,
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

  // --- Fachärzte ---
  FACHAERZTE: {
    id: "FACHAERZTE",
    text: "Behandelnde Fachärzte",
    text_en: "Treating specialists",
    type: "textarea",
    required: false,
    helperText:
      "Bitte geben Sie Ihre behandelnden Fachärzte an. Sie können mehrere Einträge hinzufügen.",
    helperText_en:
      "Please provide information about your treating specialists. You can add multiple entries.",
  },

  // --- Vollständige Anamnese: Erkrankungen & Medikamente ---
  VOLLST_ERKR_GATE: {
    id: "VOLLST_ERKR_GATE",
    text: "Haben Sie eine chronische oder psychische Erkrankung oder nehmen Sie regelmäßig Medikamente ein?",
    type: "select",
    required: true,
    options: ["Ja", "Nein", "Wei\u00df ich nicht / unsicher"],
  },
  VOLLST_ERKR_EINTRAEGE: {
    id: "VOLLST_ERKR_EINTRAEGE",
    text: "Erkrankungen und Medikamente",
    type: "repeatable_group",
    required: false,
    maxEntries: 20,
    addEntryLabel: "+ Weitere Erkrankung / Behandlung hinzufügen",
    groupSchema: [
      {
        key: "diagnose_unbekannt",
        label: "Die genaue Diagnose ist mir nicht bekannt.",
        type: "checkbox",
        required: false,
      },
      {
        key: "diagnose",
        label: "Erkrankung / Diagnose",
        type: "text",
        required: false,
        // Verborgen, solange diagnose_unbekannt aktiviert (nicht leer) ist
        conditionalOn: "diagnose_unbekannt",
        conditionalValue: "",
      },
      {
        key: "seit_wann",
        label: "Seit wann bekannt bzw. wann ungefähr diagnostiziert?",
        type: "select",
        required: false,
        options: [
          "innerhalb der letzten 2 Jahre",
          "vor 2\u20135 Jahren",
          "vor 5\u201310 Jahren",
          "vor mehr als 10 Jahren",
          "seit Kindheit/Jugend",
          "weiß ich nicht",
        ],
      },
      {
        key: "status",
        label: "Aktueller Stand der Erkrankung / Behandlung",
        type: "select",
        required: false,
        options: [
          "aktuell in Behandlung / regelmäßiger Kontrolle",
          "derzeit keine Behandlung oder Kontrolle",
          "Behandlung abgeschlossen",
          "weiß ich nicht",
        ],
      },
      {
        key: "facharzt",
        label: "In fachärztlicher Behandlung (aktuell oder früher)?",
        type: "select",
        required: false,
        options: ["Ja", "Nein", "Weiß ich nicht"],
      },
      {
        key: "facharzt_fachrichtung",
        label: "Fachrichtung",
        type: "text",
        required: false,
        conditionalOn: "facharzt",
        conditionalValue: "Ja",
      },
      {
        key: "facharzt_name",
        label: "Name des Facharztes / der Praxis",
        type: "text",
        required: false,
        helperText:
          "Bitte geben Sie auch frühere Fachärzte an, z.\u00a0B. bei Umzug oder abgeschlossener Behandlung.",
        conditionalOn: "facharzt",
        conditionalValue: "Ja",
      },
      {
        key: "facharzt_ort",
        label: "Ort",
        type: "text",
        required: false,
        conditionalOn: "facharzt",
        conditionalValue: "Ja",
      },
      {
        key: "medikamente",
        label: "Regelmäßige Medikamente wegen dieser Erkrankung?",
        type: "select",
        required: false,
        options: ["Ja", "Nein", "Weiß ich nicht"],
      },
      {
        key: "medikamente_welche",
        label: "Welche Medikamente?",
        type: "textarea",
        required: false,
        conditionalOn: "medikamente",
        conditionalValue: "Ja",
      },
    ],
  },

  // --- Vollständige Anamnese: Allergien & Unverträglichkeiten ---
  VOLLST_ALLERG_GATE: {
    id: "VOLLST_ALLERG_GATE",
    text: "Sind bei Ihnen Allergien oder Unverträglichkeiten bekannt?",
    type: "select",
    required: true,
    options: ["Ja", "Nein", "Weiß ich nicht"],
  },
  VOLLST_ALLERG_EINTRAEGE: {
    id: "VOLLST_ALLERG_EINTRAEGE",
    text: "Allergien und Unverträglichkeiten",
    type: "repeatable_group",
    required: false,
    maxEntries: 20,
    addEntryLabel: "+ Weitere Allergie oder Unverträglichkeit hinzufügen",
    groupSchema: [
      {
        key: "allergie",
        label: "Wogegen besteht die Allergie oder Unverträglichkeit?",
        type: "text",
        required: false,
      },
      {
        key: "seit_wann",
        label: "Seit wann bekannt?",
        type: "select",
        required: false,
        options: [
          "innerhalb der letzten 2 Jahre",
          "vor 2\u20135 Jahren",
          "vor 5\u201310 Jahren",
          "vor mehr als 10 Jahren",
          "seit Kindheit/Jugend",
          "weiß ich nicht",
        ],
      },
      {
        key: "reaktion",
        label: "Welche Beschwerden oder Reaktionen treten dabei auf?",
        type: "textarea",
        required: false,
      },
      {
        key: "behandlung",
        label: "Ärztlich untersucht oder behandelt?",
        type: "select",
        required: false,
        options: [
          "aktuell in Behandlung / Kontrolle",
          "früher untersucht oder behandelt",
          "nein",
          "weiß ich nicht",
        ],
      },
      {
        key: "arzt_fachrichtung",
        label: "Fachrichtung / Arztgruppe",
        type: "text",
        required: false,
        conditionalOn: "behandlung",
        conditionalValues: [
          "aktuell in Behandlung / Kontrolle",
          "früher untersucht oder behandelt",
        ],
      },
      {
        key: "arzt_name",
        label: "Name der Praxis / des Arztes",
        type: "text",
        required: false,
        conditionalOn: "behandlung",
        conditionalValues: [
          "aktuell in Behandlung / Kontrolle",
          "früher untersucht oder behandelt",
        ],
      },
      {
        key: "arzt_ort",
        label: "Ort",
        type: "text",
        required: false,
        conditionalOn: "behandlung",
        conditionalValues: [
          "aktuell in Behandlung / Kontrolle",
          "früher untersucht oder behandelt",
        ],
      },
    ],
  },

  // --- Vollständige Anamnese: Infektionskrankheiten ---
  VOLLST_INFEKT_GATE: {
    id: "VOLLST_INFEKT_GATE",
    text: "Ist bei Ihnen eine der folgenden Infektionskrankheiten bekannt?",
    type: "select",
    required: true,
    options: ["Ja", "Nein", "Weiß ich nicht"],
    helperText:
      "z.\u00a0B. HIV, Hepatitis\u00a0B, Hepatitis\u00a0C, Tuberkulose oder eine andere länger bestehende Infektionskrankheit",
  },
  VOLLST_INFEKT_EINTRAEGE: {
    id: "VOLLST_INFEKT_EINTRAEGE",
    text: "Infektionskrankheiten",
    type: "repeatable_group",
    required: false,
    maxEntries: 20,
    addEntryLabel: "+ Weitere Infektionskrankheit hinzufügen",
    groupSchema: [
      {
        key: "krankheit",
        label: "Welche Infektionskrankheit?",
        type: "select",
        required: false,
        options: ["HIV", "Hepatitis B", "Hepatitis C", "Tuberkulose", "andere"],
      },
      {
        key: "krankheit_andere",
        label: "Welche?",
        type: "text",
        required: false,
        conditionalOn: "krankheit",
        conditionalValue: "andere",
      },
      {
        key: "seit_wann",
        label: "Seit wann bekannt?",
        type: "select",
        required: false,
        options: [
          "innerhalb der letzten 2 Jahre",
          "vor 2\u20135 Jahren",
          "vor 5\u201310 Jahren",
          "vor mehr als 10 Jahren",
          "seit Kindheit/Jugend",
          "weiß ich nicht",
        ],
      },
      {
        key: "status",
        label: "Aktueller Status",
        type: "select",
        required: false,
        options: [
          "aktuell in Behandlung / regelmäßiger Kontrolle",
          "derzeit keine Behandlung oder Kontrolle",
          "Behandlung abgeschlossen",
          "weiß ich nicht",
        ],
      },
      {
        key: "behandlung",
        label: "Aktuell oder früher ärztlich behandelt?",
        type: "select",
        required: false,
        options: ["Ja", "Nein", "Weiß ich nicht"],
        helperText:
          "Bitte auch frühere behandelnde Stellen angeben, z.\u00a0B. bei Umzug oder abgeschlossener Behandlung.",
      },
      {
        key: "arzt_fachrichtung",
        label: "Fachrichtung",
        type: "text",
        required: false,
        conditionalOn: "behandlung",
        conditionalValue: "Ja",
      },
      {
        key: "arzt_name",
        label: "Arzt / Praxis",
        type: "text",
        required: false,
        conditionalOn: "behandlung",
        conditionalValue: "Ja",
      },
      {
        key: "arzt_ort",
        label: "Ort",
        type: "text",
        required: false,
        conditionalOn: "behandlung",
        conditionalValue: "Ja",
      },
      {
        key: "medikamente",
        label: "Regelmäßige Medikamente deswegen?",
        type: "select",
        required: false,
        options: ["Ja", "Nein", "Weiß ich nicht"],
      },
      {
        key: "medikamente_welche",
        label: "Welche Medikamente?",
        type: "textarea",
        required: false,
        conditionalOn: "medikamente",
        conditionalValue: "Ja",
      },
    ],
  },

  // --- Vollständige Anamnese: Familienanamnese ---
  VOLLST_FAMIL_GATE: {
    id: "VOLLST_FAMIL_GATE",
    text: "Gibt es relevante Erkrankungen in Ihrer Familie?",
    type: "select",
    required: true,
    options: ["Ja", "Nein", "Wei\u00df ich nicht"],
    helperText:
      "Gemeint sind z.\u00a0B. geh\u00e4uft auftretende oder schwerwiegende Erkrankungen bei Eltern, Geschwistern oder anderen nahen Verwandten.",
  },
  VOLLST_FAMIL_EINTRAEGE: {
    id: "VOLLST_FAMIL_EINTRAEGE",
    text: "Erkrankungen in der Familie",
    type: "repeatable_group",
    required: false,
    maxEntries: 30,
    addEntryLabel: "+ Weiteren Familieneintrag hinzufügen",
    groupSchema: [
      {
        key: "erkrankung",
        label: "Erkrankung",
        type: "text",
        required: false,
      },
      {
        key: "verwandtschaft",
        label: "Bei wem?",
        type: "multi_select",
        required: false,
        options: ["Mutter", "Vater", "Geschwister", "weitere Verwandte"],
      },
    ],
  },

  // --- Vollständige Anamnese: Impfstatus ---
  VOLLST_IMPF_BEKANNT: {
    id: "VOLLST_IMPF_BEKANNT",
    text: "Ist Ihr Impfstatus bekannt?",
    type: "select",
    required: true,
    options: ["Ja", "Nein", "Unsicher"],
  },
  VOLLST_IMPF_NACHWEIS: {
    id: "VOLLST_IMPF_NACHWEIS",
    text: "Haben Sie einen Impfpass oder einen anderen Impfnachweis?",
    type: "select",
    required: true,
    options: ["Ja", "Nein"],
  },
  VOLLST_IMPF_ABLEHNUNG: {
    id: "VOLLST_IMPF_ABLEHNUNG",
    text: "Lehnen Sie Impfungen grundsätzlich ab?",
    type: "yes_no",
    required: true,
  },
  VOLLST_IMPF_BERATUNG: {
    id: "VOLLST_IMPF_BERATUNG",
    text: "Möchten Sie Ihren Impfstatus mit der Praxis überprüfen bzw. sich hierzu beraten lassen?",
    type: "select",
    required: false,
    options: ["Ja", "Nein"],
  },

  // --- Vollständige Anamnese: Versorgungsstatus ---
  VOLLST_VERS_PFLEGEGRAD: {
    id: "VOLLST_VERS_PFLEGEGRAD",
    text: "Besteht ein Pflegegrad?",
    type: "select",
    required: true,
    options: ["Nein", "beantragt", "Ja"],
  },
  VOLLST_VERS_PFLEGEGRAD_STUFE: {
    id: "VOLLST_VERS_PFLEGEGRAD_STUFE",
    text: "Welcher Pflegegrad?",
    type: "select",
    required: false,
    options: ["1", "2", "3", "4", "5"],
  },
  VOLLST_VERS_GDB: {
    id: "VOLLST_VERS_GDB",
    text: "Ist ein Grad der Behinderung (GdB) festgestellt?",
    type: "select",
    required: true,
    options: ["Nein", "beantragt", "Ja"],
  },
  VOLLST_VERS_GDB_WERT: {
    id: "VOLLST_VERS_GDB_WERT",
    text: "Wie hoch ist der GdB?",
    type: "text",
    required: false,
    helperText: "z.\u00a0B. 50, 70, 100",
  },
  VOLLST_VERS_PROTHESEN: {
    id: "VOLLST_VERS_PROTHESEN",
    text: "Haben Sie Prothesen oder Implantate?",
    type: "select",
    required: true,
    options: ["Nein", "Ja"],
  },
  VOLLST_VERS_PROTHESEN_TEXT: {
    id: "VOLLST_VERS_PROTHESEN_TEXT",
    text: "Welche?",
    type: "text",
    required: false,
  },

  // --- Vollständige Anamnese: Basisdaten ---
  // VOLLST_SEX ist für medizinische Vorsorgeregeln vorgesehen; VOLLST_GENDER und VOLLST_PRONOMEN nicht.
  VOLLST_SEX: {
    id: "VOLLST_SEX",
    text: "Geschlecht bei Geburt",
    type: "select",
    required: false,
    options: [
      "weiblich",
      "m\u00e4nnlich",
      "nicht eindeutig zugeordnet / intergeschlechtlich",
      "Ich m\u00f6chte keine Angabe machen",
    ],
    helperText:
      "Diese Angabe kann f\u00fcr medizinisch relevante Hinweise zur Vorsorge und Fr\u00fcherkennung verwendet werden.",
  },
  VOLLST_GENDER: {
    id: "VOLLST_GENDER",
    text: "Geschlechtsidentit\u00e4t (optional)",
    type: "select",
    required: false,
    options: [
      "weiblich",
      "m\u00e4nnlich",
      "divers / nicht-bin\u00e4r",
      "andere Geschlechtsidentit\u00e4t",
      "Ich m\u00f6chte keine Angabe machen",
    ],
  },
  VOLLST_GENDER_FREITEXT: {
    id: "VOLLST_GENDER_FREITEXT",
    text: "Eigene Angabe zur Geschlechtsidentit\u00e4t",
    type: "text",
    required: false,
  },
  VOLLST_PRONOMEN: {
    id: "VOLLST_PRONOMEN",
    text: "Wie m\u00f6chten Sie angesprochen werden? (optional)",
    type: "text",
    required: false,
    helperText: "Zum Beispiel sie/ihr, er/ihm, they/them oder eine eigene Angabe.",
  },

  // --- Vollständige Anamnese: Basisdaten – Altersangabe ---
  VOLLST_AGE: {
    id: "VOLLST_AGE",
    text: "Wie alt sind Sie?",
    type: "number",
    required: true,
    unit: "Jahre",
    step: 1,
    helperText: "Bitte Ihr aktuelles Alter in ganzen Jahren angeben.",
  },

  // --- Vollständige Anamnese: Basisdaten – Körpermaße (Phase 5) ---
  VOLLST_HEIGHT: {
    id: "VOLLST_HEIGHT",
    text: "Körpergröße",
    text_en: "Height",
    type: "number",
    required: true,
    unit: "cm",
    step: 1,
    helperText: "Bitte in cm angeben, z.\u00a0B. 175.",
    helperText_en: "Please enter in cm, e.g. 175.",
  },
  VOLLST_WEIGHT: {
    id: "VOLLST_WEIGHT",
    text: "Körpergewicht",
    text_en: "Weight",
    type: "number",
    required: true,
    unit: "kg",
    step: 0.1,
    helperText: "Bitte in kg angeben, z.\u00a0B. 70 oder 70,5.",
    helperText_en: "Please enter in kg, e.g. 70 or 70.5.",
  },

  // --- Vollständige Anamnese: Nikotin / Tabak ---
  NIKOTIN_GATE: {
    id: "NIKOTIN_GATE",
    text: "Rauchen Sie oder haben Sie früher regelmäßig geraucht?",
    type: "select",
    required: true,
    options: [
      "Nein, nie regelmäßig",
      "Ja, aktuell",
      "Früher, inzwischen aufgehört",
    ],
  },
  NIKOTIN_PRODUKT: {
    id: "NIKOTIN_PRODUKT",
    text: "Was rauchen bzw. rauchten Sie überwiegend?",
    type: "select",
    required: false,
    options: [
      "Zigaretten",
      "Zigarren / Zigarillos",
      "Pfeife",
      "E-Zigarette / Vape",
      "erhitzte Tabakprodukte",
      "anderes",
    ],
  },
  NIKOTIN_PRODUKT_ANDERE: {
    id: "NIKOTIN_PRODUKT_ANDERE",
    text: "Was?",
    type: "text",
    required: false,
    helperText: "Bitte beschreiben Sie das Produkt kurz.",
  },
  NIKOTIN_DAUER_JAHRE: {
    id: "NIKOTIN_DAUER_JAHRE",
    text: "Ungefähr wie viele Jahre insgesamt rauchen bzw. rauchten Sie regelmäßig?",
    type: "text",
    required: false,
    helperText: "Bitte eine Zahl eingeben, z.\u00a0B. 10 oder ca. 20.",
  },
  NIKOTIN_ZIG_PRO_TAG: {
    id: "NIKOTIN_ZIG_PRO_TAG",
    text: "Wie viele Zigaretten rauchen bzw. rauchten Sie durchschnittlich pro Tag?",
    type: "text",
    required: false,
    helperText: "Bitte eine Zahl eingeben, z.\u00a0B. 10 oder ca. 15.",
  },
  NIKOTIN_AUFGEHOERT_VOR: {
    id: "NIKOTIN_AUFGEHOERT_VOR",
    text: "Vor wie vielen Jahren haben Sie aufgehört zu rauchen?",
    type: "text",
    required: false,
    helperText: "Bitte eine Zahl eingeben, z.\u00a0B. 5 oder ca. 10.",
  },
  NIKOTIN_AUFHOERVERSUCH: {
    id: "NIKOTIN_AUFHOERVERSUCH",
    text: "Haben Sie schon einmal versucht, mit dem Rauchen aufzuhören?",
    type: "select",
    required: false,
    options: [
      "Nein",
      "Ja, ohne professionelle Unterst\u00fctzung",
      "Ja, mit professioneller Unterst\u00fctzung",
    ],
  },
  NIKOTIN_RAUCHFREI_DAUER: {
    id: "NIKOTIN_RAUCHFREI_DAUER",
    text: "Wie lange waren Sie bei Ihrem längsten Versuch rauchfrei?",
    type: "text",
    required: false,
    helperText: "z.\u00a0B. 3 Monate, 1 Jahr.",
  },
  NIKOTIN_MOTIVATION: {
    id: "NIKOTIN_MOTIVATION",
    text: "Möchten Sie Ihren Nikotinkonsum aktuell reduzieren oder ganz aufhören?",
    type: "select",
    required: false,
    options: ["Ja", "Nein", "Unsicher"],
  },
  NIKOTIN_UNTERSTUETZUNG: {
    id: "NIKOTIN_UNTERSTUETZUNG",
    text: "Möchten Sie dabei Unterstützung durch die Praxis?",
    type: "select",
    required: false,
    options: ["Ja", "Nein", "Vielleicht / m\u00f6chte ich besprechen"],
  },

  // --- Vollständige Anamnese: Alkohol ---
  ALKOHOL_GATE: {
    id: "ALKOHOL_GATE",
    text: "Trinken Sie Alkohol?",
    type: "select",
    required: true,
    options: ["Nein", "Ja, gelegentlich", "Ja, regelm\u00e4\u00dfig"],
  },
  ALKOHOL_FRUEHER_MEHR: {
    id: "ALKOHOL_FRUEHER_MEHR",
    text: "Gab es in der Vergangenheit Phasen, in denen Sie deutlich mehr Alkohol getrunken haben als heute?",
    type: "select",
    required: false,
    options: ["Ja", "Nein", "Unsicher"],
  },
  ALKOHOL_HAEUFIGKEIT: {
    id: "ALKOHOL_HAEUFIGKEIT",
    text: "An wie vielen Tagen pro Woche trinken Sie ungefähr Alkohol?",
    type: "select",
    required: false,
    options: [
      "1 Tag pro Woche oder seltener",
      "2\u20133 Tage pro Woche",
      "4\u20135 Tage pro Woche",
      "t\u00e4glich oder fast t\u00e4glich",
      "wei\u00df ich nicht",
    ],
  },
  ALKOHOL_MENGE: {
    id: "ALKOHOL_MENGE",
    text: "Wie viel Alkohol trinken Sie an einem typischen Trinktag?",
    type: "text",
    required: false,
    helperText: "z.\u00a0B. 2 Bier, 1 Glas Wein, 2 Schn\u00e4pse.",
  },
  ALKOHOL_VERSUCH: {
    id: "ALKOHOL_VERSUCH",
    text: "Haben Sie schon einmal versucht, weniger oder keinen Alkohol zu trinken?",
    type: "select",
    required: false,
    options: [
      "Nein",
      "Ja, ohne professionelle Unterst\u00fctzung",
      "Ja, mit professioneller Unterst\u00fctzung",
    ],
  },
  ALKOHOL_BEHANDLUNG: {
    id: "ALKOHOL_BEHANDLUNG",
    text: "Waren oder sind Sie wegen Ihres Alkoholkonsums in Behandlung oder Beratung?",
    type: "select",
    required: false,
    options: ["Nein", "Ja, aktuell", "Ja, fr\u00fcher"],
  },
  ALKOHOL_BEHANDLUNG_ART: {
    id: "ALKOHOL_BEHANDLUNG_ART",
    text: "Art der Behandlung / Einrichtung",
    type: "text",
    required: false,
    helperText:
      "Bitte auch fr\u00fchere behandelnde Praxen, Beratungsstellen oder Kliniken angeben.",
  },
  ALKOHOL_BEHANDLUNG_NAME: {
    id: "ALKOHOL_BEHANDLUNG_NAME",
    text: "Name der Praxis / Einrichtung",
    type: "text",
    required: false,
  },
  ALKOHOL_BEHANDLUNG_ORT: {
    id: "ALKOHOL_BEHANDLUNG_ORT",
    text: "Ort",
    type: "text",
    required: false,
  },
  ALKOHOL_MOTIVATION: {
    id: "ALKOHOL_MOTIVATION",
    text: "M\u00f6chten Sie Ihren Alkoholkonsum reduzieren oder beenden?",
    type: "select",
    required: false,
    options: ["Ja", "Nein", "Unsicher"],
  },
  ALKOHOL_UNTERSTUETZUNG: {
    id: "ALKOHOL_UNTERSTUETZUNG",
    text: "M\u00f6chten Sie hierzu Unterst\u00fctzung durch die Praxis?",
    type: "select",
    required: false,
    options: ["Ja", "Nein", "Vielleicht / m\u00f6chte ich besprechen"],
  },

  // --- Vollständige Anamnese: Andere Substanzen / Drogen ---
  SUBST_GATE: {
    id: "SUBST_GATE",
    text: "Konsumieren Sie andere psychoaktive Substanzen oder haben Sie das fr\u00fcher getan?",
    type: "select",
    required: true,
    options: ["Nein", "Ja, aktuell", "Fr\u00fcher"],
  },
  SUBST_EINTRAEGE: {
    id: "SUBST_EINTRAEGE",
    text: "Substanzen / Drogen",
    type: "repeatable_group",
    required: false,
    maxEntries: 15,
    addEntryLabel: "+ Weitere Substanz hinzuf\u00fcgen",
    groupSchema: [
      {
        key: "substanz",
        label: "Substanz",
        type: "select",
        required: false,
        options: [
          "Cannabis",
          "Kokain / Crack",
          "Amphetamine / Methamphetamin",
          "Ecstasy / MDMA",
          "Opioide / Heroin",
          "Beruhigungs- oder Schlafmittel au\u00dferhalb der Verordnung",
          "andere",
        ],
      },
      {
        key: "substanz_andere",
        label: "Welche Substanz?",
        type: "text",
        required: false,
        conditionalOn: "substanz",
        conditionalValue: "andere",
      },
      {
        key: "status",
        label: "Konsumieren Sie diese Substanz aktuell oder liegt der Konsum in der Vergangenheit?",
        type: "select",
        required: false,
        options: ["aktuell", "fr\u00fcher"],
      },
      {
        key: "haeufigkeit",
        label: "Wie h\u00e4ufig konsumieren bzw. konsumierten Sie diese Substanz?",
        type: "select",
        required: false,
        options: [
          "seltener als monatlich",
          "monatlich",
          "w\u00f6chentlich",
          "mehrmals pro Woche",
          "t\u00e4glich oder fast t\u00e4glich",
          "wei\u00df ich nicht",
        ],
      },
      {
        key: "dauer",
        label: "\u00dcber welchen Zeitraum konsumieren bzw. konsumierten Sie diese Substanz regelm\u00e4\u00dfig?",
        type: "text",
        required: false,
      },
      {
        key: "beendet_wann",
        label: "Wann haben Sie den Konsum beendet?",
        type: "text",
        required: false,
        conditionalOn: "status",
        conditionalValue: "fr\u00fcher",
      },
      {
        key: "probleme",
        label: "Hat der Konsum bei Ihnen schon einmal zu gesundheitlichen, psychischen, beruflichen oder sozialen Problemen gef\u00fchrt?",
        type: "select",
        required: false,
        options: ["Ja", "Nein", "Unsicher"],
      },
      {
        key: "abstinenzversuch",
        label: "Haben Sie schon einmal versucht, den Konsum zu reduzieren oder zu beenden?",
        type: "select",
        required: false,
        options: [
          "Nein",
          "Ja, ohne professionelle Unterst\u00fctzung",
          "Ja, mit professioneller Unterst\u00fctzung",
        ],
      },
      {
        key: "behandlung",
        label: "Waren oder sind Sie deswegen in Beratung oder Behandlung?",
        type: "select",
        required: false,
        options: ["Nein", "Ja, aktuell", "Ja, fr\u00fcher"],
      },
      {
        key: "behandlung_art",
        label: "Art der Behandlung / Einrichtung",
        type: "text",
        required: false,
        conditionalOn: "behandlung",
        conditionalValues: ["Ja, aktuell", "Ja, fr\u00fcher"],
        helperText: "Bitte auch fr\u00fchere behandelnde Stellen angeben.",
      },
      {
        key: "behandlung_name",
        label: "Name der Praxis / Beratungsstelle / Klinik",
        type: "text",
        required: false,
        conditionalOn: "behandlung",
        conditionalValues: ["Ja, aktuell", "Ja, fr\u00fcher"],
      },
      {
        key: "behandlung_ort",
        label: "Ort",
        type: "text",
        required: false,
        conditionalOn: "behandlung",
        conditionalValues: ["Ja, aktuell", "Ja, fr\u00fcher"],
      },
      // Unterstützungswunsch nur bei aktuell konsumierter Substanz
      {
        key: "reduktion_wunsch",
        label: "M\u00f6chten Sie den Konsum dieser Substanz reduzieren oder beenden?",
        type: "select",
        required: false,
        options: ["Ja", "Nein", "Unsicher"],
        conditionalOn: "status",
        conditionalValue: "aktuell",
      },
      {
        key: "unterstuetzung_wunsch",
        label: "M\u00f6chten Sie hierzu Unterst\u00fctzung durch die Praxis?",
        type: "select",
        required: false,
        options: ["Ja", "Nein", "Vielleicht / m\u00f6chte ich besprechen"],
        conditionalOn: "status",
        conditionalValue: "aktuell",
      },
    ],
  },

  // --- Pr\u00e4vention und Beratungsw\u00fcnsche ---
  VOLLST_CHECKUP_STATUS: {
    id: "VOLLST_CHECKUP_STATUS",
    text: "Wann war Ihre letzte Gesundheitsuntersuchung (Check-up) beim Hausarzt?",
    type: "select",
    required: false,
    options: [
      "Noch nie",
      "Innerhalb der letzten 3 Jahre",
      "Vor mehr als 3 Jahren",
      "Wei\u00df ich nicht",
    ],
  },
  VOLLST_CHECKUP_BERATUNG: {
    id: "VOLLST_CHECKUP_BERATUNG",
    text: "M\u00f6chten Sie mit uns \u00fcber eine Gesundheitsuntersuchung sprechen?",
    type: "yes_no",
    required: false,
  },
  VOLLST_LUNGENSCREENING_BERATUNG: {
    id: "VOLLST_LUNGENSCREENING_BERATUNG",
    text: "M\u00f6chten Sie sich zum Thema Lungenkrebs-Screening beraten lassen?",
    type: "yes_no",
    required: false,
    helperText:
      "Ob eine Untersuchung f\u00fcr Sie infrage kommt, kl\u00e4ren wir gemeinsam in der Praxis.",
  },
  VOLLST_GEWICHT_VERAENDERN: {
    id: "VOLLST_GEWICHT_VERAENDERN",
    text: "M\u00f6chten Sie Ihr Gewicht ver\u00e4ndern?",
    type: "select",
    required: true,
    options: [
      "Nein",
      "Ja, ich m\u00f6chte Gewicht reduzieren",
      "Ja, ich m\u00f6chte Gewicht zunehmen",
      "Ich bin mir unsicher",
    ],
  },
  VOLLST_GEWICHT_UNTERSTUETZUNG: {
    id: "VOLLST_GEWICHT_UNTERSTUETZUNG",
    text: "W\u00fcnschen Sie dabei Unterst\u00fctzung oder Beratung durch die Praxis?",
    type: "yes_no",
    required: false,
  },
};

/**
 * Statischer Block-Katalog.
 *
 * Telefonnummer, E-Mail und Adresse erscheinen nur in KONTAKT bzw. ADRESSE
 * und werden durch buildQuestionnaireQuestions() dedupliziert.
 * Die Blöcke IDENTITAET (10), KONTAKT (20) und ADRESSE (40) bilden die Basis,
 * danach folgen Versicherung, Anamnese und fachliche Anliegen.
 */
export const BLOCK_CATALOG: Record<string, QuestionnaireBlock> = {
  IDENTITAET: {
    id: "IDENTITAET",
    label: "Identität",
    label_en: "Identity",
    displayOrder: 10,
    questionIds: ["IDENTITY_FIRST_NAME", "IDENTITY_LAST_NAME", "IDENTITY_BIRTHDATE"],
  },
  VERSICHERUNG: {
    id: "VERSICHERUNG",
    label: "Versicherungsdaten",
    label_en: "Insurance details",
    displayOrder: 50,
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
    displayOrder: 100,
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
    displayOrder: 20,
    questionIds: ["CONTACT_PHONE", "CONTACT_EMAIL", "CONTACT_DOCTOLIB"],
  },
  KONTAKTPERSON: {
    id: "KONTAKTPERSON",
    label: "Kontaktperson",
    displayOrder: 30,
    questionIds: [
      "KONTAKTPERSON_NAME",
      "KONTAKTPERSON_BIRTHDATE",
      "KONTAKTPERSON_RELATIONSHIP",
      "KONTAKTPERSON_CONFIRMATION",
    ],
  },
  ADRESSE: {
    id: "ADRESSE",
    label: "Adresse",
    label_en: "Address",
    displayOrder: 40,
    questionIds: ["ADDRESS_POSTAL"],
  },
  KURZANAMNESE: {
    id: "KURZANAMNESE",
    label: "Kurzanamnese",
    label_en: "Brief medical history",
    displayOrder: 60,
    conditionalRules: [
      // Pilot Phase 1: Name des Hausarztes nur bei "Ja"
      {
        action: "showQuestion",
        targetId: "ANAMNESE_GP_NAME",
        condition: {
          target: { kind: "question", questionId: "ANAMNESE_GP" },
          operator: "equals",
          value: "ja",
        },
      },
    ],
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
    displayOrder: 70,
    hint: "Bitte beachten Sie: Die maximale rückwirkende Ausstellungsdauer ist gesetzlich begrenzt.",
    hint_en: "Please note: the maximum retroactive issuance period is limited by law.",
    questionIds: ["AU_SYMPTOMS", "AU_SYMPTOMS_OTHER_TEXT", "AU_START_DATE", "AU_END_DATE", "AU_IS_FOLLOWUP"],
  },
  REZEPT: {
    id: "REZEPT",
    label: "Rezept",
    displayOrder: 80,
    questionIds: [
      "PRESCRIPTION_TYPE",
      "PRESCRIPTION_MEDICATION",
      "PRESCRIPTION_REPEAT_KNOWN",
    ],
  },
  UEBERWEISUNG: {
    id: "UEBERWEISUNG",
    label: "Überweisung",
    displayOrder: 90,
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
    displayOrder: 110,
    questionIds: [
      "HOSP_ADMISSION_REASON",
      "HOSP_ADMISSION_IS_CONTROL",
      "HOSP_ADMISSION_DATE",
    ],
  },
  TRANSPORT: {
    id: "TRANSPORT",
    label: "Krankenbeförderung / Krankentransport",
    displayOrder: 120,
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
  FACHAERZTE: {
    id: "FACHAERZTE",
    label: "Fachärzte",
    label_en: "Specialists",
    displayOrder: 130,
    description: "Angaben zu behandelnden Fachärzten",
    description_en: "Information about treating specialists",
    questionIds: ["FACHAERZTE"],
  },
  VOLLST_BASISDATEN: {
    id: "VOLLST_BASISDATEN",
    label: "Basisdaten (vollst\u00e4ndig)",
    displayOrder: 135,
    conditionalRules: [
      {
        action: "showQuestion",
        targetId: "VOLLST_GENDER_FREITEXT",
        condition: {
          target: { kind: "question", questionId: "VOLLST_GENDER" },
          operator: "equals",
          value: "andere Geschlechtsidentit\u00e4t",
        },
      },
    ],
    questionIds: ["VOLLST_AGE", "VOLLST_SEX", "VOLLST_GENDER", "VOLLST_GENDER_FREITEXT", "VOLLST_PRONOMEN", "VOLLST_HEIGHT", "VOLLST_WEIGHT"],
  },
  VOLLST_ERKRANKUNGEN: {
    id: "VOLLST_ERKRANKUNGEN",
    label: "Erkrankungen und Medikamente (vollständig)",
    displayOrder: 140,
    conditionalRules: [
      {
        action: "showQuestion",
        targetId: "VOLLST_ERKR_EINTRAEGE",
        condition: {
          mode: "OR",
          conditions: [
            {
              target: { kind: "question", questionId: "VOLLST_ERKR_GATE" },
              operator: "equals",
              value: "Ja",
            },
            {
              target: { kind: "question", questionId: "VOLLST_ERKR_GATE" },
              operator: "equals",
              value: "Wei\u00df ich nicht / unsicher",
            },
          ],
        },
      },
    ],
    questionIds: ["VOLLST_ERKR_GATE", "VOLLST_ERKR_EINTRAEGE"],
  },
  VOLLST_ALLERGIEN: {
    id: "VOLLST_ALLERGIEN",
    label: "Allergien und Unverträglichkeiten (vollständig)",
    displayOrder: 150,
    conditionalRules: [
      {
        action: "showQuestion",
        targetId: "VOLLST_ALLERG_EINTRAEGE",
        condition: {
          target: { kind: "question", questionId: "VOLLST_ALLERG_GATE" },
          operator: "equals",
          value: "Ja",
        },
      },
    ],
    questionIds: ["VOLLST_ALLERG_GATE", "VOLLST_ALLERG_EINTRAEGE"],
  },
  VOLLST_INFEKTIONEN: {
    id: "VOLLST_INFEKTIONEN",
    label: "Infektionskrankheiten (vollständig)",
    displayOrder: 160,
    conditionalRules: [
      {
        action: "showQuestion",
        targetId: "VOLLST_INFEKT_EINTRAEGE",
        condition: {
          target: { kind: "question", questionId: "VOLLST_INFEKT_GATE" },
          operator: "equals",
          value: "Ja",
        },
      },
    ],
    questionIds: ["VOLLST_INFEKT_GATE", "VOLLST_INFEKT_EINTRAEGE"],
  },
  VOLLST_FAMILIENANAMNESE: {
    id: "VOLLST_FAMILIENANAMNESE",
    label: "Familienanamnese (vollständig)",
    displayOrder: 170,
    conditionalRules: [
      {
        action: "showQuestion",
        targetId: "VOLLST_FAMIL_EINTRAEGE",
        condition: {
          target: { kind: "question", questionId: "VOLLST_FAMIL_GATE" },
          operator: "equals",
          value: "Ja",
        },
      },
    ],
    questionIds: ["VOLLST_FAMIL_GATE", "VOLLST_FAMIL_EINTRAEGE"],
  },
  VOLLST_IMPFSTATUS: {
    id: "VOLLST_IMPFSTATUS",
    label: "Impfstatus (vollständig)",
    displayOrder: 180,
    conditionalRules: [
      {
        action: "showQuestion",
        targetId: "VOLLST_IMPF_BERATUNG",
        condition: {
          mode: "OR",
          conditions: [
            {
              target: { kind: "question", questionId: "VOLLST_IMPF_BEKANNT" },
              operator: "equals",
              value: "Nein",
            },
            {
              target: { kind: "question", questionId: "VOLLST_IMPF_BEKANNT" },
              operator: "equals",
              value: "Unsicher",
            },
            {
              target: { kind: "question", questionId: "VOLLST_IMPF_NACHWEIS" },
              operator: "equals",
              value: "Nein",
            },
          ],
        },
      },
    ],
    questionIds: [
      "VOLLST_IMPF_BEKANNT",
      "VOLLST_IMPF_NACHWEIS",
      "VOLLST_IMPF_ABLEHNUNG",
      "VOLLST_IMPF_BERATUNG",
    ],
  },
  VOLLST_VERSORGUNGSSTATUS: {
    id: "VOLLST_VERSORGUNGSSTATUS",
    label: "Versorgungsstatus",
    displayOrder: 190,
    conditionalRules: [
      {
        action: "showQuestion",
        targetId: "VOLLST_VERS_PFLEGEGRAD_STUFE",
        condition: {
          target: { kind: "question", questionId: "VOLLST_VERS_PFLEGEGRAD" },
          operator: "equals",
          value: "Ja",
        },
      },
      {
        action: "showQuestion",
        targetId: "VOLLST_VERS_GDB_WERT",
        condition: {
          target: { kind: "question", questionId: "VOLLST_VERS_GDB" },
          operator: "equals",
          value: "Ja",
        },
      },
      {
        action: "showQuestion",
        targetId: "VOLLST_VERS_PROTHESEN_TEXT",
        condition: {
          target: { kind: "question", questionId: "VOLLST_VERS_PROTHESEN" },
          operator: "equals",
          value: "Ja",
        },
      },
    ],
    questionIds: [
      "VOLLST_VERS_PFLEGEGRAD",
      "VOLLST_VERS_PFLEGEGRAD_STUFE",
      "VOLLST_VERS_GDB",
      "VOLLST_VERS_GDB_WERT",
      "VOLLST_VERS_PROTHESEN",
      "VOLLST_VERS_PROTHESEN_TEXT",
    ],
  },
  VOLLST_NIKOTIN: {
    id: "VOLLST_NIKOTIN",
    label: "Nikotin / Tabak (vollständig)",
    displayOrder: 200,
    conditionalRules: [
      // Produkt + Dauer: bei aktuell oder früher
      {
        action: "showQuestion",
        targetId: "NIKOTIN_PRODUKT",
        condition: {
          mode: "OR",
          conditions: [
            { target: { kind: "question", questionId: "NIKOTIN_GATE" }, operator: "equals", value: "Ja, aktuell" },
            { target: { kind: "question", questionId: "NIKOTIN_GATE" }, operator: "equals", value: "Früher, inzwischen aufgehört" },
          ],
        },
      },
      {
        action: "showQuestion",
        targetId: "NIKOTIN_PRODUKT_ANDERE",
        condition: {
          target: { kind: "question", questionId: "NIKOTIN_PRODUKT" },
          operator: "equals",
          value: "anderes",
        },
      },
      {
        action: "showQuestion",
        targetId: "NIKOTIN_DAUER_JAHRE",
        condition: {
          mode: "OR",
          conditions: [
            { target: { kind: "question", questionId: "NIKOTIN_GATE" }, operator: "equals", value: "Ja, aktuell" },
            { target: { kind: "question", questionId: "NIKOTIN_GATE" }, operator: "equals", value: "Früher, inzwischen aufgehört" },
          ],
        },
      },
      // Zigaretten/Tag: nur bei Produkt = Zigaretten (Gate-Guard entfällt: Produkt nur bei aktiv/früher sichtbar)
      {
        action: "showQuestion",
        targetId: "NIKOTIN_ZIG_PRO_TAG",
        condition: {
          target: { kind: "question", questionId: "NIKOTIN_PRODUKT" },
          operator: "equals",
          value: "Zigaretten",
        },
      },
      // Aufhörzeitpunkt: nur bei früher
      {
        action: "showQuestion",
        targetId: "NIKOTIN_AUFGEHOERT_VOR",
        condition: {
          target: { kind: "question", questionId: "NIKOTIN_GATE" },
          operator: "equals",
          value: "Früher, inzwischen aufgehört",
        },
      },
      // Aufhörversuch + Motivation + Unterstützung: nur bei aktuell
      {
        action: "showQuestion",
        targetId: "NIKOTIN_AUFHOERVERSUCH",
        condition: {
          target: { kind: "question", questionId: "NIKOTIN_GATE" },
          operator: "equals",
          value: "Ja, aktuell",
        },
      },
      // Längste Rauchfreiheit: Aufhörversuch ist ein Ja-Wert
      {
        action: "showQuestion",
        targetId: "NIKOTIN_RAUCHFREI_DAUER",
        condition: {
          mode: "OR",
          conditions: [
            {
              target: { kind: "question", questionId: "NIKOTIN_AUFHOERVERSUCH" },
              operator: "equals",
              value: "Ja, ohne professionelle Unterstützung",
            },
            {
              target: { kind: "question", questionId: "NIKOTIN_AUFHOERVERSUCH" },
              operator: "equals",
              value: "Ja, mit professioneller Unterstützung",
            },
          ],
        },
      },
      {
        action: "showQuestion",
        targetId: "NIKOTIN_MOTIVATION",
        condition: {
          target: { kind: "question", questionId: "NIKOTIN_GATE" },
          operator: "equals",
          value: "Ja, aktuell",
        },
      },
      {
        action: "showQuestion",
        targetId: "NIKOTIN_UNTERSTUETZUNG",
        condition: {
          target: { kind: "question", questionId: "NIKOTIN_GATE" },
          operator: "equals",
          value: "Ja, aktuell",
        },
      },
    ],
    questionIds: [
      "NIKOTIN_GATE",
      "NIKOTIN_PRODUKT",
      "NIKOTIN_PRODUKT_ANDERE",
      "NIKOTIN_DAUER_JAHRE",
      "NIKOTIN_ZIG_PRO_TAG",
      "NIKOTIN_AUFGEHOERT_VOR",
      "NIKOTIN_AUFHOERVERSUCH",
      "NIKOTIN_RAUCHFREI_DAUER",
      "NIKOTIN_MOTIVATION",
      "NIKOTIN_UNTERSTUETZUNG",
    ],
  },
  VOLLST_ALKOHOL: {
    id: "VOLLST_ALKOHOL",
    label: "Alkohol (vollständig)",
    displayOrder: 210,
    conditionalRules: [
      // gelegentlich → kurze Vertiefung
      {
        action: "showQuestion",
        targetId: "ALKOHOL_FRUEHER_MEHR",
        condition: {
          target: { kind: "question", questionId: "ALKOHOL_GATE" },
          operator: "equals",
          value: "Ja, gelegentlich",
        },
      },
      // regelmäßig → vertiefte Fragen
      {
        action: "showQuestion",
        targetId: "ALKOHOL_HAEUFIGKEIT",
        condition: {
          target: { kind: "question", questionId: "ALKOHOL_GATE" },
          operator: "equals",
          value: "Ja, regelmäßig",
        },
      },
      {
        action: "showQuestion",
        targetId: "ALKOHOL_MENGE",
        condition: {
          target: { kind: "question", questionId: "ALKOHOL_GATE" },
          operator: "equals",
          value: "Ja, regelmäßig",
        },
      },
      {
        action: "showQuestion",
        targetId: "ALKOHOL_VERSUCH",
        condition: {
          target: { kind: "question", questionId: "ALKOHOL_GATE" },
          operator: "equals",
          value: "Ja, regelmäßig",
        },
      },
      // Behandlung – Regel 1: regelmäßig (einfache Bedingung)
      {
        action: "showQuestion",
        targetId: "ALKOHOL_BEHANDLUNG",
        condition: {
          target: { kind: "question", questionId: "ALKOHOL_GATE" },
          operator: "equals",
          value: "Ja, regelmäßig",
        },
      },
      // Behandlung – Regel 2: gelegentlich AND früher deutlich mehr = Ja
      // Zwei Regeln auf dasselbe Target = implizites OR zwischen den Regeln
      {
        action: "showQuestion",
        targetId: "ALKOHOL_BEHANDLUNG",
        condition: {
          mode: "AND",
          conditions: [
            {
              target: { kind: "question", questionId: "ALKOHOL_GATE" },
              operator: "equals",
              value: "Ja, gelegentlich",
            },
            {
              target: { kind: "question", questionId: "ALKOHOL_FRUEHER_MEHR" },
              operator: "equals",
              value: "Ja",
            },
          ],
        },
      },
      // Behandlungsdetails: bei aktuell oder früher
      {
        action: "showQuestion",
        targetId: "ALKOHOL_BEHANDLUNG_ART",
        condition: {
          mode: "OR",
          conditions: [
            { target: { kind: "question", questionId: "ALKOHOL_BEHANDLUNG" }, operator: "equals", value: "Ja, aktuell" },
            { target: { kind: "question", questionId: "ALKOHOL_BEHANDLUNG" }, operator: "equals", value: "Ja, früher" },
          ],
        },
      },
      {
        action: "showQuestion",
        targetId: "ALKOHOL_BEHANDLUNG_NAME",
        condition: {
          mode: "OR",
          conditions: [
            { target: { kind: "question", questionId: "ALKOHOL_BEHANDLUNG" }, operator: "equals", value: "Ja, aktuell" },
            { target: { kind: "question", questionId: "ALKOHOL_BEHANDLUNG" }, operator: "equals", value: "Ja, früher" },
          ],
        },
      },
      {
        action: "showQuestion",
        targetId: "ALKOHOL_BEHANDLUNG_ORT",
        condition: {
          mode: "OR",
          conditions: [
            { target: { kind: "question", questionId: "ALKOHOL_BEHANDLUNG" }, operator: "equals", value: "Ja, aktuell" },
            { target: { kind: "question", questionId: "ALKOHOL_BEHANDLUNG" }, operator: "equals", value: "Ja, früher" },
          ],
        },
      },
      // Motivation + Unterstützung: ausschließlich bei regelmäßig
      {
        action: "showQuestion",
        targetId: "ALKOHOL_MOTIVATION",
        condition: {
          target: { kind: "question", questionId: "ALKOHOL_GATE" },
          operator: "equals",
          value: "Ja, regelmäßig",
        },
      },
      {
        action: "showQuestion",
        targetId: "ALKOHOL_UNTERSTUETZUNG",
        condition: {
          target: { kind: "question", questionId: "ALKOHOL_GATE" },
          operator: "equals",
          value: "Ja, regelmäßig",
        },
      },
    ],
    questionIds: [
      "ALKOHOL_GATE",
      "ALKOHOL_FRUEHER_MEHR",
      "ALKOHOL_HAEUFIGKEIT",
      "ALKOHOL_MENGE",
      "ALKOHOL_VERSUCH",
      "ALKOHOL_BEHANDLUNG",
      "ALKOHOL_BEHANDLUNG_ART",
      "ALKOHOL_BEHANDLUNG_NAME",
      "ALKOHOL_BEHANDLUNG_ORT",
      "ALKOHOL_MOTIVATION",
      "ALKOHOL_UNTERSTUETZUNG",
    ],
  },
  VOLLST_SUBSTANZEN: {
    id: "VOLLST_SUBSTANZEN",
    label: "Andere Substanzen / Drogen (vollständig)",
    displayOrder: 220,
    conditionalRules: [
      {
        action: "showQuestion",
        targetId: "SUBST_EINTRAEGE",
        condition: {
          mode: "OR",
          conditions: [
            { target: { kind: "question", questionId: "SUBST_GATE" }, operator: "equals", value: "Ja, aktuell" },
            { target: { kind: "question", questionId: "SUBST_GATE" }, operator: "equals", value: "Früher" },
          ],
        },
      },
    ],
    questionIds: ["SUBST_GATE", "SUBST_EINTRAEGE"],
  },
  VOLLST_PRAEVENTION: {
    id: "VOLLST_PRAEVENTION",
    label: "Pr\u00e4vention und Beratungsw\u00fcnsche",
    displayOrder: 230,
    conditionalRules: [
      // Check-up-Status: nur ab Alter 35 (Derived Value AGE)
      {
        action: "showQuestion",
        targetId: "VOLLST_CHECKUP_STATUS",
        condition: {
          target: { kind: "derived", derivedId: "AGE" },
          operator: "greaterThanOrEqual",
          value: 35,
        },
      },
      // Beratungswunsch Check-up: wenn Status = noch nie / l\u00e4nger her / unbekannt
      {
        action: "showQuestion",
        targetId: "VOLLST_CHECKUP_BERATUNG",
        condition: {
          mode: "OR",
          conditions: [
            { target: { kind: "question", questionId: "VOLLST_CHECKUP_STATUS" }, operator: "equals", value: "Noch nie" },
            { target: { kind: "question", questionId: "VOLLST_CHECKUP_STATUS" }, operator: "equals", value: "Vor mehr als 3 Jahren" },
            { target: { kind: "question", questionId: "VOLLST_CHECKUP_STATUS" }, operator: "equals", value: "Wei\u00df ich nicht" },
          ],
        },
      },
      // Lungenkrebs-Beratungsangebot – G-BA-Kriterien seit April 2026 (konservative Vorauswahl):
      // Alter 50–75, ≥15 Pack-Years, ≥25 Rauchjahre, Zigaretten, aktuell rauchend.
      {
        action: "showQuestion",
        targetId: "VOLLST_LUNGENSCREENING_BERATUNG",
        condition: {
          mode: "AND",
          conditions: [
            { target: { kind: "derived", derivedId: "AGE" }, operator: "greaterThanOrEqual", value: 50 },
            { target: { kind: "derived", derivedId: "AGE" }, operator: "lessThanOrEqual", value: 75 },
            { target: { kind: "derived", derivedId: "PACK_YEARS" }, operator: "greaterThanOrEqual", value: 15 },
            { target: { kind: "derived", derivedId: "SMOKING_DURATION_YEARS" }, operator: "greaterThanOrEqual", value: 25 },
            { target: { kind: "question", questionId: "NIKOTIN_GATE" }, operator: "equals", value: "Ja, aktuell" },
            { target: { kind: "question", questionId: "NIKOTIN_PRODUKT" }, operator: "equals", value: "Zigaretten" },
          ],
        },
      },
      // Zweite Regel (implizites OR): ehemalige Raucher, vor weniger als 10 Jahren aufgehört.
      {
        action: "showQuestion",
        targetId: "VOLLST_LUNGENSCREENING_BERATUNG",
        condition: {
          mode: "AND",
          conditions: [
            { target: { kind: "derived", derivedId: "AGE" }, operator: "greaterThanOrEqual", value: 50 },
            { target: { kind: "derived", derivedId: "AGE" }, operator: "lessThanOrEqual", value: 75 },
            { target: { kind: "derived", derivedId: "PACK_YEARS" }, operator: "greaterThanOrEqual", value: 15 },
            { target: { kind: "derived", derivedId: "SMOKING_DURATION_YEARS" }, operator: "greaterThanOrEqual", value: 25 },
            { target: { kind: "derived", derivedId: "SMOKING_STOPPED_YEARS_AGO" }, operator: "lessThan", value: 10 },
            { target: { kind: "question", questionId: "NIKOTIN_GATE" }, operator: "equals", value: "Fr\u00fcher, inzwischen aufgeh\u00f6rt" },
            { target: { kind: "question", questionId: "NIKOTIN_PRODUKT" }, operator: "equals", value: "Zigaretten" },
          ],
        },
      },
      // Unterst\u00fctzungswunsch Gewicht: bei jeglichem Ver\u00e4nderungswunsch oder Unsicherheit
      {
        action: "showQuestion",
        targetId: "VOLLST_GEWICHT_UNTERSTUETZUNG",
        condition: {
          mode: "OR",
          conditions: [
            { target: { kind: "question", questionId: "VOLLST_GEWICHT_VERAENDERN" }, operator: "equals", value: "Ja, ich m\u00f6chte Gewicht reduzieren" },
            { target: { kind: "question", questionId: "VOLLST_GEWICHT_VERAENDERN" }, operator: "equals", value: "Ja, ich m\u00f6chte Gewicht zunehmen" },
            { target: { kind: "question", questionId: "VOLLST_GEWICHT_VERAENDERN" }, operator: "equals", value: "Ich bin mir unsicher" },
          ],
        },
      },
    ],
    questionIds: [
      "VOLLST_CHECKUP_STATUS",
      "VOLLST_CHECKUP_BERATUNG",
      "VOLLST_LUNGENSCREENING_BERATUNG",
      "VOLLST_GEWICHT_VERAENDERN",
      "VOLLST_GEWICHT_UNTERSTUETZUNG",
    ],
  },
};

/** Sortierte Block-IDs nach displayOrder. */
export const BLOCK_IDS_SORTED: string[] = Object.values(BLOCK_CATALOG)
  .sort((a, b) => a.displayOrder - b.displayOrder)
  .map((b) => b.id);

/** Block-IDs der vollst\u00e4ndigen patientenseitigen Anamnese (nur Deutsch). */
export const VOLLSTAENDIGE_ANAMNESE_PRESET: string[] = [
  "VOLLST_BASISDATEN",
  "VOLLST_ERKRANKUNGEN",
  "VOLLST_ALLERGIEN",
  "VOLLST_INFEKTIONEN",
  "VOLLST_FAMILIENANAMNESE",
  "VOLLST_IMPFSTATUS",
  "VOLLST_VERSORGUNGSSTATUS",
  "VOLLST_NIKOTIN",
  "VOLLST_ALKOHOL",
  "VOLLST_SUBSTANZEN",
  "VOLLST_PRAEVENTION",
];
