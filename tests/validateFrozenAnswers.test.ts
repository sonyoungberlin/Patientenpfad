import { validateFrozenAnswers } from "@/lib/questionnaire/validateFrozenAnswers";
import type { FrozenBlock } from "@/lib/questionnaire/frozenBlocks";
import type { QuestionDefinition } from "@/lib/questionnaire/blockCatalog";

function makeBlock(
  questions: QuestionDefinition[],
  conditionalRules: FrozenBlock["conditionalRules"] = [],
): FrozenBlock {
  return {
    id: "BLOCK",
    label: "Block",
    displayOrder: 10,
    questions,
    conditionalRules,
    initiallyVisible: true,
    outputSemantics: "documented-content-v1",
  };
}

describe("validateFrozenAnswers", () => {
  const required = (overrides: Partial<QuestionDefinition> = {}): QuestionDefinition => ({
    id: "REQUIRED",
    text: "Pflicht",
    type: "text",
    required: true,
    ...overrides,
  });

  it("weist sichtbare leere Pflichtfelder ab und akzeptiert gültige Antworten", () => {
    const blocks = [makeBlock([required()])];
    expect(validateFrozenAnswers({}, blocks)).toMatchObject({ ok: false, invalidQuestionIds: ["REQUIRED"] });
    expect(validateFrozenAnswers({ REQUIRED: "erfasst" }, blocks)).toMatchObject({ ok: true });
  });

  it("weist ungültige Optionswerte anhand des Frozen Snapshots ab", () => {
    const blocks = [makeBlock([required({ id: "STATUS", type: "select", options: ["ja", "nein"] })])];
    expect(validateFrozenAnswers({ STATUS: "unbekannt" }, blocks)).toMatchObject({ ok: false, invalidQuestionIds: ["STATUS"] });
  });

  it("akzeptiert ein leeres optionales Multi-Select in beiden Leerformaten", () => {
    const question: QuestionDefinition = {
      id: "OPTIONAL_MULTI",
      text: "Optional mehrfach",
      type: "multi_select",
      required: false,
      options: ["A", "B"],
    };
    expect(validateFrozenAnswers({ OPTIONAL_MULTI: "" }, [makeBlock([question])])).toMatchObject({ ok: true });
    expect(validateFrozenAnswers({ OPTIONAL_MULTI: "[]" }, [makeBlock([question])])).toMatchObject({ ok: true });
  });

  it.each(["", "[]"])("weist ein leeres verpflichtendes Multi-Select (%s) ab", (value) => {
    const question: QuestionDefinition = {
      id: "REQUIRED_MULTI",
      text: "Pflicht mehrfach",
      type: "multi_select",
      required: true,
      options: ["A", "B"],
    };
    expect(validateFrozenAnswers({ REQUIRED_MULTI: value }, [makeBlock([question])])).toMatchObject({
      ok: false,
      invalidQuestionIds: ["REQUIRED_MULTI"],
    });
  });

  it("akzeptiert ein leeres optionales Select-Feld", () => {
    const question: QuestionDefinition = {
      id: "OPTIONAL_SELECT",
      text: "Optional Auswahl",
      type: "select",
      required: false,
      options: ["A", "B"],
    };
    expect(validateFrozenAnswers({ OPTIONAL_SELECT: "" }, [makeBlock([question])])).toMatchObject({ ok: true });
  });

  describe("optionale und verpflichtende Ja/Nein-Fragen", () => {
    const yesNo = (overrides: Partial<QuestionDefinition> = {}): QuestionDefinition => ({
      id: "YES_NO",
      text: "Ja oder Nein",
      type: "yes_no",
      required: false,
      ...overrides,
    });

    it("akzeptiert ein leeres optionales Ja/Nein-Feld", () => {
      expect(validateFrozenAnswers({ YES_NO: "" }, [makeBlock([yesNo()])])).toMatchObject({ ok: true });
    });

    it("weist ein leeres verpflichtendes Ja/Nein-Feld ab", () => {
      expect(validateFrozenAnswers({ YES_NO: "" }, [makeBlock([yesNo({ required: true })])])).toMatchObject({
        ok: false,
        invalidQuestionIds: ["YES_NO"],
      });
    });

    it.each(["ja", "nein"])("akzeptiert den Standardwert %s", (value) => {
      expect(validateFrozenAnswers({ YES_NO: value }, [makeBlock([yesNo()])])).toMatchObject({ ok: true });
    });

    it("weist einen unbekannten Ja/Nein-Wert ab", () => {
      expect(validateFrozenAnswers({ YES_NO: "unbekannt" }, [makeBlock([yesNo()])])).toMatchObject({
        ok: false,
        invalidQuestionIds: ["YES_NO"],
      });
    });
  });

  it("weist conditional ausgeblendete Pflichtfelder nicht ab", () => {
    const blocks = [makeBlock([
      { id: "GATE", text: "Gate", type: "select", required: false, options: ["ja", "nein"] },
      required({ id: "HIDDEN" }),
    ], [{
      action: "showQuestion",
      targetId: "HIDDEN",
      condition: { target: { kind: "question", questionId: "GATE" }, operator: "equals", value: "ja" },
    }])];
    expect(validateFrozenAnswers({ GATE: "nein" }, blocks)).toMatchObject({ ok: true });
    expect(validateFrozenAnswers({ GATE: "ja" }, blocks)).toMatchObject({ ok: false, invalidQuestionIds: ["HIDDEN"] });
  });

  it("validiert ungültige Werte in conditional ausgeblendeten Feldern nicht", () => {
    const blocks = [makeBlock([
      { id: "GATE", text: "Gate", type: "select", required: false, options: ["ja", "nein"] },
      { id: "HIDDEN_SELECT", text: "Verborgen", type: "select", required: false, options: ["A", "B"] },
    ], [{
      action: "showQuestion",
      targetId: "HIDDEN_SELECT",
      condition: { target: { kind: "question", questionId: "GATE" }, operator: "equals", value: "ja" },
    }])];
    expect(validateFrozenAnswers({ GATE: "nein", HIDDEN_SELECT: "unbekannt" }, blocks)).toMatchObject({ ok: true });
    expect(validateFrozenAnswers({ GATE: "ja", HIDDEN_SELECT: "unbekannt" }, blocks)).toMatchObject({
      ok: false,
      invalidQuestionIds: ["HIDDEN_SELECT"],
    });
  });
});
