import {
  OFFICE_TOPIC_CONTINUING_EDUCATION,
  getOfficeCheckpointCatalog,
} from "@/lib/office/checkpointCatalog";
import { isLegalSourceId } from "@/lib/office/legalSources";
import { isAuthorityId } from "@/lib/office/authorities";
import { isEvidenceId } from "@/lib/office/evidenceCatalog";

describe("Office-Topic weiterbildung-fortbildungspunkte-nachweise: fachliche Anreicherung", () => {
  const catalog = getOfficeCheckpointCatalog(
    OFFICE_TOPIC_CONTINUING_EDUCATION,
  );
  const byId = new Map(catalog.map((cp) => [cp.id, cp]));

  it("enthaelt die erwarteten WB-Checkpoints in Reihenfolge", () => {
    expect(catalog.map((cp) => cp.id)).toEqual([
      "WB-01",
      "WB-02",
      "WB-03",
      "WB-04",
      "WB-05",
      "WB-06",
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

  it("WB-01 (Anlass) bleibt rein intern ohne externe Referenzen", () => {
    const cp = byId.get("WB-01");
    expect(cp?.legalRefs ?? []).toEqual([]);
    expect(cp?.authorityKeys ?? []).toEqual([]);
    expect(cp?.requiredEvidenceKeys ?? []).toEqual([]);
    expect(cp?.optionalEvidenceKeys ?? []).toEqual([]);
  });

  it("WB-02 (Pflichten/Fristen) verweist auf SGB V § 95d und nennt die Aerztekammer Berlin", () => {
    const cp = byId.get("WB-02");
    expect(cp?.legalRefs).toContain("SGB_V_PAR_95D");
    expect(cp?.authorityKeys).toContain("AERZTEKAMMER_BERLIN");
  });

  it("WB-03 (Verantwortung) bleibt rein intern ohne externe Referenzen", () => {
    const cp = byId.get("WB-03");
    expect(cp?.legalRefs ?? []).toEqual([]);
    expect(cp?.authorityKeys ?? []).toEqual([]);
    expect(cp?.requiredEvidenceKeys ?? []).toEqual([]);
    expect(cp?.optionalEvidenceKeys ?? []).toEqual([]);
  });

  it("WB-04 (Nachweise) verlangt Fortbildungszertifikat und nennt Punktekonto optional", () => {
    const cp = byId.get("WB-04");
    expect(cp?.legalRefs).toContain("SGB_V_PAR_95D");
    expect(cp?.authorityKeys).toContain("AERZTEKAMMER_BERLIN");
    expect(cp?.requiredEvidenceKeys).toContain("FORTBILDUNGSZERTIFIKAT");
    expect(cp?.optionalEvidenceKeys).toContain("FORTBILDUNGSPUNKTEKONTO_AUSZUG");
  });

  it("WB-05 (Massnahmen) verweist auf SGB V § 95d und nennt Aufholplan optional", () => {
    const cp = byId.get("WB-05");
    expect(cp?.legalRefs).toContain("SGB_V_PAR_95D");
    expect(cp?.optionalEvidenceKeys).toContain("FORTBILDUNGS_AUFHOLPLAN");
  });

  it("WB-06 (Externe Stelle) nennt die Aerztekammer Berlin als punktekontofuehrende Stelle", () => {
    const cp = byId.get("WB-06");
    expect(cp?.legalRefs).toContain("SGB_V_PAR_95D");
    expect(cp?.authorityKeys).toContain("AERZTEKAMMER_BERLIN");
    expect(cp?.optionalEvidenceKeys).toContain("FORTBILDUNGSPUNKTEKONTO_AUSZUG");
  });

  it("Abgrenzung: keine KV als Authority (vertragsaerztliche Konsequenzen liegen im FB-Topic)", () => {
    for (const cp of catalog) {
      expect(cp.authorityKeys ?? []).not.toContain("KV_BERLIN");
    }
  });
});
