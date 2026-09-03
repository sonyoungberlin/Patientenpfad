import {
  OFFICE_BLOCK_CATALOG,
  OFFICE_QUESTION_CATALOG,
  OFFICE_BLOCK_IDS_SORTED,
} from "../lib/questionnaire/officeBlockCatalog";
import { buildFrozenBlocks } from "../lib/questionnaire/frozenBlocks";

const BLOCK_ID = "BEWERBER_ARZT_PRAKTISCHE_KOMPETENZEN";

const PRAKTISCHE_SKALA = [
  "Noch nicht durchgeführt",
  "Mit Anleitung / wenig Erfahrung",
  "Weitgehend selbstständig",
  "Sicher und routiniert",
];

// 12 allgemeine Kompetenzen + Schutzimpfungen + Reiseimpfungen = 14 mit praktischer Skala
const PRAKTISCHE_SKALA_IDS = [
  "OFF_ARZT_SPRECHSTUNDE",
  "OFF_ARZT_AKUTVERSORGUNG",
  "OFF_ARZT_HAUSBESUCHE",
  "OFF_ARZT_CHRONISCH_KRANK",
  "OFF_ARZT_GERIATRIE",
  "OFF_ARZT_WUNDVERSORGUNG",
  "OFF_ARZT_CHIRURG_EINGRIFFE",
  "OFF_ARZT_EKG_BEFUNDUNG",
  "OFF_ARZT_LANGZEIT_EKG_BEFUNDUNG",
  "OFF_ARZT_LANGZEIT_RR_AUSWERTUNG",
  "OFF_ARZT_SPIROMETRIE_BEFUNDUNG",
  "OFF_ARZT_NOTFALLVERSORGUNG_PRAXIS",
  "OFF_ARZT_IMPFUNGEN",
  "OFF_ARZT_REISEIMPFUNGEN",
  "OFF_ARZT_TABAKENTWOEHNUNG",
] as const;

const ALL_QUESTION_IDS = [
  ...PRAKTISCHE_SKALA_IDS,
  "OFF_ARZT_REISEIMPFBERATUNG",
  "OFF_ARZT_PALLIATIV_ERFAHRUNG",
  "OFF_ARZT_SUCHTMEDIZIN_ERFAHRUNG",
  "OFF_ARZT_SUBSTITUTION_ERFAHRUNG",
  "OFF_ARZT_BTM_ERFAHRUNG",
  "OFF_ARZT_DIGA_ERFAHRUNG",
  "OFF_ARZT_DIGA_BERATUNG",
] as const;

