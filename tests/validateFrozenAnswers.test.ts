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
});
