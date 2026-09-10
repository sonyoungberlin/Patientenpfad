import { buildAppTextXml } from "@/lib/questionnaire/appTextXml";

describe("buildAppTextXml", () => {
  it("erzeugt exakt das erwartete APP_TEXT-Schema", () => {
    expect(buildAppTextXml("Fertiger Text")).toBe(
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
      "<appExport version=\"1.0\"><section id=\"APP_TEXT\">Fertiger Text</section></appExport>",
    );
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