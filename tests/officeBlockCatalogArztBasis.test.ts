import {
  OFFICE_BLOCK_CATALOG,
  OFFICE_QUESTION_CATALOG,
  OFFICE_BLOCK_IDS_SORTED,
} from "../lib/questionnaire/officeBlockCatalog";
import { buildFrozenBlocks } from "../lib/questionnaire/frozenBlocks";
import { evaluateCondition } from "../lib/questionnaire/conditionalLogic";

const BLOCK_ID = "BEWERBER_ARZT_BASIS";

const ALL_QUESTION_IDS = [
  "OFF_ARZT_APPROBATION",
  "OFF_ARZT_FACHARZTSTATUS",
  "OFF_ARZT_FACHGEBIET",
  "OFF_ARZT_WEITERBILDUNGSJAHR",
  "OFF_ARZT_BERUFSERFAHRUNG_JAHRE",
  "OFF_ARZT_AMBULANTE_ERFAHRUNG",
  "OFF_ARZT_HAUSARZT_ERFAHRUNG",
  "OFF_ARZT_TAETIGKEITSBEREICHE",
  "OFF_ARZT_TAETIGKEITSBEREICHE_SONSTIGE",
  "OFF_ARZT_TAETIGKEIT_BESCHREIBUNG",
] as const;

describe("BEWERBER_ARZT_BASIS – Katalog-Struktur", () => {
  it("Block ist im OFFICE_BLOCK_CATALOG vorhanden", () => {
    expect(OFFICE_BLOCK_CATALOG).toHaveProperty(BLOCK_ID);
  });

  it("Block-Label ist korrekt", () => {
    expect(OFFICE_BLOCK_CATALOG[BLOCK_ID]?.label).toBe("Ärztliche Basisqualifikation");
  });

  it("displayOrder liegt nach Berufserfahrung (30) und vor MFA_KOMPETENZEN (33)", () => {
    const order = OFFICE_BLOCK_CATALOG[BLOCK_ID]?.displayOrder ?? 0;
    expect(order).toBeGreaterThan(30);
    expect(order).toBeLessThan(33);
  });

  it("Block enthält alle 10 Fragen", () => {
    const ids = OFFICE_BLOCK_CATALOG[BLOCK_ID]?.questionIds ?? [];
    expect(ids).toHaveLength(10);
    for (const qid of ALL_QUESTION_IDS) {
      expect(ids).toContain(qid);
    }
  });

  it("alle 10 Fragen sind im OFFICE_QUESTION_CATALOG definiert", () => {
    for (const qid of ALL_QUESTION_IDS) {
      expect(OFFICE_QUESTION_CATALOG).toHaveProperty(qid);
    }
  });

  it("Block hat genau zwei conditionalRules", () => {
    expect(OFFICE_BLOCK_CATALOG[BLOCK_ID]?.conditionalRules).toHaveLength(2);
  });
});

