import type { PracticeDocumentationBlockDefinition } from "@/lib/practice/documentationBlocks";
import {
  buildPracticeDocumentationBlockDefinition,
  parsePracticeDocumentationBlockDefinition,
  resolvePracticeDocumentationBlocks,
  validatePracticeDocumentationBlock,
} from "@/lib/practice/documentationBlocks";
import { evaluateCondition } from "@/lib/questionnaire/conditionalLogic";
import { buildOptionsByQuestionId } from "@/lib/questionnaire/multiSelect";

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

  it("speichert einen langen mehrzeiligen Absatz und lädt ihn vollständig wieder", () => {
    const content = `${"Ich bin damit einverstanden, dass meine Hausarztpraxis MVZ Kreuzberg, Skalitzer Str. 33, 10999 Berlin bei den nachfolgend genannten Ärztinnen und Ärzten, Facharztpraxen oder medizinischen Einrichtungen bereits vorhandene Befunde, Arztbriefe und sonstige für meine aktuelle hausärztliche Behandlung erforderliche medizinische Unterlagen anfordert."}\n\n${"Ich willige zugleich ein, dass die nachfolgend genannten Ärztinnen und Ärzte, Praxen oder Einrichtungen die hierfür erforderlichen medizinischen Unterlagen und Gesundheitsdaten an meine oben genannte Hausarztpraxis übermitteln dürfen."}`;
    expect(content.length).toBeGreaterThan(500);
    const validation = validatePracticeDocumentationBlock({
      title: "Einwilligung Befundanforderung – Einleitung",
      blockType: "paragraph",
      text: content,
    });
    expect(validation.ok).toBe(true);
    if (!validation.ok) return;
    const initial = buildPracticeDocumentationBlockDefinition(validation.value);
    expect(initial.questions[0]).toEqual(expect.objectContaining({
      type: "textarea",
      documentationItemType: "bodyText",
      documentationText: content,
    }));
    const reopened = parsePracticeDocumentationBlockDefinition(initial);
    expect(reopened.visibleType).toBe("paragraph");
    expect(reopened.questions[0]?.documentationText).toBe(content);
    expect(reopened.questions[0]?.documentationText).toContain("\n\n");
  });

  it("behält Text als echte Freitexteingabe mit Feldbezeichnungsvalidierung bei", () => {
    const validation = validatePracticeDocumentationBlock({
      title: "Konkrete Fragestellung / insbesondere",
      blockType: "text",
      text: "Konkrete Fragestellung / insbesondere",
    });
    expect(validation.ok).toBe(true);
    if (!validation.ok) return;
    expect(buildPracticeDocumentationBlockDefinition(validation.value).questions[0]).toEqual(expect.objectContaining({ type: "textarea", documentationItemType: "freeText" }));
    expect(validatePracticeDocumentationBlock({ title: "Text", blockType: "text", text: "Zeile 1\nZeile 2" }).ok).toBe(false);
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

  it("baut eine abhängige Select-Zusatzfrage und zwei bedingte Ausgabezweige auf", () => {
    const validation = validatePracticeDocumentationBlock({
      title: "Leistungseinschränkung / Befreiung",
      blockType: "selection",
      options: [{
        value: "travel_unfit",
        label: "Reiseunfähig",
        documentationText: "",
        documentationSegments: [
          { kind: "text", text: "Vom " },
          { kind: "answerRef", fieldId: "from" },
          { kind: "conditional", fieldId: "end", optionValue: "date", segments: [
            { kind: "text", text: " bis " },
            { kind: "answerRef", fieldId: "to" },
          ] },
          { kind: "conditional", fieldId: "end", optionValue: "open", segments: [
            { kind: "text", text: " bis auf Weiteres" },
          ] },
          { kind: "text", text: " reiseunfähig." },
        ],
      }],
      additionalFields: [
        { id: "from", label: "Von", type: "date", required: true, showForOptionValues: ["travel_unfit"] },
        { id: "end", label: "Ende", type: "select", options: [{ value: "date", label: "Bis Datum" }, { value: "open", label: "Bis auf Weiteres" }], required: true, showForOptionValues: ["travel_unfit"] },
        { id: "to", label: "Bis", type: "date", required: true, showForFieldId: "end", showForOptionValues: ["date"] },
      ],
    });

    expect(validation.ok).toBe(true);
    if (!validation.ok) return;
    const definition = buildPracticeDocumentationBlockDefinition(validation.value);
    expect(definition.questions.map((question) => question.type)).toEqual(["select", "date", "select", "date"]);
    expect(definition.block.conditionalRules).toEqual(expect.arrayContaining([
      expect.objectContaining({ targetId: definition.questions[3].id, condition: expect.objectContaining({ target: expect.objectContaining({ questionId: definition.questions[2].id }), value: "date" }) }),
    ]));
    const option = definition.questions[0].options?.[0];
    expect(typeof option).toBe("object");
    if (!option || typeof option === "string") return;
    expect(option.documentationSegments).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "conditional", questionId: definition.questions[2].id, optionValue: "date" }),
      expect.objectContaining({ kind: "conditional", questionId: definition.questions[2].id, optionValue: "open" }),
    ]));
  });

  it("löst eine Zusatzangabe innerhalb einer bedingten Variante auf", () => {
    const validation = validatePracticeDocumentationBlock({
      title: "Reise(un)fähigkeit",
      blockType: "selection",
      options: [{
        value: "travel_unfit",
        label: "Reiseunfähig",
        documentationText: "",
        documentationSegments: [
          { kind: "text", text: "Aufgrund ihrer/seiner Erkrankung ist der o. g. Patient / die o. g. Patientin aus ärztlicher Sicht vom " },
          { kind: "answerRef", fieldId: "start" },
          { kind: "conditional", fieldId: "endMode", optionValue: "date", segments: [
            { kind: "text", text: " bis voraussichtlich zum " },
            { kind: "answerRef", fieldId: "end" },
            { kind: "text", text: " reiseunfähig." },
          ] },
          { kind: "conditional", fieldId: "endMode", optionValue: "open", segments: [{ kind: "text", text: " bis auf Weiteres reiseunfähig." }] },
        ],
      }],
      additionalFields: [
        { id: "start", label: "Startdatum", type: "date", required: true, showForOptionValues: ["travel_unfit"] },
        { id: "endMode", label: "Ende", type: "select", options: [{ value: "date", label: "bis Datum" }, { value: "open", label: "bis auf Weiteres" }], required: true, showForOptionValues: ["travel_unfit"] },
        { id: "end", label: "Enddatum", type: "date", required: true, showForFieldId: "endMode", showForOptionValues: ["date"] },
      ],
    });
    expect(validation.ok).toBe(true);
    if (!validation.ok) return;
    const definition = buildPracticeDocumentationBlockDefinition(validation.value);
    const option = definition.questions[0].options?.[0];
    expect(typeof option).toBe("object");
    if (!option || typeof option === "string") return;
    expect(option.documentationSegments).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "conditional", optionValue: "date", segments: expect.arrayContaining([
        expect.objectContaining({ kind: "answerRef", questionId: definition.questions[3].id }),
      ]) }),
    ]));
  });

  it("verwendet contains für Multi-Choice-Quellen und equals für normale Auswahl", () => {
    const multiValidation = validatePracticeDocumentationBlock({
      title: "Mitgegeben",
      blockType: "list",
      options: [
        { value: "plan", label: "Medikamentenplan", documentationText: "Medikamentenplan wurde mitgegeben." },
        { value: "referral", label: "Überweisung", documentationText: "Überweisung wurde mitgegeben." },
      ],
      additionalFields: [{ id: "note", label: "Hinweis", type: "text", showForOptionValues: ["plan"] }],
    });
    expect(multiValidation.ok).toBe(true);
    if (!multiValidation.ok) return;
    const multiDefinition = buildPracticeDocumentationBlockDefinition(multiValidation.value);
    const multiRule = multiDefinition.block.conditionalRules?.[0];
    const planValue = (multiDefinition.questions[0].options?.[0] as { value: string }).value;
    const referralValue = (multiDefinition.questions[0].options?.[1] as { value: string }).value;
    expect(multiRule).toMatchObject({ condition: { operator: "contains", value: planValue } });
    expect(evaluateCondition(multiRule!.condition, { [multiDefinition.questions[0].id]: planValue }, undefined, buildOptionsByQuestionId(multiDefinition.questions))).toBe(true);
    expect(evaluateCondition(multiRule!.condition, { [multiDefinition.questions[0].id]: `${planValue}, ${referralValue}` }, undefined, buildOptionsByQuestionId(multiDefinition.questions))).toBe(true);
    expect(evaluateCondition(multiRule!.condition, { [multiDefinition.questions[0].id]: referralValue }, undefined, buildOptionsByQuestionId(multiDefinition.questions))).toBe(false);
    const frozen = resolvePracticeDocumentationBlocks([{ definition: multiDefinition }]);
    expect(frozen[0]).toEqual(expect.objectContaining({
      conditionalRules: [expect.objectContaining({ condition: expect.objectContaining({ operator: "contains", value: planValue }) })],
    }));
    expect(frozen[0]?.questions[0]?.options?.[0]).toMatchObject({ documentationText: "Medikamentenplan wurde mitgegeben." });

    const selectValidation = validatePracticeDocumentationBlock({
      title: "Status",
      blockType: "selection",
      options: [
        { value: "yes", label: "Ja", documentationText: "Ja." },
        { value: "no", label: "Nein", documentationText: "Nein." },
      ],
      additionalFields: [{ id: "note", label: "Hinweis", type: "text", showForOptionValues: ["yes"] }],
    });
    expect(selectValidation.ok).toBe(true);
    if (!selectValidation.ok) return;
    const selectDefinition = buildPracticeDocumentationBlockDefinition(selectValidation.value);
    const yesValue = (selectDefinition.questions[0].options?.[0] as { value: string }).value;
    expect(selectDefinition.block.conditionalRules?.[0]).toMatchObject({
      condition: { operator: "equals", value: yesValue },
    });
  });

  it("speichert gemeinsamen Multi-Select-Ausgabetext getrennt von den Optionsausgaben", () => {
    const validation = validatePracticeDocumentationBlock({
      title: "Anforderung Facharzt",
      blockType: "list",
      sharedDocumentationText: "Wir bitten um Übermittlung folgender Unterlagen bzw. Informationen:",
      options: [
        { value: "befund", label: "Befund / Epikrise", documentationText: "Befund / Epikrise" },
        { value: "medikation", label: "Medikationsplan", documentationText: "Medikationsplan" },
        { value: "therapie", label: "Therapieempfehlung", documentationText: "Therapieempfehlung" },
      ],
    });
    expect(validation.ok).toBe(true);
    if (!validation.ok) return;
    const definition = buildPracticeDocumentationBlockDefinition(validation.value);
    expect(definition.questions[0].sharedDocumentationText).toBe("Wir bitten um Übermittlung folgender Unterlagen bzw. Informationen:");
  });

  it("baut einen generischen Repeatable-Baustein mit instanzlokalen Regeln und unbegrenztem neuen Limit", () => {
    const validation = validatePracticeDocumentationBlock({
      title: "Kontaktverlauf",
      blockType: "repeatable",
      additionalFields: [
        { id: "zeit", label: "Zeit", type: "time", required: true },
        { id: "art", label: "Art", type: "select", options: [{ value: "telefon", label: "Telefon" }, { value: "mail", label: "E-Mail" }], required: true },
        { id: "themen", label: "Themen", type: "multi_select", options: [{ value: "a", label: "A" }, { value: "b", label: "B" }], documentationSegments: [{ kind: "text", text: "Themen: " }, { kind: "answerRef", fieldId: "themen" }] },
        { id: "notiz", label: "Notiz", type: "textarea", showForFieldId: "art", showForOptionValues: ["telefon"], documentationText: "Telefonischer Kontakt." },
      ],
    });
    expect(validation.ok).toBe(true);
    if (!validation.ok) return;
    const definition = buildPracticeDocumentationBlockDefinition(validation.value);
    expect(definition.questions).toHaveLength(1);
    expect(definition.questions[0]).toEqual(expect.objectContaining({ type: "repeatable_group", maxEntries: undefined }));
    expect(definition.questions[0].groupSchema?.map((field) => field.type)).toEqual(["time", "select", "multi_select", "textarea"]);
    expect(definition.questions[0].groupSchema?.[3]).toEqual(expect.objectContaining({ conditionalOn: "art", conditionalValue: "telefon", documentationText: "Telefonischer Kontakt." }));
  });

  it("validiert instanzlokale Uhrzeit und Auswahlwerte", () => {
    const definition = buildPracticeDocumentationBlockDefinition({
      title: "Termin",
      blockType: "repeatable",
      additionalFields: [
        { id: "zeit", label: "Zeit", type: "time", required: true },
        { id: "art", label: "Art", type: "select", options: [{ value: "vorort", label: "Vor Ort" }] },
      ],
    });
    const frozen = resolvePracticeDocumentationBlocks([{ definition }]);
    const { validateFrozenAnswers } = require("@/lib/questionnaire/validateFrozenAnswers") as typeof import("@/lib/questionnaire/validateFrozenAnswers");
    expect(validateFrozenAnswers({ [definition.questions[0].id]: JSON.stringify([{ zeit: "23:59", art: "vorort" }]) }, frozen).ok).toBe(true);
    expect(validateFrozenAnswers({ [definition.questions[0].id]: JSON.stringify([{ zeit: "24:00", art: "vorort" }]) }, frozen).ok).toBe(false);
    expect(validateFrozenAnswers({ [definition.questions[0].id]: JSON.stringify([{ zeit: "12:00", art: "falsch" }]) }, frozen).ok).toBe(false);
  });

  it.each([
    ["unbekannte Quellfrage", { id: "to", label: "Bis", type: "date", showForFieldId: "missing", showForOptionValues: ["date"] }],
    ["Vorwärtsreferenz", { id: "from", label: "Von", type: "date", showForFieldId: "end", showForOptionValues: ["date"] }],
  ])("lehnt %s bei Zusatzangaben ab", (_label, field) => {
    const validation = validatePracticeDocumentationBlock({
      title: "Ungültige Abhängigkeit",
      blockType: "selection",
      options: [{ label: "Reiseunfähig", documentationText: "Reiseunfähig" }],
      additionalFields: [
        field,
        { id: "end", label: "Ende", type: "select", options: [{ value: "date", label: "Bis Datum" }], showForOptionValues: ["Reiseunfähig"] },
      ],
    });
    expect(validation.ok).toBe(false);
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