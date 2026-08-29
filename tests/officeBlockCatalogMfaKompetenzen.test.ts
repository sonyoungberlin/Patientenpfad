import {
  OFFICE_BLOCK_CATALOG,
  OFFICE_QUESTION_CATALOG,
  OFFICE_BLOCK_IDS_SORTED,
} from "../lib/questionnaire/officeBlockCatalog";
import { buildFrozenBlocks } from "../lib/questionnaire/frozenBlocks";
import { evaluateCondition } from "../lib/questionnaire/conditionalLogic";

const BLOCK_ID = "BEWERBER_MFA_KOMPETENZEN";

const KOMPETENZ_QUESTION_IDS = [
  "OFF_MFA_BLUTENTNAHME",
  "OFF_MFA_IMPFUNGEN",
  "OFF_MFA_INJEKTIONEN",
  "OFF_MFA_EKG",
  "OFF_MFA_LANGZEIT_EKG",
  "OFF_MFA_LANGZEIT_RR",
  "OFF_MFA_SPIROMETRIE",
  "OFF_MFA_WUNDVERSORGUNG",
  "OFF_MFA_SCHNELLTESTS",
  "OFF_MFA_LABOR",
  "OFF_MFA_ASSISTENZ",
  "OFF_MFA_NOTFALL",
] as const;

const KOMPETENZ_SKALA = [
  "Noch nicht durchgeführt",
  "Mit Anleitung",
  "Weitgehend sicher",
  "Sicher und routiniert",
];

describe("BEWERBER_MFA_KOMPETENZEN – Katalog-Struktur", () => {
  it("Block ist im OFFICE_BLOCK_CATALOG vorhanden", () => {
    expect(OFFICE_BLOCK_CATALOG).toHaveProperty(BLOCK_ID);
  });

  it("Block-Label ist korrekt", () => {
    expect(OFFICE_BLOCK_CATALOG[BLOCK_ID]?.label).toBe("Praktische MFA-Kompetenzen");
  });

  it("displayOrder liegt nach Berufserfahrung (30) und vor PVS_DIGITAL (35)", () => {
    const order = OFFICE_BLOCK_CATALOG[BLOCK_ID]?.displayOrder ?? 0;
    expect(order).toBeGreaterThan(30);
    expect(order).toBeLessThan(35);
  });

  it("Block enthält alle 12 Kompetenzfragen", () => {
    const ids = OFFICE_BLOCK_CATALOG[BLOCK_ID]?.questionIds ?? [];
    for (const qid of KOMPETENZ_QUESTION_IDS) {
      expect(ids).toContain(qid);
    }
  });

  it("Block enthält Zusatzqualifikationen und Freitext-Folgefrage", () => {
    const ids = OFFICE_BLOCK_CATALOG[BLOCK_ID]?.questionIds ?? [];
    expect(ids).toContain("OFF_MFA_ZUSATZQUALIFIKATIONEN");
    expect(ids).toContain("OFF_MFA_ZUSATZQUALIFIKATIONEN_SONSTIGE");
  });

  it("alle 14 Fragen sind im OFFICE_QUESTION_CATALOG definiert", () => {
    const allIds = OFFICE_BLOCK_CATALOG[BLOCK_ID]?.questionIds ?? [];
    for (const qid of allIds) {
      expect(OFFICE_QUESTION_CATALOG).toHaveProperty(qid);
    }
  });
});

describe("BEWERBER_MFA_KOMPETENZEN – Kompetenzskala", () => {
  it("alle 12 Kompetenzfragen sind vom Typ select", () => {
    for (const qid of KOMPETENZ_QUESTION_IDS) {
      expect(OFFICE_QUESTION_CATALOG[qid]?.type).toBe("select");
    }
  });

  it("alle 12 Kompetenzfragen sind kein Pflichtfeld", () => {
    for (const qid of KOMPETENZ_QUESTION_IDS) {
      expect(OFFICE_QUESTION_CATALOG[qid]?.required).toBe(false);
    }
  });

  it("alle 12 Kompetenzfragen haben exakt dieselbe 4-stufige Skala", () => {
    for (const qid of KOMPETENZ_QUESTION_IDS) {
      expect(OFFICE_QUESTION_CATALOG[qid]?.options).toEqual(KOMPETENZ_SKALA);
    }
  });
});

