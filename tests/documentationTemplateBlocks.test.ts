import { PDFDocument } from "pdf-lib";
import { inflateSync } from "node:zlib";
import type { PracticeDocumentationBlockDefinition } from "@/lib/practice/documentationBlocks";
import {
  buildPracticeDocumentationBlockDefinition,
  parsePracticeDocumentationBlockDefinition,
  resolvePracticeDocumentationBlocks,
  validatePracticeDocumentationBlock,
} from "@/lib/practice/documentationBlocks";
import { buildStructuredAppXml } from "@/lib/questionnaire/appTextXml";
import { buildSemanticMedicalRecordDocument } from "@/lib/questionnaire/buildMedicalRecordNote";
import { buildQuestionnairePdfBytes } from "@/lib/questionnaire/pdfRenderer";
import { evaluateCondition } from "@/lib/questionnaire/conditionalLogic";
import { buildOptionsByQuestionId } from "@/lib/questionnaire/multiSelect";
import { validateFrozenAnswers } from "@/lib/questionnaire/validateFrozenAnswers";

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  await PDFDocument.load(bytes);
  const raw = Buffer.from(bytes).toString("latin1");
  const streams: string[] = [];
  for (const match of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    try {
      streams.push(inflateSync(Buffer.from(match[1]!, "latin1")).toString("latin1"));
    } catch {
      streams.push(match[1]!);
    }
  }
  return streams
    .join(" ")
    .replace(/<([0-9A-F]+)>\s+Tj/g, (_, hex: string) =>
      Buffer.from(hex, "hex").toString("latin1"),
    );
}

