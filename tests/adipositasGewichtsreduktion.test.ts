/**
 * Tests für den Block ADIPOSITAS_GEWICHTSREDUKTION.
 */

import {
  QUESTION_CATALOG,
  BLOCK_CATALOG,
} from "../lib/questionnaire/blockCatalog";
import {
  evaluateCondition,
  computeVisibleQuestionIds,
} from "../lib/questionnaire/conditionalLogic";

const BLOCK_ID = "ADIPOSITAS_GEWICHTSREDUKTION";

const ALL_ADIP_IDS = [
  "ADIP_DAUER",
  "ADIP_ZUNAHME_12M",
  "ADIP_ZUNAHME_AUSLOESER",
  "ADIP_AUSLOESER_MEDIKAMENTE",
  "ADIP_REDUKTION_VERSUCH",
  "ADIP_REDUKTION_UNTERSTUETZUNG",
  "ADIP_REDUKTION_ERFOLG",
  "ADIP_BEWEGUNG",
  "ADIP_BEWEGUNG_BARRIEREN",
  "ADIP_ESSVERHALTEN",
  "ADIP_ESSVERHALTEN_MUSTER",
  "ADIP_MEDI_INTERESSE",
  "ADIP_MEDI_WELCHES",
  "ADIP_MEDI_FRUEHER",
  "ADIP_MEDI_FRUEHER_TEXT",
  "ADIP_SICHERHEIT_PANKREATITIS",
  "ADIP_SICHERHEIT_GALLENBLASE",
  "ADIP_SICHERHEIT_MAGEN_DARM",
  "ADIP_SCHWANGERSCHAFT",
  "ADIP_BERATUNGSWUNSCH",
] as const;

// ---------------------------------------------------------------------------
// 1. Block-Metadaten
// ---------------------------------------------------------------------------

describe("ADIPOSITAS_GEWICHTSREDUKTION – Block-Metadaten", () => {
  const block = BLOCK_CATALOG[BLOCK_ID];

  it("Block existiert in BLOCK_CATALOG", () => {
    expect(block).toBeDefined();
  });

  it("displayOrder ist 310", () => {
    expect(block?.displayOrder).toBe(310);
  });

  it("label ist 'Adipositas / Gewichtsreduktion'", () => {
    expect(block?.label).toBe("Adipositas / Gewichtsreduktion");
  });

  it("questionIds enthält exakt 20 Einträge", () => {
    expect(block?.questionIds).toHaveLength(20);
  });

  it("questionIds enthält alle ADIP_-IDs", () => {
    for (const id of ALL_ADIP_IDS) {
      expect(block?.questionIds).toContain(id);
    }
  });

  it("alle ADIP_-IDs existieren in QUESTION_CATALOG", () => {
    for (const id of ALL_ADIP_IDS) {
      expect(QUESTION_CATALOG[id]).toBeDefined();
    }
  });

  it("keine ADIP_-Question existiert außerhalb des Blocks (ID-Integrität)", () => {
    const adipIdsInBlock = new Set(block?.questionIds ?? []);
    for (const id of ALL_ADIP_IDS) {
      expect(adipIdsInBlock.has(id)).toBe(true);
    }
    // Kein anderer Block enthält ADIP_-IDs
    for (const [bid, b] of Object.entries(BLOCK_CATALOG)) {
      if (bid === BLOCK_ID) continue;
      for (const qid of b.questionIds) {
        expect(qid.startsWith("ADIP_")).toBe(false);
      }
    }
  });

  it("Block hat conditionalRules-Array mit 8 Einträgen", () => {
    expect(block?.conditionalRules).toHaveLength(8);
  });
});

// ---------------------------------------------------------------------------
// 2. Question-Typen und Optionen
// ---------------------------------------------------------------------------

