import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { QuestionDefinition, QuestionnaireBlock } from "./blockCatalog";
import {
  parseRepeatableGroupEntries,
  parseFacharztEntries,
  formatYesNoValue,
  buildDerivedValueLines,
} from "./formatAnswer";
import type { RepGroupEntry } from "./formatAnswer";
import { computeAllDerivedValues } from "./derivedValues";
import { computeVisibleQuestionIds } from "./conditionalLogic";
import { buildOptionsByQuestionId } from "./multiSelect";

function formatDateYyyyMmDd(date: Date): string {
  const formatter = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  return `${year}${month}${day}`;
}

export function sanitizeFilenamePart(value: string): string {
  return value
    .replaceAll("Ä", "Ae")
    .replaceAll("Ö", "Oe")
    .replaceAll("Ü", "Ue")
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getFirstBlockLabel(
  selectedBlockIds: string[],
  blockCatalog: Record<string, QuestionnaireBlock>,
): string | null {
  const firstBlockId = selectedBlockIds[0];
  if (!firstBlockId) return null;
  const label = blockCatalog[firstBlockId]?.label;
  if (!label) return null;
  const sanitized = sanitizeFilenamePart(label);
  return sanitized.length > 0 ? sanitized : null;
}

export type PdfSessionInput = {
  patient_reference: string | null;
  submitted_at: Date | null;
  submitted_by: string;
  selected_block_ids: unknown;
  deduplicated_questions: unknown;
  answers: unknown;
  source: string;
  practice_form: { title: string } | null;
};

export type PdfRenderOptions = {
  /** Titel oben auf der ersten Seite. */
  title: string;
  /** Beschriftung der Referenzzeile (z. B. "Patientenreferenz" / "Referenz"). */
  referenceLabel: string;
  /** Blockkatalog zum Nachschlagen von Labels und Conditional Rules. */
  blockCatalog: Record<string, QuestionnaireBlock>;
  patientCopy?: { returnEmail: string };
};

export async function buildQuestionnairePdfBytes(
  session: PdfSessionInput,
  opts: PdfRenderOptions,
): Promise<{ bytes: Uint8Array; filename: string }> {
  const { title, referenceLabel, blockCatalog } = opts;

  const questions = Array.isArray(session.deduplicated_questions)
    ? (session.deduplicated_questions as QuestionDefinition[])
    : [];

  const answers =
    session.answers !== null &&
    typeof session.answers === "object" &&
    !Array.isArray(session.answers)
      ? (session.answers as Record<string, string>)
      : {};

  const selectedBlockIds = Array.isArray(session.selected_block_ids)
    ? (session.selected_block_ids as string[])
    : [];

  const derivedValues = computeAllDerivedValues(answers);

  const blockSections: {
    label: string;
    questions: QuestionDefinition[];
    visibleQIds: Set<string>;
  }[] = [];
  const assignedIds = new Set<string>();

  for (const blockId of selectedBlockIds) {
    const block = blockCatalog[blockId];
    if (!block) continue;
    const visibleQIds = computeVisibleQuestionIds(
      block.conditionalRules ?? [],
      block.questionIds,
      answers,
      derivedValues as Record<string, number>,
      buildOptionsByQuestionId(
        block.questionIds
          .map((questionId) => questions.find((question) => question.id === questionId))
          .filter((question): question is QuestionDefinition => question !== undefined),
      ),
    );
    const blockQuestions = block.questionIds
      .map((qid) => questions.find((q) => q.id === qid))
      .filter((q): q is QuestionDefinition => q !== undefined && !assignedIds.has(q.id));
    blockQuestions.forEach((q) => assignedIds.add(q.id));
    if (blockQuestions.length > 0) {
      blockSections.push({ label: block.label, questions: blockQuestions, visibleQIds });
    }
  }

  const globalVisibleQIds = new Set<string>();
  blockSections.forEach(({ visibleQIds }) => visibleQIds.forEach((id) => globalVisibleQIds.add(id)));
  const remaining = questions.filter((q) => !assignedIds.has(q.id));
  if (remaining.length > 0) {
    blockSections.push({ label: "Weitere Angaben", questions: remaining, visibleQIds: globalVisibleQIds });
  }

  // ---------------------------------------------------------------------------
  // PDF aufbauen
  // ---------------------------------------------------------------------------
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595;
  const pageHeight = 842;
  const marginLeft = 50;
  const marginRight = 50;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const marginTop = 50;
  const marginBottom = 50;
  const lineHeight = 13;
  const sectionGap = 10;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - marginTop;

  function startNewPage() {
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - marginTop;
  }

  function ensureSpace(needed: number) {
    if (y - needed < marginBottom && y !== pageHeight - marginTop) startNewPage();
  }

  function wrapText(text: string, usedFont: typeof font, size: number, maxWidth: number): string[] {
    const lines: string[] = [];
    for (const paragraph of text.replaceAll("\r\n", "\n").split("\n")) {
      if (paragraph === "") {
        lines.push("");
        continue;
      }
      let current = "";
      for (const token of paragraph.split(/(\s+)/).filter(Boolean)) {
        if (usedFont.widthOfTextAtSize(current + token, size) <= maxWidth) {
          current += token;
          continue;
        }
        if (current.trim() !== "") lines.push(current.trimEnd());
        current = "";
        for (const character of [...token.trim()]) {
          if (current && usedFont.widthOfTextAtSize(current + character, size) > maxWidth) {
            lines.push(current);
            current = "";
          }
          current += character;
        }
      }
      lines.push(current.trimEnd());
    }
    return lines.length > 0 ? lines : [""];
  }

  function drawTextBlock(
    text: string,
    textOpts: {
      size?: number;
      bold?: boolean;
      color?: [number, number, number];
      x?: number;
      maxWidth?: number;
      lineHeight?: number;
      preflight?: number;
    } = {},
  ) {
    const size = textOpts.size ?? 10;
    const usedFont = textOpts.bold ? boldFont : font;
    const [r, g, b] = textOpts.color ?? [0, 0, 0];
    const blockLineHeight = textOpts.lineHeight ?? lineHeight;
    const x = textOpts.x ?? marginLeft;
    const maxWidth = textOpts.maxWidth ?? pageWidth - marginRight - x;
    const lines = wrapText(text, usedFont, size, maxWidth);
    ensureSpace(textOpts.preflight ?? blockLineHeight);
    for (const line of lines) {
      if (y - blockLineHeight < marginBottom && y !== pageHeight - marginTop) startNewPage();
      page.drawText(line, {
        x,
        y,
        size,
        font: usedFont,
        color: rgb(r, g, b),
        lineHeight: blockLineHeight,
      });
      y -= blockLineHeight;
    }
    return y;
  }

  function drawText(
    text: string,
    textOpts: { size?: number; bold?: boolean; color?: [number, number, number] } = {},
  ) {
    drawTextBlock(text, textOpts);
  }

  function drawWrappedPair(label: string, value: string, keepTogether = true) {
    const size = 9;
    const labelLines = wrapText(`${label}:`, boldFont, size, contentWidth);
    const displayValue = value && value.trim() !== "" ? value : "–";
    const valueLines = wrapText(displayValue, font, size, contentWidth - 12);
    const pairHeight = labelLines.length * lineHeight + 3 + valueLines.length * lineHeight + 5;
    if (keepTogether && pairHeight <= pageHeight - marginTop - marginBottom) ensureSpace(pairHeight);
    drawTextBlock(`${label}:`, { size, bold: true, maxWidth: contentWidth, lineHeight });
    y -= 3;
    drawTextBlock(displayValue, {
      size,
      x: marginLeft + 12,
      maxWidth: contentWidth - 12,
      lineHeight,
      color: displayValue === "–" ? [0.5, 0.5, 0.5] : [0, 0, 0],
    });
    y -= 5;
  }

  function drawRepGroupEntries(questionLabel: string, entries: RepGroupEntry[]) {
    if (entries.length === 0) return;
    drawTextBlock(`${questionLabel}:`, { size: 9, bold: true, lineHeight });
    y -= 2;
    for (const entry of entries) {
      drawTextBlock(`${entry.index}. Eintrag`, {
        size: 10,
        bold: true,
        color: [0.2, 0.2, 0.2],
        x: marginLeft + 10,
        maxWidth: contentWidth - 10,
        lineHeight,
      });
      y -= 1;
      for (const field of entry.fields) drawWrappedPair(field.label, field.value);
      y -= 3;
    }
    y -= sectionGap / 2;
  }

  drawText(title, { size: 16, bold: true });
  y -= 4;

  if (session.submitted_by === "contact_person") {
    drawText(
      "Die Angaben wurden durch eine Kontaktperson übermittelt.",
      { size: 9, color: [0.3, 0.3, 0.3] },
    );
  }

  const submittedStr = session.submitted_at
    ? session.submitted_at.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" })
    : "–";
  drawText(`Datum: ${submittedStr}`, { size: 9, color: [0.3, 0.3, 0.3] });
  drawText(`${referenceLabel}: ${session.patient_reference ?? "–"}`, { size: 9, color: [0.3, 0.3, 0.3] });

  const derivedValueLines = buildDerivedValueLines(derivedValues);
  if (derivedValueLines.length > 0) {
    y -= sectionGap;
    ensureSpace(lineHeight * 2);
    drawText("Berechnete Werte", { size: 11, bold: true });
    for (const dvLine of derivedValueLines) {
      drawText(dvLine, { size: 9 });
    }
  }

  y -= sectionGap;

  for (const section of blockSections) {
    ensureSpace(lineHeight * 3);
    y -= 4;
    drawText(section.label, { size: 11, bold: true });
    ensureSpace(4);
    page.drawLine({
      start: { x: marginLeft, y: y + 2 },
      end: { x: marginLeft + contentWidth, y: y + 2 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
    y -= 6;

    for (const q of section.questions) {
      const value = answers[q.id] ?? "";
      const isVisible = section.visibleQIds.has(q.id);

      if (q.type === "confirmation" && value === "true") {
        drawWrappedPair("Bestätigt", q.text);
        continue;
      }

      if (!isVisible) {
        drawWrappedPair(q.text, "Nicht abgefragt");
        continue;
      }
      if (q.id === "FACHAERZTE") {
        const entries = parseFacharztEntries(value);
        entries.length > 0 ? drawRepGroupEntries(q.text, entries) : drawWrappedPair(q.text, "");
        continue;
      }
      if (q.type === "repeatable_group") {
        const entries = parseRepeatableGroupEntries(value, q.id, q);
        entries.length > 0 ? drawRepGroupEntries(q.text, entries) : drawWrappedPair(q.text, "");
        continue;
      }
      const displayValue = q.type === "yes_no" && value ? formatYesNoValue(value) : value;
      drawWrappedPair(q.text, displayValue);
    }

    y -= sectionGap;
  }

  if (opts.patientCopy) {
    ensureSpace(lineHeight * 8);
    y -= sectionGap;
    drawText("Unterschrift Patient/in", { size: 10, bold: true });
    drawText("______________________________", { size: 10 });
    y -= 3;
    drawText("Datum", { size: 10, bold: true });
    drawText("______________________________", { size: 10 });
    y -= 3;
    drawText(`Bitte senden Sie das unterschriebene Dokument an: ${opts.patientCopy.returnEmail}`, { size: 9 });
    drawText("oder bringen Sie das unterschriebene Formular zu Ihrem Termin mit.", { size: 9 });
  }

  const bytes = await pdfDoc.save();

  const datePart = formatDateYyyyMmDd(session.submitted_at ?? new Date());
  const questionnairePart =
    session.source === "website"
      ? sanitizeFilenamePart(session.practice_form?.title ?? "") || null
      : getFirstBlockLabel(selectedBlockIds, blockCatalog);

  let filename: string;
  if (session.patient_reference) {
    const refPart = sanitizeFilenamePart(session.patient_reference);
    filename = questionnairePart ? `${datePart}_${refPart}_${questionnairePart}.pdf` : `${datePart}_${refPart}.pdf`;
  } else {
    const lastName = sanitizeFilenamePart((answers as Record<string, string>).IDENTITY_LAST_NAME ?? "");
    const firstName = sanitizeFilenamePart((answers as Record<string, string>).IDENTITY_FIRST_NAME ?? "");
    if (lastName && firstName) {
      const namePart = `${lastName}_${firstName}`;
      filename = questionnairePart ? `${datePart}_${namePart}_${questionnairePart}.pdf` : `${datePart}_${namePart}.pdf`;
    } else {
      filename = questionnairePart ? `${datePart}_Fragebogen_${questionnairePart}.pdf` : `${datePart}_Fragebogen.pdf`;
    }
  }

  return { bytes, filename };
}
