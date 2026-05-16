import {
  OFFICE_TOPIC_HIRING_REPLACEMENT,
  getOfficeCheckpointCatalog,
} from "@/lib/office/checkpointCatalog";
import { isLegalSourceId } from "@/lib/office/legalSources";
import { isAuthorityId } from "@/lib/office/authorities";
import { isEvidenceId } from "@/lib/office/evidenceCatalog";

describe("Office-Topic arzt-anstellen-nachbesetzung: fachliche Anreicherung", () => {
  const catalog = getOfficeCheckpointCatalog(OFFICE_TOPIC_HIRING_REPLACEMENT);
  const byId = new Map(catalog.map((cp) => [cp.id, cp]));

  it("enthaelt unveraendert die 12 NC-Checkpoints in stabiler Reihenfolge", () => {
    expect(catalog.map((cp) => cp.id)).toEqual([
      "NC-REGISTERSTATUS",
      "NC-APPROBATION",
      "NC-FACHARZTQUALIFIKATION",
      "NC-BERUFSHAFTPFLICHT",
      "NC-TAETIGKEITSUMFANG",
      "NC-EXTERNE_STELLE",
      "NC-ANTRAGSWEG",
      "NC-GENEHMIGUNGSSTATUS",
      "NC-BETRIEBSSTAETTENSTRUKTUR",
      "NC-ARBEITSVERTRAG_FREIGABE",
      "NC-LANR_BSNR_ZUORDNUNG",
      "NC-SYSTEMZUGRIFFE_EINGERICHTET",
    ]);
  });

  it("jeder NC-Checkpoint traegt mindestens eine LegalRef, einen AuthorityKey oder einen Evidence-Key", () => {
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

  it("NC-REGISTERSTATUS verweist auf SGB V § 95 und Heilberufekammergesetz Berlin", () => {
    const cp = byId.get("NC-REGISTERSTATUS");
    expect(cp?.legalRefs).toEqual(expect.arrayContaining(["SGB_V_PAR_95", "HEILBERG_BLN"]));
    expect(cp?.authorityKeys).toEqual(["AERZTEKAMMER_BERLIN"]);
    expect(cp?.requiredEvidenceKeys).toContain("REGISTERAUSZUG_AERZTE");
  });

  it("NC-APPROBATION verweist auf BAeO § 3 und die Approbationsurkunde", () => {
    const cp = byId.get("NC-APPROBATION");
    expect(cp?.legalRefs).toContain("BAEO_PAR_3");
    expect(cp?.authorityKeys).toContain("AERZTEKAMMER_BERLIN");
    expect(cp?.requiredEvidenceKeys).toContain("APPROBATIONSURKUNDE");
  });

  it("NC-FACHARZTQUALIFIKATION verweist auf das Heilberufekammergesetz Berlin (keine pauschale Berufsordnung)", () => {
    const cp = byId.get("NC-FACHARZTQUALIFIKATION");
    expect(cp?.legalRefs).toContain("HEILBERG_BLN");
    expect(cp?.legalRefs).not.toContain("BERUFSO_AERZTE_BERLIN");
    expect(cp?.requiredEvidenceKeys).toContain("FACHARZTURKUNDE");
  });

  it("NC-BERUFSHAFTPFLICHT verweist auf BAeO § 21 und einen Versicherungsnachweis", () => {
    const cp = byId.get("NC-BERUFSHAFTPFLICHT");
    expect(cp?.legalRefs).toContain("BAEO_PAR_21");
    expect(cp?.requiredEvidenceKeys).toContain("BERUFSHAFTPFLICHT_NACHWEIS");
  });

  it("NC-TAETIGKEITSUMFANG verweist auf SGB V § 95 und Aerzte-ZV § 32b mit Zulassungsausschuss Berlin", () => {
    const cp = byId.get("NC-TAETIGKEITSUMFANG");
    expect(cp?.legalRefs).toEqual(
      expect.arrayContaining(["SGB_V_PAR_95", "AERZTE_ZV_PAR_32B"]),
    );
    expect(cp?.authorityKeys).toContain("ZULASSUNGSAUSSCHUSS_BERLIN");
  });

  it("NC-EXTERNE_STELLE benennt Zulassungsausschuss Berlin, KV Berlin und Aerztekammer Berlin", () => {
    const cp = byId.get("NC-EXTERNE_STELLE");
    expect(cp?.authorityKeys).toEqual(
      expect.arrayContaining([
        "ZULASSUNGSAUSSCHUSS_BERLIN",
        "KV_BERLIN",
        "AERZTEKAMMER_BERLIN",
      ]),
    );
    expect(cp?.legalRefs).toEqual(
      expect.arrayContaining(["SGB_V_PAR_95", "AERZTE_ZV_PAR_32B"]),
    );
  });

  it("NC-ANTRAGSWEG verweist auf Aerzte-ZV § 32b und Zulassungsausschuss Berlin", () => {
    const cp = byId.get("NC-ANTRAGSWEG");
    expect(cp?.legalRefs).toContain("AERZTE_ZV_PAR_32B");
    expect(cp?.authorityKeys).toEqual(["ZULASSUNGSAUSSCHUSS_BERLIN"]);
  });

  it("NC-GENEHMIGUNGSSTATUS bleibt vollstaendig (Aerzte-ZV § 32b + SGB V § 95 + ZA Berlin + KV Berlin + Anstellungsgenehmigung)", () => {
    const cp = byId.get("NC-GENEHMIGUNGSSTATUS");
    expect(cp?.legalRefs).toEqual(
      expect.arrayContaining(["AERZTE_ZV_PAR_32B", "SGB_V_PAR_95"]),
    );
    expect(cp?.authorityKeys).toEqual(
      expect.arrayContaining(["ZULASSUNGSAUSSCHUSS_BERLIN", "KV_BERLIN"]),
    );
    expect(cp?.requiredEvidenceKeys).toContain("ANSTELLUNGSGENEHMIGUNG_ZA");
  });

  it("NC-BETRIEBSSTAETTENSTRUKTUR verweist auf BMV-Ae und SGB V § 95 mit KV Berlin", () => {
    const cp = byId.get("NC-BETRIEBSSTAETTENSTRUKTUR");
    expect(cp?.legalRefs).toEqual(expect.arrayContaining(["BMV_AE", "SGB_V_PAR_95"]));
    expect(cp?.authorityKeys).toContain("KV_BERLIN");
  });

  it("NC-ARBEITSVERTRAG_FREIGABE verweist auf NachwG und Aerzte-ZV § 32b sowie einen Arbeitsvertrag", () => {
    const cp = byId.get("NC-ARBEITSVERTRAG_FREIGABE");
    expect(cp?.legalRefs).toEqual(expect.arrayContaining(["NACHWG", "AERZTE_ZV_PAR_32B"]));
    expect(cp?.requiredEvidenceKeys).toContain("ARBEITSVERTRAG");
  });

  it("NC-LANR_BSNR_ZUORDNUNG verweist auf SGB V § 295 und BMV-Ae mit KV Berlin und LANR/BSNR-Bestaetigung", () => {
    const cp = byId.get("NC-LANR_BSNR_ZUORDNUNG");
    expect(cp?.legalRefs).toEqual(expect.arrayContaining(["SGB_V_PAR_295", "BMV_AE"]));
    expect(cp?.authorityKeys).toEqual(["KV_BERLIN"]);
    expect(cp?.requiredEvidenceKeys).toContain("LANR_BSNR_BESTAETIGUNG");
  });

  it("NC-SYSTEMZUGRIFFE_EINGERICHTET verweist auf DSGVO Art. 32 und optional eine TOM-Dokumentation", () => {
    const cp = byId.get("NC-SYSTEMZUGRIFFE_EINGERICHTET");
    expect(cp?.legalRefs).toContain("DSGVO_ART_32");
    expect(cp?.optionalEvidenceKeys).toContain("DS_TOM_DOKU");
  });
});
