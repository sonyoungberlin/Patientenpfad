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
  const lineHeight = 15;
  const sectionGap = 10;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - marginTop;

  function ensureSpace(needed: number) {
    if (y - needed < marginBottom) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - marginTop;
    }
  }

  function drawText(
    text: string,
    textOpts: { size?: number; bold?: boolean; color?: [number, number, number] } = {},
  ) {
    const size = textOpts.size ?? 10;
    const usedFont = textOpts.bold ? boldFont : font;
    const [r, g, b] = textOpts.color ?? [0, 0, 0];
    ensureSpace(size + 4);
    page.drawText(text, { x: marginLeft, y, size, font: usedFont, color: rgb(r, g, b), maxWidth: contentWidth });
    y -= size + 4;
  }

  function drawRepGroupEntries(questionLabel: string, entries: RepGroupEntry[]) {
    if (entries.length === 0) return;
    const size = 9;
    ensureSpace((size + 4) * 2);
    page.drawText(questionLabel + ":", { x: marginLeft, y, size, font: boldFont, color: rgb(0, 0, 0), maxWidth: contentWidth });
    y -= size + 4;
    for (const entry of entries) {
      ensureSpace((size + 4) * (entry.fields.length + 1));
      page.drawText(`${entry.index}. Eintrag`, { x: marginLeft + 10, y, size: size + 1, font: boldFont, color: rgb(0.2, 0.2, 0.2), maxWidth: contentWidth - 10 });
      y -= size + 4;
      for (const field of entry.fields) {
        page.drawText(`${field.label}: ${field.value}`, { x: marginLeft + 20, y, size, font, color: rgb(0, 0, 0), maxWidth: contentWidth - 20 });
        y -= size + 4;
      }
      y -= size / 2;
    }
    y -= sectionGap / 2;
  }

  function drawWrappedPair(label: string, value: string) {
    const size = 9;
    const charsPerLine = Math.floor(contentWidth / (size * 0.52));
    const valueLines = Math.ceil((value.length || 1) / charsPerLine);
    ensureSpace((1 + valueLines) * (size + 4));
    page.drawText(`${label}:`, { x: marginLeft, y, size, font: boldFont, color: rgb(0, 0, 0), maxWidth: contentWidth });
    y -= size + 3;
    const displayValue = value && value.trim() !== "" ? value : "–";
    page.drawText(displayValue, { x: marginLeft + 12, y, size, font, color: displayValue === "–" ? rgb(0.5, 0.5, 0.5) : rgb(0, 0, 0), maxWidth: contentWidth - 12 });
    y -= size + 5;
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
