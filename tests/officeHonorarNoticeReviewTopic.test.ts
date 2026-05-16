import {
  OFFICE_TOPIC_HONORAR_NOTICE_REVIEW,
  getOfficeCheckpointCatalog,
} from "@/lib/office/checkpointCatalog";
import { isLegalSourceId } from "@/lib/office/legalSources";
import { isAuthorityId } from "@/lib/office/authorities";
import { isEvidenceId } from "@/lib/office/evidenceCatalog";

describe("Office-Topic honorarbescheid-pruefung: fachliche Anreicherung", () => {
  const catalog = getOfficeCheckpointCatalog(
    OFFICE_TOPIC_HONORAR_NOTICE_REVIEW,
  );
  const byId = new Map(catalog.map((cp) => [cp.id, cp]));

  it("enthaelt die erwarteten HB-Checkpoints in Reihenfolge", () => {
    expect(catalog.map((cp) => cp.id)).toEqual([
      "HB-01",
      "HB-02",
      "HB-03",
      "HB-04",
      "HB-05",
      "HB-06",
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

  it("jeder HB-Checkpoint benennt KV Berlin als zustaendige Stelle", () => {
    for (const cp of catalog) {
      expect(cp.authorityKeys).toContain("KV_BERLIN");
    }
  });

  it("HB-01 (Fallzahlen) verlangt Honorarbescheid und referenziert PVS-Auswertungen optional", () => {
    const cp = byId.get("HB-01");
    expect(cp?.requiredEvidenceKeys).toContain("HONORARBESCHEID_KV");
    expect(cp?.optionalEvidenceKeys).toEqual(
      expect.arrayContaining(["ABRECHNUNGSDATENEXPORT", "QUARTALSPROFIL_PVS"]),
    );
  });

  it("HB-03 (Kuerzungen) verweist auf SGB V § 106d (sachlich-rechnerische Richtigstellung)", () => {
    const cp = byId.get("HB-03");
    expect(cp?.legalRefs).toContain("SGB_V_PAR_106D");
    expect(cp?.requiredEvidenceKeys).toContain("HONORARBESCHEID_KV");
  });

  it("HB-04 (Genehmigungen) verlangt KV-Genehmigungsnachweis", () => {
    const cp = byId.get("HB-04");
    expect(cp?.requiredEvidenceKeys).toContain("GENEHMIGUNG_LEISTUNG_KV");
  });

  it("HB-05 (RLV/QZV) verweist auf SGB V § 87b und nennt die RLV/QZV-Mitteilung", () => {
    const cp = byId.get("HB-05");
    expect(cp?.legalRefs).toContain("SGB_V_PAR_87B");
    expect(cp?.optionalEvidenceKeys).toContain("RLV_QZV_MITTEILUNG_KV");
  });

  it("HB-06 (Widerspruchsfrist) verweist auf SGG § 84 und nennt Honorarbescheid + Widerspruch", () => {
    const cp = byId.get("HB-06");
    expect(cp?.legalRefs).toContain("SGG_PAR_84");
    expect(cp?.requiredEvidenceKeys).toContain("HONORARBESCHEID_KV");
    expect(cp?.optionalEvidenceKeys).toContain("WIDERSPRUCH_KV");
  });
});
