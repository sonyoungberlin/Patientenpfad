import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { normalizeTextForPvs } from "@/lib/questionnaire/normalizeTextForPvs";

export type PrintPdfBlock =
  | { kind: "heading"; text: string }
  | { kind: "subheading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "separator" };

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_LEFT = 48;
const MARGIN_RIGHT = 48;
const MARGIN_BOTTOM = 48;
const LINE_HEIGHT = 13;

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of normalizeTextForPvs(text).replaceAll("\r\n", "\n").split("\n")) {
    if (!paragraph) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = "";
      for (const character of [...word]) {
        if (line && font.widthOfTextAtSize(line + character, size) > maxWidth) {
          lines.push(line);
          line = "";
        }
        line += character;
      }
    }
    lines.push(line);
  }
  return lines.length > 0 ? lines : [""];
}

export async function buildPrintPdf(
  title: string,
  blocks: readonly PrintPdfBlock[],
  printedAt = new Date(),
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const pages: PDFPage[] = [page];
  let y = 0;

  const drawPageHeader = () => {
    page.drawText(normalizeTextForPvs(title), {
      x: MARGIN_LEFT,
      y: PAGE_HEIGHT - 42,
      size: 11,
      font: bold,
      color: rgb(0, 0, 0),
    });
    const dateLabel = `Druckdatum: ${new Intl.DateTimeFormat("de-DE").format(printedAt)}`;
    const dateWidth = regular.widthOfTextAtSize(normalizeTextForPvs(dateLabel), 9);
    page.drawText(normalizeTextForPvs(dateLabel), {
      x: PAGE_WIDTH - MARGIN_RIGHT - dateWidth,
      y: PAGE_HEIGHT - 42,
      size: 9,
      font: regular,
      color: rgb(0, 0, 0),
    });
    page.drawLine({
      start: { x: MARGIN_LEFT, y: PAGE_HEIGHT - 54 },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: PAGE_HEIGHT - 54 },
      thickness: 0.7,
      color: rgb(0, 0, 0),
    });
    y = PAGE_HEIGHT - 76;
  };

  const addPage = () => {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);
    drawPageHeader();
  };

  const ensureSpace = (height: number) => {
    if (y - height < MARGIN_BOTTOM) addPage();
  };

  drawPageHeader();
  for (const block of blocks) {
    if (block.kind === "separator") {
      ensureSpace(12);
      y -= 4;
      page.drawLine({
        start: { x: MARGIN_LEFT, y },
        end: { x: PAGE_WIDTH - MARGIN_RIGHT, y },
        thickness: 0.45,
        color: rgb(0.45, 0.45, 0.45),
      });
      y -= 9;
      continue;
    }

    const isHeading = block.kind === "heading" || block.kind === "subheading";
    const size = block.kind === "heading" ? 13 : block.kind === "subheading" ? 10.5 : 9.5;
    const lineHeight = block.kind === "heading" ? 17 : block.kind === "subheading" ? 14 : LINE_HEIGHT;
    const font = isHeading ? bold : regular;
    const x = block.kind === "paragraph" ? MARGIN_LEFT + 8 : MARGIN_LEFT;
    const maxWidth = PAGE_WIDTH - MARGIN_RIGHT - x;
    const lines = wrapText(block.text, font, size, maxWidth);

    if (isHeading) ensureSpace(lineHeight + LINE_HEIGHT);
    else ensureSpace(lineHeight);
    for (const line of lines) {
      if (y - lineHeight < MARGIN_BOTTOM) addPage();
      if (line) {
        page.drawText(line, {
          x,
          y,
          size,
          font,
          color: rgb(0, 0, 0),
        });
      }
      y -= lineHeight;
    }
    y -= block.kind === "heading" ? 4 : block.kind === "subheading" ? 2 : 3;
  }

  pages.forEach((pageToNumber, index) => {
    const label = `Seite ${index + 1} von ${pages.length}`;
    const width = regular.widthOfTextAtSize(label, 8);
    pageToNumber.drawText(label, {
      x: PAGE_WIDTH - MARGIN_RIGHT - width,
      y: 24,
      size: 8,
      font: regular,
      color: rgb(0, 0, 0),
    });
  });

  return pdf.save();
}