import { PDFDocument } from "pdf-lib";
import { inflateSync } from "node:zlib";
import { buildPrintPdf } from "@/lib/pdf/printPdf";

function extractText(bytes: Uint8Array): string {
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

describe("buildPrintPdf", () => {
  it("erzeugt A4-Hochformat und nummeriert lange Inhalte vollständig", async () => {
    const bytes = await buildPrintPdf("Gesamtexport", Array.from({ length: 120 }, (_, index) => ({
      kind: "paragraph" as const,
      text: `Eintrag ${index + 1}: ${"Vollständiger Inhalt mit sauberem Umbruch. ".repeat(5)}`,
    })), new Date("2026-10-23T12:00:00.000Z"));
    const pdf = await PDFDocument.load(bytes);
    const pages = pdf.getPages();
    const text = extractText(bytes);

    expect(pages.length).toBeGreaterThan(1);
    expect(pages[0]?.getSize().width).toBeCloseTo(595.28, 0);
    expect(pages[0]?.getSize().height).toBeCloseTo(841.89, 0);
    expect(text).toContain("Eintrag 1:");
    expect(text).toContain("Eintrag 120:");
    expect(text).toContain(`Seite 1 von ${pages.length}`);
    expect(text).toContain(`Seite ${pages.length} von ${pages.length}`);
  });

  it("erzeugt auch für leere Inhalte ein gültiges, nummeriertes PDF", async () => {
    const bytes = await buildPrintPdf("Gesamtexport", [], new Date("2026-10-23T12:00:00.000Z"));
    const pdf = await PDFDocument.load(bytes);

    expect(pdf.getPageCount()).toBe(1);
    expect(extractText(bytes)).toContain("Seite 1 von 1");
  });
});