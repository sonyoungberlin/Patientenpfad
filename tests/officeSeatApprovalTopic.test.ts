import {
  OFFICE_TOPIC_SEAT_APPROVAL,
  getOfficeCheckpointCatalog,
} from "@/lib/office/checkpointCatalog";
import { isLegalSourceId } from "@/lib/office/legalSources";
import { isAuthorityId } from "@/lib/office/authorities";
import { isEvidenceId } from "@/lib/office/evidenceCatalog";

describe("Office-Topic arztsitz-zulassung-genehmigungen: fachliche Anreicherung", () => {
  const catalog = getOfficeCheckpointCatalog(OFFICE_TOPIC_SEAT_APPROVAL);
  const byId = new Map(catalog.map((cp) => [cp.id, cp]));

  it("enthaelt die erwarteten ZA-Checkpoints in Reihenfolge", () => {
    expect(catalog.map((cp) => cp.id)).toEqual([
      "ZA-01",
      "ZA-02",
      "ZA-03",
      "ZA-04",
      "ZA-05",
      "ZA-06",
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

  it("ZA-01 (Anlass/Zielbild) verweist auf § 95 SGB V", () => {
    expect(byId.get("ZA-01")?.legalRefs).toEqual(["SGB_V_PAR_95"]);
  });

  it("ZA-02 (Pflichten/Fristen) verweist auf § 95 SGB V und Aerzte-ZV §§ 18, 24 (Sitzbindung)", () => {
    const cp = byId.get("ZA-02");
    expect(cp?.legalRefs).toEqual(
      expect.arrayContaining([
        "SGB_V_PAR_95",
        "AERZTE_ZV_PAR_18",
        "AERZTE_ZV_PAR_24",
      ]),
    );
  });

  it("ZA-04 (Nachweise) verlangt Approbation/Facharzt/Arztregister und nennt Haftpflicht optional", () => {
    const cp = byId.get("ZA-04");
    expect(cp?.legalRefs).toContain("AERZTE_ZV_PAR_18");
    expect(cp?.requiredEvidenceKeys).toEqual(
      expect.arrayContaining([
        "APPROBATIONSURKUNDE",
        "FACHARZTURKUNDE",
        "REGISTERAUSZUG_AERZTE",
      ]),
    );
    expect(cp?.optionalEvidenceKeys).toEqual(
      expect.arrayContaining([
        "BERUFSHAFTPFLICHT_NACHWEIS",
        "ANTRAG_ZULASSUNG_ZA",
        "GENEHMIGUNGSANTRAG_KV",
      ]),
    );
  });

  it("ZA-05 (Entscheidung) verweist auf § 95 SGB V und nennt Zulassungs-/Anstellungs-/Leistungsbescheide optional", () => {
    const cp = byId.get("ZA-05");
    expect(cp?.legalRefs).toContain("SGB_V_PAR_95");
    expect(cp?.optionalEvidenceKeys).toEqual(
      expect.arrayContaining([
        "ZULASSUNGSBESCHEID_ZA",
        "ANSTELLUNGSGENEHMIGUNG_ZA",
        "GENEHMIGUNG_LEISTUNG_KV",
      ]),
    );
  });

  it("ZA-06 (externe Stelle) verweist auf § 32b Aerzte-ZV und nennt ZA Berlin, KV Berlin, Aerztekammer Berlin", () => {
    const cp = byId.get("ZA-06");
    expect(cp?.legalRefs).toContain("AERZTE_ZV_PAR_32B");
    expect(cp?.authorityKeys).toEqual(
      expect.arrayContaining([
        "ZULASSUNGSAUSSCHUSS_BERLIN",
        "KV_BERLIN",
        "AERZTEKAMMER_BERLIN",
      ]),
    );
    expect(cp?.requiredEvidenceKeys).toContain("ZULASSUNGSBESCHEID_ZA");
  });

  it("ZA-03 bleibt bewusst ohne legalRefs (rein interne Verantwortungszuweisung)", () => {
    expect(byId.get("ZA-03")?.legalRefs).toBeUndefined();
  });
});