describe("ADIPOSITAS_GEWICHTSREDUKTION – Question-Definitionen", () => {
  it("ADIP_DAUER ist select mit 5 Optionen", () => {
    const q = QUESTION_CATALOG["ADIP_DAUER"];
    expect(q?.type).toBe("select");
    expect(q?.required).toBe(false);
    expect(q?.options).toHaveLength(5);
    expect(q?.options).toContain("Seit weniger als 1 Jahr");
    expect(q?.options).toContain("Seit Kindheit/Jugend");
    expect(q?.options).toContain("Weiß ich nicht genau");
  });

  it("ADIP_ZUNAHME_12M ist yes_no", () => {
    const q = QUESTION_CATALOG["ADIP_ZUNAHME_12M"];
    expect(q?.type).toBe("yes_no");
    expect(q?.required).toBe(false);
  });

  it("ADIP_ZUNAHME_AUSLOESER ist multi_select mit 9 Optionen", () => {
    const q = QUESTION_CATALOG["ADIP_ZUNAHME_AUSLOESER"];
    expect(q?.type).toBe("multi_select");
    expect(q?.options).toHaveLength(9);
    expect(q?.options).toContain("Neue oder deutlich veränderte Medikamente");
    expect(q?.options).toContain("Nichts davon");
  });

  it("ADIP_AUSLOESER_MEDIKAMENTE ist textarea", () => {
    expect(QUESTION_CATALOG["ADIP_AUSLOESER_MEDIKAMENTE"]?.type).toBe("textarea");
  });

  it("ADIP_REDUKTION_VERSUCH ist select mit 3 Optionen", () => {
    const q = QUESTION_CATALOG["ADIP_REDUKTION_VERSUCH"];
    expect(q?.type).toBe("select");
    expect(q?.options).toHaveLength(3);
    expect(q?.options).toContain("Nein");
    expect(q?.options).toContain("Ja, ohne professionelle Unterstützung");
    expect(q?.options).toContain("Ja, mit professioneller Unterstützung");
  });

  it("ADIP_REDUKTION_UNTERSTUETZUNG ist multi_select mit 7 Optionen", () => {
    const q = QUESTION_CATALOG["ADIP_REDUKTION_UNTERSTUETZUNG"];
    expect(q?.type).toBe("multi_select");
    expect(q?.options).toHaveLength(7);
    expect(q?.options).toContain("Ernährungsberatung");
    expect(q?.options).toContain("Digitale Ernährungsberatung / App");
    expect(q?.options).toContain("Ärztliche Beratung / Behandlung");
    expect(q?.options).toContain("Strukturiertes Abnehmprogramm");
    expect(q?.options).toContain("Psychologische / verhaltenstherapeutische Unterstützung");
    expect(q?.options).toContain("Medikamente zur Gewichtsreduktion");
    expect(q?.options).toContain("Andere Unterstützung");
  });

  it("ADIP_REDUKTION_ERFOLG ist select mit 4 Optionen", () => {
    const q = QUESTION_CATALOG["ADIP_REDUKTION_ERFOLG"];
    expect(q?.type).toBe("select");
    expect(q?.options).toHaveLength(4);
    expect(q?.options).toContain("Kein wesentlicher Gewichtsverlust");
    expect(q?.options).toContain("Gewicht deutlich und dauerhaft reduziert");
  });

  it("ADIP_BEWEGUNG ist select mit 3 Optionen", () => {
    const q = QUESTION_CATALOG["ADIP_BEWEGUNG"];
    expect(q?.type).toBe("select");
    expect(q?.options).toHaveLength(3);
    expect(q?.options).toContain("Regelmäßig");
    expect(q?.options).toContain("Eher unregelmäßig");
    expect(q?.options).toContain("Kaum / gar nicht");
  });

  it("ADIP_BEWEGUNG_BARRIEREN ist multi_select mit 7 Optionen", () => {
    const q = QUESTION_CATALOG["ADIP_BEWEGUNG_BARRIEREN"];
    expect(q?.type).toBe("multi_select");
    expect(q?.options).toHaveLength(7);
  });

  it("ADIP_ESSVERHALTEN ist select mit 3 Optionen Ja/Nein/Weiß ich nicht", () => {
    const q = QUESTION_CATALOG["ADIP_ESSVERHALTEN"];
    expect(q?.type).toBe("select");
    expect(q?.options).toEqual(["Ja", "Nein", "Weiß ich nicht"]);
  });

  it("ADIP_ESSVERHALTEN_MUSTER ist multi_select mit 9 Optionen", () => {
    const q = QUESTION_CATALOG["ADIP_ESSVERHALTEN_MUSTER"];
    expect(q?.type).toBe("multi_select");
    expect(q?.options).toHaveLength(9);
    expect(q?.options).toContain("Manchmal Kontrollverlust beim Essen");
  });

  it("ADIP_MEDI_INTERESSE ist select mit 3 Optionen inkl. Vielleicht-Option", () => {
    const q = QUESTION_CATALOG["ADIP_MEDI_INTERESSE"];
    expect(q?.type).toBe("select");
    expect(q?.options).toHaveLength(3);
    expect(q?.options).toContain("Vielleicht / möchte mich beraten lassen");
  });

  it("ADIP_MEDI_WELCHES ist select mit 4 Optionen", () => {
    const q = QUESTION_CATALOG["ADIP_MEDI_WELCHES"];
    expect(q?.type).toBe("select");
    expect(q?.options).toHaveLength(4);
    expect(q?.options).toContain("Semaglutid (z.\u00a0B. Wegovy)");
    expect(q?.options).toContain("Tirzepatid (z.\u00a0B. Mounjaro)");
  });

  it("ADIP_MEDI_FRUEHER ist yes_no", () => {
    expect(QUESTION_CATALOG["ADIP_MEDI_FRUEHER"]?.type).toBe("yes_no");
  });

  it("ADIP_MEDI_FRUEHER_TEXT ist textarea", () => {
    expect(QUESTION_CATALOG["ADIP_MEDI_FRUEHER_TEXT"]?.type).toBe("textarea");
  });

  it("ADIP_SICHERHEIT_PANKREATITIS ist select mit Nein/Ja/Weiß ich nicht", () => {
    const q = QUESTION_CATALOG["ADIP_SICHERHEIT_PANKREATITIS"];
    expect(q?.type).toBe("select");
    expect(q?.options).toEqual(["Nein", "Ja", "Weiß ich nicht"]);
  });

  it("ADIP_SICHERHEIT_GALLENBLASE ist select mit Nein/Ja/Weiß ich nicht", () => {
    const q = QUESTION_CATALOG["ADIP_SICHERHEIT_GALLENBLASE"];
    expect(q?.type).toBe("select");
    expect(q?.options).toEqual(["Nein", "Ja", "Weiß ich nicht"]);
  });

  it("ADIP_SICHERHEIT_MAGEN_DARM ist select mit Nein/Ja/Weiß ich nicht", () => {
    const q = QUESTION_CATALOG["ADIP_SICHERHEIT_MAGEN_DARM"];
    expect(q?.type).toBe("select");
    expect(q?.options).toEqual(["Nein", "Ja", "Weiß ich nicht"]);
  });

  it("ADIP_SCHWANGERSCHAFT ist select mit Nein/Ja/Nicht zutreffend", () => {
    const q = QUESTION_CATALOG["ADIP_SCHWANGERSCHAFT"];
    expect(q?.type).toBe("select");
    expect(q?.options).toEqual(["Nein", "Ja", "Nicht zutreffend"]);
  });

  it("ADIP_BERATUNGSWUNSCH ist multi_select mit 6 Optionen", () => {
    const q = QUESTION_CATALOG["ADIP_BERATUNGSWUNSCH"];
    expect(q?.type).toBe("multi_select");
    expect(q?.options).toHaveLength(6);
    expect(q?.options).toContain("Weiterführende Behandlung / Adipositas-Sprechstunde");
  });

  it("alle ADIP_-Fragen haben required: false", () => {
    for (const id of ALL_ADIP_IDS) {
      expect(QUESTION_CATALOG[id]?.required).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Conditional Logic – alle 8 Rules
// ---------------------------------------------------------------------------

describe("ADIPOSITAS_GEWICHTSREDUKTION – Conditional Logic", () => {
  const getRule = (targetId: string) =>
    BLOCK_CATALOG[BLOCK_ID]?.conditionalRules?.filter(
      (r) => r.targetId === targetId,
    ) ?? [];

  // Rule 1: ADIP_ZUNAHME_AUSLOESER sichtbar bei Zunahme = ja
  describe("Rule 1 – ADIP_ZUNAHME_AUSLOESER (equals ja)", () => {
    it("Rule ist vorhanden", () => {
      expect(getRule("ADIP_ZUNAHME_AUSLOESER")).toHaveLength(1);
    });

    it("sichtbar wenn ADIP_ZUNAHME_12M = 'ja'", () => {
      const [rule] = getRule("ADIP_ZUNAHME_AUSLOESER");
      expect(evaluateCondition(rule!.condition, { ADIP_ZUNAHME_12M: "ja" })).toBe(true);
    });

    it("nicht sichtbar wenn ADIP_ZUNAHME_12M = 'nein'", () => {
      const [rule] = getRule("ADIP_ZUNAHME_AUSLOESER");
      expect(evaluateCondition(rule!.condition, { ADIP_ZUNAHME_12M: "nein" })).toBe(false);
    });

    it("nicht sichtbar bei leerer Antwort", () => {
      const [rule] = getRule("ADIP_ZUNAHME_AUSLOESER");
      expect(evaluateCondition(rule!.condition, {})).toBe(false);
    });
  });

  // Rule 2: ADIP_AUSLOESER_MEDIKAMENTE per contains auf multi_select
  describe("Rule 2 – ADIP_AUSLOESER_MEDIKAMENTE (contains auf multi_select)", () => {
    it("Rule ist vorhanden", () => {
      expect(getRule("ADIP_AUSLOESER_MEDIKAMENTE")).toHaveLength(1);
    });

    it("sichtbar wenn Auslöser nur 'Neue oder deutlich veränderte Medikamente'", () => {
      const [rule] = getRule("ADIP_AUSLOESER_MEDIKAMENTE");
      expect(
        evaluateCondition(rule!.condition, {
          ADIP_ZUNAHME_AUSLOESER: "Neue oder deutlich veränderte Medikamente",
        }),
      ).toBe(true);
    });

    it("sichtbar wenn Auslöser Mehrfachauswahl inkl. Medikamente", () => {
      const [rule] = getRule("ADIP_AUSLOESER_MEDIKAMENTE");
      expect(
        evaluateCondition(rule!.condition, {
          ADIP_ZUNAHME_AUSLOESER:
            "Neue oder deutlich veränderte Medikamente, Neue Erkrankung",
        }),
      ).toBe(true);
    });

    it("nicht sichtbar wenn Auslöser ohne Medikamente", () => {
      const [rule] = getRule("ADIP_AUSLOESER_MEDIKAMENTE");
      expect(
        evaluateCondition(rule!.condition, {
          ADIP_ZUNAHME_AUSLOESER: "Neue Erkrankung, Schwangerschaft",
        }),
      ).toBe(false);
    });

    it("nicht sichtbar bei leerer Antwort", () => {
      const [rule] = getRule("ADIP_AUSLOESER_MEDIKAMENTE");
      expect(evaluateCondition(rule!.condition, {})).toBe(false);
    });
  });

  // Rule 3: ADIP_REDUKTION_UNTERSTUETZUNG nur bei professionell
  describe("Rule 3 – ADIP_REDUKTION_UNTERSTUETZUNG (equals professionell)", () => {
    it("Rule ist vorhanden", () => {
      expect(getRule("ADIP_REDUKTION_UNTERSTUETZUNG")).toHaveLength(1);
    });

    it("sichtbar bei 'Ja, mit professioneller Unterstützung'", () => {
      const [rule] = getRule("ADIP_REDUKTION_UNTERSTUETZUNG");
      expect(
        evaluateCondition(rule!.condition, {
          ADIP_REDUKTION_VERSUCH: "Ja, mit professioneller Unterstützung",
        }),
      ).toBe(true);
    });

    it("nicht sichtbar bei 'Ja, ohne professionelle Unterstützung'", () => {
      const [rule] = getRule("ADIP_REDUKTION_UNTERSTUETZUNG");
      expect(
        evaluateCondition(rule!.condition, {
          ADIP_REDUKTION_VERSUCH: "Ja, ohne professionelle Unterstützung",
        }),
      ).toBe(false);
    });

    it("nicht sichtbar bei 'Nein'", () => {
      const [rule] = getRule("ADIP_REDUKTION_UNTERSTUETZUNG");
      expect(
        evaluateCondition(rule!.condition, { ADIP_REDUKTION_VERSUCH: "Nein" }),
      ).toBe(false);
    });
  });

  // Rule 4: ADIP_REDUKTION_ERFOLG bei beiden Ja-Varianten (OR)
  describe("Rule 4 – ADIP_REDUKTION_ERFOLG (OR beider Ja-Varianten)", () => {
    it("Rule ist vorhanden", () => {
      expect(getRule("ADIP_REDUKTION_ERFOLG")).toHaveLength(1);
    });

    it("sichtbar bei 'Ja, ohne professionelle Unterstützung'", () => {
      const [rule] = getRule("ADIP_REDUKTION_ERFOLG");
      expect(
        evaluateCondition(rule!.condition, {
          ADIP_REDUKTION_VERSUCH: "Ja, ohne professionelle Unterstützung",
        }),
      ).toBe(true);
    });

    it("sichtbar bei 'Ja, mit professioneller Unterstützung'", () => {
      const [rule] = getRule("ADIP_REDUKTION_ERFOLG");
      expect(
        evaluateCondition(rule!.condition, {
          ADIP_REDUKTION_VERSUCH: "Ja, mit professioneller Unterstützung",
        }),
      ).toBe(true);
    });

    it("nicht sichtbar bei 'Nein'", () => {
      const [rule] = getRule("ADIP_REDUKTION_ERFOLG");
      expect(
        evaluateCondition(rule!.condition, { ADIP_REDUKTION_VERSUCH: "Nein" }),
      ).toBe(false);
    });
  });

  // Rule 5: ADIP_BEWEGUNG_BARRIEREN bei unregelmäßig oder kaum (OR)
  describe("Rule 5 – ADIP_BEWEGUNG_BARRIEREN (OR unregelmäßig / kaum)", () => {
    it("Rule ist vorhanden", () => {
      expect(getRule("ADIP_BEWEGUNG_BARRIEREN")).toHaveLength(1);
    });

    it("sichtbar bei 'Eher unregelmäßig'", () => {
      const [rule] = getRule("ADIP_BEWEGUNG_BARRIEREN");
      expect(
        evaluateCondition(rule!.condition, { ADIP_BEWEGUNG: "Eher unregelmäßig" }),
      ).toBe(true);
    });

    it("sichtbar bei 'Kaum / gar nicht'", () => {
      const [rule] = getRule("ADIP_BEWEGUNG_BARRIEREN");
      expect(
        evaluateCondition(rule!.condition, { ADIP_BEWEGUNG: "Kaum / gar nicht" }),
      ).toBe(true);
    });

    it("nicht sichtbar bei 'Regelmäßig'", () => {
      const [rule] = getRule("ADIP_BEWEGUNG_BARRIEREN");
      expect(
        evaluateCondition(rule!.condition, { ADIP_BEWEGUNG: "Regelmäßig" }),
      ).toBe(false);
    });
  });

  // Rule 6: ADIP_ESSVERHALTEN_MUSTER bei Ja
  describe("Rule 6 – ADIP_ESSVERHALTEN_MUSTER (equals Ja)", () => {
    it("Rule ist vorhanden", () => {
      expect(getRule("ADIP_ESSVERHALTEN_MUSTER")).toHaveLength(1);
    });

    it("sichtbar bei 'Ja'", () => {
      const [rule] = getRule("ADIP_ESSVERHALTEN_MUSTER");
      expect(
        evaluateCondition(rule!.condition, { ADIP_ESSVERHALTEN: "Ja" }),
      ).toBe(true);
    });

    it("nicht sichtbar bei 'Nein'", () => {
      const [rule] = getRule("ADIP_ESSVERHALTEN_MUSTER");
      expect(
        evaluateCondition(rule!.condition, { ADIP_ESSVERHALTEN: "Nein" }),
      ).toBe(false);
    });

    it("nicht sichtbar bei 'Weiß ich nicht'", () => {
      const [rule] = getRule("ADIP_ESSVERHALTEN_MUSTER");
      expect(
        evaluateCondition(rule!.condition, { ADIP_ESSVERHALTEN: "Weiß ich nicht" }),
      ).toBe(false);
    });
  });

  // Rule 7: ADIP_MEDI_WELCHES bei Ja oder Vielleicht (OR)
  describe("Rule 7 – ADIP_MEDI_WELCHES (OR Ja / Vielleicht)", () => {
    it("Rule ist vorhanden", () => {
      expect(getRule("ADIP_MEDI_WELCHES")).toHaveLength(1);
    });

    it("sichtbar bei 'Ja'", () => {
      const [rule] = getRule("ADIP_MEDI_WELCHES");
      expect(
        evaluateCondition(rule!.condition, { ADIP_MEDI_INTERESSE: "Ja" }),
      ).toBe(true);
    });

    it("sichtbar bei 'Vielleicht / möchte mich beraten lassen'", () => {
      const [rule] = getRule("ADIP_MEDI_WELCHES");
      expect(
        evaluateCondition(rule!.condition, {
          ADIP_MEDI_INTERESSE: "Vielleicht / möchte mich beraten lassen",
        }),
      ).toBe(true);
    });

    it("nicht sichtbar bei 'Nein'", () => {
      const [rule] = getRule("ADIP_MEDI_WELCHES");
      expect(
        evaluateCondition(rule!.condition, { ADIP_MEDI_INTERESSE: "Nein" }),
      ).toBe(false);
    });
  });

  // Rule 8: ADIP_MEDI_FRUEHER_TEXT bei ja
  describe("Rule 8 – ADIP_MEDI_FRUEHER_TEXT (equals ja)", () => {
    it("Rule ist vorhanden", () => {
      expect(getRule("ADIP_MEDI_FRUEHER_TEXT")).toHaveLength(1);
    });

    it("sichtbar bei 'ja'", () => {
      const [rule] = getRule("ADIP_MEDI_FRUEHER_TEXT");
      expect(
        evaluateCondition(rule!.condition, { ADIP_MEDI_FRUEHER: "ja" }),
      ).toBe(true);
    });

    it("nicht sichtbar bei 'nein'", () => {
      const [rule] = getRule("ADIP_MEDI_FRUEHER_TEXT");
      expect(
        evaluateCondition(rule!.condition, { ADIP_MEDI_FRUEHER: "nein" }),
      ).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// 4. computeVisibleQuestionIds – Integrationstests
// ---------------------------------------------------------------------------

describe("ADIPOSITAS_GEWICHTSREDUKTION – computeVisibleQuestionIds", () => {
  const block = BLOCK_CATALOG[BLOCK_ID]!;
  const rules = block.conditionalRules ?? [];
  const qIds = block.questionIds;

  it("leere Antworten → 14 unkonditionierte Fragen sichtbar", () => {
    const visible = computeVisibleQuestionIds(rules, qIds, {});
    // Die 6 conditionierten Fragen sind verborgen
    const conditional = [
      "ADIP_ZUNAHME_AUSLOESER",
      "ADIP_AUSLOESER_MEDIKAMENTE",
      "ADIP_REDUKTION_UNTERSTUETZUNG",
      "ADIP_REDUKTION_ERFOLG",
      "ADIP_BEWEGUNG_BARRIEREN",
      "ADIP_ESSVERHALTEN_MUSTER",
      "ADIP_MEDI_WELCHES",
      "ADIP_MEDI_FRUEHER_TEXT",
    ];
    // 20 - 8 conditional = 12 always visible (alle ohne Rule)
    for (const id of conditional) {
      expect(visible.has(id)).toBe(false);
    }
    expect(visible.size).toBe(12);
  });

  it("alle Gates auf Ja → alle 20 Fragen sichtbar", () => {
    const answers: Record<string, string> = {
      ADIP_ZUNAHME_12M: "ja",
      ADIP_ZUNAHME_AUSLOESER: "Neue oder deutlich veränderte Medikamente",
      ADIP_REDUKTION_VERSUCH: "Ja, mit professioneller Unterstützung",
      ADIP_BEWEGUNG: "Eher unregelmäßig",
      ADIP_ESSVERHALTEN: "Ja",
      ADIP_MEDI_INTERESSE: "Ja",
      ADIP_MEDI_FRUEHER: "ja",
    };
    const visible = computeVisibleQuestionIds(rules, qIds, answers);
    expect(visible.size).toBe(20);
    for (const id of ALL_ADIP_IDS) {
      expect(visible.has(id)).toBe(true);
    }
  });

  it("nur ADIP_ZUNAHME_12M=ja → Auslöser sichtbar, Medikamente-Textarea noch nicht", () => {
    const visible = computeVisibleQuestionIds(rules, qIds, {
      ADIP_ZUNAHME_12M: "ja",
    });
    expect(visible.has("ADIP_ZUNAHME_AUSLOESER")).toBe(true);
    expect(visible.has("ADIP_AUSLOESER_MEDIKAMENTE")).toBe(false);
  });
});
