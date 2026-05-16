import { LEGAL_SOURCES } from "@/lib/office/legalSources";
import { AUTHORITIES } from "@/lib/office/authorities";
import { EVIDENCES } from "@/lib/office/evidenceCatalog";

/**
 * Registry-Hygiene: deckt pauschale Legacy-Eintraege und disambiguierte Evidence-Labels ab.
 *
 * Konvention (Phase 22 Datenqualitaet):
 * - LegalSources ohne `paragraph` sind Pauschalquellen. Bestand bleibt erhalten,
 *   aber jede solche Quelle MUSS in einer Allowlist stehen UND eine Note tragen,
 *   die das "Legacy-Pauschalquelle"-Etikett enthaelt. Neue Pauschalquellen sollen
 *   nicht hinzukommen, ohne diesen Test bewusst zu erweitern.
 * - Unreferenzierte Authorities werden mit einer Begruendungs-Note vorgehalten.
 * - Evidences mit aehnlicher Bedeutung (DIENSTPLAN / DIENSTPLAN_PRAXIS,
 *   STELLUNGNAHME_KV_PLAUSIBILITAET) tragen Notes, die ihre Abgrenzung erklaeren.
 */
describe("office registry hygiene (Phase 22)", () => {
  // Bekannte Pauschalquellen ohne konkrete Paragraphenangabe, die historisch entstanden sind.
  // Diese Liste darf NICHT wachsen: neue pauschale Eintraege sollen statt dessen paragraphengenau
  // modelliert werden. Andere paragraphlose LegalSources (z. B. ganze Rahmengesetze wie HEILBERG_BLN,
  // BLN_DSG, NACHWG) sind absichtlich als ganzes Werk referenziert und gelten nicht als Legacy.
  const LEGACY_PAUSCHAL_LEGAL_SOURCES = ["BDSG", "BERUFSO_AERZTE_BERLIN", "BMV_AE"] as const;

  it("die bekannten Legacy-Pauschalquellen existieren und tragen die Legacy-Note", () => {
    for (const id of LEGACY_PAUSCHAL_LEGAL_SOURCES) {
      const entry = LEGAL_SOURCES.find((e) => e.id === id);
      expect(entry).toBeDefined();
      expect(entry?.note ?? "").toMatch(/Legacy-Pauschalquelle/);
    }
  });

  it("unreferenzierte Authorities (FINANZAMT_BERLIN, BFARM) tragen eine Begruendungs-Note", () => {
    const expected = ["FINANZAMT_BERLIN", "BFARM"] as const;
    for (const id of expected) {
      const entry = AUTHORITIES.find((a) => a.id === id);
      expect(entry).toBeDefined();
      expect(entry?.note ?? "").not.toBe("");
    }
  });

  it("Dienstplan-Evidences sind durch Notes voneinander abgegrenzt", () => {
    const dp = EVIDENCES.find((e) => e.id === "DIENSTPLAN");
    const dpPraxis = EVIDENCES.find((e) => e.id === "DIENSTPLAN_PRAXIS");
    expect(dp?.note ?? "").toMatch(/DIENSTPLAN_PRAXIS/);
    expect(dpPraxis?.note ?? "").toMatch(/DIENSTPLAN\b/);
  });

  it("STELLUNGNAHME_KV_PLAUSIBILITAET deckt per Label beide Verwendungskontexte ab", () => {
    const entry = EVIDENCES.find((e) => e.id === "STELLUNGNAHME_KV_PLAUSIBILITAET");
    expect(entry?.label ?? "").toMatch(/Abrechnungs/);
    expect(entry?.label ?? "").toMatch(/Plausibilitaets/);
  });
});
