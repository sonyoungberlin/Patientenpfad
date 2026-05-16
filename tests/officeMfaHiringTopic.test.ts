import {
  OFFICE_TOPIC_MFA_HIRING,
  getOfficeCheckpointCatalog,
} from "@/lib/office/checkpointCatalog";
import { isLegalSourceId } from "@/lib/office/legalSources";
import { isAuthorityId } from "@/lib/office/authorities";
import { isEvidenceId } from "@/lib/office/evidenceCatalog";

describe("Office-Topic mfa-einstellung: fachliche Anreicherung", () => {
  const catalog = getOfficeCheckpointCatalog(OFFICE_TOPIC_MFA_HIRING);
  const byId = new Map(catalog.map((cp) => [cp.id, cp]));

  it("enthaelt unveraendert die 6 MF-Checkpoints MF-01..MF-06", () => {
    expect(catalog.map((cp) => cp.id)).toEqual([
      "MF-01",
      "MF-02",
      "MF-03",
      "MF-04",
      "MF-05",
      "MF-06",
    ]);
  });

  it("jeder MF-Checkpoint traegt mindestens eine LegalRef, einen AuthorityKey oder einen Evidence-Key", () => {
    for (const cp of catalog) {
      const hasLegal = (cp.legalRefs?.length ?? 0) > 0;
      const hasAuthority = (cp.authorityKeys?.length ?? 0) > 0;
      const hasEvidence =
        (cp.requiredEvidenceKeys?.length ?? 0) > 0 ||
        (cp.optionalEvidenceKeys?.length ?? 0) > 0;
      expect(hasLegal || hasAuthority || hasEvidence).toBe(true);
    }
  });

  it("alle Referenzen sind in den Registries auffindbar", () => {
    for (const cp of catalog) {
      for (const ref of cp.legalRefs ?? []) expect(isLegalSourceId(ref)).toBe(true);
      for (const ref of cp.authorityKeys ?? []) expect(isAuthorityId(ref)).toBe(true);
      for (const ref of cp.requiredEvidenceKeys ?? []) expect(isEvidenceId(ref)).toBe(true);
      for (const ref of cp.optionalEvidenceKeys ?? []) expect(isEvidenceId(ref)).toBe(true);
    }
  });

  it("MF-01 Berufsabschluss verweist auf BBiG § 37, Aerztekammer Berlin als zustaendige Stelle und das MFA-Berufsabschlusszeugnis", () => {
    const cp = byId.get("MF-01");
    expect(cp?.legalRefs).toContain("BBIG_PAR_37");
    expect(cp?.authorityKeys).toEqual(["AERZTEKAMMER_BERLIN"]);
    expect(cp?.requiredEvidenceKeys).toContain("MFA_BERUFSABSCHLUSS");
  });

  it("MF-02 Arbeitsvertrag verweist auf NachwG und einen Arbeitsvertrag", () => {
    const cp = byId.get("MF-02");
    expect(cp?.legalRefs).toEqual(["NACHWG"]);
    expect(cp?.requiredEvidenceKeys).toContain("ARBEITSVERTRAG");
  });

  it("MF-03 Personalunterlagen verweist auf EStG § 39e (ELStAM) und enthaelt Personalakte plus Lohnsteuermerkmale", () => {
    const cp = byId.get("MF-03");
    expect(cp?.legalRefs).toContain("ESTG_PAR_39E");
    expect(cp?.requiredEvidenceKeys).toEqual(
      expect.arrayContaining(["PERSONALAKTE_GRUNDDATEN", "LOHNSTEUERMERKMALE_ELSTAM"]),
    );
  });

  it("MF-04 Sozialversicherung verweist auf SGB IV § 28a und § 8, Minijob-Zentrale und Krankenkasse als Einzugsstelle sowie eine SV-Anmeldung", () => {
    const cp = byId.get("MF-04");
    expect(cp?.legalRefs).toEqual(
      expect.arrayContaining(["SGB_IV_PAR_28A", "SGB_IV_PAR_8"]),
    );
    expect(cp?.authorityKeys).toEqual(
      expect.arrayContaining(["MINIJOB_ZENTRALE", "KRANKENKASSE_EINZUGSSTELLE"]),
    );
    expect(cp?.requiredEvidenceKeys).toContain("SV_ANMELDUNG");
  });

  it("MF-05 Zugriffsrechte verweist auf DSGVO Art. 32 und optional auf eine TOM-Dokumentation", () => {
    const cp = byId.get("MF-05");
    expect(cp?.legalRefs).toContain("DSGVO_ART_32");
    expect(cp?.optionalEvidenceKeys).toContain("DS_TOM_DOKU");
  });

  it("MF-06 Einarbeitung dokumentiert verweist optional auf einen Einarbeitungsplan", () => {
    const cp = byId.get("MF-06");
    expect(cp?.optionalEvidenceKeys).toContain("EINARBEITUNGSPLAN");
  });
});
