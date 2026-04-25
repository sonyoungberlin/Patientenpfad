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
    specificCheckpointIds: [
      "AU_BACKDATE_ALLOWED",
      "AU_DURATION_ALLOWED",
      "AU_REPEAT_WITHOUT_EXAM",
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
    ],
    globalHints: {
      IS_NEW_PATIENT: "AU-Hinweis: Neupatient / Erstkontakt relevant.",
      PATIENT_NOT_IN_GERMANY: "AU-Hinweis: Aufenthalt in Deutschland relevant.",
      DOCTOR_REVIEW_REQUIRED: "AU-Hinweis: ärztliche Einschätzung erforderlich.",
      DATA_INCOMPLETE: "AU-Hinweis: Angaben / Daten unvollständig.",
    },
  },
};
