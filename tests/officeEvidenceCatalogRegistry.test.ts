import {
  EVIDENCES,
  getEvidence,
  isEvidenceId,
  listEvidences,
  type EvidenceId,
} from "@/lib/office/evidenceCatalog";

describe("evidenceCatalog registry", () => {
  it("alle IDs sind eindeutig", () => {
    const ids = EVIDENCES.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("IDs enthalten keine Sonderzeichen", () => {
    for (const entry of EVIDENCES) {
      expect(entry.id).toMatch(/^[A-Z0-9_]+$/);
    }
  });

  it("listEvidences liefert nichtleere Liste", () => {
    expect(listEvidences().length).toBeGreaterThan(0);
  });

  it("isEvidenceId und getEvidence sind konsistent", () => {
    for (const entry of EVIDENCES) {
      expect(isEvidenceId(entry.id)).toBe(true);
      expect(getEvidence(entry.id as EvidenceId).id).toBe(entry.id);
    }
    expect(isEvidenceId("DOES_NOT_EXIST")).toBe(false);
  });
});
