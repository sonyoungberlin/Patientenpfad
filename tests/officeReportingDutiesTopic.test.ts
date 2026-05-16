import {
  OFFICE_TOPIC_REPORTING_DUTIES,
  getOfficeCheckpointCatalog,
} from "@/lib/office/checkpointCatalog";
import { isLegalSourceId } from "@/lib/office/legalSources";
import { isAuthorityId } from "@/lib/office/authorities";
import { isEvidenceId } from "@/lib/office/evidenceCatalog";

describe("Office-Topic meldepflichten-zustaendige-stellen: fachliche Anreicherung", () => {
  const catalog = getOfficeCheckpointCatalog(OFFICE_TOPIC_REPORTING_DUTIES);
  const byId = new Map(catalog.map((cp) => [cp.id, cp]));

  it("enthaelt die erwarteten MP-Checkpoints in Reihenfolge", () => {
    expect(catalog.map((cp) => cp.id)).toEqual([
      "MP-01",
      "MP-02",
      "MP-03",
      "MP-04",
      "MP-05",
      "MP-06",
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

  it("MP-02 (Pflichten/Fristen) verweist auf IfSG §§ 6, 7, 8, 9", () => {
    expect(byId.get("MP-02")?.legalRefs).toEqual([
      "IFSG_PAR_6",
      "IFSG_PAR_7",
      "IFSG_PAR_8",
      "IFSG_PAR_9",
    ]);
  });

  it("MP-03 (Verantwortung) verweist auf § 8 IfSG (verpflichtete Personen)", () => {
    expect(byId.get("MP-03")?.legalRefs).toEqual(["IFSG_PAR_8"]);
  });

  it("MP-04 (Nachweise) verweist auf § 9 IfSG und verlangt IFSG_MELDUNG", () => {
    const cp = byId.get("MP-04");
    expect(cp?.legalRefs).toContain("IFSG_PAR_9");
    expect(cp?.requiredEvidenceKeys).toContain("IFSG_MELDUNG");
  });

  it("MP-06 (externe Stelle) verweist auf §§ 8, 9 IfSG und das bezirkliche Gesundheitsamt Berlin", () => {
    const cp = byId.get("MP-06");
    expect(cp?.legalRefs).toEqual(
      expect.arrayContaining(["IFSG_PAR_8", "IFSG_PAR_9"]),
    );
    expect(cp?.authorityKeys).toEqual(["GESUNDHEITSAMT_BERLIN"]);
    expect(cp?.requiredEvidenceKeys).toContain("IFSG_MELDUNG");
  });

  it("MP-01 und MP-05 bleiben bewusst ohne legalRefs (interner Anlass / interne Freigabe)", () => {
    expect(byId.get("MP-01")?.legalRefs).toBeUndefined();
    expect(byId.get("MP-05")?.legalRefs).toBeUndefined();
  });
});
