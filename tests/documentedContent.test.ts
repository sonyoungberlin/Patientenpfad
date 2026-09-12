import { hasDocumentedAnswer, hasDocumentedBlockContent } from "@/lib/questionnaire/documentedContent";
import type { FrozenBlock } from "@/lib/questionnaire/frozenBlocks";
import type { QuestionDefinition } from "@/lib/questionnaire/blockCatalog";

function question(overrides: Partial<QuestionDefinition>): QuestionDefinition {
  return {
    id: "QUESTION",
    text: "Frage",
    type: "text",
    required: false,
    ...overrides,
  };
}

function block(q: QuestionDefinition): FrozenBlock {
  return {
    id: "BLOCK",
    label: "Block",
    displayOrder: 10,
    questions: [q],
    conditionalRules: [],
    initiallyVisible: true,
    outputSemantics: "documented-content-v1",
  };
}

describe("documented content", () => {
  it.each([
    ["text", question({ type: "text" }), "Text"],
    ["textarea", question({ type: "textarea" }), "Notiz"],
    ["number", question({ type: "number" }), "120"],
    ["yes_no", question({ type: "yes_no", options: ["ja", "nein"] }), "nein"],
    ["select", question({ type: "select", options: ["Status"] }), "Status"],
    ["multi_select", question({ type: "multi_select", options: ["A", "B"] }), "A"],
  ])("erkennt eine beantwortete %s-Frage", (_label, q, value) => {
    expect(hasDocumentedAnswer(q, { [q.id]: value })).toBe(true);
  });

  it("ignoriert leere Standardwerte", () => {
    const q = question({ type: "text" });
    expect(hasDocumentedAnswer(q, {})).toBe(false);
    expect(hasDocumentedAnswer(q, { [q.id]: "   " })).toBe(false);
  });

  it.each([
    ["0", question({ type: "text" })],
    ["nein", question({ type: "yes_no", options: ["ja", "nein"] })],
    ["false", question({ type: "text" })],
  ])("erkennt %s als dokumentierten Inhalt", (value, q) => {
    expect(hasDocumentedAnswer(q, { [q.id]: value })).toBe(true);
  });

  it("unterscheidet leeres und gefülltes multi_select", () => {
    const q = question({ type: "multi_select", options: ["A", "B"] });
    expect(hasDocumentedAnswer(q, { [q.id]: "" })).toBe(false);
    expect(hasDocumentedAnswer(q, { [q.id]: "A" })).toBe(true);
  });

  it("ignoriert leere und erkennt gefüllte repeatable groups", () => {
    const q = question({
      type: "repeatable_group",
      groupSchema: [{ key: "note", label: "Notiz", type: "text", required: false }],
    });
    expect(hasDocumentedAnswer(q, { [q.id]: "[]" })).toBe(false);
    expect(hasDocumentedAnswer(q, { [q.id]: JSON.stringify([{}]) })).toBe(false);
    expect(hasDocumentedAnswer(q, { [q.id]: JSON.stringify([{ note: "Eintrag" }]) })).toBe(true);
  });

  it("ignoriert technisch leere Impfmatrix-Einträge", () => {
    const q = question({
      id: "VACCINATION_REVIEW_ITEMS",
      type: "repeatable_group",
      presentation: "vaccination_matrix",
    });
    expect(hasDocumentedAnswer(q, JSON.parse(JSON.stringify({
      VACCINATION_REVIEW_ITEMS: JSON.stringify([{ vaccination_id: "rsv" }]),
    })))).toBe(false);
    expect(hasDocumentedAnswer(q, {
      VACCINATION_REVIEW_ITEMS: JSON.stringify([{ vaccination_id: "rsv", documented_status: "Unklar" }]),
    })).toBe(true);
  });

  it.each([
    [{ schema_version: 1, entries: [] }, false],
    [{ schema_version: 1, entries: [{ vaccination_id: "influenza", status: "complete" }] }, true],
    [{ schema_version: 1, entries: [{ vaccination_id: "influenza", status: "open" }] }, true],
    [{ schema_version: 1, entries: [{ vaccination_id: "influenza", status: "planned" }] }, true],
    [{ schema_version: 1, entries: [{ vaccination_id: "hpv", doses: [{ number: 1, status: "done" }] }] }, true],
    [{ schema_version: 1, entries: [{ vaccination_id: "influenza", status: "open", note: "Abklärung" }] }, true],
    [{ schema_version: 1, entries: [{ vaccination_id: "hpv", doses: [{ number: 2, status: "planned", recommended_interval_value: 5, recommended_interval_unit: "months" }] }] }, true],
    [{ schema_version: 1, entries: [], supplemental_note: "Reiseimpfung prüfen" }, true],
  ])("wertet strukturierte Impfantworten korrekt als %s", (structured, expected) => {
    const q = question({ id: "VACCINATION_REVIEW_ITEMS", type: "repeatable_group", presentation: "vaccination_matrix" });
    expect(hasDocumentedAnswer(q, { VACCINATION_REVIEW_ITEMS: JSON.stringify(structured) })).toBe(expected);
  });

  it("prüft Blockinhalt optional gegen sichtbare Fragen", () => {
    const q = question({ id: "VISIBLE" });
    const frozen = block(q);
    expect(hasDocumentedBlockContent(frozen, { VISIBLE: "Text" }, new Set(["VISIBLE"]))).toBe(true);
    expect(hasDocumentedBlockContent(frozen, { VISIBLE: "Text" }, new Set())).toBe(false);
  });
});
