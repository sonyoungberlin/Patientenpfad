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
      PATIENT_NOT_IN_GERMANY: "Eine AU-Bescheinigung setzt in der Regel einen Aufenthalt in Deutschland voraus.",
    },
  },

  PRESCRIPTION: {
    id: "PRESCRIPTION",
    label: "Rezept",
    decisionCheckpointId: "PRESCRIPTION_DECISION",
    specificCheckpointIds: [
      "PRESCRIPTION_STATUTORY_POSSIBLE",
      "PRESCRIPTION_BTM_ADHS_RULES",
      "PRESCRIPTION_SPECIALIST_REPORT_REQUIRED",
      "PRESCRIPTION_GYN_EXCLUSIVITY",
      "PRESCRIPTION_NO_POSTAL_DELIVERY",
    ],
    boundGlobalCheckpointIds: [
      "IS_CHRONIC_PATIENT",
      "PATIENT_NOT_IN_GERMANY",
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
      PATIENT_NOT_IN_GERMANY: "Rezepte können in deutschen Apotheken zuverlässig eingelöst werden. Im Ausland kann die Einlösung eingeschränkt sein.",
      IS_CHRONIC_PATIENT: "Bei Dauermedikation sind regelmäßige Kontrolltermine vorgesehen.",
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
      "IS_CHRONIC_PATIENT",
    ],
    availableActionIds: [
      "ONLINE_ANAMNESIS",
      "BOOK_APPOINTMENT",
      "OPEN_CONSULTATION",
      "URINE_SAMPLE_ONSITE",
    ],
    globalHints: {
      IS_NEW_PATIENT: "Bei Neupatienten erfolgt die Labordiagnostik in der Regel nach einer Erstvorstellung.",
      PATIENT_NOT_IN_GERMANY: "Die Besprechung von Laborbefunden per Videosprechstunde ist bei Aufenthalt außerhalb Deutschlands nicht möglich.",
      IS_CHRONIC_PATIENT: "Bei chronischen Erkrankungen sind regelmäßige Verlaufskontrollen vorgesehen.",
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
    boundGlobalCheckpointIds: [],
    availableActionIds: [
      "BOOK_APPOINTMENT",
      "OPEN_CONSULTATION",
      "PROCESSING_DELAY",
      "TECHNICAL_ISSUE",
    ],
    globalHints: {},
  },

  ACUTE_CARE: {
    id: "ACUTE_CARE",
    label: "Akuttermin / offene Sprechstunde",
    decisionCheckpointId: "ACUTE_CARE_DECISION",
    specificCheckpointIds: [
      "ACUTE_PURPOSE",
      "ACUTE_EXCLUSION",
      "ACUTE_APPOINTMENT_INFO",
      "OPEN_CONSULTATION_INFO",
      "WAITING_TIME",
      "CAPACITY_LIMIT",
      "CHRONIC_EXCLUSION",
      "INFECTIOUS_PROTOCOL",
    ],
    boundGlobalCheckpointIds: [],
    availableActionIds: [
      "BOOK_APPOINTMENT",
      "OPEN_CONSULTATION",
      "PROCESSING_DELAY",
      "TECHNICAL_ISSUE",
    ],
    globalHints: {},
  },

  REFERRAL: {
    id: "REFERRAL",
    label: "Überweisung",
    decisionCheckpointId: "REFERRAL_DECISION",
    specificCheckpointIds: [
      "REF_DOCTOR_CONTACT_REQUIRED",
      "REF_ORIGINAL_VS_PDF",
      "REF_PSYCHOTHERAPY_FIRST_STEP",
      "REF_SPECIALTY_REQUIRED",
      "REF_BOOKING_CODE_PROCESS",
    ],
    boundGlobalCheckpointIds: [
      "IS_NEW_PATIENT",
    ],
    availableActionIds: [
      "BOOK_APPOINTMENT",
      "OPEN_CONSULTATION",
      "PROCESSING_DELAY",
      "TECHNICAL_ISSUE",
    ],
    globalHints: {
      IS_NEW_PATIENT: "Bei Erstpatienten erfolgt die Ausstellung einer Überweisung in der Regel nach persönlicher Vorstellung.",
    },
  },
};
