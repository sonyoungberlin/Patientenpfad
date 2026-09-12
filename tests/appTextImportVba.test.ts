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

  it("setzt keine Schriftfamilie hart", () => {
    expect(source).not.toMatch(/\.Font\.Name\s*=/i);
    expect(procedure("ImportV2DocumentTitle")).not.toContain(".Font.");
    expect(procedure("ImportV2DocumentTitle")).not.toContain(".ParagraphFormat.");
  });
});