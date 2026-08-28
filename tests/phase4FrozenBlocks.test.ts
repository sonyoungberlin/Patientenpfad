/**
 * Phase 4: Frozen Blocks + Block-Level Conditional Logic
 *
 * Testet:
 *  - buildFrozenBlocks: Blockaufbau, Transitive Follower, Cycle-Schutz
 *  - parseFrozenBlocks: Robustheit
 *  - computeVisibleBlockIds: initiallyVisible, showBlock-Regeln
 *  - sanitizeAnswers mit frozenQuestionMap
 *  - buildMedicalRecordNote mit frozenBlocks
 *  - Legacy-Pfad unverändert
 */

import {
  buildFrozenBlocks,
  parseFrozenBlocks,
  type FrozenBlock,
} from "../lib/questionnaire/frozenBlocks";
import {
  computeVisibleBlockIds,
  computeVisibleQuestionIds,
  type ConditionalRule,
} from "../lib/questionnaire/conditionalLogic";
import { sanitizeAnswers } from "../lib/questionnaire/sanitizeAnswers";
import { buildMedicalRecordNote } from "../lib/questionnaire/buildMedicalRecordNote";
import {
  BLOCK_CATALOG,
  QUESTION_CATALOG,
  type QuestionDefinition,
} from "../lib/questionnaire/blockCatalog";

// ---------------------------------------------------------------------------
// Fixtures: Mini-Blocks für isolierte Tests
// ---------------------------------------------------------------------------

function makeBlock(
  id: string,
  displayOrder: number,
  questionIds: string[],
  conditionalRules: ConditionalRule[] = [],
  initiallyVisible = true,
): FrozenBlock {
  return {
    id,
    label: `Block ${id}`,
    displayOrder,
    questions: questionIds.map((qid) => ({
      id: qid,
      text: `Frage ${qid}`,
      type: "text" as const,
      required: false,
    })),
    conditionalRules,
    initiallyVisible,
  };
}

const RULE_Q1_SHOWS_BLOCK_B: ConditionalRule = {
  action: "showBlock",
  targetId: "block-b",
  condition: {
    target: { kind: "question", questionId: "q1" },
    operator: "equals",
    value: "ja",
  },
};

const RULE_Q2_SHOWS_BLOCK_C: ConditionalRule = {
  action: "showBlock",
  targetId: "block-c",
  condition: {
    target: { kind: "question", questionId: "q2" },
    operator: "equals",
    value: "ja",
  },
};

const RULE_Q3_SHOWS_BLOCK_A: ConditionalRule = {
  action: "showBlock",
  targetId: "block-a",
  condition: {
    target: { kind: "question", questionId: "q3" },
    operator: "equals",
    value: "ja",
  },
};

// ---------------------------------------------------------------------------
// parseFrozenBlocks
// ---------------------------------------------------------------------------

