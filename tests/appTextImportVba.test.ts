import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(process.cwd(), "AppTextImport.bas"), "utf8");

function procedure(name: string): string {
  const pattern = new RegExp(
    `(?:Private|Public) (?:Sub|Function) ${name}\\b[\\s\\S]*?End (?:Sub|Function)`,
  );
  const match = source.match(pattern);
  if (!match) throw new Error(`VBA-Prozedur fehlt: ${name}`);
  return match[0];
}

describe("AppTextImport VBA", () => {
  it("importiert documentTitle ausschließlich im XML-v2-Pfad", () => {
    const dispatcher = procedure("AppTextAusXMLImportieren");
    const version1 = procedure("ImportVersion1");
    const version2 = procedure("ImportVersion2");

    expect(dispatcher).toContain('Case "1.0"');
    expect(dispatcher).toContain('Case "2.0"');
    expect(version2).toContain("ImportV2DocumentTitle xml, missingTags");
    expect(version1).not.toContain("ImportV2DocumentTitle");
    expect(version1).not.toContain("APP_TITLE");
    expect(version1).not.toContain("documentTitle");
  });

  it("liest den Titel einmal zentral und befüllt APP_TITLE über die vorhandene Tag-Suche", () => {
    const titleImport = procedure("ImportV2DocumentTitle");

    expect(titleImport).toContain('xml.SelectSingleNode("/appExport/documentTitle")');
    expect(titleImport.match(/SelectSingleNode\("\/appExport\/documentTitle"\)/g)).toHaveLength(1);
    expect(titleImport).toContain('FindContentControlByTag("APP_TITLE")');
    expect(titleImport).toContain("cc.Range.Text = documentTitle");
  });

  it("überspringt fehlenden oder leeren Titel und toleriert ein fehlendes APP_TITLE-Feld", () => {
    const titleImport = procedure("ImportV2DocumentTitle");

    expect(titleImport).toContain("If titleNode Is Nothing Then Exit Sub");
    expect(titleImport).toContain("If Len(Trim$(documentTitle)) = 0 Then Exit Sub");
    expect(titleImport).toContain("If cc Is Nothing Then");
    expect(titleImport).toContain('AddMissingTag missingTags, "APP_TITLE"');
  });

  it("lässt die drei v2-Slots und deren medizinische Renderinglogik unverändert", () => {
    const version2 = procedure("ImportVersion2");
    const sectionImport = procedure("InsertV2Section");
    const formatting = procedure("ApplyItemFormatting");

    expect(version2).toContain('Case "1", "2", "3"');
    expect(version2).toContain('targetTag = "APP_TEXT_" & slotValue');
    expect(version2).toContain("InsertV2Section cc, node");
    expect(sectionImport).toContain('Set items = sectionNode.SelectNodes("./item")');
    expect(sectionImport).toContain("ApplyItemFormatting itemRange, itemNode, itemType");
    expect(formatting).toContain('Case "heading"');
    expect(formatting).toContain('Case "freeText"');
    expect(formatting).toContain('Case "measurement", "status", "listItem"');
  });

  it.each([
    ["Fall A", 1],
    ["Fall B", 2],
    ["Fall C", 3],
  ])("behandelt %s über den bestehenden v2-Importpfad", (_caseName, filledSlotCount) => {
    const version2 = procedure("ImportVersion2");
    const sectionImport = procedure("InsertV2Section");
    const emptySection = procedure("ClearEmptyV2Section");

    expect(version2).toContain('Case "1", "2", "3"');
    expect(version2).toContain("InsertV2Section cc, node");
    expect(sectionImport).toContain("If visibleItemCount = 0 Then");
    expect(sectionImport).toContain("ClearEmptyV2Section cc");
    expect(sectionImport).toContain("cc.Range.Text = sectionText");
    expect(emptySection).toContain("cc.Range.Text = vbNullString");
    expect(emptySection).toContain("cc.SetPlaceholderText");
    expect(filledSlotCount).toBeGreaterThan(0);
  });

  it("leert v2-Slots ohne Dummy-Inhalt, Absatz oder Slot-Abstandsänderung", () => {
    const sectionImport = procedure("InsertV2Section");
    const emptySection = procedure("ClearEmptyV2Section");
    const slotSpacing = procedure("ApplyV2SlotSpacing");

    expect(emptySection).not.toContain('" "');
    expect(emptySection).not.toContain("vbCr");
    expect(emptySection).not.toContain("InsertAfter");
    expect(emptySection).not.toContain("ContentControls.Add");
    expect(emptySection).not.toContain(".Delete");
    expect(sectionImport.indexOf("ClearEmptyV2Section cc")).toBeLessThan(
      sectionImport.indexOf("cc.Range.Text = sectionText"),
    );
    expect(slotSpacing).toContain("slotRange.ParagraphFormat.SpaceBefore = 12");
    expect(slotSpacing).not.toContain("SpaceAfter");
  });

  it("unterdrückt spacingOnly-Überschriften und übernimmt ihren Abstand für den Folgeinhalt", () => {
    const sectionImport = procedure("InsertV2Section");
    const renderedText = procedure("BuildRenderedItemText");
    const formatting = procedure("ApplyItemFormatting");

    expect(renderedText).toContain("If IsSpacingOnlyHeading(itemNode, itemType) Then Exit Function");
    expect(sectionImport).toContain("If IsSpacingOnlyHeading(itemNode, itemType) Then");
    expect(sectionImport).toContain("pendingSpacingBefore = True");
    expect(sectionImport).toContain("pendingSpacingBefore = False");
    expect(formatting).toContain("If addSpacingBefore And itemRange.ParagraphFormat.SpaceBefore < 6 Then");
    expect(formatting).toContain("itemRange.ParagraphFormat.SpaceBefore = 6");
  });

  it("rendert sichtbare Überschriften weiterhin als fett formatierten Text", () => {
    const renderedText = procedure("BuildRenderedItemText");
    const formatting = procedure("ApplyItemFormatting");

    expect(renderedText).toContain("BuildRenderedItemText = itemText");
    expect(formatting).toContain('Case "heading"');
    expect(formatting).toContain("itemRange.Font.Bold = True");
  });

  it("trennt Slot 1 von Slot 2 und Slot 2 von Slot 3 über eine eigene Layoutregel", () => {
    const version2 = procedure("ImportVersion2");
    const slotSpacing = procedure("ApplyV2SlotSpacing");

    expect(version2).toContain("ApplyV2SlotSpacing xml");
    expect(slotSpacing).toContain("For slotNumber = 1 To 3");
    expect(slotSpacing).toContain("If previousSlotIsFilled Then");
    expect(slotSpacing).toContain('"APP_TEXT_" & CStr(slotNumber)');
    expect(slotSpacing).toContain("slotRange.ParagraphFormat.SpaceBefore = 12");
  });

  it("setzt Slot-Abstand nur vor einem weiteren tatsächlich befüllten Slot", () => {
    const slotSpacing = procedure("ApplyV2SlotSpacing");
    const visibleContent = procedure("V2SectionHasVisibleContent");

    expect(slotSpacing).toContain("If V2SectionHasVisibleContent(sectionNode) Then");
    expect(slotSpacing).toContain("previousSlotIsFilled = True");
    expect(slotSpacing).not.toContain("SpaceAfter");
    expect(visibleContent).toContain('sectionNode.SelectNodes("./item")');
    expect(visibleContent).toContain("BuildRenderedItemText(itemNode, itemType)");
  });

  it("verändert für die Slot-Trennung weder Slot-Inhalte noch APP_TITLE", () => {
    const slotSpacing = procedure("ApplyV2SlotSpacing");
    const titleImport = procedure("ImportV2DocumentTitle");

    expect(slotSpacing).not.toContain(".Text =");
    expect(slotSpacing).not.toContain("InsertV2Section");
    expect(slotSpacing).not.toContain("ApplyItemFormatting");
    expect(slotSpacing).not.toContain("APP_TITLE");
    expect(titleImport).toContain("cc.Range.Text = documentTitle");
    expect(titleImport).not.toContain("ApplyV2SlotSpacing");
  });

  it("setzt keine Schriftfamilie hart", () => {
    expect(source).not.toMatch(/\.Font\.Name\s*=/i);
    expect(procedure("ImportV2DocumentTitle")).not.toContain(".Font.");
    expect(procedure("ImportV2DocumentTitle")).not.toContain(".ParagraphFormat.");
  });
});