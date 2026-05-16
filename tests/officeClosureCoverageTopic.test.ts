import {
  OFFICE_TOPIC_CLOSURE_COVERAGE,
  getOfficeCheckpointCatalog,
} from "@/lib/office/checkpointCatalog";
import { isLegalSourceId } from "@/lib/office/legalSources";
import { isAuthorityId } from "@/lib/office/authorities";
import { isEvidenceId } from "@/lib/office/evidenceCatalog";

describe("Office-Topic praxisschliessung-vertretung: fachliche Anreicherung", () => {
  const catalog = getOfficeCheckpointCatalog(OFFICE_TOPIC_CLOSURE_COVERAGE);
  const byId = new Map(catalog.map((cp) => [cp.id, cp]));

  it("enthaelt die erwarteten UV-Checkpoints in Reihenfolge", () => {
    expect(catalog.map((cp) => cp.id)).toEqual([
      "UV-01",
      "UV-02",
      "UV-03",
      "UV-04",
      "UV-05",
      "UV-06",
      "UV-PATIENTENINFO",
      "UV-NOTFALLVERSORGUNG",
      "UV-TERMINMANAGEMENT",
      "UV-ABRECHNUNGSZUORDNUNG",
    ]);
  });

  it("alle Referenzen sind in den Registries auffindbar", () => {
    for (const cp of catalog) {
      for (const ref of cp.legalRefs ?? []) expect(isLegalSourceId(ref)).toBe(true);
      for (const ref of cp.authorityKeys ?? []) expect(isAuthorityId(ref)).toBe(true);
      for (const ref of cp.requiredEvidenceKeys ?? []) expect(isEvidenceId(ref)).toBe(true);
      for (const ref of cp.optionalEvidenceKeys ?? []) expect(isEvidenceId(ref)).toBe(true);
    }
  });

  it("UV-01 verweist auf Aerzte-ZV § 32 (Zeitraum-Regelung)", () => {
    const cp = byId.get("UV-01");
    expect(cp?.legalRefs).toContain("AERZTE_ZV_PAR_32");
  });

  it("UV-02 verweist auf Aerzte-ZV § 32 sowie KV Berlin und Aerztekammer Berlin", () => {
    const cp = byId.get("UV-02");
    expect(cp?.legalRefs).toContain("AERZTE_ZV_PAR_32");
    expect(cp?.authorityKeys).toEqual(
      expect.arrayContaining(["KV_BERLIN", "AERZTEKAMMER_BERLIN"]),
    );
  });

  it("UV-04 sichert Vertretungsregelung und optional Dienstplan", () => {
    const cp = byId.get("UV-04");
    expect(cp?.requiredEvidenceKeys).toContain("VERTRETUNGSREGELUNG");
    expect(cp?.optionalEvidenceKeys).toContain("DIENSTPLAN");
  });

  it("UV-05 Entscheidung Vertretungsmodell verweist auf KV Berlin (Anzeigepflicht)", () => {
    const cp = byId.get("UV-05");
    expect(cp?.legalRefs).toContain("AERZTE_ZV_PAR_32");
    expect(cp?.authorityKeys).toContain("KV_BERLIN");
    expect(cp?.requiredEvidenceKeys).toContain("VERTRETUNGSREGELUNG");
  });

  it("UV-06 externe Stellen benennt KV Berlin auf Basis Aerzte-ZV § 32", () => {
    const cp = byId.get("UV-06");
    expect(cp?.legalRefs).toContain("AERZTE_ZV_PAR_32");
    expect(cp?.authorityKeys).toContain("KV_BERLIN");
  });

  it("UV-PATIENTENINFO fordert einen Patienteninfo-Aushang", () => {
    const cp = byId.get("UV-PATIENTENINFO");
    expect(cp?.requiredEvidenceKeys).toContain("PATIENTENINFO_AUSHANG");
  });

  it("UV-NOTFALLVERSORGUNG benennt KV Berlin (Bereitschaftsdienst) und optional Notfallrufnummern", () => {
    const cp = byId.get("UV-NOTFALLVERSORGUNG");
    expect(cp?.authorityKeys).toContain("KV_BERLIN");
    expect(cp?.optionalEvidenceKeys).toContain("NOTFALL_RUFNUMMERN");
  });

  it("UV-TERMINMANAGEMENT haelt optional einen Dienstplan vor", () => {
    const cp = byId.get("UV-TERMINMANAGEMENT");
    expect(cp?.optionalEvidenceKeys).toContain("DIENSTPLAN");
  });

  it("UV-ABRECHNUNGSZUORDNUNG verweist auf BMV-Ae und SGB V § 295 mit LANR/BSNR-Bestaetigung", () => {
    const cp = byId.get("UV-ABRECHNUNGSZUORDNUNG");
    expect(cp?.legalRefs).toEqual(
      expect.arrayContaining(["BMV_AE", "SGB_V_PAR_295"]),
    );
    expect(cp?.authorityKeys).toContain("KV_BERLIN");
    expect(cp?.requiredEvidenceKeys).toContain("LANR_BSNR_BESTAETIGUNG");
  });
});
