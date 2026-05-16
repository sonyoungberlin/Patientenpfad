import {
  OFFICE_TOPIC_MEDICAL_DEVICE_PURCHASE,
  getOfficeCheckpointCatalog,
} from "@/lib/office/checkpointCatalog";
import { isLegalSourceId } from "@/lib/office/legalSources";
import { isAuthorityId } from "@/lib/office/authorities";
import { isEvidenceId } from "@/lib/office/evidenceCatalog";

describe("Office-Topic medizinisches-geraet-anschaffung: fachliche Anreicherung", () => {
  const catalog = getOfficeCheckpointCatalog(
    OFFICE_TOPIC_MEDICAL_DEVICE_PURCHASE,
  );
  const byId = new Map(catalog.map((cp) => [cp.id, cp]));

  it("enthaelt die erwarteten MG-Checkpoints in Reihenfolge", () => {
    expect(catalog.map((cp) => cp.id)).toEqual([
      "MG-01",
      "MG-02",
      "MG-03",
      "MG-04",
      "MG-05",
      "MG-06",
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

  it("MG-01 verweist auf MPBetreibV § 3 und § 4 (Betreiberverantwortung / Allg. Anforderungen)", () => {
    const cp = byId.get("MG-01");
    expect(cp?.legalRefs).toEqual(
      expect.arrayContaining(["MPBETREIBV_PAR_3", "MPBETREIBV_PAR_4"]),
    );
  });

  it("MG-03 verlangt Einweisungsprotokoll und verweist auf MPBetreibV § 4 und § 11", () => {
    const cp = byId.get("MG-03");
    expect(cp?.legalRefs).toEqual(
      expect.arrayContaining(["MPBETREIBV_PAR_4", "MPBETREIBV_PAR_11"]),
    );
    expect(cp?.requiredEvidenceKeys).toContain("MP_EINWEISUNGSPROTOKOLL");
    expect(cp?.optionalEvidenceKeys).toContain("MEDIZINPRODUKTEBUCH");
  });

  it("MG-04 verweist auf Instandhaltung, STK, MTK inkl. Anlage 2 und nennt LAGetSi als Aufsicht", () => {
    const cp = byId.get("MG-04");
    expect(cp?.legalRefs).toEqual(
      expect.arrayContaining([
        "MPBETREIBV_PAR_7",
        "MPBETREIBV_PAR_12",
        "MPBETREIBV_PAR_15",
        "MPBETREIBV_ANLAGE_2",
      ]),
    );
    expect(cp?.authorityKeys).toContain("LAGETSI_BERLIN");
    expect(cp?.optionalEvidenceKeys).toEqual(
      expect.arrayContaining([
        "MP_WARTUNGSNACHWEIS",
        "MP_STK_PROTOKOLL",
        "MP_MTK_PROTOKOLL",
        "MP_NAECHSTE_KONTROLLE_KENNZEICHNUNG",
      ]),
    );
  });

  it("MG-06 verlangt Medizinproduktebuch und Bestandsverzeichnis und verweist auf §§ 11, 13, 14 MPBetreibV", () => {
    const cp = byId.get("MG-06");
    expect(cp?.legalRefs).toEqual(
      expect.arrayContaining([
        "MPBETREIBV_PAR_11",
        "MPBETREIBV_PAR_13",
        "MPBETREIBV_PAR_14",
      ]),
    );
    expect(cp?.requiredEvidenceKeys).toEqual(
      expect.arrayContaining(["MEDIZINPRODUKTEBUCH", "MP_BESTANDSVERZEICHNIS"]),
    );
    expect(cp?.optionalEvidenceKeys).toContain("MP_FUNKTIONS_PRUEFUNG");
  });
});