describe("BEWERBER_MFA_KOMPETENZEN – Zusatzqualifikationen", () => {
  it("OFF_MFA_ZUSATZQUALIFIKATIONEN ist multi_select und kein Pflichtfeld", () => {
    const q = OFFICE_QUESTION_CATALOG["OFF_MFA_ZUSATZQUALIFIKATIONEN"];
    expect(q?.type).toBe("multi_select");
    expect(q?.required).toBe(false);
  });

  it("OFF_MFA_ZUSATZQUALIFIKATIONEN enthält Option 'Sonstige'", () => {
    const q = OFFICE_QUESTION_CATALOG["OFF_MFA_ZUSATZQUALIFIKATIONEN"];
    expect(q?.options).toContain("Sonstige");
  });

  it("OFF_MFA_ZUSATZQUALIFIKATIONEN enthält alle erwarteten Optionen", () => {
    const q = OFFICE_QUESTION_CATALOG["OFF_MFA_ZUSATZQUALIFIKATIONEN"];
    expect(q?.options).toEqual(
      expect.arrayContaining([
        "Impfmanagement",
        "NäPA",
        "VERAH",
        "Wundmanagement",
        "Kardiologie",
        "Medizinprodukte / Aufbereitung",
        "Praxismanagement",
        "Fachwirt/in für ambulante medizinische Versorgung",
        "Sonstige",
      ]),
    );
  });

  it("OFF_MFA_ZUSATZQUALIFIKATIONEN_SONSTIGE ist textarea und kein Pflichtfeld", () => {
    const q = OFFICE_QUESTION_CATALOG["OFF_MFA_ZUSATZQUALIFIKATIONEN_SONSTIGE"];
    expect(q?.type).toBe("textarea");
    expect(q?.required).toBe(false);
  });
});

describe("BEWERBER_MFA_KOMPETENZEN – Conditional Logic", () => {
  it("Block hat genau eine conditionalRule", () => {
    const rules = OFFICE_BLOCK_CATALOG[BLOCK_ID]?.conditionalRules ?? [];
    expect(rules).toHaveLength(1);
  });

  it("conditionalRule zeigt SONSTIGE-Textarea wenn multi_select 'Sonstige' enthält", () => {
    const rule = OFFICE_BLOCK_CATALOG[BLOCK_ID]?.conditionalRules?.[0];
    expect(rule?.action).toBe("showQuestion");
    expect(rule?.targetId).toBe("OFF_MFA_ZUSATZQUALIFIKATIONEN_SONSTIGE");
    expect(rule?.condition).toMatchObject({
      target: { kind: "question", questionId: "OFF_MFA_ZUSATZQUALIFIKATIONEN" },
      operator: "contains",
      value: "Sonstige",
    });
  });

  it("evaluateCondition: Sonstige allein → sichtbar", () => {
    const rule = OFFICE_BLOCK_CATALOG[BLOCK_ID]!.conditionalRules![0]!;
    const result = evaluateCondition(
      rule.condition,
      { OFF_MFA_ZUSATZQUALIFIKATIONEN: "Sonstige" },
    );
    expect(result).toBe(true);
  });

  it("evaluateCondition: Sonstige in Kombination → sichtbar", () => {
    const rule = OFFICE_BLOCK_CATALOG[BLOCK_ID]!.conditionalRules![0]!;
    const result = evaluateCondition(
      rule.condition,
      { OFF_MFA_ZUSATZQUALIFIKATIONEN: "NäPA, Wundmanagement, Sonstige" },
    );
    expect(result).toBe(true);
  });

  it("evaluateCondition: kein Sonstige → nicht sichtbar", () => {
    const rule = OFFICE_BLOCK_CATALOG[BLOCK_ID]!.conditionalRules![0]!;
    const result = evaluateCondition(
      rule.condition,
      { OFF_MFA_ZUSATZQUALIFIKATIONEN: "NäPA, VERAH" },
    );
    expect(result).toBe(false);
  });

  it("evaluateCondition: leere Antwort → nicht sichtbar", () => {
    const rule = OFFICE_BLOCK_CATALOG[BLOCK_ID]!.conditionalRules![0]!;
    const result = evaluateCondition(
      rule.condition,
      { OFF_MFA_ZUSATZQUALIFIKATIONEN: "" },
    );
    expect(result).toBe(false);
  });
});

