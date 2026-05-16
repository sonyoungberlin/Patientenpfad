import {
  OFFICE_TOPIC_REGRESS,
  getOfficeCheckpointCatalog,
} from "@/lib/office/checkpointCatalog";
import { isLegalSourceId } from "@/lib/office/legalSources";
import { isAuthorityId } from "@/lib/office/authorities";
import { isEvidenceId } from "@/lib/office/evidenceCatalog";

describe("Office-Topic regress-wirtschaftlichkeitspruefung: fachliche Anreicherung", () => {
  const catalog = getOfficeCheckpointCatalog(OFFICE_TOPIC_REGRESS);
  const byId = new Map(catalog.map((cp) => [cp.id, cp]));

  it("enthaelt die erwarteten RG-Checkpoints in Reihenfolge", () => {
    expect(catalog.map((cp) => cp.id)).toEqual([
      "RG-01",
      "RG-02",
      "RG-03",
      "RG-04",
      "RG-05",
      "RG-06",
      "RG-07",
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

  it("RG-01 (Anlass/Zeitraum) verweist auf §§ 106, 106b SGB V und nennt Pruefbescheid/Anhoerung optional", () => {
    const cp = byId.get("RG-01");
    expect(cp?.legalRefs).toEqual(
      expect.arrayContaining(["SGB_V_PAR_106", "SGB_V_PAR_106B"]),
    );
    expect(cp?.optionalEvidenceKeys).toEqual(
      expect.arrayContaining([
        "PRUEFBESCHEID_PRUEFUNGSSTELLE",
        "ANHOERUNG_PRUEFUNGSSTELLE",
      ]),
    );
  });

  it("RG-02 (Pflichten/Fristen) verweist auf SGB V §§ 106, 106b und SGG § 84 (Widerspruchsfrist)", () => {
    const cp = byId.get("RG-02");
    expect(cp?.legalRefs).toEqual(
      expect.arrayContaining([
        "SGB_V_PAR_106",
        "SGB_V_PAR_106B",
        "SGG_PAR_84",
      ]),
    );
  });

  it("RG-04 (Nachweise) verlangt Verordnungsdaten und nennt Praxisbesonderheiten + medizinische Begruendung optional", () => {
    const cp = byId.get("RG-04");
    expect(cp?.legalRefs).toContain("SGB_V_PAR_106B");
    expect(cp?.requiredEvidenceKeys).toContain("VERORDNUNGSDATEN_PVS");
    expect(cp?.optionalEvidenceKeys).toEqual(
      expect.arrayContaining(["PRAXISBESONDERHEITEN_DOKU", "MEDIZINISCHE_BEGRUENDUNG"]),
    );
  });

  it("RG-05 (Entscheidung) verweist auf SGG § 84 und § 106c SGB V (Beschwerdeausschuss)", () => {
    const cp = byId.get("RG-05");
    expect(cp?.legalRefs).toEqual(
      expect.arrayContaining(["SGG_PAR_84", "SGB_V_PAR_106C"]),
    );
    expect(cp?.optionalEvidenceKeys).toEqual(
      expect.arrayContaining([
        "STELLUNGNAHME_PRUEFUNGSSTELLE",
        "WIDERSPRUCH_PRUEFUNGSSTELLE",
      ]),
    );
  });

  it("RG-06 (externe Stelle) verweist auf § 106c SGB V und nennt Pruefungsstelle Berlin und KV Berlin", () => {
    const cp = byId.get("RG-06");
    expect(cp?.legalRefs).toContain("SGB_V_PAR_106C");
    expect(cp?.authorityKeys).toEqual(
      expect.arrayContaining(["PRUEFUNGSSTELLE_BERLIN", "KV_BERLIN"]),
    );
    expect(cp?.requiredEvidenceKeys).toContain("PRUEFBESCHEID_PRUEFUNGSSTELLE");
  });

  it("RG-03 und RG-07 bleiben bewusst ohne legalRefs (rein interne Verantwortungs-/Risikofelder)", () => {
    expect(byId.get("RG-03")?.legalRefs).toBeUndefined();
    expect(byId.get("RG-07")?.legalRefs).toBeUndefined();
  });
});
