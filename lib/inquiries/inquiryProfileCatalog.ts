import { InquiryType, type InquiryProfile, type InquiryProfileV2 } from "@/lib/inquiries/types";

/**
 * Statischer Profil-Katalog für den Anfrage-Assistenten.
 *
 * Jeder Eintrag definiert die Kernantwort und die geordnete Checkpoint-Liste
 * für einen Anfragetyp. Profile sind unveränderlich – bestehende Sessions
 * verwenden immer einen eingefrorenen Snapshot des Profils.
 */
export const INQUIRY_PROFILE_CATALOGUE: Record<InquiryType, InquiryProfile> = {
  [InquiryType.FSME_IMPFUNG]: {
    type: InquiryType.FSME_IMPFUNG,
    label: "FSME-Impfung",
    coreAnswer:
      "Vielen Dank für Ihre Anfrage. Ein Termin zur FSME-Impfung kann über unseren Online-Kalender gebucht werden.",
    checkpointIds: ["IC01", "IC02", "IC03", "IC04", "IC05", "IC06"],
  },
};

// ---------------------------------------------------------------------------
// Neuer Profil-Katalog (Architektur v2)
// ---------------------------------------------------------------------------

/**
 * Profil-Katalog nach der neuen Architektur.
 *
 * Jedes Profil bindet einen DECISION-Checkpoint, spezifische Checkpoints,
 * gebundene globale Checkpoints und verfügbare Aktionen.
 * Globale Checkpoints werden bei mehreren Anliegen in M2 nur einmal abgefragt.
 */
