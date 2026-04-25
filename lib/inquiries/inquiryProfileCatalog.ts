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
    specificFactIds: [
      "AU_BACKDATE_IN_RANGE",
      "AU_DURATION_IN_RANGE",
      "AU_PATIENT_KNOWN",
    ],
    boundGlobalFactIds: [
      "IN_GERMANY",
      "DOCTOR_ASSESSMENT_CONTEXT",
    ],
    decisionPossibleOutputBlockId: "AU_DECISION_POSSIBLE",
    decisionNotPossibleOutputBlockId: "AU_DECISION_NOT_POSSIBLE",
    availableOutputBlockIds: [
      "AU_REASON_TOO_LATE",
      "AU_REASON_ABROAD",
      "AU_REASON_DOCTOR_REQUIRED",
      "AU_INFO_KNOWN_PATIENT_5_DAYS",
      "AU_INFO_NEW_PATIENT_3_DAYS",
    ],
    availableActionIds: [
      "DIGITAL_REQUEST",
      "ONLINE_ANAMNESIS",
      "BOOK_APPOINTMENT",
    ],
  },
};
