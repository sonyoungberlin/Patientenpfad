import { INQUIRY_CHECKPOINT_CATALOG_V2 } from "@/lib/inquiries/inquiryCheckpointCatalog";
import {
  ALL_PROCESS_SHELF_CHECKPOINT_IDS,
  getProcessShelfGroupForCheckpointId,
  PROCESS_SHELF_GROUPS,
  PROCESS_SHELF_GROUP_ORDER,
} from "@/lib/inquiries/processShelfGroups";

describe("PROCESS_SHELF_GROUPS", () => {
  it("definiert genau die sechs Prozessregale", () => {
    expect(PROCESS_SHELF_GROUP_ORDER).toEqual([
      "missingInfoOrDocuments",
      "documentsAndUpload",
      "insuranceData",
      "appointmentsAndBooking",
      "digitalRequest",
      "waitingProcessingTechnical",
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
    expect(getProcessShelfGroupForCheckpointId("DOCUMENT_UPLOAD")).toBe("documentsAndUpload");
    expect(getProcessShelfGroupForCheckpointId("TECH_UPLOAD_FAILED")).toBe("documentsAndUpload");
    expect(getProcessShelfGroupForCheckpointId("INSURANCE_DATA_APP_TRANSFER")).toBe("insuranceData");
    expect(getProcessShelfGroupForCheckpointId("DIGITAL_REQUEST")).toBe("digitalRequest");
    expect(getProcessShelfGroupForCheckpointId("DIGITAL_REQUEST_PROCESSING_TIME")).toBe("waitingProcessingTechnical");
    expect(getProcessShelfGroupForCheckpointId("BOOK_APPOINTMENT")).toBe("appointmentsAndBooking");
    expect(getProcessShelfGroupForCheckpointId("APPOINTMENT_BOOK_GENERAL")).toBe("appointmentsAndBooking");
    expect(getProcessShelfGroupForCheckpointId("PROCESSING_DELAY")).toBe("waitingProcessingTechnical");
    expect(getProcessShelfGroupForCheckpointId("TECHNICAL_ISSUE")).toBe("waitingProcessingTechnical");
  });

  it("liefert null fuer nicht zugeordnete IDs", () => {
    expect(getProcessShelfGroupForCheckpointId("AU_BACKDATE_LIMIT")).toBeNull();
  });

  it("jede Gruppe hat Label und mindestens eine ID", () => {
    for (const groupId of PROCESS_SHELF_GROUP_ORDER) {
      expect(PROCESS_SHELF_GROUPS[groupId].label.length).toBeGreaterThan(0);
      expect(PROCESS_SHELF_GROUPS[groupId].checkpointIds.length).toBeGreaterThan(0);
    }
  });
});
