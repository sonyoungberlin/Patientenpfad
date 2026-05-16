import {
  OFFICE_TOPIC_DATA_PROTECTION_INCIDENT,
  getOfficeCheckpointCatalog,
} from "@/lib/office/checkpointCatalog";
import { isLegalSourceId } from "@/lib/office/legalSources";
import { isAuthorityId } from "@/lib/office/authorities";
import { isEvidenceId } from "@/lib/office/evidenceCatalog";

describe("Office-Topic datenschutzvorfall: fachliche Anreicherung", () => {
  const catalog = getOfficeCheckpointCatalog(OFFICE_TOPIC_DATA_PROTECTION_INCIDENT);
  const byId = new Map(catalog.map((cp) => [cp.id, cp]));

  it("enthaelt unveraendert die 6 DS-Checkpoints DS-01..DS-06", () => {
    expect(catalog.map((cp) => cp.id)).toEqual([
      "DS-01",
      "DS-02",
      "DS-03",
      "DS-04",
      "DS-05",
      "DS-06",
    ]);
  });

  it("alle DS-Checkpoints haben mindestens eine legalRef oder einen authorityKey oder einen Evidence-Key", () => {
    for (const cp of catalog) {
      const hasLegal = (cp.legalRefs?.length ?? 0) > 0;
      const hasAuthority = (cp.authorityKeys?.length ?? 0) > 0;
      const hasEvidence =
        (cp.requiredEvidenceKeys?.length ?? 0) > 0 ||
        (cp.optionalEvidenceKeys?.length ?? 0) > 0;
      expect(hasLegal || hasAuthority || hasEvidence).toBe(true);
    }
  });

  it("alle DS-Referenzen sind in den Registries auffindbar", () => {
    for (const cp of catalog) {
      for (const ref of cp.legalRefs ?? []) expect(isLegalSourceId(ref)).toBe(true);
      for (const ref of cp.authorityKeys ?? []) expect(isAuthorityId(ref)).toBe(true);
      for (const ref of cp.requiredEvidenceKeys ?? []) expect(isEvidenceId(ref)).toBe(true);
      for (const ref of cp.optionalEvidenceKeys ?? []) expect(isEvidenceId(ref)).toBe(true);
    }
  });

  it("DS-01 Vorfall dokumentiert verweist auf DSGVO Art. 33 und Art. 5 sowie ein Vorfallprotokoll", () => {
    const cp = byId.get("DS-01");
    expect(cp?.legalRefs).toEqual(expect.arrayContaining(["DSGVO_ART_33", "DSGVO_ART_5"]));
    expect(cp?.requiredEvidenceKeys).toContain("DS_VORFALL_PROTOKOLL");
  });

  it("DS-02 Betroffene Daten bewertet verweist auf DSGVO Art. 32/33 und eine Risikobewertung", () => {
    const cp = byId.get("DS-02");
    expect(cp?.legalRefs).toEqual(expect.arrayContaining(["DSGVO_ART_33", "DSGVO_ART_32"]));
    expect(cp?.requiredEvidenceKeys).toContain("DS_RISIKOBEWERTUNG");
  });

  it("DS-03 Meldepflicht meldet ausschliesslich an die Berliner Datenschutzbeauftragte", () => {
    const cp = byId.get("DS-03");
    expect(cp?.authorityKeys).toEqual(["BERLIN_DATENSCHUTZBEAUFTRAGTE"]);
    expect(cp?.legalRefs).toEqual(expect.arrayContaining(["DSGVO_ART_33", "BLN_DSG"]));
    expect(cp?.requiredEvidenceKeys).toContain("DS_MELDUNG_AUFSICHT");
  });

  it("DS-04 Zugriffe gesichert verweist auf DSGVO Art. 32 (Sicherheit der Verarbeitung)", () => {
    const cp = byId.get("DS-04");
    expect(cp?.legalRefs).toContain("DSGVO_ART_32");
    expect(cp?.optionalEvidenceKeys).toContain("DS_TOM_DOKU");
  });

  it("DS-05 Betroffene informiert verweist auf DSGVO Art. 34 und Betroffenen-Info", () => {
    const cp = byId.get("DS-05");
    expect(cp?.legalRefs).toContain("DSGVO_ART_34");
    expect(cp?.requiredEvidenceKeys).toContain("DS_BETROFFENEN_INFO");
  });

  it("DS-06 Folgemassnahmen verweist auf DSGVO Art. 5/32 und einen Massnahmenplan", () => {
    const cp = byId.get("DS-06");
    expect(cp?.legalRefs).toEqual(expect.arrayContaining(["DSGVO_ART_5", "DSGVO_ART_32"]));
    expect(cp?.requiredEvidenceKeys).toContain("DS_MASSNAHMENPLAN");
    expect(cp?.optionalEvidenceKeys).toContain("DS_TOM_DOKU");
  });
});
