import { buildPracticeDocumentationBlockDefinition } from "@/lib/practice/documentationBlocks";
import { buildDocumentationLibraryPrintBlocks } from "@/lib/practice/documentationLibraryPrintPdf";

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
});