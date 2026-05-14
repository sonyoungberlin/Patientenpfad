import { INQUIRY_CHECKPOINT_CATALOG_V2 } from "@/lib/inquiries/inquiryCheckpointCatalog";
import {
  isMixedCheckpointId,
  MIXED_CHECKPOINT_IDS,
} from "@/lib/inquiries/mixedCheckpointIds";
import { TRIGGER_ONLY_CHECKPOINT_IDS } from "@/lib/inquiries/triggerOnlyCheckpointIds";

describe("MIXED_CHECKPOINT_IDS", () => {
  it("enthaelt die bekannten Mixed-IDs", () => {
    expect(MIXED_CHECKPOINT_IDS).toEqual([
      "AU_MISSING_EGK",
      "PRESCRIPTION_INSURANCE_PROOF_MISSING",
      "REFERRAL_INSURANCE_PROOF_MISSING",
      "APPOINTMENT_INSURANCE_PROOF_MISSING",
      "ONBOARDING_GKV_DOCUMENT_MISSING",
      "ONBOARDING_PKV_PAS_MISSING",
      "BILLING_DOCUMENT_MISSING",
      "HMV_PREVIOUS_ORDER_MISSING",
      "HMV_INFO_MISSING",
      "MEDICAL_DOCUMENT_INFO_MISSING",
      "HMV_IN_PERSON_REQUIRED",
      "MEDICAL_DOCUMENT_CONSULTATION_REQUIRED",
      "APPOINTMENT_WRONG_TYPE",
      "APPOINTMENT_BOOKING_CODE_REQUIRED",
      "IMMUNIZATION_STANDARD_AVAILABLE",
      "IMMUNIZATION_RISK_REVIEW_REQUIRED",
      "SAMPLE_COLLECTION_ORDER_AVAILABLE",
      "LAB_CHECKUP_RULES",
      "LAB_MPU_EXCLUSION",
      "BILLING_COST_NOT_COVERED",
      "BILLING_EXTERNAL_RESPONSIBILITY",
      "BILLING_ADDRESS_MISSING",
      "MEDICAL_DOCUMENT_PRIVATE_SERVICE",
      "INFECTIOUS_PROTOCOL",
      "PRESCRIPTION_STATUTORY_POSSIBLE",
      "PRESCRIPTION_NO_PRESCRIPTION_REQUIRED",
    ]);
  });

  it("enthaelt keine bekannten reinen Prozess-IDs", () => {
    expect(MIXED_CHECKPOINT_IDS).not.toContain("DIGITAL_REQUEST");
    expect(MIXED_CHECKPOINT_IDS).not.toContain("DOCUMENT_UPLOAD");
    expect(MIXED_CHECKPOINT_IDS).not.toContain("LAB_RESULTS_PENDING");
    expect(MIXED_CHECKPOINT_IDS).not.toContain("APPOINTMENT_INFO_TYPE_PURPOSE");
  });

  it("enthaelt keine bekannten Trigger-only-IDs", () => {
    for (const triggerOnlyId of TRIGGER_ONLY_CHECKPOINT_IDS) {
      expect(MIXED_CHECKPOINT_IDS).not.toContain(triggerOnlyId);
    }
  });

  it("enthaelt keine Duplikate", () => {
    const unique = new Set(MIXED_CHECKPOINT_IDS);
    expect(unique.size).toBe(MIXED_CHECKPOINT_IDS.length);
  });

  it("enthaelt nur IDs aus dem Checkpoint-Katalog", () => {
    for (const checkpointId of MIXED_CHECKPOINT_IDS) {
      expect(INQUIRY_CHECKPOINT_CATALOG_V2[checkpointId]).toBeDefined();
    }
  });

  it("isMixedCheckpointId erkennt Mixed-IDs", () => {
    expect(isMixedCheckpointId("LAB_CHECKUP_RULES")).toBe(true);
    expect(isMixedCheckpointId("BILLING_ADDRESS_MISSING")).toBe(true);
  });

  it("isMixedCheckpointId lehnt Nicht-Mixed ab", () => {
    expect(isMixedCheckpointId("LAB_INTERNAL_ORDER")).toBe(false);
    expect(isMixedCheckpointId("UNBEKANNTE_ID")).toBe(false);
  });
});
