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
    label: "AU / Krankschreibung",
    decisionCheckpointId: "AU_DECISION",
    specificCheckpointIds: [],
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
    ],
    globalHints: {
      IS_NEW_PATIENT: "AU-Hinweis: Neupatient / Erstkontakt relevant.",
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
      "PRESCRIPTION_KNOWN_MEDICATION",
      "PRESCRIPTION_FOLLOW_UP",
      "PRESCRIPTION_SPECIALIST_REQUIRED",
      "PRESCRIPTION_CONTROL_OVERDUE",
      "PRESCRIPTION_SPECIAL_TYPE",
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
      "LAB_MEDICAL_INDICATION",
      "LAB_CHECKUP_ELIGIBLE",
      "LAB_VALUES_DEFINED",
      "LAB_FASTING_REQUIRED",
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
    ],
    globalHints: {
      IS_NEW_PATIENT: "Labor-Hinweis: Erstvorstellung vor Labordiagnostik erforderlich.",
      PATIENT_NOT_IN_GERMANY: "Labor-Hinweis: Videosprechstunde / Besprechung bei Aufenthalt außerhalb Deutschlands nicht möglich.",
      DOCTOR_REVIEW_REQUIRED: "Labor-Hinweis: ärztliche Klärung vor Terminvergabe oder Laboranforderung notwendig.",
      DATA_INCOMPLETE: "Labor-Hinweis: Angaben oder Versicherungsdaten fehlen.",
      IS_CHRONIC_PATIENT: "Labor-Hinweis: regelmäßige Verlaufskontrolle relevant.",
    },
  },
};
