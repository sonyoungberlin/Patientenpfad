import {
  OFFICE_TOPIC_EXTENDED_OPENING_HOURS,
  getOfficeCheckpointCatalog,
} from "@/lib/office/checkpointCatalog";
import { isLegalSourceId } from "@/lib/office/legalSources";
import { isAuthorityId } from "@/lib/office/authorities";
import { isEvidenceId } from "@/lib/office/evidenceCatalog";

describe("Office-Topic oeffnungszeiten-erweiterung-praxis: fachliche Anreicherung", () => {
  const catalog = getOfficeCheckpointCatalog(OFFICE_TOPIC_EXTENDED_OPENING_HOURS);
  const byId = new Map(catalog.map((cp) => [cp.id, cp]));

  it("enthaelt die erwarteten OE-Checkpoints in Reihenfolge", () => {
    expect(catalog.map((cp) => cp.id)).toEqual([
      "OE-01",
      "OE-02",
      "OE-03",
      "OE-04",
      "OE-05",
      "OE-06",
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

  it("OE-03 (KV-Anforderungen) verweist auf § 19a Aerzte-ZV und verlangt Sprechzeiten-Meldung an KV Berlin", () => {
    const cp = byId.get("OE-03");
    expect(cp?.legalRefs).toEqual(["AERZTE_ZV_PAR_19A"]);
    expect(cp?.authorityKeys).toEqual(["KV_BERLIN"]);
    expect(cp?.requiredEvidenceKeys).toContain("SPRECHZEITEN_MELDUNG_KV");
  });

  it("OE-04 (Patienteninformation) verweist auf § 19a Aerzte-ZV und verlangt Sprechzeiten-Aushang", () => {
    const cp = byId.get("OE-04");
    expect(cp?.legalRefs).toContain("AERZTE_ZV_PAR_19A");
    expect(cp?.requiredEvidenceKeys).toContain("PATIENTENINFO_SPRECHZEITEN");
  });

  it("OE-05 (Dienstplanung) nennt internen Dienstplan optional", () => {
    expect(byId.get("OE-05")?.optionalEvidenceKeys).toContain("DIENSTPLAN_PRAXIS");
  });

  it("OE-06 (Praxisbetrieb abgesichert) verweist auf § 19a Aerzte-ZV und KV Berlin", () => {
    const cp = byId.get("OE-06");
    expect(cp?.legalRefs).toContain("AERZTE_ZV_PAR_19A");
    expect(cp?.authorityKeys).toContain("KV_BERLIN");
  });

  it("OE-01 und OE-02 bleiben bewusst ohne legalRefs (interne Personal-/Arbeitszeitentscheidung)", () => {
    expect(byId.get("OE-01")?.legalRefs).toBeUndefined();
    expect(byId.get("OE-02")?.legalRefs).toBeUndefined();
  });
});
