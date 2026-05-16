import {
  OFFICE_TOPIC_KV_BILLING,
  getOfficeCheckpointCatalog,
} from "@/lib/office/checkpointCatalog";
import { isLegalSourceId } from "@/lib/office/legalSources";
import { isAuthorityId } from "@/lib/office/authorities";
import { isEvidenceId } from "@/lib/office/evidenceCatalog";

describe("Office-Topic kv-schreiben-abrechnungsrueckfrage: fachliche Anreicherung", () => {
  const catalog = getOfficeCheckpointCatalog(OFFICE_TOPIC_KV_BILLING);
  const byId = new Map(catalog.map((cp) => [cp.id, cp]));

  it("enthaelt die erwarteten KV-Checkpoints in Reihenfolge", () => {
    expect(catalog.map((cp) => cp.id)).toEqual([
      "KV-01",
      "KV-02",
      "KV-03",
      "KV-04",
      "KV-05",
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

  it("KV-01 (Sachverhalt) verlangt das KV-Schreiben und nennt KV Berlin", () => {
    const cp = byId.get("KV-01");
    expect(cp?.authorityKeys).toContain("KV_BERLIN");
    expect(cp?.requiredEvidenceKeys).toContain("KV_SCHREIBEN_ABRECHNUNG");
  });

  it("KV-02 (Frist/Form) verweist auf SGB V § 106d und das KV-Schreiben als Fristanker", () => {
    const cp = byId.get("KV-02");
    expect(cp?.legalRefs).toContain("SGB_V_PAR_106D");
    expect(cp?.authorityKeys).toContain("KV_BERLIN");
    expect(cp?.requiredEvidenceKeys).toContain("KV_SCHREIBEN_ABRECHNUNG");
  });

  it("KV-03 (interne Einschaetzung) bleibt rein intern und nennt PVS-Auswertungen optional", () => {
    const cp = byId.get("KV-03");
    expect(cp?.legalRefs ?? []).toEqual([]);
    expect(cp?.authorityKeys ?? []).toEqual([]);
    expect(cp?.optionalEvidenceKeys).toEqual(
      expect.arrayContaining([
        "QUARTALSPROFIL_PVS",
        "ABRECHNUNGSDATENEXPORT",
        "HONORARBESCHEID_KV",
      ]),
    );
  });

  it("KV-04 (Rueckmeldung) verweist auf SGB V § 106d und verlangt eine Stellungnahme an die KV", () => {
    const cp = byId.get("KV-04");
    expect(cp?.legalRefs).toContain("SGB_V_PAR_106D");
    expect(cp?.authorityKeys).toContain("KV_BERLIN");
    expect(cp?.requiredEvidenceKeys).toContain("STELLUNGNAHME_KV_PLAUSIBILITAET");
  });

  it("KV-05 (Antwortquelle) nennt KV Berlin und PVS-/Honorarbescheid-Quellen optional", () => {
    const cp = byId.get("KV-05");
    expect(cp?.authorityKeys).toContain("KV_BERLIN");
    expect(cp?.optionalEvidenceKeys).toEqual(
      expect.arrayContaining([
        "ABRECHNUNGSDATENEXPORT",
        "QUARTALSPROFIL_PVS",
        "HONORARBESCHEID_KV",
      ]),
    );
  });

  it("Abgrenzung: kein SGG § 84 und kein Verweis auf Widerspruch (das ist Honorarbescheid-Topic)", () => {
    for (const cp of catalog) {
      expect(cp.legalRefs ?? []).not.toContain("SGG_PAR_84");
      expect(cp.requiredEvidenceKeys ?? []).not.toContain("WIDERSPRUCH_KV");
      expect(cp.optionalEvidenceKeys ?? []).not.toContain("WIDERSPRUCH_KV");
    }
  });
});
