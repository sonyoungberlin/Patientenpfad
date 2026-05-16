import {
  OFFICE_TOPIC_CME_GENERAL_MEDICINE,
  getOfficeCheckpointCatalog,
} from "@/lib/office/checkpointCatalog";
import { isLegalSourceId } from "@/lib/office/legalSources";
import { isAuthorityId } from "@/lib/office/authorities";
import { isEvidenceId } from "@/lib/office/evidenceCatalog";

describe("Office-Topic fortbildungspunkte-allgemeinmedizin: fachliche Anreicherung", () => {
  const catalog = getOfficeCheckpointCatalog(OFFICE_TOPIC_CME_GENERAL_MEDICINE);
  const byId = new Map(catalog.map((cp) => [cp.id, cp]));

  it("enthaelt die erwarteten FB-Checkpoints in Reihenfolge", () => {
    expect(catalog.map((cp) => cp.id)).toEqual([
      "FB-01",
      "FB-02",
      "FB-03",
      "FB-04",
      "FB-05",
      "FB-06",
      "FB-AUFHOLPLAN",
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

  it("jeder FB-Checkpoint verweist mindestens auf SGB V § 95d oder einen Nachweis", () => {
    for (const cp of catalog) {
      const hasLegal = (cp.legalRefs?.length ?? 0) > 0;
      const hasEvidence =
        (cp.requiredEvidenceKeys?.length ?? 0) > 0 ||
        (cp.optionalEvidenceKeys?.length ?? 0) > 0;
      expect(hasLegal || hasEvidence).toBe(true);
    }
  });

  it("FB-01 verweist auf SGB V § 95d (Nachweiszeitraum)", () => {
    expect(byId.get("FB-01")?.legalRefs).toContain("SGB_V_PAR_95D");
  });

  it("FB-02 verweist auf SGB V § 95d, Aerztekammer Berlin und das Fortbildungszertifikat", () => {
    const cp = byId.get("FB-02");
    expect(cp?.legalRefs).toContain("SGB_V_PAR_95D");
    expect(cp?.authorityKeys).toContain("AERZTEKAMMER_BERLIN");
    expect(cp?.requiredEvidenceKeys).toContain("FORTBILDUNGSZERTIFIKAT");
    expect(cp?.optionalEvidenceKeys).toContain("FORTBILDUNGSPUNKTEKONTO_AUSZUG");
  });

  it("FB-03 archiviert Fortbildungszertifikat und optional Punktekonto-Auszug", () => {
    const cp = byId.get("FB-03");
    expect(cp?.requiredEvidenceKeys).toContain("FORTBILDUNGSZERTIFIKAT");
    expect(cp?.optionalEvidenceKeys).toContain("FORTBILDUNGSPUNKTEKONTO_AUSZUG");
  });

  it("FB-04 verweist auf SGB V § 95d (5-Jahres-Frist)", () => {
    expect(byId.get("FB-04")?.legalRefs).toContain("SGB_V_PAR_95D");
  });

  it("FB-05 benennt Aerztekammer Berlin und KV Berlin und fordert das Fortbildungszertifikat", () => {
    const cp = byId.get("FB-05");
    expect(cp?.legalRefs).toContain("SGB_V_PAR_95D");
    expect(cp?.authorityKeys).toEqual(
      expect.arrayContaining(["AERZTEKAMMER_BERLIN", "KV_BERLIN"]),
    );
    expect(cp?.requiredEvidenceKeys).toContain("FORTBILDUNGSZERTIFIKAT");
  });

  it("FB-06 verweist auf SGB V § 95d und KV Berlin (Honorarkuerzung / Zulassungsentziehung)", () => {
    const cp = byId.get("FB-06");
    expect(cp?.legalRefs).toContain("SGB_V_PAR_95D");
    expect(cp?.authorityKeys).toContain("KV_BERLIN");
  });

  it("FB-AUFHOLPLAN verweist auf SGB V § 95d und optional auf einen Aufholplan", () => {
    const cp = byId.get("FB-AUFHOLPLAN");
    expect(cp?.legalRefs).toContain("SGB_V_PAR_95D");
    expect(cp?.optionalEvidenceKeys).toContain("FORTBILDUNGS_AUFHOLPLAN");
  });
});
