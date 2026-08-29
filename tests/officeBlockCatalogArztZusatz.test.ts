import {
  OFFICE_BLOCK_CATALOG,
  OFFICE_QUESTION_CATALOG,
  OFFICE_BLOCK_IDS_SORTED,
} from "../lib/questionnaire/officeBlockCatalog";
import { buildFrozenBlocks } from "../lib/questionnaire/frozenBlocks";
import { evaluateCondition } from "../lib/questionnaire/conditionalLogic";

const BLOCK_ID = "BEWERBER_ARZT_ZUSATZQUALIFIKATIONEN";

const ALL_QUESTION_IDS = [
  "OFF_ARZT_PSYCHOSOMATIK",
  "OFF_ARZT_HAUTKREBSSCREENING",
  "OFF_ARZT_LUNGENKREBS_BERATUNG",
  "OFF_ARZT_SONOGRAPHIE",
  "OFF_ARZT_SONOGRAPHIE_BEREICHE",
  "OFF_ARZT_SONOGRAPHIE_SONSTIGE",
  "OFF_ARZT_LANGZEIT_EKG",
  "OFF_ARZT_DMP_ERFAHRUNG",
  "OFF_ARZT_DMP_SONSTIGE",
  "OFF_ARZT_PALLIATIVMEDIZIN",
  "OFF_ARZT_NOTFALLMEDIZIN",
  "OFF_ARZT_WEITERE_ZUSATZQUALIFIKATIONEN",
] as const;

const SKALA_STANDARD = [
  "Vorhanden",
  "In Vorbereitung / Nachweis läuft",
  "Nicht vorhanden",
  "Nicht relevant / keine Angabe",
];

describe("BEWERBER_ARZT_ZUSATZQUALIFIKATIONEN – Katalog-Struktur", () => {
  it("Block ist im OFFICE_BLOCK_CATALOG vorhanden", () => {
    expect(OFFICE_BLOCK_CATALOG).toHaveProperty(BLOCK_ID);
  });

  it("Block-Label ist korrekt", () => {
    expect(OFFICE_BLOCK_CATALOG[BLOCK_ID]?.label).toBe(
      "Ärztliche Zusatzqualifikationen & Genehmigungen",
    );
  });

  it("displayOrder liegt nach ARZT_BASIS (31) und vor MFA_KOMPETENZEN (33)", () => {
    const order = OFFICE_BLOCK_CATALOG[BLOCK_ID]?.displayOrder ?? 0;
    expect(order).toBeGreaterThan(31);
    expect(order).toBeLessThan(33);
  });

  it("Block enthält alle 12 Fragen", () => {
    const ids = OFFICE_BLOCK_CATALOG[BLOCK_ID]?.questionIds ?? [];
    expect(ids).toHaveLength(12);
    for (const qid of ALL_QUESTION_IDS) {
      expect(ids).toContain(qid);
    }
  });

  it("alle 12 Fragen sind im OFFICE_QUESTION_CATALOG definiert", () => {
    for (const qid of ALL_QUESTION_IDS) {
      expect(OFFICE_QUESTION_CATALOG).toHaveProperty(qid);
    }
  });

  it("Block hat genau drei conditionalRules", () => {
    expect(OFFICE_BLOCK_CATALOG[BLOCK_ID]?.conditionalRules).toHaveLength(3);
  });
});

