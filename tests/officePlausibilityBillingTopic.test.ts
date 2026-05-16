import {
  OFFICE_TOPIC_PLAUSIBILITY_BILLING,
  getOfficeCheckpointCatalog,
} from "@/lib/office/checkpointCatalog";
import { isLegalSourceId } from "@/lib/office/legalSources";
import { isAuthorityId } from "@/lib/office/authorities";
import { isEvidenceId } from "@/lib/office/evidenceCatalog";

describe("Office-Topic plausibilitaetspruefung-abrechnung: fachliche Anreicherung", () => {
  const catalog = getOfficeCheckpointCatalog(
    OFFICE_TOPIC_PLAUSIBILITY_BILLING,
  );
  const byId = new Map(catalog.map((cp) => [cp.id, cp]));

  it("enthaelt die erwarteten PL-Checkpoints in Reihenfolge", () => {
    expect(catalog.map((cp) => cp.id)).toEqual([
      "PL-01",
      "PL-02",
      "PL-03",
      "PL-04",
      "PL-05",
      "PL-06",
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

  it("PL-01 (Quartalsprofil) verweist auf SGB V § 106d, KV Berlin und Quartalsprofil-Nachweis", () => {
    const cp = byId.get("PL-01");
    expect(cp?.legalRefs).toContain("SGB_V_PAR_106D");
    expect(cp?.authorityKeys).toContain("KV_BERLIN");
    expect(cp?.requiredEvidenceKeys).toContain("QUARTALSPROFIL_PVS");
    expect(cp?.optionalEvidenceKeys).toContain("STELLUNGNAHME_KV_PLAUSIBILITAET");
  });

  it("PL-02 (Tagesprofile) verweist auf SGB V § 106d und nennt Zeitprofil-Auswertung optional", () => {
    const cp = byId.get("PL-02");
    expect(cp?.legalRefs).toContain("SGB_V_PAR_106D");
    expect(cp?.authorityKeys).toContain("KV_BERLIN");
    expect(cp?.optionalEvidenceKeys).toEqual(
      expect.arrayContaining([
        "TAGESPROFIL_PVS",
        "ZEITPROFIL_PVS",
        "STELLUNGNAHME_KV_PLAUSIBILITAET",
      ]),
    );
  });

  it("PL-03 (vollstaendige Dokumentation) verweist auf SGB V § 295 (Pflichtangaben Abrechnung)", () => {
    const cp = byId.get("PL-03");
    expect(cp?.legalRefs).toEqual(
      expect.arrayContaining(["SGB_V_PAR_295", "BMV_AE"]),
    );
    expect(cp?.optionalEvidenceKeys).toContain("ABRECHNUNGSDATENEXPORT");
  });

  it("PL-04 (genehmigungspflichtige Leistungen) bleibt mit KV Berlin und Genehmigungsnachweis verbunden", () => {
    const cp = byId.get("PL-04");
    expect(cp?.authorityKeys).toContain("KV_BERLIN");
    expect(cp?.requiredEvidenceKeys).toContain("GENEHMIGUNG_LEISTUNG_KV");
  });

  it("PL-06 (interne Freigabe) verweist optional auf Freigabevermerkung", () => {
    const cp = byId.get("PL-06");
    expect(cp?.optionalEvidenceKeys).toContain("FREIGABE_ABRECHNUNG_INTERN");
  });
});