describe("BEWERBER_ARZT_BASIS – Fragedefinitionen", () => {
  it("OFF_ARZT_APPROBATION ist select und Pflichtfeld", () => {
    const q = OFFICE_QUESTION_CATALOG["OFF_ARZT_APPROBATION"];
    expect(q?.type).toBe("select");
    expect(q?.required).toBe(true);
  });

  it("OFF_ARZT_APPROBATION hat exakt die vorgesehenen fünf Optionen", () => {
    expect(OFFICE_QUESTION_CATALOG["OFF_ARZT_APPROBATION"]?.options).toEqual([
      "Deutsche Approbation vorhanden",
      "Approbation in Deutschland beantragt",
      "Berufserlaubnis vorhanden",
      "Ausländische ärztliche Zulassung vorhanden",
      "Noch keine ärztliche Zulassung",
    ]);
  });

  it("OFF_ARZT_FACHARZTSTATUS ist select und Pflichtfeld", () => {
    const q = OFFICE_QUESTION_CATALOG["OFF_ARZT_FACHARZTSTATUS"];
    expect(q?.type).toBe("select");
    expect(q?.required).toBe(true);
  });

  it("OFF_ARZT_FACHARZTSTATUS hat exakt drei Optionen", () => {
    expect(OFFICE_QUESTION_CATALOG["OFF_ARZT_FACHARZTSTATUS"]?.options).toEqual([
      "Facharztanerkennung vorhanden",
      "In fachärztlicher Weiterbildung",
      "Noch keine fachärztliche Weiterbildung begonnen",
    ]);
  });

  it("OFF_ARZT_FACHGEBIET ist text und kein Pflichtfeld", () => {
    const q = OFFICE_QUESTION_CATALOG["OFF_ARZT_FACHGEBIET"];
    expect(q?.type).toBe("text");
    expect(q?.required).toBe(false);
  });

  it("OFF_ARZT_WEITERBILDUNGSJAHR ist number und kein Pflichtfeld", () => {
    const q = OFFICE_QUESTION_CATALOG["OFF_ARZT_WEITERBILDUNGSJAHR"];
    expect(q?.type).toBe("number");
    expect(q?.required).toBe(false);
  });

  it("OFF_ARZT_BERUFSERFAHRUNG_JAHRE ist number mit unit Jahre", () => {
    const q = OFFICE_QUESTION_CATALOG["OFF_ARZT_BERUFSERFAHRUNG_JAHRE"];
    expect(q?.type).toBe("number");
    expect(q?.unit).toBe("Jahre");
    expect(q?.required).toBe(false);
  });

  it("OFF_ARZT_AMBULANTE_ERFAHRUNG ist yes_no und kein Pflichtfeld", () => {
    const q = OFFICE_QUESTION_CATALOG["OFF_ARZT_AMBULANTE_ERFAHRUNG"];
    expect(q?.type).toBe("yes_no");
    expect(q?.required).toBe(false);
  });

  it("OFF_ARZT_HAUSARZT_ERFAHRUNG ist yes_no und kein Pflichtfeld", () => {
    const q = OFFICE_QUESTION_CATALOG["OFF_ARZT_HAUSARZT_ERFAHRUNG"];
    expect(q?.type).toBe("yes_no");
    expect(q?.required).toBe(false);
  });

  it("OFF_ARZT_TAETIGKEITSBEREICHE ist multi_select mit 10 Optionen inkl. Sonstiges", () => {
    const q = OFFICE_QUESTION_CATALOG["OFF_ARZT_TAETIGKEITSBEREICHE"];
    expect(q?.type).toBe("multi_select");
    expect(q?.required).toBe(false);
    expect(q?.options).toHaveLength(10);
    expect(q?.options).toContain("Sonstiges");
    expect(q?.options).toEqual(
      expect.arrayContaining([
        "Hausarztpraxis",
        "Facharztpraxis",
        "MVZ",
        "Krankenhaus / Klinik",
        "Universitätsklinik",
        "Notaufnahme",
        "Bereitschaftsdienst",
        "Rehabilitation",
        "Öffentlicher Gesundheitsdienst",
        "Sonstiges",
      ]),
    );
  });

  it("OFF_ARZT_TAETIGKEITSBEREICHE_SONSTIGE ist textarea und kein Pflichtfeld", () => {
    const q = OFFICE_QUESTION_CATALOG["OFF_ARZT_TAETIGKEITSBEREICHE_SONSTIGE"];
    expect(q?.type).toBe("textarea");
    expect(q?.required).toBe(false);
  });

  it("OFF_ARZT_TAETIGKEIT_BESCHREIBUNG ist textarea und kein Pflichtfeld", () => {
    const q = OFFICE_QUESTION_CATALOG["OFF_ARZT_TAETIGKEIT_BESCHREIBUNG"];
    expect(q?.type).toBe("textarea");
    expect(q?.required).toBe(false);
  });
});