describe("BEWERBER_ARZT_ZUSATZQUALIFIKATIONEN – Fragedefinitionen", () => {
  it("OFF_ARZT_PSYCHOSOMATIK ist select mit Standard-Skala", () => {
    const q = OFFICE_QUESTION_CATALOG["OFF_ARZT_PSYCHOSOMATIK"];
    expect(q?.type).toBe("select");
    expect(q?.required).toBe(false);
    expect(q?.options).toEqual(SKALA_STANDARD);
  });

  it("OFF_ARZT_HAUTKREBSSCREENING ist select mit Standard-Skala", () => {
    const q = OFFICE_QUESTION_CATALOG["OFF_ARZT_HAUTKREBSSCREENING"];
    expect(q?.type).toBe("select");
    expect(q?.options).toEqual(SKALA_STANDARD);
  });

  it("OFF_ARZT_LUNGENKREBS_BERATUNG ist select mit Standard-Skala", () => {
    const q = OFFICE_QUESTION_CATALOG["OFF_ARZT_LUNGENKREBS_BERATUNG"];
    expect(q?.type).toBe("select");
    expect(q?.options).toEqual(SKALA_STANDARD);
  });

  it("OFF_ARZT_SONOGRAPHIE hat 5-stufige Skala inkl. Teilweise vorhanden", () => {
    const q = OFFICE_QUESTION_CATALOG["OFF_ARZT_SONOGRAPHIE"];
    expect(q?.type).toBe("select");
    expect(q?.options).toEqual([
      "Vorhanden",
      "Teilweise vorhanden",
      "In Vorbereitung / Nachweis läuft",
      "Nicht vorhanden",
      "Nicht relevant / keine Angabe",
    ]);
  });

  it("OFF_ARZT_SONOGRAPHIE_BEREICHE ist multi_select mit 5 Bereichen", () => {
    const q = OFFICE_QUESTION_CATALOG["OFF_ARZT_SONOGRAPHIE_BEREICHE"];
    expect(q?.type).toBe("multi_select");
    expect(q?.required).toBe(false);
    expect(q?.options).toEqual(
      expect.arrayContaining(["Abdomen", "Schilddrüse", "Gefäße", "Echokardiographie", "Sonstige"]),
    );
    expect(q?.options).toHaveLength(5);
  });

  it("OFF_ARZT_SONOGRAPHIE_SONSTIGE ist textarea", () => {
    expect(OFFICE_QUESTION_CATALOG["OFF_ARZT_SONOGRAPHIE_SONSTIGE"]?.type).toBe("textarea");
  });

  it("OFF_ARZT_LANGZEIT_EKG ist select mit Standard-Skala", () => {
    const q = OFFICE_QUESTION_CATALOG["OFF_ARZT_LANGZEIT_EKG"];
    expect(q?.type).toBe("select");
    expect(q?.options).toEqual(SKALA_STANDARD);
  });

  it("OFF_ARZT_DMP_ERFAHRUNG ist multi_select mit 6 Optionen inkl. Sonstige", () => {
    const q = OFFICE_QUESTION_CATALOG["OFF_ARZT_DMP_ERFAHRUNG"];
    expect(q?.type).toBe("multi_select");
    expect(q?.options).toHaveLength(6);
    expect(q?.options).toContain("Sonstige");
    expect(q?.options).toContain("Keine Erfahrung");
  });

  it("OFF_ARZT_DMP_SONSTIGE ist textarea", () => {
    expect(OFFICE_QUESTION_CATALOG["OFF_ARZT_DMP_SONSTIGE"]?.type).toBe("textarea");
  });

  it("OFF_ARZT_PALLIATIVMEDIZIN hat 5-stufige Skala", () => {
    const q = OFFICE_QUESTION_CATALOG["OFF_ARZT_PALLIATIVMEDIZIN"];
    expect(q?.options).toHaveLength(5);
    expect(q?.options).toContain("Zusatzbezeichnung / formale Qualifikation vorhanden");
  });

  it("OFF_ARZT_NOTFALLMEDIZIN hat dieselbe Skala wie Palliativmedizin", () => {
    expect(OFFICE_QUESTION_CATALOG["OFF_ARZT_NOTFALLMEDIZIN"]?.options).toEqual(
      OFFICE_QUESTION_CATALOG["OFF_ARZT_PALLIATIVMEDIZIN"]?.options,
    );
  });

  it("OFF_ARZT_WEITERE_ZUSATZQUALIFIKATIONEN ist textarea", () => {
    expect(OFFICE_QUESTION_CATALOG["OFF_ARZT_WEITERE_ZUSATZQUALIFIKATIONEN"]?.type).toBe(
      "textarea",
    );
  });
});

