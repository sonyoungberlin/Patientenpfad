import {
  OFFICE_TOPIC_MINOR_MFA_APPRENTICE_HIRING,
  getOfficeCheckpointCatalog,
} from "@/lib/office/checkpointCatalog";
import { isLegalSourceId } from "@/lib/office/legalSources";
import { isAuthorityId } from "@/lib/office/authorities";
import { isEvidenceId } from "@/lib/office/evidenceCatalog";

describe("Office-Topic mfa-azubi-unter-18-einstellung: fachliche Anreicherung", () => {
  const catalog = getOfficeCheckpointCatalog(OFFICE_TOPIC_MINOR_MFA_APPRENTICE_HIRING);
  const byId = new Map(catalog.map((cp) => [cp.id, cp]));

  it("enthaelt unveraendert die 6 MA-Checkpoints MA-01..MA-06", () => {
    expect(catalog.map((cp) => cp.id)).toEqual([
      "MA-01",
      "MA-02",
      "MA-03",
      "MA-04",
      "MA-05",
      "MA-06",
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

  it("jeder MA-Checkpoint traegt mindestens eine LegalRef, einen AuthorityKey oder einen Evidence-Key", () => {
    for (const cp of catalog) {
      const hasLegal = (cp.legalRefs?.length ?? 0) > 0;
      const hasAuthority = (cp.authorityKeys?.length ?? 0) > 0;
      const hasEvidence =
        (cp.requiredEvidenceKeys?.length ?? 0) > 0 ||
        (cp.optionalEvidenceKeys?.length ?? 0) > 0;
      expect(hasLegal || hasAuthority || hasEvidence).toBe(true);
    }
  });

  it("MA-01 benennt LAGetSi Berlin als Jugendarbeitsschutz-Aufsicht", () => {
    const cp = byId.get("MA-01");
    expect(cp?.authorityKeys).toContain("LAGETSI_BERLIN");
  });

  it("MA-02 verweist auf JArbSchG § 32 mit Erstuntersuchungs-Bescheinigung und optional Nachuntersuchung", () => {
    const cp = byId.get("MA-02");
    expect(cp?.legalRefs).toContain("JARBSCHG_PAR_32");
    expect(cp?.requiredEvidenceKeys).toContain("JARBSCHG_ERSTUNTERSUCHUNG");
    expect(cp?.optionalEvidenceKeys).toContain("JARBSCHG_NACHUNTERSUCHUNG");
  });

  it("MA-03 verweist auf BBiG §§ 10, 11, Aerztekammer Berlin als zustaendige Stelle und einen MFA-Ausbildungsvertrag", () => {
    const cp = byId.get("MA-03");
    expect(cp?.legalRefs).toEqual(
      expect.arrayContaining(["BBIG_PAR_10", "BBIG_PAR_11"]),
    );
    expect(cp?.authorityKeys).toContain("AERZTEKAMMER_BERLIN");
    expect(cp?.requiredEvidenceKeys).toContain("AUSBILDUNGSVERTRAG_MFA");
  });

  it("MA-04 begrenzt Arbeitszeiten ueber JArbSchG §§ 8, 11 und LAGetSi Berlin", () => {
    const cp = byId.get("MA-04");
    expect(cp?.legalRefs).toEqual(
      expect.arrayContaining(["JARBSCHG_PAR_8", "JARBSCHG_PAR_11"]),
    );
    expect(cp?.authorityKeys).toContain("LAGETSI_BERLIN");
  });

  it("MA-05 erwartet eine Einwilligung der Erziehungsberechtigten", () => {
    const cp = byId.get("MA-05");
    expect(cp?.requiredEvidenceKeys).toContain("EINWILLIGUNG_ERZIEHUNGSBERECHTIGTE");
  });

  it("MA-06 verweist auf JArbSchG § 29, BG BGW und eine Unterweisungs-Dokumentation", () => {
    const cp = byId.get("MA-06");
    expect(cp?.legalRefs).toContain("JARBSCHG_PAR_29");
    expect(cp?.authorityKeys).toContain("BG_BGW");
    expect(cp?.requiredEvidenceKeys).toContain("JUGEND_UNTERWEISUNG_DOKU");
  });
});
