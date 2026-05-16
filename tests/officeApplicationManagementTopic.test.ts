import {
  OFFICE_TOPIC_APPLICATION_MANAGEMENT,
  getOfficeCheckpointCatalog,
} from "@/lib/office/checkpointCatalog";
import { isLegalSourceId } from "@/lib/office/legalSources";
import { isAuthorityId } from "@/lib/office/authorities";
import { isEvidenceId } from "@/lib/office/evidenceCatalog";

describe("Office-Topic antragsmanagement-fristen-zustaendigkeiten: fachliche Anreicherung", () => {
  const catalog = getOfficeCheckpointCatalog(
    OFFICE_TOPIC_APPLICATION_MANAGEMENT,
  );
  const byId = new Map(catalog.map((cp) => [cp.id, cp]));

  it("enthaelt die erwarteten AM-Checkpoints in Reihenfolge", () => {
    expect(catalog.map((cp) => cp.id)).toEqual([
      "AM-01",
      "AM-02",
      "AM-03",
      "AM-04",
      "AM-05",
      "AM-06",
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

  it("AM-01 (Anlass) bleibt rein intern ohne externe Referenzen", () => {
    const cp = byId.get("AM-01");
    expect(cp?.legalRefs ?? []).toEqual([]);
    expect(cp?.authorityKeys ?? []).toEqual([]);
    expect(cp?.requiredEvidenceKeys ?? []).toEqual([]);
    expect(cp?.optionalEvidenceKeys ?? []).toEqual([]);
  });

  it("AM-02 (Pflichten/Fristen) nennt die typischen externen Adressaten und verlangt den Antrag", () => {
    const cp = byId.get("AM-02");
    expect(cp?.authorityKeys).toEqual(
      expect.arrayContaining([
        "KV_BERLIN",
        "ZULASSUNGSAUSSCHUSS_BERLIN",
        "AERZTEKAMMER_BERLIN",
        "GESUNDHEITSAMT_BERLIN",
      ]),
    );
    expect(cp?.requiredEvidenceKeys).toContain("ANTRAG_EXTERNE_STELLE");
    expect(cp?.legalRefs ?? []).toEqual([]);
  });

  it("AM-03 (Verantwortung) bleibt rein intern ohne externe Referenzen", () => {
    const cp = byId.get("AM-03");
    expect(cp?.legalRefs ?? []).toEqual([]);
    expect(cp?.authorityKeys ?? []).toEqual([]);
    expect(cp?.requiredEvidenceKeys ?? []).toEqual([]);
    expect(cp?.optionalEvidenceKeys ?? []).toEqual([]);
  });

  it("AM-04 (Nachweise) verlangt Antrag und nennt Eingangsbestaetigung/Bescheid optional", () => {
    const cp = byId.get("AM-04");
    expect(cp?.requiredEvidenceKeys).toContain("ANTRAG_EXTERNE_STELLE");
    expect(cp?.optionalEvidenceKeys).toEqual(
      expect.arrayContaining([
        "EINGANGSBESTAETIGUNG_EXTERNE_STELLE",
        "BESCHEID_EXTERNE_STELLE",
      ]),
    );
  });

  it("AM-05 (Einreichungs-/Nachsteuerungs-Entscheidung) bleibt intern, mit Antrag und Eingangsbestaetigung als Beleg optional", () => {
    const cp = byId.get("AM-05");
    expect(cp?.legalRefs ?? []).toEqual([]);
    expect(cp?.authorityKeys ?? []).toEqual([]);
    expect(cp?.optionalEvidenceKeys).toEqual(
      expect.arrayContaining([
        "ANTRAG_EXTERNE_STELLE",
        "EINGANGSBESTAETIGUNG_EXTERNE_STELLE",
      ]),
    );
  });

  it("AM-06 (Risiken/Eskalation) verweist auf SGG § 84 als Fristanker und nennt Bescheid/Widerspruch optional", () => {
    const cp = byId.get("AM-06");
    expect(cp?.legalRefs).toContain("SGG_PAR_84");
    expect(cp?.authorityKeys).toEqual(
      expect.arrayContaining(["KV_BERLIN", "ZULASSUNGSAUSSCHUSS_BERLIN"]),
    );
    expect(cp?.optionalEvidenceKeys).toEqual(
      expect.arrayContaining(["BESCHEID_EXTERNE_STELLE", "WIDERSPRUCH_KV"]),
    );
  });

  it("Abgrenzung: SGG § 84 nur in AM-06 (Eskalationsanker), nicht in den Einreichungs-Checkpoints", () => {
    for (const id of ["AM-01", "AM-02", "AM-03", "AM-04", "AM-05"]) {
      const cp = byId.get(id);
      expect(cp?.legalRefs ?? []).not.toContain("SGG_PAR_84");
    }
  });
});
