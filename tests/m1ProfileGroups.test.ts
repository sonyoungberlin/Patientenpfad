import { M1_PROFILE_GROUPS } from "@/lib/inquiries/m1ProfileGroups";
import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";

describe("M1_PROFILE_GROUPS – Struktur und Vollständigkeit", () => {
  const allCatalogIds = new Set(Object.keys(INQUIRY_PROFILE_CATALOG_V2));

  const allGroupedIds = M1_PROFILE_GROUPS.flatMap((g) => [...g.profileIds]);

  it("enthält genau 3 Gruppen", () => {
    expect(M1_PROFILE_GROUPS).toHaveLength(3);
  });

  it("alle Profil-IDs in Gruppen existieren im Katalog", () => {
    for (const id of allGroupedIds) {
      expect(allCatalogIds.has(id)).toBe(true);
    }
  });

  it("jedes Profil erscheint genau einmal", () => {
    const seen = new Set<string>();
    for (const id of allGroupedIds) {
      expect(seen.has(id)).toBe(false);
      seen.add(id);
    }
  });

  it("alle Katalog-Profile sind in genau einer Gruppe", () => {
    const grouped = new Set(allGroupedIds);
    for (const id of allCatalogIds) {
      expect(grouped.has(id)).toBe(true);
    }
  });

  describe("Gruppe 1: Dokumente & Ergebnisse", () => {
    const group = M1_PROFILE_GROUPS[0];
    it("hat den erwarteten Titel", () => {
      expect(group.label).toBe("Dokumente & Ergebnisse");
    });
    it("enthält AU, PRESCRIPTION, REFERRAL, MEDICAL_DOCUMENTS", () => {
      expect(group.profileIds).toContain("AU");
      expect(group.profileIds).toContain("PRESCRIPTION");
      expect(group.profileIds).toContain("REFERRAL");
      expect(group.profileIds).toContain("MEDICAL_DOCUMENTS");
    });
    it("enthält genau 4 Profile", () => {
      expect(group.profileIds).toHaveLength(4);
    });
  });

  describe("Gruppe 2: Termine & persönliche Vorstellung", () => {
    const group = M1_PROFILE_GROUPS[1];
    it("hat den erwarteten Titel", () => {
      expect(group.label).toBe("Termine & persönliche Vorstellung");
    });
    it("enthält APPOINTMENT, ACUTE_CARE, LAB, SAMPLE_COLLECTION, IMMUNIZATION", () => {
      expect(group.profileIds).toContain("APPOINTMENT");
      expect(group.profileIds).toContain("ACUTE_CARE");
      expect(group.profileIds).toContain("LAB");
      expect(group.profileIds).toContain("SAMPLE_COLLECTION");
      expect(group.profileIds).toContain("IMMUNIZATION");
    });
    it("enthält genau 5 Profile", () => {
      expect(group.profileIds).toHaveLength(5);
    });
  });

  describe("Gruppe 3: Organisation, Technik & Sonstiges", () => {
    const group = M1_PROFILE_GROUPS[2];
    it("hat den erwarteten Titel", () => {
      expect(group.label).toBe("Organisation, Technik & Sonstiges");
    });
    it("enthält BILLING, TECH_SUPPORT, ONBOARDING", () => {
      expect(group.profileIds).toContain("BILLING");
      expect(group.profileIds).toContain("TECH_SUPPORT");
      expect(group.profileIds).toContain("ONBOARDING");
    });
    it("enthält genau 3 Profile", () => {
      expect(group.profileIds).toHaveLength(3);
    });
  });
});
