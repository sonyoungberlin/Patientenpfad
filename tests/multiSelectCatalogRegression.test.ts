import { BLOCK_CATALOG, QUESTION_CATALOG } from "@/lib/questionnaire/blockCatalog";
import { parseMultiSelectValue, toggleMultiSelectValue } from "@/lib/questionnaire/multiSelect";
import { evaluateCondition } from "@/lib/questionnaire/conditionalLogic";

function collectMultiSelectDefinitions() {
  const definitions: Array<{ id: string; options: string[] }> = [];
  const seen = new Set<string>();

  for (const question of Object.values(QUESTION_CATALOG)) {
    if (question.type === "multi_select" && question.options && !seen.has(question.id)) {
      definitions.push({ id: question.id, options: question.options });
      seen.add(question.id);
    }
    for (const field of question.groupSchema ?? []) {
      if (field.type === "multi_select" && field.options) {
        definitions.push({ id: `${question.id}.${field.key}`, options: field.options });
      }
    }
  }

  return definitions;
}

function combinations<T>(items: readonly T[], maxSize: number): T[][] {
  const result: T[][] = [];
  const visit = (start: number, current: T[]) => {
    if (current.length > 0) result.push([...current]);
    if (current.length === maxSize) return;
    for (let index = start; index < items.length; index += 1) {
      current.push(items[index]!);
      visit(index + 1, current);
      current.pop();
    }
  };
  visit(0, []);
  return result;
}

describe("Multi-Select-Katalogregression", () => {
  const definitions = collectMultiSelectDefinitions();

  it("erfasst alle eigenständigen und verschachtelten Multi-Selects", () => {
    expect(definitions.length).toBe(8);
    expect(definitions.map((definition) => definition.id)).toContain("VOLLST_FAMIL_EINTRAEGE.verwandtschaft");
    expect(definitions.map((definition) => definition.id)).toContain("ADIP_ESSVERHALTEN_MUSTER");
  });

  it.each(definitions)("$id rekonstruiert Einzel- und Mehrfachauswahlen eindeutig", ({ options }) => {
    const maxSize = options.length <= 10 ? options.length : 3;
    const serializedValues = new Map<string, string>();

    for (const selectedOptions of combinations(options, maxSize)) {
      let serialized = "";
      for (const option of selectedOptions) {
        serialized = toggleMultiSelectValue(serialized, option, options);
      }
      expect(parseMultiSelectValue(serialized, options)).toEqual(selectedOptions);
      const previous = serializedValues.get(serialized);
      expect(previous).toBeUndefined();
      serializedValues.set(serialized, selectedOptions.join("\u0001"));
    }
  });

  it("enthält die beiden realen Adipositas-Komma-Labels", () => {
    expect(QUESTION_CATALOG.ADIP_ESSVERHALTEN_MUSTER?.options).toContain(
      "Essen bei Stress, Traurigkeit oder Langeweile",
    );
    expect(QUESTION_CATALOG.ADIP_BERATUNGSWUNSCH?.options).toContain(
      "Prüfung, ob eine medikamentöse Behandlung für mich infrage kommt",
    );
  });

  it("verwendet vollständige Optionswerte bei Conditional contains", () => {
    const options = ["Option A", "Option B", "Essen bei Stress, Traurigkeit oder Langeweile"];
    const condition = {
      target: { kind: "question" as const, questionId: "Q_MULTI" },
      operator: "contains" as const,
      value: "Option B",
    };
    expect(evaluateCondition(condition, { Q_MULTI: "Option A, Option B" }, undefined, new Map([["Q_MULTI", options]]))).toBe(true);
    expect(
      evaluateCondition(
        { ...condition, value: "Essen bei Stress, Traurigkeit oder Langeweile" },
        { Q_MULTI: "Essen bei Stress, Traurigkeit oder Langeweile" },
        undefined,
        new Map([["Q_MULTI", options]]),
      ),
    ).toBe(true);
    expect(
      evaluateCondition(
        { ...condition, value: "Traurigkeit oder Langeweile" },
        { Q_MULTI: "Essen bei Stress, Traurigkeit oder Langeweile" },
        undefined,
        new Map([["Q_MULTI", options]]),
      ),
    ).toBe(false);
  });

  it("behält die bestehenden ADIP-ConditionalRules", () => {
    const rules = BLOCK_CATALOG.ADIPOSITAS_GEWICHTSREDUKTION.conditionalRules ?? [];
    const rule = rules.find((candidate) => candidate.targetId === "ADIP_AUSLOESER_MEDIKAMENTE")!;
    expect(
      evaluateCondition(
        rule.condition,
        { ADIP_ZUNAHME_AUSLOESER: "Neue oder deutlich veränderte Medikamente, Neue Erkrankung" },
        undefined,
        new Map([["ADIP_ZUNAHME_AUSLOESER", QUESTION_CATALOG.ADIP_ZUNAHME_AUSLOESER!.options!]]),
      ),
    ).toBe(true);
  });
});
