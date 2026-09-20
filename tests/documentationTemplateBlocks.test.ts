import type { PracticeDocumentationBlockDefinition } from "@/lib/practice/documentationBlocks";
import {
  buildPracticeDocumentationBlockDefinition,
  parsePracticeDocumentationBlockDefinition,
  resolvePracticeDocumentationBlocks,
  validatePracticeDocumentationBlock,
} from "@/lib/practice/documentationBlocks";

describe("Dokumentationsbausteine der Praxisbibliothek", () => {
  it.each([
    ["text", "textarea"],
    ["selection", "select"],
    ["measurement", "number"],
    ["list", "multi_select"],
    ["hint", "confirmation"],
  ] as const)("bildet %s auf %s ab", (blockType, questionType) => {
    const validation = validatePracticeDocumentationBlock({
      title: "Baustein",
      blockType,
      text: "Dokumentation",
      unit: "mmHg",
      options: [
        { label: "Ja", documentationText: "Bestätigt" },
        { label: "Nein", documentationText: "Verneint" },
      ],
    });
    expect(validation.ok).toBe(true);
    if (!validation.ok) return;

    const definition = buildPracticeDocumentationBlockDefinition(validation.value);
    expect(definition.questions[0].type).toBe(questionType);
    if (blockType === "hint") expect(definition.questions[0].required).toBe(true);
  });

  it("bewahrt getrennte Bezeichnungs- und Ausgabetexte sowie stabile IDs beim Bearbeiten", () => {
    const initial = buildPracticeDocumentationBlockDefinition({
      title: "Auswahl",
      blockType: "selection",
      options: [
        { label: "Sichtbar A", documentationText: "Ausgabe A" },
        { label: "Sichtbar B", documentationText: "Ausgabe B" },
      ],
    });
    const options = initial.questions[0].options;
    expect(options?.[0]).toEqual(expect.objectContaining({ label: "Sichtbar A", documentationText: "Ausgabe A" }));

    const updated = buildPracticeDocumentationBlockDefinition({
      title: "Auswahl neu",
      blockType: "selection",
      options: (options ?? []).map((option) => typeof option === "string"
        ? { label: option, documentationText: option }
        : { value: option.value, label: `${option.label} neu`, documentationText: option.documentationText ?? option.label }),
    }, initial);
    expect(updated.block.id).toBe(initial.block.id);
    expect(updated.questions[0].id).toBe(initial.questions[0].id);
    expect(updated.questions[0].options?.map((option) => typeof option === "string" ? option : option.value))
      .toEqual(options?.map((option) => typeof option === "string" ? option : option.value));
  });

  it("akzeptiert genau eine Auswahloption mit statischem Ausgabetext", () => {
    const validation = validatePracticeDocumentationBlock({
      title: "Einzelauswahl",
      blockType: "selection",
      options: [{ label: "Reiseunfähig", documentationText: "Reiseunfähig" }],
    });

    expect(validation.ok).toBe(true);
    if (!validation.ok) return;
    expect(validation.value.options).toHaveLength(1);
  });

  it("akzeptiert genau eine Auswahloption mit strukturierter Komposition ohne documentationText", () => {
    const validation = validatePracticeDocumentationBlock({
      title: "Leistungseinschränkung",
      blockType: "selection",
      options: [{
        label: "Reiseunfähig",
        documentationText: "",
        documentationSegments: [
          { kind: "text", text: "Vom " },
          { kind: "answerRef", fieldId: "from" },
          { kind: "text", text: " bis " },
          { kind: "answerRef", fieldId: "to" },
          { kind: "text", text: " reiseunfähig." },
        ],
      }],
      additionalFields: [
        { id: "from", label: "Von", type: "date", showForOptionValues: ["Reiseunfähig"] },
        { id: "to", label: "Bis", type: "date", showForOptionValues: ["Reiseunfähig"] },
      ],
    });

    expect(validation.ok).toBe(true);
    if (!validation.ok) return;
    expect(validation.value.options?.[0].documentationText).toBe("");
    expect(validation.value.options?.[0].documentationSegments).toHaveLength(5);
  });

  it("lehnt eine Option ohne statischen oder strukturierten Ausgabetext ab", () => {
    const validation = validatePracticeDocumentationBlock({
      title: "Unvollständige Auswahl",
      blockType: "selection",
      options: [{ label: "Reiseunfähig", documentationText: "" }],
    });

    expect(validation).toEqual({
      ok: false,
      error: "Ausgabetext oder eine strukturierte Ausgabekomposition ist erforderlich.",
    });
  });

  it("akzeptiert mehrere Fragen in einer gespeicherten Definition und friert sie unabhängig ein", () => {
    const definition: PracticeDocumentationBlockDefinition = {
      schemaVersion: 1,
      visibleType: "measurement",
      block: {
        id: "practice_block_vitalwerte",
        label: "Vitalwerte",
        displayOrder: 0,
        questionIds: ["practice_question_gewicht", "practice_question_notiz"],
      },
      questions: [
        { id: "practice_question_gewicht", text: "Gewicht", type: "number", required: false, unit: "kg" },
        { id: "practice_question_notiz", text: "Zusatznotiz", type: "textarea", required: false },
      ],
    };
    expect(parsePracticeDocumentationBlockDefinition(definition).questions).toHaveLength(2);
    const frozen = resolvePracticeDocumentationBlocks([{ definition }], [
      { blockId: definition.block.id, section: 3, order: 0 },
    ]);
    definition.questions[0].text = "Verändert";

    expect(frozen[0]).toEqual(expect.objectContaining({ section: 3, order: 0 }));
    expect(frozen[0].questions.map(({ text }) => text)).toEqual(["Gewicht", "Zusatznotiz"]);
  });
});