describe("BEWERBER_ARZT_ZUSATZQUALIFIKATIONEN – Conditional Logic", () => {
  const getRule = (targetId: string) =>
    OFFICE_BLOCK_CATALOG[BLOCK_ID]?.conditionalRules?.find((r) => r.targetId === targetId);

  describe("OFF_ARZT_SONOGRAPHIE_BEREICHE – OR-Condition", () => {
    it("Rule vorhanden, action showQuestion", () => {
      const rule = getRule("OFF_ARZT_SONOGRAPHIE_BEREICHE");
      expect(rule?.action).toBe("showQuestion");
    });

    it("condition ist ConditionGroup mit mode OR und zwei Bedingungen", () => {
      const rule = getRule("OFF_ARZT_SONOGRAPHIE_BEREICHE")!;
      expect(rule.condition).toMatchObject({ mode: "OR" });
      const group = rule.condition as { mode: "OR"; conditions: unknown[] };
      expect(group.conditions).toHaveLength(2);
    });

    it("sichtbar wenn Sonographie = 'Vorhanden'", () => {
      const rule = getRule("OFF_ARZT_SONOGRAPHIE_BEREICHE")!;
      expect(
        evaluateCondition(rule.condition, { OFF_ARZT_SONOGRAPHIE: "Vorhanden" }),
      ).toBe(true);
    });

    it("sichtbar wenn Sonographie = 'Teilweise vorhanden'", () => {
      const rule = getRule("OFF_ARZT_SONOGRAPHIE_BEREICHE")!;
      expect(
        evaluateCondition(rule.condition, { OFF_ARZT_SONOGRAPHIE: "Teilweise vorhanden" }),
      ).toBe(true);
    });

    it("nicht sichtbar wenn 'In Vorbereitung / Nachweis läuft'", () => {
      const rule = getRule("OFF_ARZT_SONOGRAPHIE_BEREICHE")!;
      expect(
        evaluateCondition(rule.condition, {
          OFF_ARZT_SONOGRAPHIE: "In Vorbereitung / Nachweis läuft",
        }),
      ).toBe(false);
    });

    it("nicht sichtbar wenn 'Nicht vorhanden'", () => {
      const rule = getRule("OFF_ARZT_SONOGRAPHIE_BEREICHE")!;
      expect(
        evaluateCondition(rule.condition, { OFF_ARZT_SONOGRAPHIE: "Nicht vorhanden" }),
      ).toBe(false);
    });

    it("nicht sichtbar wenn keine Antwort", () => {
      const rule = getRule("OFF_ARZT_SONOGRAPHIE_BEREICHE")!;
      expect(evaluateCondition(rule.condition, {})).toBe(false);
    });
  });

  describe("OFF_ARZT_SONOGRAPHIE_SONSTIGE – contains-Condition", () => {
    it("Rule vorhanden", () => {
      expect(getRule("OFF_ARZT_SONOGRAPHIE_SONSTIGE")?.action).toBe("showQuestion");
    });

    it("sichtbar wenn 'Sonstige' in Bereichen", () => {
      const rule = getRule("OFF_ARZT_SONOGRAPHIE_SONSTIGE")!;
      expect(
        evaluateCondition(rule.condition, { OFF_ARZT_SONOGRAPHIE_BEREICHE: "Abdomen, Sonstige" }),
      ).toBe(true);
    });

    it("nicht sichtbar ohne 'Sonstige'", () => {
      const rule = getRule("OFF_ARZT_SONOGRAPHIE_SONSTIGE")!;
      expect(
        evaluateCondition(rule.condition, { OFF_ARZT_SONOGRAPHIE_BEREICHE: "Abdomen" }),
      ).toBe(false);
    });
  });

  describe("OFF_ARZT_DMP_SONSTIGE – contains-Condition", () => {
    it("Rule vorhanden", () => {
      expect(getRule("OFF_ARZT_DMP_SONSTIGE")?.action).toBe("showQuestion");
    });

    it("sichtbar wenn 'Sonstige' in DMP-Erfahrung", () => {
      const rule = getRule("OFF_ARZT_DMP_SONSTIGE")!;
      expect(
        evaluateCondition(rule.condition, { OFF_ARZT_DMP_ERFAHRUNG: "KHK, Sonstige" }),
      ).toBe(true);
    });

    it("nicht sichtbar ohne 'Sonstige'", () => {
      const rule = getRule("OFF_ARZT_DMP_SONSTIGE")!;
      expect(
        evaluateCondition(rule.condition, { OFF_ARZT_DMP_ERFAHRUNG: "KHK, COPD" }),
      ).toBe(false);
    });

    it("nicht sichtbar bei 'Keine Erfahrung'", () => {
      const rule = getRule("OFF_ARZT_DMP_SONSTIGE")!;
      expect(
        evaluateCondition(rule.condition, { OFF_ARZT_DMP_ERFAHRUNG: "Keine Erfahrung" }),
      ).toBe(false);
    });
  });
});

