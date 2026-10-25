import { inflateSync } from "node:zlib";
import { PDFDocument } from "pdf-lib";
import { buildPrintPdf } from "@/lib/pdf/printPdf";
import { buildPracticeDocumentationBlockDefinition } from "@/lib/practice/documentationBlocks";
import { buildDocumentationLibraryPrintBlocks } from "@/lib/practice/documentationLibraryPrintPdf";

function getText(blocks: ReturnType<typeof buildDocumentationLibraryPrintBlocks>): string {
  return blocks.map((block) => block.kind === "separator" ? "---" : block.text).join("\n");
}

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
  return streams.join(" ").replace(/<([0-9A-F]+)>\s+Tj/g, (_, hex: string) =>
    Buffer.from(hex, "hex").toString("latin1"),
  );
}

describe("Dokumentationsbibliothek-Gesamtexport-Inhalte", () => {
  it("ordnet vollständige Blockinhalte den Vorlagen zu und führt übrige Bausteine auf", () => {
    const textDefinition = buildPracticeDocumentationBlockDefinition({
      title: "Einwilligung",
      blockType: "text",
      text: "Bitte wählen",
      documentationSegments: [
        { kind: "text", text: "Beginn: " },
        { kind: "answerRef", fieldId: "__primary" },
      ],
    });
    const selectionDefinition = buildPracticeDocumentationBlockDefinition({
      title: "Einwilligungsoption",
      blockType: "selection",
      sharedDocumentationText: "Gemeinsamer Textbaustein",
      options: [
        { label: "Zustimmung", documentationText: "Einwilligung erteilt" },
        { label: "Ablehnung", documentationText: "Einwilligung nicht erteilt" },
      ],
    });
    const repeatableDefinition = buildPracticeDocumentationBlockDefinition({
      title: "Kontaktpersonen",
      blockType: "repeatable",
      text: "Kontaktperson",
      additionalFields: [{
        id: "specialty",
        label: "Fachrichtung",
        type: "text",
        required: true,
        documentationText: "Dokumentierte Fachrichtung",
      }],
    });
    const blocks = buildDocumentationLibraryPrintBlocks([
      { id: textDefinition.block.id, title: "Einwilligung", isActive: true, definition: textDefinition },
      { id: selectionDefinition.block.id, title: "Einwilligungsoption", isActive: true, definition: selectionDefinition },
      {
        id: "inactive-block",
        title: "Inaktiver Absatz",
        isActive: false,
        definition: buildPracticeDocumentationBlockDefinition({
          title: "Inaktiver Absatz",
          blockType: "paragraph",
          text: "Vollständiger inaktiver Textbaustein.",
        }),
      },
      { id: repeatableDefinition.block.id, title: "Kontaktpersonen", isActive: true, definition: repeatableDefinition },
    ], [{
      name: "Patientenaufnahme",
      category: "documentation",
      block_layout: [
        { blockId: textDefinition.block.id, section: 2, order: 0 },
        { blockId: selectionDefinition.block.id, section: 2, order: 1 },
      ],
      outputFormat: "formell",
      documentTitleOption: "stellungnahme",
      patientSignatureRequired: true,
    }]);
    const text = blocks.map((block) => block.kind === "separator" ? "---" : block.text).join("\n");

    expect(text).toContain("Vorlage: Patientenaufnahme");
    expect(text).toContain("Ausgabeform: formell");
    expect(text).toContain("Dokumenttitel: Stellungnahme");
    expect(text).toContain("Patientenunterschrift erforderlich: ja");
    expect(text).toContain("Abschnitt 2");
    expect(text).toContain("Bitte wählen");
    expect(text).toContain("Gemeinsamer Textbaustein");
    expect(text).toContain("Einwilligung erteilt");
    expect(text).toContain("Einwilligung nicht erteilt");
    expect(text).toContain("Beginn: [Bitte wählen]");
    expect(text).toContain("Inaktiver Absatz");
    expect(text).toContain("Vollständiger inaktiver Textbaustein.");
    expect(text).toContain("Fachrichtung");
    expect(text).toContain("Eingabe erforderlich: ja");
    expect(text).toContain("Dokumentierte Fachrichtung");
  });

  it("gibt auch ohne Vorlagen alle Bausteine aus", () => {
    const definition = buildPracticeDocumentationBlockDefinition({
      title: "Notfallhinweis",
      blockType: "paragraph",
      text: "Bei akuter Gefahr sofort eskalieren.",
    });
    const blocks = buildDocumentationLibraryPrintBlocks([
      { id: definition.block.id, title: "Notfallhinweis", isActive: false, definition },
    ], []);

    expect(blocks.map((block) => block.kind === "separator" ? "---" : block.text).join("\n"))
      .toContain("Bei akuter Gefahr sofort eskalieren.");
  });

  it("löst Optionen in verschachtelten Segmenten und AND/OR-Regeln lesbar auf", async () => {
    const definition = buildPracticeDocumentationBlockDefinition({
      title: "Versorgungsweg",
      blockType: "selection",
      options: [
        { value: "practice_option_referral", label: "Überweisung", documentationText: "Überweisung veranlasst" },
        { value: "practice_option_other", label: "Andere Versorgung", documentationText: "Andere Versorgung gewählt" },
      ],
      additionalFields: [
        {
          id: "detail",
          label: "Zusätzliche Angaben",
          type: "textarea",
          required: true,
          showForOptionValues: ["practice_option_referral"],
        },
        {
          id: "services",
          label: "Leistungen",
          type: "multi_select",
          options: [
            { value: "practice_option_lab", label: "Labor" },
            { value: "practice_option_imaging", label: "Bildgebung" },
          ],
          required: false,
          showForOptionValues: ["practice_option_referral"],
        },
        {
          id: "amount",
          label: "Anzahl",
          type: "number",
          required: false,
          showForOptionValues: ["practice_option_referral"],
        },
      ],
    });
    const primary = definition.questions[0]!;
    const detail = definition.questions[1]!;
    const services = definition.questions[2]!;
    const amount = definition.questions[3]!;
    const referralValue = (primary.options?.[0] as { value: string }).value;
    const labValue = (services.options?.[0] as { value: string }).value;
    const unknownId = "practice_option_missing";
    primary.documentationSegments = [
      {
        kind: "conditional",
        questionId: primary.id,
        optionValue: referralValue,
        segments: [
          { kind: "text", text: "Details: " },
          { kind: "answerRef", questionId: detail.id },
          {
            kind: "conditional",
            questionId: services.id,
            optionValue: labValue,
            segments: [{ kind: "text", text: " (Labor ausgewählt)" }],
          },
        ],
      },
      {
        kind: "conditional",
        questionId: "question_missing",
        optionValue: unknownId,
        segments: [{ kind: "text", text: "Fallback" }],
      },
    ];
    definition.block.conditionalRules = [
      {
        action: "showQuestion",
        targetId: detail.id,
        condition: {
          mode: "AND",
          conditions: [
            { target: { kind: "question", questionId: primary.id }, operator: "equals", value: referralValue },
            { target: { kind: "question", questionId: services.id }, operator: "isAnswered" },
          ],
        },
      },
      {
        action: "showQuestion",
        targetId: amount.id,
        condition: {
          mode: "OR",
          conditions: [
            { target: { kind: "question", questionId: services.id }, operator: "contains", value: labValue },
            { target: { kind: "question", questionId: amount.id }, operator: "greaterThan", value: 10 },
          ],
        },
      },
      ...([
        ["notEquals", referralValue],
        ["greaterThanOrEqual", 10],
        ["lessThan", 20],
        ["lessThanOrEqual", 20],
        ["isEmpty", undefined],
      ] as const).map(([operator, value]) => ({
        action: "showQuestion" as const,
        targetId: detail.id,
        condition: {
          target: { kind: "question" as const, questionId: primary.id },
          operator,
          ...(value === undefined ? {} : { value }),
        },
      })),
    ];

    const blocks = buildDocumentationLibraryPrintBlocks([
      { id: definition.block.id, title: "Versorgungsweg", isActive: true, definition },
    ], []);
    const text = getText(blocks);
    const pdfBytes = await buildPrintPdf("Dokumentationsbibliothek", blocks);
    const pdfText = await extractPdfText(pdfBytes);

    expect(text).toContain("Überweisung");
    expect(text.indexOf("Überweisung")).toBeLessThan(text.indexOf("Andere Versorgung"));
    expect(text).toContain("Wenn bei Versorgungsweg „Überweisung“ ausgewählt ist");
    expect(text).toContain("Wenn bei Leistungen „Labor“ ausgewählt ist");
    expect(text).toContain("Details: [Zusätzliche Angaben]");
    expect(text).toContain("Wenn bei nicht zugeordnetes Feld „nicht zugeordneter Auswahlwert“ ausgewählt ist");
    expect(text).toContain("Zusätzliche Angaben wird angezeigt, wenn (Versorgungsweg ist „Überweisung“ und Leistungen wurde ausgefüllt).");
    expect(text).toContain("Anzahl wird angezeigt, wenn (Leistungen enthält „Labor“ oder Anzahl ist größer als 10).");
    expect(text).toContain("Versorgungsweg ist nicht „Überweisung“");
    expect(text).toContain("Versorgungsweg ist mindestens 10");
    expect(text).toContain("Versorgungsweg ist kleiner als 20");
    expect(text).toContain("Versorgungsweg ist höchstens 20");
    expect(text).toContain("Versorgungsweg ist leer");
    expect(text).toContain("Zusätzliche Angaben (Mehrzeiliger Freitext)");
    expect(text).toContain("Leistungen (Mehrfachauswahl)");
    expect(text).not.toMatch(/(?:practice_)?(?:option|question|field|block)_[\w-]+/i);
    expect(text).not.toContain("undefined");
    expect(pdfText).not.toMatch(/(?:practice_)?(?:option|question|field|block)_[\w-]+/i);
    expect(pdfText).not.toContain("undefined");
  });

  it("löst Optionen und Bedingungen wiederholbarer Felder über ihre Labels auf", async () => {
    const definition = buildPracticeDocumentationBlockDefinition({
      title: "Kontaktstellen",
      blockType: "repeatable",
      additionalFields: [
        {
          id: "contact_type",
          label: "Kontaktart",
          type: "select",
          options: [{ value: "option_practice", label: "Facharztpraxis" }],
          showForOptionValues: [],
        },
        {
          id: "specialty",
          label: "Fachgebiet",
          type: "text",
          required: true,
          showForFieldId: "contact_type",
          showForOptionValues: ["option_practice"],
          documentationSegments: [
            { kind: "conditional", fieldId: "contact_type", optionValue: "option_practice", segments: [
              { kind: "text", text: "Zuständig: " },
              { kind: "answerRef", fieldId: "specialty" },
            ] },
          ],
        },
      ],
    });
    const blocks = buildDocumentationLibraryPrintBlocks([
      { id: definition.block.id, title: "Kontaktstellen", isActive: true, definition },
    ], []);
    const text = getText(blocks);
    const pdfBytes = await buildPrintPdf("Dokumentationsbibliothek", blocks);
    const pdfText = await extractPdfText(pdfBytes);

    expect(text).toContain("Kontaktart (Einfachauswahl)");
    expect(text).toContain("Fachgebiet (Kurzer Freitext)");
    expect(text).toContain("Sichtbar, wenn bei Kontaktart die Auswahl „Facharztpraxis“ getroffen ist.");
    expect(text).toContain("Wenn bei Kontaktart „Facharztpraxis“ ausgewählt ist");
    expect(text).toContain("Zuständig: [Fachgebiet]");
    expect(text).not.toContain("option_practice");
    expect(text).not.toContain("undefined");
    expect(pdfText).not.toContain("option_practice");
    expect(pdfText).not.toContain("undefined");
  });

  it("ersetzt technische Legacy-Optionsstrings ohne sichtbares Label neutral", async () => {
    const definition = buildPracticeDocumentationBlockDefinition({
      title: "Legacy-Auswahl",
      blockType: "selection",
      options: [
        { label: "Lesbare Auswahl", documentationText: "Lesbarer Ausgabetext" },
      ],
    });
    definition.questions[0]!.options = ["option_legacy_internal_id"];
    const blocks = buildDocumentationLibraryPrintBlocks([
      { id: definition.block.id, title: "Legacy-Auswahl", isActive: true, definition },
    ], []);
    const pdfBytes = await buildPrintPdf("Dokumentationsbibliothek", blocks);
    const pdfText = await extractPdfText(pdfBytes);

    expect(pdfText).toContain("Nicht näher bezeichnete Option");
    expect(pdfText).not.toContain("option_legacy_internal_id");
    expect(pdfText).not.toContain("undefined");
  });
});