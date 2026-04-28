/**
 * Tests für buildInitialInquirySectionSnapshot.
 *
 * Sicherstellt, dass Sections immer nach profile.displayOrder sortiert werden,
 * unabhängig von der Klick-Reihenfolge des Nutzers in der M1-Auswahlliste.
 */

import { buildInitialInquirySectionSnapshot } from "@/lib/inquiries/inquirySessionService";
import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";
import { DecisionStatus } from "@/lib/inquiries/types";

describe("buildInitialInquirySectionSnapshot – Reihenfolge nach displayOrder", () => {
  it("BILLING vor LAB eingegeben → Snapshot enthält LAB vor BILLING", () => {
    const snapshot = buildInitialInquirySectionSnapshot(["BILLING", "LAB"]);
    const ids = snapshot.map((s) => s.inquiryId);
    expect(ids).toEqual(["LAB", "BILLING"]);
  });

  it("LAB vor BILLING eingegeben → Reihenfolge bleibt korrekt (LAB vor BILLING)", () => {
    const snapshot = buildInitialInquirySectionSnapshot(["LAB", "BILLING"]);
    const ids = snapshot.map((s) => s.inquiryId);
    expect(ids).toEqual(["LAB", "BILLING"]);
  });

  it("alle bekannten Profile → Snapshot in aufsteigender displayOrder", () => {
    // Eingabe in umgekehrter displayOrder
    const allIds = Object.values(INQUIRY_PROFILE_CATALOG_V2)
      .sort((a, b) => (b.displayOrder ?? Infinity) - (a.displayOrder ?? Infinity))
      .map((p) => p.id);

    const snapshot = buildInitialInquirySectionSnapshot(allIds);
    const resultIds = snapshot.map((s) => s.inquiryId);

    const expectedIds = Object.values(INQUIRY_PROFILE_CATALOG_V2)
      .sort((a, b) => (a.displayOrder ?? Infinity) - (b.displayOrder ?? Infinity))
      .map((p) => p.id);

    expect(resultIds).toEqual(expectedIds);
  });

  it("unbekannte IDs werden herausgefiltert und beeinflussen die Reihenfolge nicht", () => {
    const snapshot = buildInitialInquirySectionSnapshot([
      "UNKNOWN_PROFILE",
      "BILLING",
      "LAB",
    ]);
    const ids = snapshot.map((s) => s.inquiryId);
    expect(ids).toEqual(["LAB", "BILLING"]);
  });

  it("jede Section hat decisionStatus DISABLED und leere checkpointStatuses", () => {
    const snapshot = buildInitialInquirySectionSnapshot(["LAB", "BILLING"]);
    for (const section of snapshot) {
      expect(section.decisionStatus).toBe(DecisionStatus.DISABLED);
      expect(section.checkpointStatuses).toEqual({});
    }
  });

  it("einzelnes Profil → Snapshot enthält genau eine Section", () => {
    const snapshot = buildInitialInquirySectionSnapshot(["LAB"]);
    expect(snapshot).toHaveLength(1);
    expect(snapshot[0].inquiryId).toBe("LAB");
  });

  it("leere Eingabe → leerer Snapshot", () => {
    const snapshot = buildInitialInquirySectionSnapshot([]);
    expect(snapshot).toHaveLength(0);
  });
});