export const INQUIRY_PROFILE_CATALOG_V2: Record<string, InquiryProfileV2> = {
  AU: {
    id: "AU",
    label: "AU / Arbeitsunfähigkeitsbescheinigung",
    decisionCheckpointId: "AU_DECISION",
    specificCheckpointIds: [
      "AU_BACKDATE_LIMIT",
      "AU_WORK_ACCIDENT",
      "AU_CHILD_SICK",
      "AU_CONTINUITY_REQUIRED",
      "AU_RETURN_TO_WORK",
    ],
    boundGlobalCheckpointIds: [
      "IS_NEW_PATIENT",
      "PATIENT_NOT_IN_GERMANY",
      "DOCTOR_REVIEW_REQUIRED",
      "DATA_INCOMPLETE",
    ],
    availableActionIds: [
      "DIGITAL_REQUEST",
      "ONLINE_ANAMNESIS",
      "BOOK_APPOINTMENT",
      "OPEN_CONSULTATION",
      "PROCESSING_DELAY",
      "TECHNICAL_ISSUE",
    ],
    globalHints: {
      IS_NEW_PATIENT: "Bei Neupatienten können Arbeitsunfähigkeitsbescheinigungen über eine digitale Anfrage für maximal drei Tage ausgestellt werden; bei bereits bekannten Patienten sind bis zu fünf Tage möglich.",
      PATIENT_NOT_IN_GERMANY: "AU-Hinweis: Aufenthalt in Deutschland relevant.",
      DOCTOR_REVIEW_REQUIRED: "AU-Hinweis: ärztliche Einschätzung erforderlich.",
      DATA_INCOMPLETE: "AU-Hinweis: Angaben / Daten unvollständig.",
    },
  },

  PRESCRIPTION: {
    id: "PRESCRIPTION",
    label: "Rezept",
    decisionCheckpointId: "PRESCRIPTION_DECISION",
    specificCheckpointIds: [
      "PRESCRIPTION_CONTROL_OVERDUE",
      "PRESCRIPTION_SPECIALIST_REPORT_REQUIRED",
      "PRESCRIPTION_BTM_ADHS_RULES",
      "PRESCRIPTION_PRIVATE_ONLY",
      "PRESCRIPTION_GYN_EXCLUSIVITY",
      "PRESCRIPTION_NO_POSTAL_DELIVERY",
    ],
    boundGlobalCheckpointIds: [
      "IS_NEW_PATIENT",
      "PATIENT_NOT_IN_GERMANY",
      "DOCTOR_REVIEW_REQUIRED",
      "DATA_INCOMPLETE",
      "IS_CHRONIC_PATIENT",
    ],
    availableActionIds: [
      "DIGITAL_REQUEST",
      "ONLINE_ANAMNESIS",
      "BOOK_APPOINTMENT",
      "OPEN_CONSULTATION",
      "E_RECIPE_USE",
      "PHARMACY_INFORMATION",
      "DOCUMENT_UPLOAD",
      "PROCESSING_DELAY",
      "TECHNICAL_ISSUE",
    ],
    globalHints: {
      IS_NEW_PATIENT: "Rezept-Hinweis: Neupatient, Termin erforderlich.",
      PATIENT_NOT_IN_GERMANY: "Rezept-Hinweis: Aufenthalt außerhalb Deutschlands.",
      DOCTOR_REVIEW_REQUIRED: "Rezept-Hinweis: ärztliche Prüfung notwendig.",
      DATA_INCOMPLETE: "Rezept-Hinweis: Unterlagen / Daten fehlen.",
      IS_CHRONIC_PATIENT: "Rezept-Hinweis: regelmäßige Kontrolle bei Dauermedikation erforderlich.",
    },
  },

  LAB: {
    id: "LAB",
    label: "Labor",
    decisionCheckpointId: "LAB_DECISION",
    specificCheckpointIds: [
      "LAB_CHECKUP_RULES",
      "LAB_FASTING_REQUIRED",
      "LAB_SELF_PAYER_IGEL",
      "LAB_DISCUSSION_PROCESS_CODE",
      "LAB_MPU_EXCLUSION",
    ],
    boundGlobalCheckpointIds: [
      "IS_NEW_PATIENT",
      "PATIENT_NOT_IN_GERMANY",
      "DOCTOR_REVIEW_REQUIRED",
      "DATA_INCOMPLETE",
      "IS_CHRONIC_PATIENT",
    ],
    availableActionIds: [
      "ONLINE_ANAMNESIS",
      "BOOK_APPOINTMENT",
      "OPEN_CONSULTATION",
      "URINE_SAMPLE_ONSITE",
    ],
    globalHints: {
      IS_NEW_PATIENT: "Labor-Hinweis: Erstvorstellung vor Labordiagnostik erforderlich.",
      PATIENT_NOT_IN_GERMANY: "Labor-Hinweis: Videosprechstunde / Besprechung bei Aufenthalt außerhalb Deutschlands nicht möglich.",
      DOCTOR_REVIEW_REQUIRED: "Labor-Hinweis: ärztliche Klärung vor Terminvergabe oder Laboranforderung notwendig.",
      DATA_INCOMPLETE: "Labor-Hinweis: Angaben oder Versicherungsdaten fehlen.",
      IS_CHRONIC_PATIENT: "Labor-Hinweis: regelmäßige Verlaufskontrolle relevant.",
    },
  },

  SAMPLE_COLLECTION: {
    id: "SAMPLE_COLLECTION",
    label: "Urin- und Stuhlprobe",
    decisionCheckpointId: "SAMPLE_COLLECTION_DECISION",
    specificCheckpointIds: [
      "URINE_SAMPLE_INSTRUCTIONS",
      "STOOL_SAMPLE_INSTRUCTIONS",
      "SAMPLE_HANDOVER",
      "LAB_RESULT_TIME",
    ],
    boundGlobalCheckpointIds: [
      "IS_NEW_PATIENT",
      "PATIENT_NOT_IN_GERMANY",
      "DOCTOR_REVIEW_REQUIRED",
      "DATA_INCOMPLETE",
    ],
    availableActionIds: [
      "BOOK_APPOINTMENT",
      "OPEN_CONSULTATION",
      "PROCESSING_DELAY",
      "TECHNICAL_ISSUE",
    ],
    globalHints: {
      IS_NEW_PATIENT: "Proben-Hinweis: Bitte melden Sie sich vorab in unserer Praxis an.",
      PATIENT_NOT_IN_GERMANY: "Proben-Hinweis: Die Probenabgabe ist nur vor Ort in der Praxis möglich.",
      DOCTOR_REVIEW_REQUIRED: "Proben-Hinweis: Vor der Probenabgabe ist eine ärztliche Klärung erforderlich.",
      DATA_INCOMPLETE: "Proben-Hinweis: Für die Zuordnung der Probe werden vollständige Patientendaten benötigt.",
    },
  },
};
