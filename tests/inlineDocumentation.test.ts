import { buildMedicalRecordNote } from "@/lib/questionnaire/buildMedicalRecordNote";
import type { FrozenBlock } from "@/lib/questionnaire/frozenBlocks";
import { resolveInlineDocumentation } from "@/lib/questionnaire/inlineDocumentation";

const genericBlock: FrozenBlock = {
  id: "ARBITRARY_BLOCK",
  label: "Beliebiger Block",
  displayOrder: 1,
  questions: [
    { id: "FIRST_VALUE", text: "Erster Wert", type: "number", required: false, unit: "u" },
    { id: "SECOND_VALUE", text: "Zweiter Wert", type: "number", required: false, unit: "u" },
    { id: "SINGLE_VALUE", text: "Einzelwert", type: "text", required: false },
  ],
  conditionalRules: [],
  initiallyVisible: true,
  outputSemantics: "documented-content-v1",
  documentationPresentation: {
    layout: "inline",
    separator: " – ",
    items: [
      { questionIds: ["FIRST_VALUE", "SECOND_VALUE"], label: "Paar", labelSeparator: " ", valueSeparator: "/" },
      { questionIds: ["SINGLE_VALUE"], label: "Text" },
    ],
  },
};

describe("generische Inline-Dokumentation", () => {
  it("setzt beliebige Frozen-Fragen metadatengetrieben zusammen", () => {
    expect(resolveInlineDocumentation(genericBlock, {
      FIRST_VALUE: "12",
      SECOND_VALUE: "8",
      SINGLE_VALUE: "vorhanden",
    })).toBe("Paar 12/8 u – Text: vorhanden");
    expect(resolveInlineDocumentation(genericBlock, {
      FIRST_VALUE: "12",
      SINGLE_VALUE: "vorhanden",
    })).toBe("Text: vorhanden");
  });

  it("behält ohne Inline-Metadaten das bisherige Zeilenlayout", () => {
    const historicalBlock = { ...genericBlock, documentationPresentation: undefined };
    const note = buildMedicalRecordNote({
      answers: { FIRST_VALUE: "12", SINGLE_VALUE: "vorhanden" },
      selected_block_ids: [historicalBlock.id],
      frozenBlocks: [historicalBlock],
      internalWorkflowId: null,
    });

    expect(note).toContain("Erster Wert: 12 u");
    expect(note).toContain("Einzelwert: vorhanden");
    expect(note).not.toContain("Paar 12/8 u");
  });
});