import {
  buildAppTextXml,
  buildStructuredAppXml,
  buildStructuredXmlFilename,
} from "@/lib/questionnaire/appTextXml";

describe("buildAppTextXml", () => {
  it("erzeugt exakt das erwartete APP_TEXT-Schema", () => {
    const xml = buildAppTextXml("Fertiger Text");
    expect(xml).toBe(
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
      "<appExport version=\"1.0\"><section id=\"APP_TEXT\">Fertiger Text</section></appExport>",
    );
    expect(xml.match(/id="APP_TEXT"/g)).toHaveLength(1);
  });

  it("escaped XML-Sonderzeichen im Textknoten", () => {
    expect(buildAppTextXml(`A & B < C > D "Zitat" 'Apostroph'`)).toContain(
      "A &amp; B &lt; C &gt; D &quot;Zitat&quot; &apos;Apostroph&apos;",
    );
  });

  it("erhält Absätze und normalisiert CRLF sowie CR zu LF", () => {
    const xml = buildAppTextXml("Erste Zeile\r\n\r\nZweite Zeile\rDritte Zeile");

    expect(xml).toContain("Erste Zeile\n\nZweite Zeile\nDritte Zeile");
    expect(xml).not.toContain("\r");
  });

  it("erhält UTF-8-Inhalte und entfernt unzulässige XML-1.0-Steuerzeichen", () => {
    const xml = buildAppTextXml("Ärztliche Größe\u0000\u0008\u000B\tbleibt");

    expect(xml).toContain("Ärztliche Größe\tbleibt");
    expect(xml).not.toContain("\u0000");
    expect(xml).not.toContain("\u0008");
    expect(xml).not.toContain("\u000B");
  });
});

describe("buildStructuredAppXml", () => {
  it("serialisiert drei semantische Sections und escaped XML-Inhalte", () => {
    const xml = buildStructuredAppXml({
      sections: [
        { slot: 1, items: [
          { type: "heading", text: "Labor & Werte" },
          { type: "measurement", text: "Lipidprofil: <auffällig>\u0000" },
        ] },
        { slot: 2, items: [] },
        { slot: 3, items: [{ type: "bodyText", text: "Ärztliche Stellungnahme" }] },
      ],
    });

    expect(xml).toContain('<appExport version="2.0">');
    expect(xml).toContain('<section slot="1">');
    expect(xml).toContain('<item type="heading">Labor &amp; Werte</item>');
    expect(xml).toContain('<item type="measurement">Lipidprofil: &lt;auffällig&gt;</item>');
    expect(xml).toContain('<section slot="2"></section>');
    expect(xml).toContain('<section slot="3">');
    expect(xml).not.toContain("\u0000");
  });

  it("ergänzt den separaten v2-Dateisuffix", () => {
    expect(buildStructuredXmlFilename("Interne_Dokumentation.xml"))
      .toBe("Interne_Dokumentation-v2.xml");
  });
});