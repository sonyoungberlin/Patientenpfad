export const PROCESS_SHELF_GROUPS = {
  missingInfoOrDocuments: {
    label: "Fehlende Angaben / Unterlagen",
    checkpointIds: [
      "AU_MISSING_QUESTIONNAIRE",
      "PRESCRIPTION_MEDICATION_UNCLEAR",
      "PRESCRIPTION_DOSAGE_UNCLEAR",
      "PRESCRIPTION_MEDICATION_NOT_DOCUMENTED",
      "PRESCRIPTION_INDICATION_NOT_DOCUMENTED",
      "PRESCRIPTION_SPECIALIST_REPORT_REQUIRED",
      "HOSPITAL_DISCHARGE_REPORT_MISSING",
      "REF_SPECIALTY_REQUIRED",
      "APPOINTMENT_DATA_INCOMPLETE",
      "APPOINTMENT_REASON_UNCLEAR",
    ] as const,
  },
  documentsAndUpload: {
    label: "Dokumente & Upload",
    checkpointIds: [
      "DOCUMENT_UPLOAD",
      "TECH_UPLOAD_FAILED",
    ] as const,
  },
  insuranceData: {
    label: "Versicherungsdaten",
    checkpointIds: [
      "INSURANCE_DATA_APP_TRANSFER",
      "AU_MISSING_EGK",
      "PRESCRIPTION_INSURANCE_PROOF_MISSING",
      "REFERRAL_INSURANCE_PROOF_MISSING",
      "APPOINTMENT_INSURANCE_PROOF_MISSING",
    ] as const,
  },
  appointmentsAndBooking: {
    label: "Termine & Buchung",
    checkpointIds: [
      "BOOK_APPOINTMENT",
      "APPOINTMENT_BOOK_GENERAL",
      "APPOINTMENT_BOOK_FINDINGS_REVIEW",
      "APPOINTMENT_BOOK_CHECKUP_SECOND",
      "APPOINTMENT_BOOK_CHRONIC_CONTROL",
      "REF_BOOKING_CODE_PROCESS",
    ] as const,
  },
  digitalRequest: {
    label: "Digitale Anfrage",
    checkpointIds: [
      "DIGITAL_REQUEST",
      "DIGITAL_REQUEST_REQUIRED",
      "DIGITAL_REQUEST_MEDICAL_REVIEW",
      "E_RECIPE_USE",
    ] as const,
  },
  waitingProcessingTechnical: {
    label: "Warten / Bearbeitung / technische Hinweise",
    checkpointIds: [
      "DIGITAL_REQUEST_PROCESSING_TIME",
      "PROCESSING_DELAY",
      "TECHNICAL_ISSUE",
      "TECHNICAL_ISSUE_DELAY",
      "STAFF_SHORTAGE_DELAY",
    ] as const,
  },
} as const;

export type ProcessShelfGroupId = keyof typeof PROCESS_SHELF_GROUPS;

export const PROCESS_SHELF_GROUP_ORDER: readonly ProcessShelfGroupId[] = [
  "missingInfoOrDocuments",
  "documentsAndUpload",
  "insuranceData",
  "appointmentsAndBooking",
  "digitalRequest",
  "waitingProcessingTechnical",
] as const;

export const ALL_PROCESS_SHELF_CHECKPOINT_IDS = PROCESS_SHELF_GROUP_ORDER.flatMap(
  (groupId) => [...PROCESS_SHELF_GROUPS[groupId].checkpointIds],
);

const PROCESS_SHELF_LOOKUP = new Map<string, ProcessShelfGroupId>();

for (const groupId of PROCESS_SHELF_GROUP_ORDER) {
  for (const checkpointId of PROCESS_SHELF_GROUPS[groupId].checkpointIds) {
    if (!PROCESS_SHELF_LOOKUP.has(checkpointId)) {
      PROCESS_SHELF_LOOKUP.set(checkpointId, groupId);
    }
  }
}

export function getProcessShelfGroupForCheckpointId(
  checkpointId: string,
): ProcessShelfGroupId | null {
  return PROCESS_SHELF_LOOKUP.get(checkpointId) ?? null;
}
