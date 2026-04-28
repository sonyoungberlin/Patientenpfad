import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";

describe("INQUIRY_PROFILE_CATALOG_V2 – displayOrder", () => {
  it("jedes Profil hat ein displayOrder-Feld", () => {
    for (const profile of Object.values(INQUIRY_PROFILE_CATALOG_V2)) {
      expect(typeof profile.displayOrder).toBe("number");
    }
  });

  it("displayOrder-Werte sind eindeutig (keine Duplikate)", () => {
    const orders = Object.values(INQUIRY_PROFILE_CATALOG_V2).map(
      (p) => p.displayOrder,
    );
    const unique = new Set(orders);
    expect(unique.size).toBe(orders.length);
  });

  it("Profile nach displayOrder sortiert entsprechen der erwarteten Reihenfolge", () => {
    const sorted = Object.values(INQUIRY_PROFILE_CATALOG_V2)
      .sort((a, b) => (a.displayOrder ?? Infinity) - (b.displayOrder ?? Infinity))
      .map((p) => p.id);

    expect(sorted).toEqual([
      "ACUTE_CARE",
      "APPOINTMENT",
      "AU",
      "PRESCRIPTION",
      "MEDICAL_DOCUMENTS",
      "REFERRAL",
      "IMMUNIZATION",
      "LAB",
      "SAMPLE_COLLECTION",
      "ONBOARDING",
      "BILLING",
      "TECH_SUPPORT",
    ]);
  });
});
