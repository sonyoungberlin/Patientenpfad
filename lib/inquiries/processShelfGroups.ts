export const PROCESS_SHELF_GROUPS = {
  missingInfoOrDocuments: {
    label: "Fehlende Angaben / Unterlagen",
    checkpointIds: [
      // AU
      "AU_MISSING_QUESTIONNAIRE",
      // Rezept
      "PRESCRIPTION_MEDICATION_UNCLEAR",
      "PRESCRIPTION_DOSAGE_UNCLEAR",
      "PRESCRIPTION_MEDICATION_NOT_DOCUMENTED",
      "PRESCRIPTION_INDICATION_NOT_DOCUMENTED",
      "PRESCRIPTION_SPECIALIST_REPORT_REQUIRED",
      "HOSPITAL_DISCHARGE_REPORT_MISSING",
      // Überweisung
      "REF_SPECIALTY_REQUIRED",
      // Termin
      "APPOINTMENT_DATA_INCOMPLETE",
      "APPOINTMENT_REASON_UNCLEAR",
      // Labor
      "LAB_INTERNAL_ORDER_MISSING",
      "LAB_SPECIALIST_REFERRAL_ORIGINAL_REQUIRED",
      // Krankenhauseinweisung
      "HOSPITAL_ADMISSION_MISSING_INFO",
      // Probenabgabe
      "SAMPLE_COLLECTION_INFORMATION_INCOMPLETE",
      "SAMPLE_COLLECTION_ORDER_UNCLEAR_OR_MISSING",
      // Impfung
      "IMMUNIZATION_STATUS_UNCLEAR",
      "IMMUNIZATION_VACCINATION_RECORD_MISSING",
      // Onboarding
      "ONBOARDING_DOCUMENT_MISSING",
      "ONBOARDING_DATA_UPDATE_REQUIRED",
      "ONBOARDING_IDENTITY_CLARIFICATION_REQUIRED",
      "ONBOARDING_PROVIDE_IDENTITY_DATA",
      "ONBOARDING_DATA_MISSING_CONTEXT",
      // Abrechnung
      "BILLING_DATA_MISSING",
      // Attest
      "MEDICAL_DOCUMENT_DOCUMENTATION_MISSING",
      "MEDICAL_DOCUMENTS_TRANSLATION_REQUIRED",
      // Versicherungsnummer
      "INSURANCE_NUMBER_INVALID_FORMAT",
    ] as const,
  },
  documentsAndUpload: {
    label: "Dokumente & Upload",
    checkpointIds: [
      "DOCUMENT_UPLOAD",
      "REF_ORIGINAL_VS_PDF",
      "HMV_PREVIOUS_ORDER_MISSING",
      "APPOINTMENT_EXTERNAL_FINDING_PRESENT",
      "ONBOARDING_GKV_DOCUMENT_MISSING",
      "ONBOARDING_PKV_PAS_MISSING",
      "MEDICAL_DOCUMENT_INFO_MISSING",
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
      // Allgemein
      "BOOK_APPOINTMENT",
      "CONTROL_APPOINTMENT_RECOMMENDED",
      // Termin-Profil
      "APPOINTMENT_BOOK_GENERAL",
      "APPOINTMENT_BOOK_FINDINGS_REVIEW",
      "APPOINTMENT_BOOK_CHECKUP_SECOND",
      "APPOINTMENT_BOOK_CHRONIC_CONTROL",
      "APPOINTMENT_INTERNAL_ORDER_EKG",
      "APPOINTMENT_BOOK_EKG_ORDER",
      "APPOINTMENT_INFO_TYPE_PURPOSE",
      "APPOINTMENT_INFO_BLOOD_DRAW_NOT_DOCTOR_VISIT",
      "APPOINTMENT_INFO_VIDEO_SCOPE",
      "APPOINTMENT_INFO_IN_PERSON_REQUIRED",
      "APPOINTMENT_INFO_CHECKUP_PURPOSE",
      "APPOINTMENT_INFO_CHRONIC_CONTROL_PURPOSE",
      "APPOINTMENT_INFO_SHORT_NOTICE_CANCELLATION_IMPACT",
      "APPOINTMENT_INFO_BOOKING_RESTRICTED_AFTER_NO_SHOW",
      "APPOINTMENT_INFO_BOOKING_REENABLED_AFTER_CLARIFICATION",
      // Überweisung
      "REF_BOOKING_CODE_PROCESS",
      // Labor
      "LAB_APPOINTMENT_INTERNAL",
      "LAB_APPOINTMENT_CHECKUP",
      "LAB_APPOINTMENT_INDIVIDUAL",
      "LAB_APPOINTMENT_DOCTOR",
      "LAB_SAMPLE_FOLLOWUP_APPOINTMENT_RECOMMENDED",
      // Impfung
      "IMMUNIZATION_BOOK_VACCINATION",
      "IMMUNIZATION_BOOK_COUNSELING",
      // Akut
      "ACUTE_OPEN_CONSULTATION_ACTION",
      "ACUTE_BOOKING_INFO",
      // Krankenhaus
      "TRANSPORT_QUESTIONNAIRE_REQUEST",
    ] as const,
  },
  digitalRequest: {
    label: "Digitale Anfrage",
    checkpointIds: [
      "DIGITAL_REQUEST",
      "DIGITAL_REQUEST_REQUIRED",
      "DIGITAL_REQUEST_MEDICAL_REVIEW",
      "E_RECIPE_USE",
      "PHARMACY_INFORMATION",
      "ONLINE_ANAMNESIS",
      "CARE_CHANNEL_CHOICE",
    ] as const,
  },
  waitingProcessingTechnical: {
    label: "Warten / Bearbeitung / technische Hinweise",
    checkpointIds: [
      "DIGITAL_REQUEST_PROCESSING_TIME",
      "PROCESSING_DELAY",
      "TECHNICAL_ISSUE",
      "TECH_VIDEO_NOT_WORKING",
      "LAB_RESULTS_PENDING",
      "LAB_RESULT_TIME",
    ] as const,
  },
  preparation: {
    label: "Vorbereitung",
    checkpointIds: [
      "LAB_FASTING_REQUIRED",
      "LAB_BRING_REFERRAL",
      "IMMUNIZATION_BRING_VACCINATION_RECORD",
      "URINE_SAMPLE_INSTRUCTIONS",
      "STOOL_SAMPLE_INSTRUCTIONS",
      "SAMPLE_HANDOVER",
      "URINE_SAMPLE_ONSITE",
    ] as const,
  },
  billing: {
    label: "Abrechnung / Kosten",
    checkpointIds: [
      "BILLING_NOT_COVERED_BY_STATUTORY",
      "BILLING_GOA_BILLING",
      "BILLING_ONSITE_PAYMENT",
      "BILLING_CONTACT_EXTERNAL_PARTY",
      "BILLING_ADDRESS_UPDATE_REQUESTED",
      "BILLING_EXTERNAL_PROVIDER",
      "BILLING_INVOICE_TIMING",
      "BILLING_PROCESS_EXTERNAL",
      "PAYMENT_ONSITE_INFO",
      "LAB_COST_COVERED_BY_REFERRAL",
      "LAB_SELF_PAYER_NOTE",
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
  "preparation",
  "billing",
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

/**
 * Bindung „Prozess-Schublade → globale Action-IDs".
 *
 * Entkoppelt von `PROCESS_SHELF_GROUPS[*].checkpointIds` (welche fachliche und
 * Prozess-Checkpoints mischen). Nur globale Shelf-Actions, die ausschließlich
 * dann in M3/M5 erscheinen sollen, wenn ihre Schublade durch aktive
 * fachliche Statuswerte aktiviert wurde.
 */
export const PROCESS_SHELF_GROUP_ACTION_IDS: Record<ProcessShelfGroupId, readonly string[]> = {
  missingInfoOrDocuments: [],
  documentsAndUpload: ["DOCUMENT_UPLOAD"],
  insuranceData: [],
  appointmentsAndBooking: [],
  digitalRequest: [],
  waitingProcessingTechnical: ["PROCESSING_DELAY", "TECHNICAL_ISSUE"],
  preparation: [],
  billing: [],
};

// Self-Activation-Guard: IDs, die selbst globale Shelf-Actions sind, dürfen
// nicht über ihren eigenen ACTIVE-Status ihre Schublade freischalten.
const GLOBAL_SHELF_ACTION_ID_SET: ReadonlySet<string> = new Set<string>(
  PROCESS_SHELF_GROUP_ORDER.flatMap((g) => [...PROCESS_SHELF_GROUP_ACTION_IDS[g]]),
);

/**
 * Leitet aus einer gemischten Status-Map (checkpoint_statuses ∪ action_statuses)
 * die Menge der aktiven Prozess-Schubladen ab. Aktiv sind ausschließlich die
 * Werte "YES", "SHOW", "ACTIVE". IDs, die selbst zu den globalen Shelf-Actions
 * gehören, werden ignoriert (kein Selbstaktivierungs-Loop).
 */
export function getActiveProcessShelfGroupsFromStatuses(
  statuses: Record<string, string>,
): Set<ProcessShelfGroupId> {
  const active = new Set<ProcessShelfGroupId>();
  for (const [id, value] of Object.entries(statuses)) {
    if (value !== "YES" && value !== "SHOW" && value !== "ACTIVE") continue;
    if (GLOBAL_SHELF_ACTION_ID_SET.has(id)) continue;
    const g = getProcessShelfGroupForCheckpointId(id);
    if (g) active.add(g);
  }
  return active;
}

/**
 * Liefert die Menge der globalen Action-IDs, die durch die übergebenen
 * aktiven Schubladen freigegeben sind.
 */
export function getAllowedGlobalActionIds(
  activeGroups: ReadonlySet<ProcessShelfGroupId>,
): Set<string> {
  const allowed = new Set<string>();
  for (const g of activeGroups) {
    for (const id of PROCESS_SHELF_GROUP_ACTION_IDS[g]) allowed.add(id);
  }
  return allowed;
}