describe("BEWERBER_ARZT_BASIS – Conditional Logic", () => {
  const getRule = (targetId: string) =>
    OFFICE_BLOCK_CATALOG[BLOCK_ID]?.conditionalRules?.find(
      (r) => r.targetId === targetId,
    );

  describe("OFF_ARZT_WEITERBILDUNGSJAHR – equals-Rule", () => {
    it("Rule ist vorhanden und zeigt Weiterbildungsjahr", () => {
      const rule = getRule("OFF_ARZT_WEITERBILDUNGSJAHR");
      expect(rule?.action).toBe("showQuestion");
      expect(rule?.condition).toMatchObject({
        target: { kind: "question", questionId: "OFF_ARZT_FACHARZTSTATUS" },
        operator: "equals",
        value: "In fachärztlicher Weiterbildung",
      });
    });

    it("sichtbar wenn 'In fachärztlicher Weiterbildung'", () => {
      const rule = getRule("OFF_ARZT_WEITERBILDUNGSJAHR")!;
      expect(
        evaluateCondition(rule.condition, {
          OFF_ARZT_FACHARZTSTATUS: "In fachärztlicher Weiterbildung",
        }),
      ).toBe(true);
    });

    it("nicht sichtbar wenn 'Facharztanerkennung vorhanden'", () => {
      const rule = getRule("OFF_ARZT_WEITERBILDUNGSJAHR")!;
      expect(
        evaluateCondition(rule.condition, {
          OFF_ARZT_FACHARZTSTATUS: "Facharztanerkennung vorhanden",
        }),
      ).toBe(false);
    });

    it("nicht sichtbar wenn keine Antwort", () => {
      const rule = getRule("OFF_ARZT_WEITERBILDUNGSJAHR")!;
      expect(evaluateCondition(rule.condition, {})).toBe(false);
    });
  });

  describe("OFF_ARZT_TAETIGKEITSBEREICHE_SONSTIGE – contains-Rule", () => {
    it("Rule ist vorhanden und zeigt Sonstiges-Textarea", () => {
      const rule = getRule("OFF_ARZT_TAETIGKEITSBEREICHE_SONSTIGE");
      expect(rule?.action).toBe("showQuestion");
      expect(rule?.condition).toMatchObject({
        target: { kind: "question", questionId: "OFF_ARZT_TAETIGKEITSBEREICHE" },
        operator: "contains",
        value: "Sonstiges",
      });
    });

    it("sichtbar wenn 'Sonstiges' allein gewählt", () => {
      const rule = getRule("OFF_ARZT_TAETIGKEITSBEREICHE_SONSTIGE")!;
      expect(
        evaluateCondition(rule.condition, {
          OFF_ARZT_TAETIGKEITSBEREICHE: "Sonstiges",
        }),
      ).toBe(true);
    });

    it("sichtbar wenn 'Sonstiges' in Kombination", () => {
      const rule = getRule("OFF_ARZT_TAETIGKEITSBEREICHE_SONSTIGE")!;
      expect(
        evaluateCondition(rule.condition, {
          OFF_ARZT_TAETIGKEITSBEREICHE: "Hausarztpraxis, MVZ, Sonstiges",
        }),
      ).toBe(true);
    });

    it("nicht sichtbar wenn 'Sonstiges' nicht enthalten", () => {
      const rule = getRule("OFF_ARZT_TAETIGKEITSBEREICHE_SONSTIGE")!;
      expect(
        evaluateCondition(rule.condition, {
          OFF_ARZT_TAETIGKEITSBEREICHE: "Hausarztpraxis, MVZ",
        }),
      ).toBe(false);
    });

    it("nicht sichtbar bei leerer Antwort", () => {
      const rule = getRule("OFF_ARZT_TAETIGKEITSBEREICHE_SONSTIGE")!;
      expect(evaluateCondition(rule.condition, {})).toBe(false);
    });
  });
});

describe("BEWERBER_ARZT_BASIS – buildFrozenBlocks", () => {
  it("friert Block korrekt ein mit allen 10 Fragen", () => {
    const frozen = buildFrozenBlocks(
      [BLOCK_ID],
      OFFICE_BLOCK_CATALOG,
      OFFICE_QUESTION_CATALOG,
    );
    expect(frozen).toHaveLength(1);
    const block = frozen[0]!;
    expect(block.id).toBe(BLOCK_ID);
    expect(block.initiallyVisible).toBe(true);
    expect(block.questions).toHaveLength(10);
  });

  it("beide ConditionalRules sind im frozen Block enthalten", () => {
    const frozen = buildFrozenBlocks(
      [BLOCK_ID],
      OFFICE_BLOCK_CATALOG,
      OFFICE_QUESTION_CATALOG,
    );
    expect(frozen[0]?.conditionalRules).toHaveLength(2);
  });

  it("Approbations-Optionen im Snapshot sind korrekt (tiefer Clone)", () => {
    const frozen = buildFrozenBlocks(
      [BLOCK_ID],
      OFFICE_BLOCK_CATALOG,
      OFFICE_QUESTION_CATALOG,
    );
    const frozenQ = frozen[0]!.questions.find((q) => q.id === "OFF_ARZT_APPROBATION");
    expect(frozenQ?.options).toContain("Deutsche Approbation vorhanden");
    // Mutation im Snapshot darf Original nicht beeinflussen
    frozenQ!.options = [];
    expect(OFFICE_QUESTION_CATALOG["OFF_ARZT_APPROBATION"]!.options).toHaveLength(5);
  });
});

