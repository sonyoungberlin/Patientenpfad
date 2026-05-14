import { PROCESS_SHELF_PROFILE_BINDINGS } from "@/lib/inquiries/processShelfProfileBindings";
import { INQUIRY_CHECKPOINT_CATALOG_V2 } from "@/lib/inquiries/inquiryCheckpointCatalog";
import { isMixedCheckpointId } from "@/lib/inquiries/mixedCheckpointIds";
import { isTriggerOnlyCheckpointId } from "@/lib/inquiries/triggerOnlyCheckpointIds";

// ---------------------------------------------------------------------------
// Hilfsfunktion: alle gebundenen IDs als flache Liste
// ---------------------------------------------------------------------------
function allBoundIds(): string[] {
  return Object.values(PROCESS_SHELF_PROFILE_BINDINGS).flatMap((ids) => [...ids]);
}

// ---------------------------------------------------------------------------
// 1. Alle gebundenen IDs existieren im Checkpoint-Katalog
// ---------------------------------------------------------------------------
describe("PROCESS_SHELF_PROFILE_BINDINGS – Katalog-Integrität", () => {
  it("alle gebundenen IDs existieren im INQUIRY_CHECKPOINT_CATALOG_V2", () => {
    for (const [profileId, ids] of Object.entries(PROCESS_SHELF_PROFILE_BINDINGS)) {
      for (const id of ids) {
        const missing = !INQUIRY_CHECKPOINT_CATALOG_V2[id];
        if (missing) {
          throw new Error(`Profil ${profileId}: ID "${id}" fehlt im Katalog`);
        }
        expect(INQUIRY_CHECKPOINT_CATALOG_V2[id]).toBeDefined();
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Keine Mixed-IDs enthalten
// ---------------------------------------------------------------------------
describe("PROCESS_SHELF_PROFILE_BINDINGS – keine Mixed-IDs", () => {
  it("keine der gebundenen IDs ist eine Mixed-ID", () => {
    for (const id of allBoundIds()) {
      if (isMixedCheckpointId(id)) {
        throw new Error(`"${id}" ist eine Mixed-ID und darf nicht in PROCESS_SHELF_PROFILE_BINDINGS stehen`);
      }
      expect(isMixedCheckpointId(id)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Keine Trigger-only-IDs enthalten
// ---------------------------------------------------------------------------
describe("PROCESS_SHELF_PROFILE_BINDINGS – keine Trigger-only-IDs", () => {
  it("keine der gebundenen IDs ist eine Trigger-only-ID", () => {
    for (const id of allBoundIds()) {
      if (isTriggerOnlyCheckpointId(id)) {
        throw new Error(`"${id}" ist eine Trigger-only-ID und darf nicht in PROCESS_SHELF_PROFILE_BINDINGS stehen`);
      }
      expect(isTriggerOnlyCheckpointId(id)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Erwartete Bindings je Profil
// ---------------------------------------------------------------------------
describe("PROCESS_SHELF_PROFILE_BINDINGS – AU", () => {
  it("AU enthält AU_MISSING_QUESTIONNAIRE", () => {
    expect(PROCESS_SHELF_PROFILE_BINDINGS["AU"]).toContain("AU_MISSING_QUESTIONNAIRE");
  });

  it("AU enthält TECH_UPLOAD_FAILED", () => {
    expect(PROCESS_SHELF_PROFILE_BINDINGS["AU"]).toContain("TECH_UPLOAD_FAILED");
  });
});

describe("PROCESS_SHELF_PROFILE_BINDINGS – PRESCRIPTION", () => {
  it("PRESCRIPTION enthält PRESCRIPTION_MEDICATION_UNCLEAR", () => {
    expect(PROCESS_SHELF_PROFILE_BINDINGS["PRESCRIPTION"]).toContain("PRESCRIPTION_MEDICATION_UNCLEAR");
  });

  it("PRESCRIPTION enthält PRESCRIPTION_DOSAGE_UNCLEAR", () => {
    expect(PROCESS_SHELF_PROFILE_BINDINGS["PRESCRIPTION"]).toContain("PRESCRIPTION_DOSAGE_UNCLEAR");
  });

  it("PRESCRIPTION enthält PRESCRIPTION_MEDICATION_NOT_DOCUMENTED", () => {
    expect(PROCESS_SHELF_PROFILE_BINDINGS["PRESCRIPTION"]).toContain("PRESCRIPTION_MEDICATION_NOT_DOCUMENTED");
  });

  it("PRESCRIPTION enthält PRESCRIPTION_SPECIALIST_REPORT_REQUIRED", () => {
    expect(PROCESS_SHELF_PROFILE_BINDINGS["PRESCRIPTION"]).toContain("PRESCRIPTION_SPECIALIST_REPORT_REQUIRED");
  });

  it("PRESCRIPTION enthält HOSPITAL_DISCHARGE_REPORT_MISSING", () => {
    expect(PROCESS_SHELF_PROFILE_BINDINGS["PRESCRIPTION"]).toContain("HOSPITAL_DISCHARGE_REPORT_MISSING");
  });

  it("PRESCRIPTION enthält TECH_UPLOAD_FAILED", () => {
    expect(PROCESS_SHELF_PROFILE_BINDINGS["PRESCRIPTION"]).toContain("TECH_UPLOAD_FAILED");
  });
});

describe("PROCESS_SHELF_PROFILE_BINDINGS – REFERRAL", () => {
  it("REFERRAL enthält REF_SPECIALTY_REQUIRED", () => {
    expect(PROCESS_SHELF_PROFILE_BINDINGS["REFERRAL"]).toContain("REF_SPECIALTY_REQUIRED");
  });

  it("REFERRAL enthält TECH_UPLOAD_FAILED", () => {
    expect(PROCESS_SHELF_PROFILE_BINDINGS["REFERRAL"]).toContain("TECH_UPLOAD_FAILED");
  });
});

describe("PROCESS_SHELF_PROFILE_BINDINGS – LAB", () => {
  it("LAB enthält LAB_RESULTS_PENDING", () => {
    expect(PROCESS_SHELF_PROFILE_BINDINGS["LAB"]).toContain("LAB_RESULTS_PENDING");
  });

  it("LAB enthält LAB_INTERNAL_ORDER_MISSING", () => {
    expect(PROCESS_SHELF_PROFILE_BINDINGS["LAB"]).toContain("LAB_INTERNAL_ORDER_MISSING");
  });

  it("LAB enthält LAB_SPECIALIST_REFERRAL_ORIGINAL_REQUIRED", () => {
    expect(PROCESS_SHELF_PROFILE_BINDINGS["LAB"]).toContain("LAB_SPECIALIST_REFERRAL_ORIGINAL_REQUIRED");
  });
});

describe("PROCESS_SHELF_PROFILE_BINDINGS – APPOINTMENT", () => {
  it("APPOINTMENT enthält APPOINTMENT_DATA_INCOMPLETE", () => {
    expect(PROCESS_SHELF_PROFILE_BINDINGS["APPOINTMENT"]).toContain("APPOINTMENT_DATA_INCOMPLETE");
  });

  it("APPOINTMENT enthält APPOINTMENT_REASON_UNCLEAR", () => {
    expect(PROCESS_SHELF_PROFILE_BINDINGS["APPOINTMENT"]).toContain("APPOINTMENT_REASON_UNCLEAR");
  });

  it("APPOINTMENT enthält APPOINTMENT_DOCUMENT_MISSING", () => {
    expect(PROCESS_SHELF_PROFILE_BINDINGS["APPOINTMENT"]).toContain("APPOINTMENT_DOCUMENT_MISSING");
  });
});