describe("BEWERBER_MFA_KOMPETENZEN – buildFrozenBlocks", () => {
  it("friert Block korrekt ein", () => {
    const frozen = buildFrozenBlocks(
      [BLOCK_ID],
      OFFICE_BLOCK_CATALOG,
      OFFICE_QUESTION_CATALOG,
    );
    expect(frozen).toHaveLength(1);
    const block = frozen[0]!;
    expect(block.id).toBe(BLOCK_ID);
    expect(block.initiallyVisible).toBe(true);
  });

  it("alle 14 Fragen sind im frozen Block enthalten", () => {
    const frozen = buildFrozenBlocks(
      [BLOCK_ID],
      OFFICE_BLOCK_CATALOG,
      OFFICE_QUESTION_CATALOG,
    );
    const frozenIds = frozen[0]!.questions.map((q) => q.id);
    for (const qid of OFFICE_BLOCK_CATALOG[BLOCK_ID]!.questionIds) {
      expect(frozenIds).toContain(qid);
    }
  });

  it("eingefrorene Skala ist identisch zur Katalog-Definition (tiefer Clone)", () => {
    const frozen = buildFrozenBlocks(
      [BLOCK_ID],
      OFFICE_BLOCK_CATALOG,
      OFFICE_QUESTION_CATALOG,
    );
    const frozenBlutentnahme = frozen[0]!.questions.find(
      (q) => q.id === "OFF_MFA_BLUTENTNAHME",
    );
    expect(frozenBlutentnahme?.options).toEqual(KOMPETENZ_SKALA);
    // Mutation im Snapshot darf Original nicht verändern
    frozenBlutentnahme!.options = [];
    expect(OFFICE_QUESTION_CATALOG["OFF_MFA_BLUTENTNAHME"]!.options).toEqual(KOMPETENZ_SKALA);
  });
});

describe("Bestehende Office-Blöcke – Regressionsprüfung", () => {
  const ALLE_ERWARTETEN_BLOCKS = [
    "BEWERBER_KONTAKT",
    "BEWERBER_AUSBILDUNG",
    "BEWERBER_BERUFSERFAHRUNG",
    "BEWERBER_MFA_KOMPETENZEN",
    "BEWERBER_PVS_DIGITAL",
    "BEWERBER_SPRACHKENNTNISSE",
    "BEWERBER_FUEHRERSCHEIN",
    "BEWERBER_ARBEITSZEITEN",
  ] as const;

  it("OFFICE_BLOCK_CATALOG enthält jetzt 10 Blöcke", () => {
    expect(Object.keys(OFFICE_BLOCK_CATALOG)).toHaveLength(10);
  });

  it("OFFICE_BLOCK_IDS_SORTED enthält alle 10 Blöcke in korrekter Reihenfolge", () => {
    expect(OFFICE_BLOCK_IDS_SORTED).toHaveLength(10);
    const mfaIdx = OFFICE_BLOCK_IDS_SORTED.indexOf("BEWERBER_MFA_KOMPETENZEN");
    const berufsIdx = OFFICE_BLOCK_IDS_SORTED.indexOf("BEWERBER_BERUFSERFAHRUNG");
    const pvsIdx = OFFICE_BLOCK_IDS_SORTED.indexOf("BEWERBER_PVS_DIGITAL");
    expect(mfaIdx).toBeGreaterThan(berufsIdx);
    expect(mfaIdx).toBeLessThan(pvsIdx);
  });

  it("alle 8 erwarteten Blöcke sind vorhanden", () => {
    for (const id of ALLE_ERWARTETEN_BLOCKS) {
      expect(OFFICE_BLOCK_CATALOG).toHaveProperty(id);
    }
  });

  it("buildFrozenBlocks aller 8 Blöcke läuft fehlerfrei durch", () => {
    const allIds = Object.keys(OFFICE_BLOCK_CATALOG);
    expect(() =>
      buildFrozenBlocks(allIds, OFFICE_BLOCK_CATALOG, OFFICE_QUESTION_CATALOG),
    ).not.toThrow();
  });

  it("BEWERBER_FUEHRERSCHEIN – ConditionalRule bleibt intakt", () => {
    const rule = OFFICE_BLOCK_CATALOG["BEWERBER_FUEHRERSCHEIN"]?.conditionalRules?.[0];
    expect(rule?.action).toBe("showQuestion");
    expect(rule?.targetId).toBe("OFF_FUEHRERSCHEIN_KLASSEN");
  });

  it("BEWERBER_PVS_DIGITAL – ConditionalRule bleibt intakt", () => {
    const rule = OFFICE_BLOCK_CATALOG["BEWERBER_PVS_DIGITAL"]?.conditionalRules?.[0];
    expect(rule?.action).toBe("showQuestion");
    expect(rule?.targetId).toBe("OFF_PVS_SYSTEME");
  });
});