describe("parseFrozenBlocks", () => {
  it("gibt null zurück für null", () => {
    expect(parseFrozenBlocks(null)).toBeNull();
  });

  it("gibt null zurück für undefined", () => {
    expect(parseFrozenBlocks(undefined)).toBeNull();
  });

  it("gibt null zurück für leeres Array", () => {
    expect(parseFrozenBlocks([])).toBeNull();
  });

  it("gibt null zurück für nicht-Array-Wert", () => {
    expect(parseFrozenBlocks("string")).toBeNull();
    expect(parseFrozenBlocks(42)).toBeNull();
    expect(parseFrozenBlocks({})).toBeNull();
  });

  it("gibt non-empty Array unverändert zurück", () => {
    const blocks = [makeBlock("a", 1, ["q1"])];
    const result = parseFrozenBlocks(blocks);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// computeVisibleBlockIds
// ---------------------------------------------------------------------------

describe("computeVisibleBlockIds", () => {
  it("initiallyVisible=true Block immer sichtbar", () => {
    const blocks = [makeBlock("block-a", 1, ["q1"], [], true)];
    const visible = computeVisibleBlockIds([], blocks, {});
    expect(visible.has("block-a")).toBe(true);
  });

  it("initiallyVisible=false Block initial unsichtbar ohne passende Regel", () => {
    const blocks = [makeBlock("block-b", 2, ["q2"], [], false)];
    const visible = computeVisibleBlockIds([], blocks, {});
    expect(visible.has("block-b")).toBe(false);
  });

  it("showBlock-Regel macht Block sichtbar wenn Bedingung erfüllt", () => {
    const blocks = [
      makeBlock("block-a", 1, ["q1"], [], true),
      makeBlock("block-b", 2, ["q2"], [], false),
    ];
    const rules: ConditionalRule[] = [RULE_Q1_SHOWS_BLOCK_B];
    const visible = computeVisibleBlockIds(rules, blocks, { q1: "ja" });
    expect(visible.has("block-b")).toBe(true);
  });

  it("showBlock-Regel hat keine Wirkung wenn Bedingung nicht erfüllt", () => {
    const blocks = [
      makeBlock("block-a", 1, ["q1"], [], true),
      makeBlock("block-b", 2, ["q2"], [], false),
    ];
    const rules: ConditionalRule[] = [RULE_Q1_SHOWS_BLOCK_B];
    const visible = computeVisibleBlockIds(rules, blocks, { q1: "nein" });
    expect(visible.has("block-b")).toBe(false);
  });

  it("Bedingung erfüllt → Block sichtbar; Antwort zurückgesetzt → Block unsichtbar", () => {
    const blocks = [makeBlock("block-b", 2, ["q2"], [], false)];
    const rules: ConditionalRule[] = [RULE_Q1_SHOWS_BLOCK_B];

    const visibleWith = computeVisibleBlockIds(rules, blocks, { q1: "ja" });
    expect(visibleWith.has("block-b")).toBe(true);

    const visibleWithout = computeVisibleBlockIds(rules, blocks, { q1: "" });
    expect(visibleWithout.has("block-b")).toBe(false);
  });

  it("showBlock-Regel für Block außerhalb von frozenBlocks wird ignoriert", () => {
    const blocks = [makeBlock("block-a", 1, ["q1"], [], true)];
    const rules: ConditionalRule[] = [RULE_Q1_SHOWS_BLOCK_B]; // block-b nicht in frozen
    const visible = computeVisibleBlockIds(rules, blocks, { q1: "ja" });
    expect(visible.has("block-b")).toBe(false);
  });

  it("showQuestion-Regel funktioniert innerhalb sichtbarer Blöcke", () => {
    const blockA = makeBlock("block-a", 1, ["q1", "q2"], [], true);
    const qIds = blockA.questions.map((q) => q.id);
    const showQ2Rule: ConditionalRule = {
      action: "showQuestion",
      targetId: "q2",
      condition: {
        target: { kind: "question", questionId: "q1" },
        operator: "equals",
        value: "ja",
      },
    };
    // q2 ohne Antwort → unsichtbar
    const noQ2 = computeVisibleQuestionIds([showQ2Rule], qIds, { q1: "" });
    expect(noQ2.has("q2")).toBe(false);

    // q1 = "ja" → q2 sichtbar
    const withQ2 = computeVisibleQuestionIds([showQ2Rule], qIds, { q1: "ja" });
    expect(withQ2.has("q2")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildFrozenBlocks (mit echtem BLOCK_CATALOG)
// ---------------------------------------------------------------------------

describe("buildFrozenBlocks – echte Katalog-Blöcke", () => {
  const firstBlockId = Object.keys(BLOCK_CATALOG)[0];

  it("gibt leeres Array zurück für leere Auswahl", () => {
    const result = buildFrozenBlocks([]);
    expect(result).toHaveLength(0);
  });

  it("unbekannte Block-IDs werden ignoriert", () => {
    const result = buildFrozenBlocks(["DOES_NOT_EXIST"]);
    expect(result).toHaveLength(0);
  });

  it("ausgewählte Blöcke haben initiallyVisible=true", () => {
    if (!firstBlockId) return;
    const result = buildFrozenBlocks([firstBlockId]);
    const found = result.find((b) => b.id === firstBlockId);
    expect(found).toBeDefined();
    expect(found!.initiallyVisible).toBe(true);
  });

  it("Fragen sind tiefe Kopien (Mutation ändert nicht Snapshot)", () => {
    if (!firstBlockId) return;
    const result = buildFrozenBlocks([firstBlockId]);
    const block = result.find((b) => b.id === firstBlockId);
    if (!block || block.questions.length === 0) return;
    const q = block.questions[0];
    const origText = q.text;
    // Mutation des Snapshots
    (q as { text: string }).text = "__MUTATED__";
    // Original im QUESTION_CATALOG unverändert
    const catalogQ = QUESTION_CATALOG[q.id];
    expect(catalogQ?.text).not.toBe("__MUTATED__");
    // Aber auch Snapshot selbst zeigt Mutation (deep copy, kein Freeze)
    expect(q.text).toBe("__MUTATED__");
    // Restore
    (q as { text: string }).text = origText;
  });

  it("keine Duplikate in questions über alle Blöcke", () => {
    const allIds = Object.keys(BLOCK_CATALOG).slice(0, 5);
    const result = buildFrozenBlocks(allIds);
    const allQIds = result.flatMap((b) => b.questions.map((q) => q.id));
    const unique = new Set(allQIds);
    expect(allQIds.length).toBe(unique.size);
  });

  it("Blöcke nach displayOrder sortiert", () => {
    const allIds = Object.keys(BLOCK_CATALOG);
    const result = buildFrozenBlocks(allIds);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].displayOrder).toBeGreaterThanOrEqual(
        result[i - 1].displayOrder,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// buildFrozenBlocks – Transitive Follower & Cycle-Schutz (Mock-Blocks)
// ---------------------------------------------------------------------------

describe("buildFrozenBlocks – transitive Follower + Cycle-Schutz", () => {
  // Wir können buildFrozenBlocks nicht direkt mit Mock-Blöcken aufrufen,
  // da es BLOCK_CATALOG intern nutzt. Stattdessen testen wir die Logik
  // über computeVisibleBlockIds mit handgebauten FrozenBlock-Arrays.

  it("transitiver Follower: A → B → C alle sichtbar wenn Kette ausgelöst", () => {
    const blockA = makeBlock("block-a", 1, ["q1"], [RULE_Q1_SHOWS_BLOCK_B], true);
    const blockB = makeBlock("block-b", 2, ["q2"], [RULE_Q2_SHOWS_BLOCK_C], false);
    const blockC = makeBlock("block-c", 3, ["q3"], [], false);
    const blocks = [blockA, blockB, blockC];
    const rules = [...blockA.conditionalRules, ...blockB.conditionalRules];

    // q1=ja → block-b sichtbar; q2=ja → block-c sichtbar
    const visible = computeVisibleBlockIds(rules, blocks, { q1: "ja", q2: "ja" });
    expect(visible.has("block-a")).toBe(true);
    expect(visible.has("block-b")).toBe(true);
    expect(visible.has("block-c")).toBe(true);
  });

  it("transitiver Follower: mittlere Kette unterbrochen → Endblock unsichtbar", () => {
    const blockA = makeBlock("block-a", 1, ["q1"], [RULE_Q1_SHOWS_BLOCK_B], true);
    const blockB = makeBlock("block-b", 2, ["q2"], [RULE_Q2_SHOWS_BLOCK_C], false);
    const blockC = makeBlock("block-c", 3, ["q3"], [], false);
    const blocks = [blockA, blockB, blockC];
    const rules = [...blockA.conditionalRules, ...blockB.conditionalRules];

    // q1=ja → block-b sichtbar; aber q2 leer → block-c NICHT sichtbar
    const visible = computeVisibleBlockIds(rules, blocks, { q1: "ja", q2: "" });
    expect(visible.has("block-b")).toBe(true);
    expect(visible.has("block-c")).toBe(false);
  });

  it("Cycle-Schutz: zirkuläre showBlock-Regeln terminieren korrekt", () => {
    // block-a → block-b → block-a (Zyklus)
    const ruleAB: ConditionalRule = {
      action: "showBlock",
      targetId: "block-b",
      condition: {
        target: { kind: "question", questionId: "q1" },
        operator: "equals",
        value: "ja",
      },
    };
    const ruleBA: ConditionalRule = {
      action: "showBlock",
      targetId: "block-a",
      condition: {
        target: { kind: "question", questionId: "q2" },
        operator: "equals",
        value: "ja",
      },
    };
    const blockA = makeBlock("block-a", 1, ["q1"], [ruleAB], true);
    const blockB = makeBlock("block-b", 2, ["q2"], [ruleBA], false);
    const blocks = [blockA, blockB];
    const rules = [...blockA.conditionalRules, ...blockB.conditionalRules];

    // Kein Endlos-Loop erwartet – einfach terminieren
    expect(() =>
      computeVisibleBlockIds(rules, blocks, { q1: "ja", q2: "ja" }),
    ).not.toThrow();
    const visible = computeVisibleBlockIds(rules, blocks, { q1: "ja", q2: "ja" });
    expect(visible.has("block-a")).toBe(true);
    expect(visible.has("block-b")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// sanitizeAnswers mit frozenQuestionMap
// ---------------------------------------------------------------------------

describe("sanitizeAnswers – frozenQuestionMap (Phase 4)", () => {
  const frozenRepeatableQ: QuestionDefinition = {
    id: "frozen-rg",
    text: "Frozen Repeatable Group",
    type: "repeatable_group",
    required: false,
    maxEntries: 2,
    groupSchema: [
      { key: "name", label: "Name", type: "text", required: false },
      { key: "choice", label: "Wahl", type: "select", options: ["A", "B"], required: false },
    ],
  };

  const frozenMap = new Map<string, QuestionDefinition>([
    ["frozen-rg", frozenRepeatableQ],
  ]);

  const deduplicatedQuestions = [{ id: "frozen-rg" }];

  it("akzeptiert gültige repeatable_group-Einträge über frozenMap", () => {
    const answers = {
      "frozen-rg": JSON.stringify([{ name: "Anna", choice: "A" }]),
    };
    const result = sanitizeAnswers(answers, deduplicatedQuestions, "de", frozenMap);
    expect(result["frozen-rg"]).toBe(answers["frozen-rg"]);
  });

  it("begrenzt Einträge auf maxEntries aus frozenMap", () => {
    const entries = [
      { name: "A", choice: "A" },
      { name: "B", choice: "B" },
      { name: "C", choice: "A" }, // überschreitet maxEntries=2
    ];
    const answers = { "frozen-rg": JSON.stringify(entries) };
    const result = sanitizeAnswers(answers, deduplicatedQuestions, "de", frozenMap);
    const parsed = JSON.parse(result["frozen-rg"] as string);
    expect(parsed).toHaveLength(2);
  });

  it("verwirft Einträge mit ungültigen Zeichen in text-Feldern", () => {
    const answers = {
      "frozen-rg": JSON.stringify([{ name: "Анна", choice: "A" }]),
    };
    const result = sanitizeAnswers(answers, deduplicatedQuestions, "de", frozenMap);
    // Alle Einträge verworfen → Schlüssel nicht im Ergebnis (null → kein Eintrag)
    const raw = result["frozen-rg"];
    if (raw !== undefined) {
      const parsed = JSON.parse(raw);
      expect(parsed).toHaveLength(0);
    } else {
      expect(raw).toBeUndefined();
    }
  });

  it("ohne frozenMap: fällt zurück auf QUESTION_CATALOG", () => {
    // Nur testen, dass kein Fehler auftritt – QUESTION_CATALOG hat keine "frozen-rg"
    const answers = { "frozen-rg": "irgendwas" };
    // frozen-rg ist nicht in QUESTION_CATALOG → wird herausgefiltert
    const result = sanitizeAnswers(answers, [], "de", undefined);
    expect(result).not.toHaveProperty("frozen-rg");
  });
});

// ---------------------------------------------------------------------------
// buildMedicalRecordNote – frozen path vs. legacy path
// ---------------------------------------------------------------------------

describe("buildMedicalRecordNote – frozen vs. legacy path", () => {
  it("mit frozenBlocks: nutzt frozen-Struktur (keine Fehler)", () => {
    const block = makeBlock("block-x", 1, ["q-text"]);
    block.questions[0] = {
      id: "q-text",
      text: "Testfrage",
      type: "text",
      required: false,
    };
    const answers = { "q-text": "Antwort" };
    expect(() =>
      buildMedicalRecordNote({
        answers,
        language: "de",
        frozenBlocks: [block],
      }),
    ).not.toThrow();
    const note = buildMedicalRecordNote({
      answers,
      language: "de",
      frozenBlocks: [block],
    });
    expect(note).toContain("Antwort");
  });

  it("ohne frozenBlocks: Legacy-Pfad, kein Fehler", () => {
    // Legacy: selected_block_ids + answers übergeben
    const firstBlock = Object.values(BLOCK_CATALOG)[0];
    const firstQ = firstBlock.questionIds[0];
    const answers: Record<string, string> = {};
    if (firstQ) answers[firstQ] = "Testwert";
    expect(() =>
      buildMedicalRecordNote({
        answers,
        language: "de",
        frozenBlocks: null,
        selected_block_ids: [firstBlock.id],
      }),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// parseFrozenBlocks – edge cases
// ---------------------------------------------------------------------------

describe("parseFrozenBlocks – Robustheit", () => {
  it("gibt Blöcke mit mehreren Einträgen zurück", () => {
    const blocks = [makeBlock("a", 1, ["q1"]), makeBlock("b", 2, ["q2"])];
    const result = parseFrozenBlocks(blocks);
    expect(result).toHaveLength(2);
  });
});
