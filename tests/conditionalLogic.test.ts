/**
 * Tests für lib/questionnaire/conditionalLogic.ts
 *
 * Abdeckung:
 *  - evaluateCondition() mit equals-Operator (true/false)
 *  - computeVisibleQuestionIds() ohne Regeln → alle Fragen sichtbar
 *  - Pilotregel: ANAMNESE_GP = "ja" → ANAMNESE_GP_NAME sichtbar
 *  - Pilotregel: ANAMNESE_GP = "nein" → ANAMNESE_GP_NAME unsichtbar
 *  - Antworten unsichtbarer Fragen werden nicht in filteredAnswers übernommen
 *  - parseConditionalRules(null/[]) → leeres Array
 */

import {
  evaluateCondition,
  computeVisibleQuestionIds,
  parseConditionalRules,
  type ConditionalRule,
} from "@/lib/questionnaire/conditionalLogic";
import { BLOCK_CATALOG } from "@/lib/questionnaire/blockCatalog";

// ---------------------------------------------------------------------------
// evaluateCondition
// ---------------------------------------------------------------------------

describe("evaluateCondition – equals-Operator", () => {
  const answerJa: Record<string, string> = { ANAMNESE_GP: "ja" };
  const answerNein: Record<string, string> = { ANAMNESE_GP: "nein" };

  const condition = {
    target: { kind: "question" as const, questionId: "ANAMNESE_GP" },
    operator: "equals" as const,
    value: "ja",
  };

  it("gibt true zurück wenn der Wert übereinstimmt", () => {
    expect(evaluateCondition(condition, answerJa)).toBe(true);
  });

  it("gibt false zurück wenn der Wert nicht übereinstimmt", () => {
    expect(evaluateCondition(condition, answerNein)).toBe(false);
  });

  it("gibt false zurück wenn die Frage nicht beantwortet wurde", () => {
    expect(evaluateCondition(condition, {})).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// computeVisibleQuestionIds – leere Regeln
// ---------------------------------------------------------------------------

describe("computeVisibleQuestionIds – ohne Regeln", () => {
  const allIds = ["ANAMNESE_GP", "ANAMNESE_GP_NAME", "ANAMNESE_HEIGHT"];

  it("gibt alle Fragen zurück, wenn keine Regeln vorhanden sind", () => {
    const result = computeVisibleQuestionIds([], allIds, {});
    expect(result).toEqual(new Set(allIds));
  });

  it("gibt alle Fragen zurück, wenn Regeln eine leere Liste sind", () => {
    const result = computeVisibleQuestionIds([], allIds, { ANAMNESE_GP: "nein" });
    expect(result).toEqual(new Set(allIds));
  });
});

// ---------------------------------------------------------------------------
// computeVisibleQuestionIds – Pilotregel ANAMNESE_GP → ANAMNESE_GP_NAME
// ---------------------------------------------------------------------------

const pilotRules: ConditionalRule[] = [
  {
    action: "showQuestion",
    targetId: "ANAMNESE_GP_NAME",
    condition: {
      target: { kind: "question", questionId: "ANAMNESE_GP" },
      operator: "equals",
      value: "ja",
    },
  },
];

const allIds = [
  "ANAMNESE_GP",
  "ANAMNESE_GP_NAME",
  "ANAMNESE_HEIGHT",
  "ANAMNESE_WEIGHT",
];

describe("computeVisibleQuestionIds – Pilotregel", () => {
  it('ANAMNESE_GP = "ja" → ANAMNESE_GP_NAME ist sichtbar', () => {
    const visible = computeVisibleQuestionIds(pilotRules, allIds, {
      ANAMNESE_GP: "ja",
    });
    expect(visible.has("ANAMNESE_GP_NAME")).toBe(true);
  });

  it('ANAMNESE_GP = "nein" → ANAMNESE_GP_NAME ist unsichtbar', () => {
    const visible = computeVisibleQuestionIds(pilotRules, allIds, {
      ANAMNESE_GP: "nein",
    });
    expect(visible.has("ANAMNESE_GP_NAME")).toBe(false);
  });

  it("Fragen ohne showQuestion-Regel sind immer sichtbar", () => {
    const visible = computeVisibleQuestionIds(pilotRules, allIds, {
      ANAMNESE_GP: "nein",
    });
    expect(visible.has("ANAMNESE_GP")).toBe(true);
    expect(visible.has("ANAMNESE_HEIGHT")).toBe(true);
    expect(visible.has("ANAMNESE_WEIGHT")).toBe(true);
  });

  it("Antworten unsichtbarer Fragen werden beim Submit-Filter ausgeschlossen", () => {
    // Simulation des Submit-Filters in QuestionnaireFormClient.tsx
    const values = {
      ANAMNESE_GP: "nein",
      ANAMNESE_GP_NAME: "Dr. Schreiber",
      ANAMNESE_HEIGHT: "175",
    };
    const visibleIds = computeVisibleQuestionIds(pilotRules, allIds, values);
    const answersToSend = Object.fromEntries(
      Object.entries(values).filter(([id]) => visibleIds.has(id)),
    );

    expect("ANAMNESE_GP_NAME" in answersToSend).toBe(false);
    expect(answersToSend.ANAMNESE_GP).toBe("nein");
    expect(answersToSend.ANAMNESE_HEIGHT).toBe("175");
  });
});

describe("computeVisibleQuestionIds – Kurzanamnese-Gates", () => {
  const rules = BLOCK_CATALOG.KURZANAMNESE.conditionalRules ?? [];
  const questionIds = BLOCK_CATALOG.KURZANAMNESE.questionIds;
  const gateToDetail = [
    ["ANAMNESE_GP", "ANAMNESE_GP_NAME"],
    ["ANAMNESE_CHRONIC_GATE", "ANAMNESE_CHRONIC"],
    ["ANAMNESE_ALLERGIES_GATE", "ANAMNESE_ALLERGIES"],
    ["ANAMNESE_MEDICATIONS_GATE", "ANAMNESE_MEDICATIONS"],
  ] as const;

  it("blendet alle vier Detailfelder initial aus", () => {
    const visible = computeVisibleQuestionIds(rules, questionIds, {});
    for (const [, detailId] of gateToDetail) {
      expect(visible.has(detailId)).toBe(false);
    }
  });

  it.each(gateToDetail)("%s = ja zeigt %s", (gateId, detailId) => {
    const visible = computeVisibleQuestionIds(rules, questionIds, {
      [gateId]: "ja",
    });
    expect(visible.has(detailId)).toBe(true);
  });

  it.each(gateToDetail)("%s = nein verbirgt %s", (gateId, detailId) => {
    const visible = computeVisibleQuestionIds(rules, questionIds, {
      [gateId]: "nein",
    });
    expect(visible.has(detailId)).toBe(false);
  });

  it("übermittelt keine Antworten aus verneinten Detailzweigen", () => {
    const answers = Object.fromEntries(
      gateToDetail.flatMap(([gateId, detailId]) => [
        [gateId, "nein"],
        [detailId, "veraltete Antwort"],
      ]),
    );
    const visible = computeVisibleQuestionIds(rules, questionIds, answers);
    const answersToSend = Object.fromEntries(
      Object.entries(answers).filter(([id]) => visible.has(id)),
    );
    for (const [gateId, detailId] of gateToDetail) {
      expect(answersToSend[gateId]).toBe("nein");
      expect(answersToSend[detailId]).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// parseConditionalRules
// ---------------------------------------------------------------------------

describe("parseConditionalRules", () => {
  it("gibt [] für null zurück", () => {
    expect(parseConditionalRules(null)).toEqual([]);
  });

  it("gibt [] für undefined zurück", () => {
    expect(parseConditionalRules(undefined)).toEqual([]);
  });

  it("gibt [] für leeres Array zurück", () => {
    expect(parseConditionalRules([])).toEqual([]);
  });

  it("gibt die Regeln für ein valides Array zurück", () => {
    const rules: ConditionalRule[] = [
      {
        action: "showQuestion",
        targetId: "ANAMNESE_GP_NAME",
        condition: {
          target: { kind: "question", questionId: "ANAMNESE_GP" },
          operator: "equals",
          value: "ja",
        },
      },
    ];
    expect(parseConditionalRules(rules)).toEqual(rules);
  });
});