describe("BEWERBER_ARZT_PRAKTISCHE_KOMPETENZEN – Katalog-Struktur", () => {
  it("Block ist im OFFICE_BLOCK_CATALOG vorhanden", () => {
    expect(OFFICE_BLOCK_CATALOG).toHaveProperty(BLOCK_ID);
  });

  it("Block-Label ist korrekt", () => {
    expect(OFFICE_BLOCK_CATALOG[BLOCK_ID]?.label).toBe("Praktische ärztliche Kompetenzen");
  });

  it("displayOrder liegt nach ARZT_ORGA_TECHNIK (32.5) und vor MFA_KOMPETENZEN (33)", () => {
    const order = OFFICE_BLOCK_CATALOG[BLOCK_ID]?.displayOrder ?? 0;
    expect(order).toBeGreaterThan(32.5);
    expect(order).toBeLessThan(33);
  });

  it("Block enthält alle 22 Fragen", () => {
    const ids = OFFICE_BLOCK_CATALOG[BLOCK_ID]?.questionIds ?? [];
    expect(ids).toHaveLength(22);
    for (const qid of ALL_QUESTION_IDS) {
      expect(ids).toContain(qid);
    }
  });

  it("alle 22 Fragen sind im OFFICE_QUESTION_CATALOG definiert", () => {
    for (const qid of ALL_QUESTION_IDS) {
      expect(OFFICE_QUESTION_CATALOG).toHaveProperty(qid);
    }
  });

  it("Block hat keine conditionalRules", () => {
    expect(OFFICE_BLOCK_CATALOG[BLOCK_ID]?.conditionalRules ?? []).toHaveLength(0);
  });

  it("alle Question-IDs im Block sind eindeutig (keine Dopplungen)", () => {
    const ids = OFFICE_BLOCK_CATALOG[BLOCK_ID]?.questionIds ?? [];
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("BEWERBER_ARZT_PRAKTISCHE_KOMPETENZEN – Question-Types", () => {
  it("alle 22 Fragen sind vom Typ select", () => {
    for (const qid of ALL_QUESTION_IDS) {
      expect(OFFICE_QUESTION_CATALOG[qid]?.type).toBe("select");
    }
  });

  it("keine der 22 Fragen ist Pflichtfeld", () => {
    for (const qid of ALL_QUESTION_IDS) {
      expect(OFFICE_QUESTION_CATALOG[qid]?.required).toBe(false);
    }
  });

  it("keine Frage im Block ist vom Typ text oder number (keine Identifikatoren)", () => {
    for (const qid of ALL_QUESTION_IDS) {
      const type = OFFICE_QUESTION_CATALOG[qid]?.type;
      expect(type).not.toBe("text");
      expect(type).not.toBe("number");
    }
  });
});

describe("BEWERBER_ARZT_PRAKTISCHE_KOMPETENZEN – Kompetenzskalen", () => {
  it("15 Fragen mit praktischer 4er-Skala haben exakt dieselben Optionen", () => {
    for (const qid of PRAKTISCHE_SKALA_IDS) {
      expect(OFFICE_QUESTION_CATALOG[qid]?.options).toEqual(PRAKTISCHE_SKALA);
    }
  });

  it("OFF_ARZT_REISEIMPFBERATUNG hat eigene 4er-Skala", () => {
    expect(OFFICE_QUESTION_CATALOG["OFF_ARZT_REISEIMPFBERATUNG"]?.options).toEqual([
      "Keine Erfahrung",
      "Grundkenntnisse / wenig Erfahrung",
      "Regelmäßig durchgeführt",
      "Sicher und routiniert",
    ]);
  });

  it("OFF_ARZT_SUCHTMEDIZIN_ERFAHRUNG hat korrekte 4er-Skala", () => {
    expect(OFFICE_QUESTION_CATALOG["OFF_ARZT_SUCHTMEDIZIN_ERFAHRUNG"]?.options).toEqual([
      "Keine Erfahrung",
      "Grundkenntnisse / wenig Erfahrung",
      "Regelmäßige Erfahrung",
      "Sicher und routiniert",
    ]);
  });

  // OFF_ARZT_SUCHTMEDIZIN_QUALIFIKATION liegt jetzt in BEWERBER_ARZT_ZUSATZQUALIFIKATIONEN
  it("OFF_ARZT_SUCHTMEDIZIN_QUALIFIKATION ist NICHT im Praktisch-Block", () => {
    expect(OFFICE_BLOCK_CATALOG[BLOCK_ID]?.questionIds).not.toContain(
      "OFF_ARZT_SUCHTMEDIZIN_QUALIFIKATION",
    );
  });

  it("OFF_ARZT_PALLIATIV_ERFAHRUNG hat eigene praktische Skala (Keine Erfahrung…)", () => {
    expect(OFFICE_QUESTION_CATALOG["OFF_ARZT_PALLIATIV_ERFAHRUNG"]?.options).toEqual([
      "Keine Erfahrung",
      "Mit Anleitung / wenig Erfahrung",
      "Weitgehend selbstständig",
      "Sicher und routiniert",
    ]);
    expect(OFFICE_QUESTION_CATALOG["OFF_ARZT_PALLIATIV_ERFAHRUNG"]?.required).toBe(false);
  });

  it("OFF_ARZT_SUBSTITUTION_ERFAHRUNG hat korrekte 4er-Skala", () => {
    expect(OFFICE_QUESTION_CATALOG["OFF_ARZT_SUBSTITUTION_ERFAHRUNG"]?.options).toEqual([
      "Keine Erfahrung",
      "Grundkenntnisse / mitbetreut",
      "Selbstständig durchgeführt",
      "Umfangreiche / regelmäßige Erfahrung",
    ]);
  });

  it("OFF_ARZT_BTM_ERFAHRUNG hat korrekte 4er-Skala", () => {
    expect(OFFICE_QUESTION_CATALOG["OFF_ARZT_BTM_ERFAHRUNG"]?.options).toEqual([
      "Keine Erfahrung",
      "Grundkenntnisse",
      "Gelegentliche praktische Erfahrung",
      "Sicher und routiniert",
    ]);
  });

  it("OFF_ARZT_DIGA_ERFAHRUNG hat korrekte 4er-Skala", () => {
    expect(OFFICE_QUESTION_CATALOG["OFF_ARZT_DIGA_ERFAHRUNG"]?.options).toEqual([
      "Keine Erfahrung",
      "Grundkenntnisse",
      "Gelegentlich eingesetzt / verordnet",
      "Sicher und routiniert",
    ]);
  });

  it("OFF_ARZT_DIGA_BERATUNG hat korrekte 4er-Skala", () => {
    expect(OFFICE_QUESTION_CATALOG["OFF_ARZT_DIGA_BERATUNG"]?.options).toEqual([
      "Keine Erfahrung",
      "Grundkenntnisse",
      "Gelegentliche praktische Erfahrung",
      "Sicher und routiniert",
    ]);
  });
});

describe("BEWERBER_ARZT_PRAKTISCHE_KOMPETENZEN – Keine Dubletten / Abgrenzung", () => {
  it("OFF_ARZT_LANGZEIT_EKG_BEFUNDUNG ist distinct von OFF_ARZT_LANGZEIT_EKG (Qualifikation)", () => {
    expect(OFFICE_QUESTION_CATALOG["OFF_ARZT_LANGZEIT_EKG_BEFUNDUNG"]).toBeDefined();
    expect(OFFICE_QUESTION_CATALOG["OFF_ARZT_LANGZEIT_EKG"]).toBeDefined();
    expect(OFFICE_QUESTION_CATALOG["OFF_ARZT_LANGZEIT_EKG_BEFUNDUNG"]?.text).not.toBe(
      OFFICE_QUESTION_CATALOG["OFF_ARZT_LANGZEIT_EKG"]?.text,
    );
  });

  it("OFF_ARZT_NOTFALLVERSORGUNG_PRAXIS ist distinct von OFF_ARZT_NOTFALLMEDIZIN (Zusatzqualifikation)", () => {
    expect(OFFICE_QUESTION_CATALOG["OFF_ARZT_NOTFALLVERSORGUNG_PRAXIS"]).toBeDefined();
    expect(OFFICE_QUESTION_CATALOG["OFF_ARZT_NOTFALLMEDIZIN"]).toBeDefined();
    expect(OFFICE_QUESTION_CATALOG["OFF_ARZT_NOTFALLVERSORGUNG_PRAXIS"]?.text).not.toBe(
      OFFICE_QUESTION_CATALOG["OFF_ARZT_NOTFALLMEDIZIN"]?.text,
    );
  });

  it("keine Frage enthält Nummernfelder für BtM, Substitution oder Suchtmedizin", () => {
    const suchtIds = [
      "OFF_ARZT_BTM_ERFAHRUNG",
      "OFF_ARZT_SUBSTITUTION_ERFAHRUNG",
      "OFF_ARZT_SUCHTMEDIZIN_ERFAHRUNG",
      "OFF_ARZT_SUCHTMEDIZIN_QUALIFIKATION",
    ];
    for (const qid of suchtIds) {
      expect(OFFICE_QUESTION_CATALOG[qid]?.type).not.toBe("number");
      expect(OFFICE_QUESTION_CATALOG[qid]?.type).not.toBe("text");
    }
  });
});

describe("BEWERBER_ARZT_PRAKTISCHE_KOMPETENZEN – buildFrozenBlocks", () => {
  it("friert Block korrekt ein mit allen 22 Fragen", () => {
    const frozen = buildFrozenBlocks(
      [BLOCK_ID],
      OFFICE_BLOCK_CATALOG,
      OFFICE_QUESTION_CATALOG,
    );
    expect(frozen).toHaveLength(1);
    expect(frozen[0]!.questions).toHaveLength(22);
    expect(frozen[0]!.initiallyVisible).toBe(true);
  });

  it("eingefrorene Optionen sind tiefe Klone – Mutation isoliert", () => {
    const frozen = buildFrozenBlocks(
      [BLOCK_ID],
      OFFICE_BLOCK_CATALOG,
      OFFICE_QUESTION_CATALOG,
    );
    const frozenQ = frozen[0]!.questions.find((q) => q.id === "OFF_ARZT_SPRECHSTUNDE");
    frozenQ!.options = [];
    expect(OFFICE_QUESTION_CATALOG["OFF_ARZT_SPRECHSTUNDE"]!.options).toEqual(PRAKTISCHE_SKALA);
  });
});

describe("Bestehende Office-Blöcke – Regressionsprüfung", () => {
  it("OFFICE_BLOCK_CATALOG enthält jetzt 13 Blöcke", () => {
    expect(Object.keys(OFFICE_BLOCK_CATALOG)).toHaveLength(15);
  });

  it("OFFICE_BLOCK_IDS_SORTED enthält alle 13 Blöcke in korrekter Reihenfolge", () => {
    expect(OFFICE_BLOCK_IDS_SORTED).toHaveLength(15);
    const praktischIdx = OFFICE_BLOCK_IDS_SORTED.indexOf("BEWERBER_ARZT_PRAKTISCHE_KOMPETENZEN");
    const orgaIdx = OFFICE_BLOCK_IDS_SORTED.indexOf("BEWERBER_ARZT_ORGA_TECHNIK");
    const mfaIdx = OFFICE_BLOCK_IDS_SORTED.indexOf("BEWERBER_MFA_KOMPETENZEN");
    expect(praktischIdx).toBeGreaterThan(orgaIdx);
    expect(praktischIdx).toBeLessThan(mfaIdx);
  });

  it("BEWERBER_ARZT_BASIS unverändert (2 conditionalRules)", () => {
    expect(OFFICE_BLOCK_CATALOG["BEWERBER_ARZT_BASIS"]?.conditionalRules).toHaveLength(2);
  });

  it("BEWERBER_ARZT_ZUSATZQUALIFIKATIONEN unverändert (3 conditionalRules)", () => {
    expect(OFFICE_BLOCK_CATALOG["BEWERBER_ARZT_ZUSATZQUALIFIKATIONEN"]?.conditionalRules).toHaveLength(3);
  });

  it("BEWERBER_ARZT_ORGA_TECHNIK unverändert (2 conditionalRules)", () => {
    expect(OFFICE_BLOCK_CATALOG["BEWERBER_ARZT_ORGA_TECHNIK"]?.conditionalRules).toHaveLength(2);
  });

  it("buildFrozenBlocks aller 13 Blöcke läuft fehlerfrei durch", () => {
    expect(() =>
      buildFrozenBlocks(
        Object.keys(OFFICE_BLOCK_CATALOG),
        OFFICE_BLOCK_CATALOG,
        OFFICE_QUESTION_CATALOG,
      ),
    ).not.toThrow();
  });
});