describe("Bestehende Office-Blöcke – Regressionsprüfung", () => {
  const ALLE_ERWARTETEN_BLOCKS = [
    "BEWERBER_KONTAKT",
    "BEWERBER_AUSBILDUNG",
    "BEWERBER_BERUFSERFAHRUNG",
    "BEWERBER_ARZT_BASIS",
    "BEWERBER_MFA_KOMPETENZEN",
    "BEWERBER_PVS_DIGITAL",
    "BEWERBER_REZEPTION_BUERO",
    "BEWERBER_SPRACHKENNTNISSE",
    "BEWERBER_FUEHRERSCHEIN",
    "BEWERBER_ARBEITSZEITEN",
  ] as const;

  it("OFFICE_BLOCK_CATALOG enthält jetzt 13 Blöcke", () => {
    expect(Object.keys(OFFICE_BLOCK_CATALOG)).toHaveLength(15);
  });

  it("OFFICE_BLOCK_IDS_SORTED enthält alle 13 Blöcke in korrekter Reihenfolge", () => {
    expect(OFFICE_BLOCK_IDS_SORTED).toHaveLength(15);
    const arztIdx = OFFICE_BLOCK_IDS_SORTED.indexOf("BEWERBER_ARZT_BASIS");
    const berufsIdx = OFFICE_BLOCK_IDS_SORTED.indexOf("BEWERBER_BERUFSERFAHRUNG");
    const mfaIdx = OFFICE_BLOCK_IDS_SORTED.indexOf("BEWERBER_MFA_KOMPETENZEN");
    expect(arztIdx).toBeGreaterThan(berufsIdx);
    expect(arztIdx).toBeLessThan(mfaIdx);
  });

  it("alle 10 Blöcke sind vorhanden", () => {
    for (const id of ALLE_ERWARTETEN_BLOCKS) {
      expect(OFFICE_BLOCK_CATALOG).toHaveProperty(id);
    }
  });

  it("buildFrozenBlocks aller 10 Blöcke läuft fehlerfrei durch", () => {
    const allIds = Object.keys(OFFICE_BLOCK_CATALOG);
    expect(() =>
      buildFrozenBlocks(allIds, OFFICE_BLOCK_CATALOG, OFFICE_QUESTION_CATALOG),
    ).not.toThrow();
  });

  it("BEWERBER_FUEHRERSCHEIN – ConditionalRule bleibt intakt", () => {
    const rule = OFFICE_BLOCK_CATALOG["BEWERBER_FUEHRERSCHEIN"]?.conditionalRules?.[0];
    expect(rule?.targetId).toBe("OFF_FUEHRERSCHEIN_KLASSEN");
  });

  it("BEWERBER_MFA_KOMPETENZEN – ConditionalRule bleibt intakt", () => {
    const rules = OFFICE_BLOCK_CATALOG["BEWERBER_MFA_KOMPETENZEN"]?.conditionalRules ?? [];
    expect(rules).toHaveLength(2);
    expect(rules[0]?.targetId).toBe("OFF_MFA_FACHSPEZIFISCHE_FORTBILDUNG");
    expect(rules[1]?.targetId).toBe("OFF_MFA_ZUSATZQUALIFIKATIONEN_SONSTIGE");
  });

  it("BEWERBER_PVS_DIGITAL – ConditionalRule bleibt intakt", () => {
    const rule = OFFICE_BLOCK_CATALOG["BEWERBER_PVS_DIGITAL"]?.conditionalRules?.[0];
    expect(rule?.targetId).toBe("OFF_PVS_SYSTEME");
  });
});
