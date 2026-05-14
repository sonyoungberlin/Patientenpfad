import { INQUIRY_CHECKPOINT_CATALOG_V2 } from "@/lib/inquiries/inquiryCheckpointCatalog";
import {
  ALL_PROCESS_SHELF_CHECKPOINT_IDS,
  getProcessShelfGroupForCheckpointId,
  PROCESS_SHELF_GROUPS,
  PROCESS_SHELF_GROUP_ORDER,
} from "@/lib/inquiries/processShelfGroups";

describe("PROCESS_SHELF_GROUPS", () => {
  it("definiert genau die acht Prozessregale", () => {
    expect(PROCESS_SHELF_GROUP_ORDER).toEqual([
      "missingInfoOrDocuments",
      "documentsAndUpload",
      "insuranceData",
      "appointmentsAndBooking",
      "digitalRequest",
      "waitingProcessingTechnical",
      "preparation",
      "billing",
    ]);
  });

  it("enthaelt nur bestehende Checkpoint-IDs", () => {
    for (const checkpointId of ALL_PROCESS_SHELF_CHECKPOINT_IDS) {
      expect(INQUIRY_CHECKPOINT_CATALOG_V2[checkpointId]).toBeDefined();
    }
  });

  it("enthaelt keine doppelten IDs ueber Gruppen hinweg", () => {
    const unique = new Set(ALL_PROCESS_SHELF_CHECKPOINT_IDS);
    expect(unique.size).toBe(ALL_PROCESS_SHELF_CHECKPOINT_IDS.length);
  });

  it("ordnet die geforderten Kern-IDs den erwarteten Regalen zu", () => {
    // documentsAndUpload
    expect(getProcessShelfGroupForCheckpointId("DOCUMENT_UPLOAD")).toBe("documentsAndUpload");
    expect(getProcessShelfGroupForCheckpointId("TECH_UPLOAD_FAILED")).toBe("documentsAndUpload");
    expect(getProcessShelfGroupForCheckpointId("REF_ORIGINAL_VS_PDF")).toBe("documentsAndUpload");
    // insuranceData
    expect(getProcessShelfGroupForCheckpointId("INSURANCE_DATA_APP_TRANSFER")).toBe("insuranceData");
    expect(getProcessShelfGroupForCheckpointId("AU_MISSING_EGK")).toBe("insuranceData");
    expect(getProcessShelfGroupForCheckpointId("APPOINTMENT_INSURANCE_PROOF_MISSING")).toBe("insuranceData");
    // appointmentsAndBooking
    expect(getProcessShelfGroupForCheckpointId("BOOK_APPOINTMENT")).toBe("appointmentsAndBooking");
    expect(getProcessShelfGroupForCheckpointId("APPOINTMENT_BOOK_GENERAL")).toBe("appointmentsAndBooking");
    expect(getProcessShelfGroupForCheckpointId("LAB_APPOINTMENT_INTERNAL")).toBe("appointmentsAndBooking");
    expect(getProcessShelfGroupForCheckpointId("LAB_APPOINTMENT_CHECKUP")).toBe("appointmentsAndBooking");
    expect(getProcessShelfGroupForCheckpointId("LAB_APPOINTMENT_INDIVIDUAL")).toBe("appointmentsAndBooking");
    expect(getProcessShelfGroupForCheckpointId("LAB_APPOINTMENT_DOCTOR")).toBe("appointmentsAndBooking");
    expect(getProcessShelfGroupForCheckpointId("IMMUNIZATION_BOOK_VACCINATION")).toBe("appointmentsAndBooking");
    expect(getProcessShelfGroupForCheckpointId("IMMUNIZATION_BOOK_COUNSELING")).toBe("appointmentsAndBooking");
    expect(getProcessShelfGroupForCheckpointId("LAB_SAMPLE_FOLLOWUP_APPOINTMENT_RECOMMENDED")).toBe("appointmentsAndBooking");
    expect(getProcessShelfGroupForCheckpointId("CONTROL_APPOINTMENT_RECOMMENDED")).toBe("appointmentsAndBooking");
    expect(getProcessShelfGroupForCheckpointId("ACUTE_OPEN_CONSULTATION_ACTION")).toBe("appointmentsAndBooking");
    expect(getProcessShelfGroupForCheckpointId("TRANSPORT_QUESTIONNAIRE_REQUEST")).toBe("appointmentsAndBooking");
    // digitalRequest
    expect(getProcessShelfGroupForCheckpointId("DIGITAL_REQUEST")).toBe("digitalRequest");
    expect(getProcessShelfGroupForCheckpointId("E_RECIPE_USE")).toBe("digitalRequest");
    expect(getProcessShelfGroupForCheckpointId("PHARMACY_INFORMATION")).toBe("digitalRequest");
    expect(getProcessShelfGroupForCheckpointId("ONLINE_ANAMNESIS")).toBe("digitalRequest");
    expect(getProcessShelfGroupForCheckpointId("CARE_CHANNEL_CHOICE")).toBe("digitalRequest");
    // waitingProcessingTechnical
    expect(getProcessShelfGroupForCheckpointId("DIGITAL_REQUEST_PROCESSING_TIME")).toBe("waitingProcessingTechnical");
    expect(getProcessShelfGroupForCheckpointId("PROCESSING_DELAY")).toBe("waitingProcessingTechnical");
    expect(getProcessShelfGroupForCheckpointId("TECHNICAL_ISSUE")).toBe("waitingProcessingTechnical");
    expect(getProcessShelfGroupForCheckpointId("TECH_VIDEO_NOT_WORKING")).toBe("waitingProcessingTechnical");
    expect(getProcessShelfGroupForCheckpointId("LAB_RESULTS_PENDING")).toBe("waitingProcessingTechnical");
    expect(getProcessShelfGroupForCheckpointId("LAB_RESULT_TIME")).toBe("waitingProcessingTechnical");
    // missingInfoOrDocuments
    expect(getProcessShelfGroupForCheckpointId("AU_MISSING_QUESTIONNAIRE")).toBe("missingInfoOrDocuments");
    expect(getProcessShelfGroupForCheckpointId("HOSPITAL_ADMISSION_MISSING_INFO")).toBe("missingInfoOrDocuments");
    expect(getProcessShelfGroupForCheckpointId("SAMPLE_COLLECTION_INFORMATION_INCOMPLETE")).toBe("missingInfoOrDocuments");
    expect(getProcessShelfGroupForCheckpointId("IMMUNIZATION_STATUS_UNCLEAR")).toBe("missingInfoOrDocuments");
    expect(getProcessShelfGroupForCheckpointId("IMMUNIZATION_VACCINATION_RECORD_MISSING")).toBe("missingInfoOrDocuments");
    expect(getProcessShelfGroupForCheckpointId("ONBOARDING_DOCUMENT_MISSING")).toBe("missingInfoOrDocuments");
    expect(getProcessShelfGroupForCheckpointId("ONBOARDING_IDENTITY_CLARIFICATION_REQUIRED")).toBe("missingInfoOrDocuments");
    expect(getProcessShelfGroupForCheckpointId("BILLING_DATA_MISSING")).toBe("missingInfoOrDocuments");
    expect(getProcessShelfGroupForCheckpointId("MEDICAL_DOCUMENT_DOCUMENTATION_MISSING")).toBe("missingInfoOrDocuments");
    expect(getProcessShelfGroupForCheckpointId("INSURANCE_NUMBER_INVALID_FORMAT")).toBe("missingInfoOrDocuments");
    // preparation
    expect(getProcessShelfGroupForCheckpointId("LAB_FASTING_REQUIRED")).toBe("preparation");
    expect(getProcessShelfGroupForCheckpointId("LAB_BRING_REFERRAL")).toBe("preparation");
    expect(getProcessShelfGroupForCheckpointId("IMMUNIZATION_BRING_VACCINATION_RECORD")).toBe("preparation");
    expect(getProcessShelfGroupForCheckpointId("URINE_SAMPLE_INSTRUCTIONS")).toBe("preparation");
    expect(getProcessShelfGroupForCheckpointId("STOOL_SAMPLE_INSTRUCTIONS")).toBe("preparation");
    expect(getProcessShelfGroupForCheckpointId("SAMPLE_HANDOVER")).toBe("preparation");
    expect(getProcessShelfGroupForCheckpointId("APPOINTMENT_PREPARATION_REQUIRED")).toBe("preparation");
    // billing
    expect(getProcessShelfGroupForCheckpointId("BILLING_NOT_COVERED_BY_STATUTORY")).toBe("billing");
    expect(getProcessShelfGroupForCheckpointId("BILLING_GOA_BILLING")).toBe("billing");
    expect(getProcessShelfGroupForCheckpointId("BILLING_ONSITE_PAYMENT")).toBe("billing");
    expect(getProcessShelfGroupForCheckpointId("BILLING_CONTACT_EXTERNAL_PARTY")).toBe("billing");
    expect(getProcessShelfGroupForCheckpointId("BILLING_ADDRESS_UPDATE_REQUESTED")).toBe("billing");
    expect(getProcessShelfGroupForCheckpointId("PAYMENT_ONSITE_INFO")).toBe("billing");
    expect(getProcessShelfGroupForCheckpointId("LAB_COST_COVERED_BY_REFERRAL")).toBe("billing");
    expect(getProcessShelfGroupForCheckpointId("LAB_SELF_PAYER_NOTE")).toBe("billing");
  });

  it("liefert null fuer nicht zugeordnete IDs", () => {
    expect(getProcessShelfGroupForCheckpointId("AU_BACKDATE_LIMIT")).toBeNull();
    expect(getProcessShelfGroupForCheckpointId("PRESCRIPTION_DOCTOR_REVIEW_REQUIRED")).toBeNull();
    expect(getProcessShelfGroupForCheckpointId("UNBEKANNTE_ID")).toBeNull();
  });

  it("jede Gruppe hat Label und mindestens eine ID", () => {
    for (const groupId of PROCESS_SHELF_GROUP_ORDER) {
      expect(PROCESS_SHELF_GROUPS[groupId].label.length).toBeGreaterThan(0);
      expect(PROCESS_SHELF_GROUPS[groupId].checkpointIds.length).toBeGreaterThan(0);
    }
  });

  it("neue Gruppen preparation und billing sind vollstaendig definiert", () => {
    expect(PROCESS_SHELF_GROUPS.preparation.label).toBe("Vorbereitung");
    expect(PROCESS_SHELF_GROUPS.preparation.checkpointIds.length).toBeGreaterThanOrEqual(5);
    expect(PROCESS_SHELF_GROUPS.billing.label).toBe("Abrechnung / Kosten");
    expect(PROCESS_SHELF_GROUPS.billing.checkpointIds.length).toBeGreaterThanOrEqual(5);
  });
});