describe("Dokumentationsbausteine der Praxisbibliothek", () => {
  it.each([
    ["text", "textarea"],
    ["selection", "select"],
    ["measurement", "number"],
    ["month", "month"],
    ["list", "multi_select"],
    ["hint", "textarea"],
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
    if (blockType === "text") {
      expect(definition.questions[0]).toEqual(expect.objectContaining({
        documentationItemType: "bodyText",
        omitDocumentationLabel: true,
        documentationSegments: [{ kind: "answerRef", questionId: definition.questions[0].id }],
      }));
    }
    if (blockType === "hint") {
      expect(definition.questions[0]).toEqual(expect.objectContaining({
        required: false,
        documentationItemType: "freeText",
        omitDocumentationLabel: true,
        documentationSegments: [{ kind: "answerRef", questionId: definition.questions[0].id }],
      }));
    }
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

  it("hält den Bibliothekstitel standardmäßig als unsichtbare semantische Blockgrenze", () => {
    const definition = buildPracticeDocumentationBlockDefinition({
      title: "Interner Bibliothekstitel",
      blockType: "paragraph",
      text: "Der medizinische Inhalt bleibt sichtbar.",
    });
    const frozenBlocks = resolvePracticeDocumentationBlocks([{ definition }]);
    const document = buildSemanticMedicalRecordDocument({
      answers: {},
      selected_block_ids: [definition.block.id],
      frozenBlocks,
      internalWorkflowId: null,
    });
    const items = document.sections.flatMap((section) => section.items);

    expect(items).toEqual([
      expect.objectContaining({
        type: "heading",
        text: "Interner Bibliothekstitel",
        headingVisibility: "spacingOnly",
      }),
      expect.objectContaining({
        type: "bodyText",
        text: "Der medizinische Inhalt bleibt sichtbar.",
      }),
    ]);
    expect(buildStructuredAppXml(document)).toContain(
      '<item type="heading" level="1" visibility="spacingOnly">Interner Bibliothekstitel</item>',
    );
  });

  it("erhält eine ausdrücklich sichtbare Praxisblock-Überschrift", () => {
    const definition = buildPracticeDocumentationBlockDefinition({
      title: "Gewünschte Überschrift",
      blockType: "paragraph",
      text: "Dokumentierter Inhalt.",
    });
    definition.block.structuredHeadingVisibility = "visible";
    const frozenBlocks = resolvePracticeDocumentationBlocks([{ definition }]);
    const document = buildSemanticMedicalRecordDocument({
      answers: {},
      selected_block_ids: [definition.block.id],
      frozenBlocks,
      internalWorkflowId: null,
    });
    const heading = document.sections.flatMap((section) => section.items)
      .find((item) => item.type === "heading");

    expect(heading).toEqual(expect.objectContaining({
      text: "Gewünschte Überschrift",
      headingVisibility: "visible",
    }));
    expect(buildStructuredAppXml(document)).toContain(
      '<item type="heading" level="1">Gewünschte Überschrift</item>',
    );
  });

  it("hält aufeinanderfolgende Absatzinhalte vollständig und ihre technischen Titel unsichtbar", () => {
    const contents = [
      "Erster medizinischer Absatz.",
      "Zweiter medizinischer Absatz.",
      "Dritter medizinischer Absatz.",
    ];
    const definitions = contents.map((text, index) => buildPracticeDocumentationBlockDefinition({
      title: `Technischer Baustein ${index + 1}`,
      blockType: "paragraph",
      text,
    }));
    const frozenBlocks = resolvePracticeDocumentationBlocks(
      definitions.map((definition) => ({ definition })),
    );
    const document = buildSemanticMedicalRecordDocument({
      answers: {},
      selected_block_ids: definitions.map((definition) => definition.block.id),
      frozenBlocks,
      internalWorkflowId: null,
    });
    const items = document.sections.flatMap((section) => section.items);
    const headings = items.filter((item) => item.type === "heading");
    const bodyTexts = items.filter((item) => item.type === "bodyText");
    const xml = buildStructuredAppXml(document);

    expect(headings).toHaveLength(3);
    expect(headings.every((item) => item.headingVisibility === "spacingOnly")).toBe(true);
    expect(bodyTexts.map((item) => item.text)).toEqual(contents);
    expect(xml.match(/visibility="spacingOnly"/g)).toHaveLength(3);
    for (const content of contents) expect(xml).toContain(content);
  });

  it("gibt normalen Freitext ohne Label als bodyText aus und lässt leere Eingaben weg", () => {
    const definition = buildPracticeDocumentationBlockDefinition({
      title: "Ergänzung",
      blockType: "text",
      text: "Welche Ergänzung soll dokumentiert werden?",
    });
    const question = definition.questions[0];
    const frozenBlocks = resolvePracticeDocumentationBlocks([{ definition }]);
    const populated = buildSemanticMedicalRecordDocument({
      answers: { [question.id]: "Kontrolle in vier Wochen." },
      selected_block_ids: [definition.block.id],
      frozenBlocks,
      internalWorkflowId: null,
    });
    const populatedItems = populated.sections.flatMap((section) => section.items);
    expect(populatedItems).toContainEqual(expect.objectContaining({
      type: "bodyText",
      text: "Kontrolle in vier Wochen.",
    }));
    expect(buildStructuredAppXml(populated)).not.toContain("Welche Ergänzung");

    const empty = buildSemanticMedicalRecordDocument({
      answers: { [question.id]: "" },
      selected_block_ids: [definition.block.id],
      frozenBlocks,
      internalWorkflowId: null,
    });
    expect(empty.sections.flatMap((section) => section.items)).toHaveLength(0);
  });

  it("gibt Hinweise labelfrei als freeText für den bestehenden Word-Präfix aus", () => {
    const definition = buildPracticeDocumentationBlockDefinition({
      title: "Zusatzhinweis",
      blockType: "hint",
      text: "Welcher Hinweis soll ergänzt werden?",
    });
    const question = definition.questions[0];
    const document = buildSemanticMedicalRecordDocument({
      answers: { [question.id]: "Befund bitte zeitnah übermitteln." },
      selected_block_ids: [definition.block.id],
      frozenBlocks: resolvePracticeDocumentationBlocks([{ definition }]),
      internalWorkflowId: null,
    });
    const xml = buildStructuredAppXml(document);
    expect(xml).toContain('<item type="freeText">Befund bitte zeitnah übermitteln.</item>');
    expect(xml).not.toContain("Welcher Hinweis");
    expect(xml).not.toContain("Hinweis: Hinweis:");
  });

  it("behält Text als labelfreie Fließtexteingabe mit Feldbezeichnungsvalidierung bei", () => {
    const validation = validatePracticeDocumentationBlock({
      title: "Konkrete Fragestellung / insbesondere",
      blockType: "text",
      text: "Konkrete Fragestellung / insbesondere",
    });
    expect(validation.ok).toBe(true);
    if (!validation.ok) return;
    expect(buildPracticeDocumentationBlockDefinition(validation.value).questions[0]).toEqual(expect.objectContaining({
      type: "textarea",
      documentationItemType: "bodyText",
      omitDocumentationLabel: true,
    }));
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

  it("wertet bedingte Pflichtfelder im Frozen- und Submit-Pfad aus", () => {
    const validation = validatePracticeDocumentationBlock({
      title: "Reise(un)fähigkeit",
      blockType: "selection",
      options: [
        { value: "travel_unfit", label: "Reiseunfähig", documentationText: "Reiseunfähig" },
        { value: "fit", label: "Reisefähig", documentationText: "Reisefähig" },
      ],
      additionalFields: [
        { id: "endMode", label: "Ende", type: "select", options: [{ value: "date", label: "Bis Datum" }, { value: "open", label: "Bis auf Weiteres" }], required: true, showForOptionValues: ["travel_unfit"] },
        { id: "end", label: "Enddatum", type: "date", required: true, showForFieldId: "endMode", showForOptionValues: ["date"] },
      ],
    });
    expect(validation.ok).toBe(true);
    if (!validation.ok) return;

    const definition = buildPracticeDocumentationBlockDefinition(validation.value);
    const frozen = resolvePracticeDocumentationBlocks([{ definition }]);
    const primaryId = definition.questions[0].id;
    const endModeId = definition.questions[1].id;
    const endId = definition.questions[2].id;
    const travelUnfitValue = (definition.questions[0].options?.[0] as { value: string }).value;

    expect(frozen[0].conditionalRules).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: "showQuestion", targetId: endId }),
    ]));
    expect(validateFrozenAnswers({ [primaryId]: travelUnfitValue, [endModeId]: "open" }, frozen)).toMatchObject({ ok: true });
    expect(validateFrozenAnswers({ [primaryId]: travelUnfitValue, [endModeId]: "date" }, frozen)).toMatchObject({ ok: false, invalidQuestionIds: [endId] });
  });

  it("blendet eine körperlich bedingte Zusatzfrage bei psychischer Auswahl aus", () => {
    const validation = validatePracticeDocumentationBlock({
      title: "Ärztliche Stellungnahme",
      blockType: "selection",
      options: [
        { value: "physical", label: "Körperlich", documentationText: "Körperlich" },
        { value: "psychological", label: "Psychisch", documentationText: "Psychisch" },
      ],
      additionalFields: [
        { id: "limitations", label: "Konkrete nicht mögliche Belastungen", type: "textarea", required: true, showForOptionValues: ["physical"] },
      ],
    });
    expect(validation.ok).toBe(true);
    if (!validation.ok) return;

    const definition = buildPracticeDocumentationBlockDefinition(validation.value);
    const frozen = resolvePracticeDocumentationBlocks([{ definition }]);
    const primaryId = definition.questions[0].id;
    const limitationsId = definition.questions[1].id;
    const psychologicalValue = (definition.questions[0].options?.[1] as { value: string }).value;
    const physicalValue = (definition.questions[0].options?.[0] as { value: string }).value;

    expect(validateFrozenAnswers({ [primaryId]: psychologicalValue }, frozen)).toMatchObject({ ok: true });
    expect(validateFrozenAnswers({ [primaryId]: physicalValue }, frozen)).toMatchObject({ ok: false, invalidQuestionIds: [limitationsId] });
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

    const question = definition.questions[0];
    const optionValues = question.options?.map((option) => typeof option === "string" ? option : option.value) ?? [];
    const document = buildSemanticMedicalRecordDocument({
      answers: { [question.id]: optionValues.slice(0, 2).join(", ") },
      selected_block_ids: [definition.block.id],
      frozenBlocks: resolvePracticeDocumentationBlocks([{ definition }]),
      internalWorkflowId: null,
    });
    const contentItems = document.sections.flatMap((section) => section.items)
      .filter((item) => item.type !== "heading");
    expect(contentItems).toEqual([
      expect.objectContaining({ type: "bodyText", text: "Wir bitten um Übermittlung folgender Unterlagen bzw. Informationen:" }),
      expect.objectContaining({ type: "listItem", text: "Befund / Epikrise" }),
      expect.objectContaining({ type: "listItem", text: "Medikationsplan" }),
    ]);
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

  it("wandelt label-only Repeatable-Ausgabetexte in feldwertauflösende Segmente um", () => {
    const definition = buildPracticeDocumentationBlockDefinition({
      title: "Facharztkontakte",
      blockType: "repeatable",
      additionalFields: [
        { id: "fachrichtung", label: "Fachrichtung", type: "text", documentationText: "Fachrichtung:" },
        { id: "name", label: "Name", type: "text", documentationText: "Name" },
        { id: "notiz", label: "Notiz", type: "textarea", documentationText: "Individuelle fachliche Notiz." },
      ],
    });
    const fields = definition.questions[0]?.groupSchema ?? [];

    expect(fields[0]).toEqual(expect.objectContaining({
      documentationText: undefined,
      documentationSegments: [
        { kind: "text", text: "Fachrichtung: " },
        { kind: "fieldRef", fieldKey: fields[0]?.key },
      ],
    }));
    expect(fields[1]).toEqual(expect.objectContaining({
      documentationText: undefined,
      documentationSegments: [
        { kind: "text", text: "Name: " },
        { kind: "fieldRef", fieldKey: fields[1]?.key },
      ],
    }));
    expect(fields[2]).toEqual(expect.objectContaining({ documentationText: "Individuelle fachliche Notiz." }));
    expect(fields[2]?.documentationSegments).toBeUndefined();
  });

  it("gruppiert wiederholte Detailangaben kompakt ohne technische Eintragsnummern", () => {
    const definition = buildPracticeDocumentationBlockDefinition({
      title: "Facharzt/Praxis",
      blockType: "repeatable",
      additionalFields: [
        { id: "fachrichtung", label: "Fachrichtung", type: "text" },
        { id: "praxis", label: "Praxis", type: "text" },
      ],
    });
    const question = definition.questions[0];
    const document = buildSemanticMedicalRecordDocument({
      answers: { [question.id]: JSON.stringify([
        { fachrichtung: "Orthopädie", praxis: "Praxis A" },
        { fachrichtung: "Kardiologie", praxis: "Praxis B" },
      ]) },
      selected_block_ids: [definition.block.id],
      frozenBlocks: resolvePracticeDocumentationBlocks([{ definition }]),
      internalWorkflowId: null,
    });
    const detailItems = document.sections.flatMap((section) => section.items)
      .filter((item) => item.type === "listItem");
    expect(detailItems).toEqual([
      expect.objectContaining({ text: "Fachrichtung: Orthopädie\nPraxis: Praxis A" }),
      expect.objectContaining({ text: "Fachrichtung: Kardiologie\nPraxis: Praxis B" }),
    ]);
    expect(buildStructuredAppXml(document)).not.toMatch(/\d+\. Eintrag/);
  });

  it("gibt den Einschränkungstext des Sport-/Schwimmblocks genau einmal aus", async () => {
    const validation = validatePracticeDocumentationBlock({
      title: "Teilnahme – Einschränkungen",
      blockType: "text",
      text: "Einschränkungen der Teilnahme",
      documentationSegments: [
        { kind: "answerRef", fieldId: "__primary" },
        { kind: "text", text: "." },
      ],
    });
    expect(validation.ok).toBe(true);
    if (!validation.ok) return;

    const definition = buildPracticeDocumentationBlockDefinition(validation.value);
    const frozenBlocks = resolvePracticeDocumentationBlocks([{ definition }]);
    const question = definition.questions[0]!;
    const answer = "Synthetische Einschränkung: Belastung nur nach ärztlicher Rücksprache";
    const answers = { [question.id]: answer };
    const document = buildSemanticMedicalRecordDocument({
      answers,
      selected_block_ids: [definition.block.id],
      frozenBlocks,
      internalWorkflowId: null,
    });
    const semanticText = document.sections.flatMap((section) => section.items).map((item) => item.text).join("\n");
    const xml = buildStructuredAppXml(document);
    const pdf = await buildQuestionnairePdfBytes({
      patient_reference: null,
      submitted_at: new Date("2026-09-23T10:00:00.000Z"),
      submitted_by: "audit",
      selected_block_ids: [definition.block.id],
      deduplicated_questions: [question],
      answers,
      source: "audit",
      session_kind: "internal_documentation",
      internal_workflow_id: null,
      practice_form: null,
      frozen_blocks: frozenBlocks,
    }, {
      title: "Audit",
      referenceLabel: "Referenz",
      blockCatalog: {},
    });
    const pdfText = await extractPdfText(pdf.bytes);

    expect(semanticText).toContain("Teilnahme – Einschränkungen");
    expect(semanticText).toContain(`${answer}.`);
    expect(semanticText.match(/Einschränkungen/g)).toHaveLength(1);
    expect(semanticText).not.toContain("Hinweis: Einschränkungen:");
    expect(xml).toContain("Teilnahme – Einschränkungen");
    expect(xml).toContain(`${answer}.`);
    expect(xml).not.toContain("Hinweis: Einschränkungen:");
    expect(pdfText).toContain("Teilnahme");
    expect(pdfText).toContain("Einschränkungen");
    expect(pdfText).toContain("Belastung nur nach ärztlicher Rücksprache");
    expect(pdfText).not.toContain("Hinweis: Einschränkungen:");
  });

  it("führt Repeatable-Text, Auswahl, Datum und Monat durch SemanticDocument, XML v2 und PDF", async () => {
    const definition = buildPracticeDocumentationBlockDefinition({
      title: "Roundtrip-Prüfung",
      blockType: "repeatable",
      additionalFields: [
        { id: "text", label: "Text", type: "text", documentationText: "Text:" },
        { id: "status", label: "Status", type: "select", options: [{ value: "open", label: "Offen" }], documentationText: "Status:" },
        { id: "topics", label: "Themen", type: "multi_select", options: [{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }], documentationText: "Themen:" },
        { id: "date", label: "Datum", type: "date", documentationText: "Datum:" },
        { id: "month", label: "Monat", type: "month", documentationText: "Monat:" },
      ],
    });
    const frozenBlocks = resolvePracticeDocumentationBlocks([{ definition }]);
    const question = definition.questions[0]!;
    const answers = {
      [question.id]: JSON.stringify([
        { text: "AUDIT_A_TEXT", status: "open", topics: "a, b", date: "2026-09-23", month: "2026-09" },
        { text: "AUDIT_B_TEXT", status: "open", topics: "b", date: "2026-09-24", month: "2026-10" },
      ]),
    };
    const document = buildSemanticMedicalRecordDocument({
      answers,
      selected_block_ids: [definition.block.id],
      frozenBlocks,
      internalWorkflowId: null,
    });
    const semanticText = document.sections.flatMap((section) => section.items).map((item) => item.text).join("\n");
    const xml = buildStructuredAppXml(document);
    const pdf = await buildQuestionnairePdfBytes({
      patient_reference: null,
      submitted_at: new Date("2026-09-23T10:00:00.000Z"),
      submitted_by: "audit",
      selected_block_ids: [definition.block.id],
      deduplicated_questions: [question],
      answers,
      source: "audit",
      session_kind: "internal_documentation",
      internal_workflow_id: null,
      practice_form: null,
      frozen_blocks: frozenBlocks,
    }, {
      title: "Audit",
      referenceLabel: "Referenz",
      blockCatalog: {},
    });
    const pdfText = await extractPdfText(pdf.bytes);
    const expected = [
      "AUDIT_A_TEXT", "Offen", "Alpha, Beta", "23.09.2026", "09/2026",
      "AUDIT_B_TEXT", "Beta", "24.09.2026", "10/2026",
    ];

    for (const value of expected) {
      expect(semanticText).toContain(value);
      expect(xml).toContain(value);
      expect(pdfText).toContain(value);
    }
    expect(semanticText.match(/AUDIT_[AB]_TEXT/g)).toEqual(["AUDIT_A_TEXT", "AUDIT_B_TEXT"]);
    expect(semanticText).not.toContain("Status: open");
    expect(semanticText).not.toContain("Themen: a");
    expect(xml.match(/Status: Offen/g)).toHaveLength(2);
    expect(xml.match(/Datum: \d{2}\.\d{2}\.2026/g)).toHaveLength(2);
    expect(xml.match(/Monat: \d{2}\/2026/g)).toHaveLength(2);
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

  it("validiert Monatswerte strikt für Haupt- und Wiederholungsfelder", () => {
    const monthDefinition = buildPracticeDocumentationBlockDefinition({
      title: "Behandlungsbeginn",
      blockType: "month",
      required: false,
    });
    const monthFrozen = resolvePracticeDocumentationBlocks([{ definition: monthDefinition }]);
    const { validateFrozenAnswers } = require("@/lib/questionnaire/validateFrozenAnswers") as typeof import("@/lib/questionnaire/validateFrozenAnswers");

    for (const value of ["2024-03", ""]) {
      expect(validateFrozenAnswers({ [monthDefinition.questions[0].id]: value }, monthFrozen).ok).toBe(true);
    }
    for (const value of ["2024-00", "2024-13", "03/2024", "2024-03-01", "24-03", "2024-3", "2024-03x"]) {
      expect(validateFrozenAnswers({ [monthDefinition.questions[0].id]: value }, monthFrozen).ok).toBe(false);
    }
    const requiredDefinition = buildPracticeDocumentationBlockDefinition({
      title: "Pflichtbeginn",
      blockType: "month",
      required: true,
    });
    const requiredFrozen = resolvePracticeDocumentationBlocks([{ definition: requiredDefinition }]);
    expect(validateFrozenAnswers({ [requiredDefinition.questions[0].id]: "" }, requiredFrozen).ok).toBe(false);
    expect(validateFrozenAnswers({ [requiredDefinition.questions[0].id]: "2024-03" }, requiredFrozen).ok).toBe(true);

    const repeatableDefinition = buildPracticeDocumentationBlockDefinition({
      title: "Verläufe",
      blockType: "repeatable",
      additionalFields: [{ id: "beginn", label: "Beginn", type: "month", required: true }],
    });
    const repeatableFrozen = resolvePracticeDocumentationBlocks([{ definition: repeatableDefinition }]);
    const repeatableId = repeatableDefinition.questions[0].id;
    expect(validateFrozenAnswers({ [repeatableId]: JSON.stringify([{ beginn: "2024-03" }]) }, repeatableFrozen).ok).toBe(true);
    expect(validateFrozenAnswers({ [repeatableId]: JSON.stringify([{ beginn: "2024-13" }]) }, repeatableFrozen).ok).toBe(false);
    expect(validateFrozenAnswers({ [repeatableId]: "" }, repeatableFrozen).ok).toBe(true);
  });

  it("friert einen neuen Month-Fragetyp ein und liest alte Definitionen weiter", () => {
    const definition = buildPracticeDocumentationBlockDefinition({
      title: "Behandlungsbeginn",
      blockType: "month",
    });
    const frozen = resolvePracticeDocumentationBlocks([{ definition }]);
    expect(frozen[0]?.questions[0]?.type).toBe("month");

    const legacy = parsePracticeDocumentationBlockDefinition({
      schemaVersion: 1,
      visibleType: "text",
      block: { id: "practice_block_legacy", label: "Legacy", displayOrder: 0, questionIds: ["practice_question_legacy"] },
      questions: [{ id: "practice_question_legacy", text: "Legacy", type: "textarea", required: false }],
    });
    expect(legacy.questions[0]?.type).toBe("textarea");
  });

  it("speichert frageeigene Segmente auch für eigenständige Textbausteine", () => {
    const validation = validatePracticeDocumentationBlock({
      title: "Behandlungshinweis",
      blockType: "text",
      text: "Hinweis",
      documentationSegments: [
        { kind: "text", text: "Dokumentiert: " },
        { kind: "answerRef", fieldId: "monat" },
      ],
      additionalFields: [{ id: "monat", label: "Monat", type: "month" }],
    });
    expect(validation.ok).toBe(true);
    if (!validation.ok) return;
    const definition = buildPracticeDocumentationBlockDefinition(validation.value);
    const reopened = parsePracticeDocumentationBlockDefinition(definition);
    expect(reopened.questions[0]?.documentationSegments).toEqual([
      { kind: "text", text: "Dokumentiert: " },
      { kind: "answerRef", questionId: "monat" },
    ]);
    const frozen = resolvePracticeDocumentationBlocks([{ definition: reopened }]);
    expect(frozen[0]?.questions[0]?.documentationSegments).toEqual(reopened.questions[0]?.documentationSegments);
    expect(frozen[0]?.questions[1]?.type).toBe("month");
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