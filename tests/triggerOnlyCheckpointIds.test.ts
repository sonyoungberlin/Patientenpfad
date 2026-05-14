import { INQUIRY_CHECKPOINT_CATALOG_V2 } from "@/lib/inquiries/inquiryCheckpointCatalog";
import {
  isTriggerOnlyCheckpointId,
  TRIGGER_ONLY_CHECKPOINT_IDS,
} from "@/lib/inquiries/triggerOnlyCheckpointIds";

describe("TRIGGER_ONLY_CHECKPOINT_IDS", () => {
  it("enthaelt die bekannten reinen Trigger-IDs", () => {
    expect(TRIGGER_ONLY_CHECKPOINT_IDS).toEqual([
      "AU_NEW_PATIENT_LIMIT",
      "AU_DIGITAL_AU_PROCESS",
      "AU_NO_APPOINTMENT_ACUTE",
      "LAB_INTERNAL_ORDER",
      "LAB_EXTERNAL_REFERRAL",
      "REF_HAV_CASE",
      "ACUTE_APPOINTMENT_INFO",
      "ONBOARDING_IDENTITY_MISMATCH",
      "ONBOARDING_DATA_INCOMPLETE",
      "ONBOARDING_WRONG_PRACTICE",
    ]);
  });

  it("enthaelt keine offensichtlichen Nicht-Trigger", () => {
    expect(TRIGGER_ONLY_CHECKPOINT_IDS).not.toContain("AU_BACKDATE_LIMIT");
    expect(TRIGGER_ONLY_CHECKPOINT_IDS).not.toContain("APPOINTMENT_TYPE_QUESTION");
    expect(TRIGGER_ONLY_CHECKPOINT_IDS).not.toContain("APPOINTMENT_INFO_TYPE_PURPOSE");
    expect(TRIGGER_ONLY_CHECKPOINT_IDS).not.toContain("DIGITAL_REQUEST");
    expect(TRIGGER_ONLY_CHECKPOINT_IDS).not.toContain("ONBOARDING_DOCUMENT_MISSING");
  });

  it("enthaelt keine Duplikate", () => {
    const unique = new Set(TRIGGER_ONLY_CHECKPOINT_IDS);
    expect(unique.size).toBe(TRIGGER_ONLY_CHECKPOINT_IDS.length);
  });

  it("enthaelt nur IDs aus dem Checkpoint-Katalog", () => {
    for (const checkpointId of TRIGGER_ONLY_CHECKPOINT_IDS) {
      expect(INQUIRY_CHECKPOINT_CATALOG_V2[checkpointId]).toBeDefined();
    }
  });

  it("isTriggerOnlyCheckpointId erkennt Trigger-only IDs", () => {
    expect(isTriggerOnlyCheckpointId("LAB_INTERNAL_ORDER")).toBe(true);
    expect(isTriggerOnlyCheckpointId("REF_HAV_CASE")).toBe(true);
  });

  it("isTriggerOnlyCheckpointId lehnt Nicht-Trigger ab", () => {
    expect(isTriggerOnlyCheckpointId("AU_BACKDATE_LIMIT")).toBe(false);
    expect(isTriggerOnlyCheckpointId("UNBEKANNTE_ID")).toBe(false);
  });
});
