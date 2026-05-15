// Zentrale Bindung: Welche reinen Prozess-Checkpoints werden pro Profil zusätzlich eingespeist?
// Nur risikoarme, reine Prozess-IDs (keine Mixed, keine Trigger-only, keine fachlichen IDs)

import { INQUIRY_CHECKPOINT_CATALOG_V2 } from "./inquiryCheckpointCatalog";

function onlyExplanations(ids: readonly string[]): string[] {
  return ids.filter(
    (id) => INQUIRY_CHECKPOINT_CATALOG_V2[id]?.kind === "EXPLANATION"
  );
}

export const GLOBAL_PROCESS_SHELF: readonly string[] = onlyExplanations([
  // IDs, die in mehreren Profilen vorkommen und technisch nur einmal verarbeitet werden sollen
  "TECH_UPLOAD_FAILED",
  "REQUIRED_INFORMATION_COMPLETE",
  "DIGITAL_REQUEST_MEDICAL_REVIEW",
  "DOCUMENTS_RECEIVED_AND_ASSIGNED",
  "TECHNICAL_ISSUE_DELAY",
  "STAFF_SHORTAGE_DELAY",
]);

export const PROCESS_SHELF_PROFILE_BINDINGS: Record<string, readonly string[]> = {
  AU: onlyExplanations([
    "AU_MISSING_QUESTIONNAIRE",
    // "TECH_UPLOAD_FAILED" entfernt, da jetzt im GLOBAL_PROCESS_SHELF
  ]),
  PRESCRIPTION: onlyExplanations([
    "PRESCRIPTION_MEDICATION_UNCLEAR",
    "PRESCRIPTION_DOSAGE_UNCLEAR",
    "PRESCRIPTION_MEDICATION_NOT_DOCUMENTED",
    "PRESCRIPTION_SPECIALIST_REPORT_REQUIRED",
    "HOSPITAL_DISCHARGE_REPORT_MISSING",
    // "TECH_UPLOAD_FAILED" entfernt
  ]),
  REFERRAL: onlyExplanations([
    "REF_SPECIALTY_REQUIRED",
    // "TECH_UPLOAD_FAILED" entfernt
  ]),
  LAB: onlyExplanations([
    "LAB_RESULTS_PENDING",
    "LAB_INTERNAL_ORDER_MISSING",
    "LAB_SPECIALIST_REFERRAL_ORIGINAL_REQUIRED",
  ]),
  SAMPLE_COLLECTION: onlyExplanations([
    "SAMPLE_COLLECTION_INFORMATION_INCOMPLETE",
    "SAMPLE_COLLECTION_ORDER_UNCLEAR_OR_MISSING",
  ]),
  APPOINTMENT: onlyExplanations([
    "APPOINTMENT_DATA_INCOMPLETE",
    "APPOINTMENT_REASON_UNCLEAR",
    "APPOINTMENT_PROCESS_MULTI_STEP",
    "APPOINTMENT_PREPARATION_REQUIRED",
    "APPOINTMENT_DOCUMENT_MISSING",
    "APPOINTMENT_VIDEO_REQUIREMENTS",
  ]),
  ONBOARDING: onlyExplanations([
    "ONBOARDING_DOCTOLIB_INFO",
    "ONBOARDING_DATA_UPDATE_REQUIRED",
    "ONBOARDING_DOCUMENT_MISSING",
    "ONBOARDING_PROCESS_REQUIRED",
    "INSURANCE_NUMBER_INVALID_FORMAT",
  ]),
  BILLING: onlyExplanations([
    "BILLING_EXTERNAL_PROVIDER",
    "BILLING_INVOICE_TIMING",
    "BILLING_DATA_MISSING",
  ]),
  MEDICAL_DOCUMENTS: onlyExplanations([
    "MEDICAL_DOCUMENT_DOCUMENTATION_MISSING",
    "MEDICAL_DOCUMENTS_TRANSLATION_REQUIRED",
    "MEDICAL_DOCUMENT_PROCESS_INFO",
  ]),
  TECH_SUPPORT: onlyExplanations([
    "TECH_VIDEO_NOT_WORKING",
    // "TECH_UPLOAD_FAILED" entfernt
  ]),
};