describe("BEWERBER_ARZT_ZUSATZQUALIFIKATIONEN – buildFrozenBlocks", () => {
  it("friert Block korrekt ein mit allen 12 Fragen", () => {
    const frozen = buildFrozenBlocks(
      [BLOCK_ID],
      OFFICE_BLOCK_CATALOG,
      OFFICE_QUESTION_CATALOG,
    );
    expect(frozen).toHaveLength(1);
    expect(frozen[0]!.questions).toHaveLength(12);
    expect(frozen[0]!.initiallyVisible).toBe(true);
  });

  it("alle drei ConditionalRules sind im Snapshot", () => {
    const frozen = buildFrozenBlocks(
      [BLOCK_ID],
      OFFICE_BLOCK_CATALOG,
      OFFICE_QUESTION_CATALOG,
    );
    expect(frozen[0]!.conditionalRules).toHaveLength(3);
  });
});

describe("Bestehende Office-Blöcke – Regressionsprüfung", () => {
  const ALLE_ERWARTETEN_BLOCKS = [
    "BEWERBER_KONTAKT",
    "BEWERBER_AUSBILDUNG",
    "BEWERBER_BERUFSERFAHRUNG",
    "BEWERBER_ARZT_BASIS",
    "BEWERBER_ARZT_ZUSATZQUALIFIKATIONEN",
    "BEWERBER_MFA_KOMPETENZEN",
    "BEWERBER_PVS_DIGITAL",
    "BEWERBER_REZEPTION_BUERO",
    "BEWERBER_SPRACHKENNTNISSE",
    "BEWERBER_FUEHRERSCHEIN",
    "BEWERBER_ARBEITSZEITEN",
  ] as const;

  it("OFFICE_BLOCK_CATALOG enthält jetzt 11 Blöcke", () => {
    expect(Object.keys(OFFICE_BLOCK_CATALOG)).toHaveLength(11);
  });

  it("OFFICE_BLOCK_IDS_SORTED enthält alle 11 Blöcke in korrekter Reihenfolge", () => {
    expect(OFFICE_BLOCK_IDS_SORTED).toHaveLength(11);
    const zusatzIdx = OFFICE_BLOCK_IDS_SORTED.indexOf("BEWERBER_ARZT_ZUSATZQUALIFIKATIONEN");
    const basisIdx = OFFICE_BLOCK_IDS_SORTED.indexOf("BEWERBER_ARZT_BASIS");
    const mfaIdx = OFFICE_BLOCK_IDS_SORTED.indexOf("BEWERBER_MFA_KOMPETENZEN");
    expect(zusatzIdx).toBeGreaterThan(basisIdx);
    expect(zusatzIdx).toBeLessThan(mfaIdx);
  });

  it("alle 11 Blöcke sind vorhanden", () => {
    for (const id of ALLE_ERWARTETEN_BLOCKS) {
      expect(OFFICE_BLOCK_CATALOG).toHaveProperty(id);
    }
  });

  it("buildFrozenBlocks aller 11 Blöcke läuft fehlerfrei durch", () => {
    expect(() =>
      buildFrozenBlocks(
        Object.keys(OFFICE_BLOCK_CATALOG),
        OFFICE_BLOCK_CATALOG,
        OFFICE_QUESTION_CATALOG,
      ),
    ).not.toThrow();
  });

  it("BEWERBER_ARZT_BASIS – Conditional Rules bleiben intakt", () => {
    const rules = OFFICE_BLOCK_CATALOG["BEWERBER_ARZT_BASIS"]?.conditionalRules ?? [];
    expect(rules).toHaveLength(2);
  });
});
