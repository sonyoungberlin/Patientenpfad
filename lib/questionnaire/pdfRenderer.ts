import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type {
  BlockDocumentationPresentation,
  QuestionDefinition,
  QuestionnaireBlock,
} from "./blockCatalog";
import {
  parseRepeatableGroupEntries,
  parseFacharztEntries,
  formatYesNoValue,
  buildDerivedValueLines,
  getStructuredDocumentationQuestionIds,
  joinMedicalStatementSentences,
  resolveQuestionDocumentation,
  resolveStructuredQuestionDocumentation,
} from "./formatAnswer";
import { getQuestionOptionValues } from "./questionOptions";
import type { RepGroupEntry } from "./formatAnswer";
import { computeAllDerivedValues } from "./derivedValues";
import { computeVisibleBlockIds, computeVisibleQuestionIds } from "./conditionalLogic";
import { buildOptionsByQuestionId } from "./multiSelect";
import { buildFrozenBlocks, getInternalPatientSignatureMetadata, parseFrozenBlocks, type FrozenBlock } from "./frozenBlocks";
import { computeQuestionnaireAttentionHints } from "./attentionHints";
import { normalizeTextForPvs } from "./normalizeTextForPvs";
import { resolveInternalWorkflow } from "./internalWorkflowRegistry";
import {
  hasDocumentedBlockContent,
  isDocumentedContentSnapshot,
  isNewBlockBasedInternalSession,
} from "./documentedContent";
import {
  buildQuestionnaireExportFilename,
  sanitizeFilenamePart,
} from "./questionnaireExportFilename";
import { resolveInlineDocumentation } from "./inlineDocumentation";
import { formatStructuredVaccinationEntries } from "./vaccinationReview";
import { formatDigitalRequestSnapshot } from "./digitalRequestSnapshot";

export { sanitizeFilenamePart } from "./questionnaireExportFilename";

export type PdfSessionInput = {
  patient_reference: string | null;
  submitted_at: Date | null;
  submitted_by: string;
  selected_block_ids: unknown;
  deduplicated_questions: unknown;
  answers: unknown;
  source: string;
  session_kind?: string;
  internal_workflow_id?: unknown;
  practice_form: { title: string } | null;
  frozen_blocks?: unknown;
  digital_request_snapshot?: unknown;
};

export type PdfRenderOptions = {
  /** Titel oben auf der ersten Seite. */
  title: string;
  /** Beschriftung der Referenzzeile (z. B. "Patientenreferenz" / "Referenz"). */
  referenceLabel: string;
  /** Blockkatalog zum Nachschlagen von Labels und Conditional Rules. */
  blockCatalog: Record<string, QuestionnaireBlock>;
  /** Optionaler fachlicher Dateiname; ohne Angabe bleibt die Bestandslogik unverändert. */
  filenameLabel?: string;
  /** Optionaler finaler Dateiname für spezialisierte Exportpfade. */
  filename?: string;
  /** Interne Workflows dürfen unbeantwortete Fragen ausblenden. */
  omitUnanswered?: boolean;
  /** Unterdrückt ein Fragenlabel, wenn es exakt der Blocküberschrift entspricht. */
  omitMatchingBlockQuestionLabels?: boolean;
  /** Interne Workflows können vollständig leere Blocks gezielt auslassen. */
  omitEmptyBlocksInPdf?: boolean;
  patientCopy?: { returnEmail: string };
};

export async function buildQuestionnairePdfBytes(
  session: PdfSessionInput,
  opts: PdfRenderOptions,
): Promise<{ bytes: Uint8Array; filename: string }> {
  const { title, referenceLabel, blockCatalog } = opts;

  const questions = Array.isArray(session.deduplicated_questions)
    ? (session.deduplicated_questions as QuestionDefinition[]).filter(
        (question) => question.id !== "PATIENT_COPY_EMAIL",
      )
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
  const snapshotBlocks = parseFrozenBlocks(session.frozen_blocks);
  const isNewBlockBased = isNewBlockBasedInternalSession({
    sessionKind: session.session_kind ?? "",
    internalWorkflowId: session.internal_workflow_id,
    frozenBlocks: snapshotBlocks,
  });
  const useDocumentedContent = session.session_kind === "internal_documentation" &&
    (isNewBlockBased || isDocumentedContentSnapshot(snapshotBlocks));
  const internalWorkflow = session.session_kind === "internal_documentation" && !isNewBlockBased
    ? resolveInternalWorkflow(session.internal_workflow_id)
    : null;
  const omitMatchingBlockQuestionLabels = opts.omitMatchingBlockQuestionLabels
    ?? internalWorkflow?.legacyOutputPolicy.omitMatchingBlockQuestionLabels
    ?? false;

  const blockSections: {
    id: string;
    label: string;
    questions: QuestionDefinition[];
    visibleQIds: Set<string>;
    documentationPresentation?: BlockDocumentationPresentation;
  }[] = [];
  const assignedIds = new Set<string>();

  const renderBlocks: Array<{
    id: string;
    label: string;
    displayOrder: number;
    questions: QuestionDefinition[];
    conditionalRules: import("./conditionalLogic").ConditionalRule[];
    initiallyVisible: boolean;
    documentationPresentation?: BlockDocumentationPresentation;
    paperSignature?: { label: string };
  }> = snapshotBlocks
    ? snapshotBlocks
    : selectedBlockIds
        .map((blockId) => blockCatalog[blockId])
        .filter((block): block is QuestionnaireBlock => block !== undefined)
        .map((block) => ({
          ...block,
          questions: block.questionIds
            .map((questionId) => questions.find((question) => question.id === questionId))
            .filter((question): question is QuestionDefinition => question !== undefined),
          conditionalRules: block.conditionalRules ?? [],
          initiallyVisible: true,
        }));
  const allBlockRules = renderBlocks.flatMap((block) => block.conditionalRules);
  const visibleBlockIds = computeVisibleBlockIds(
    allBlockRules,
    renderBlocks,
    answers,
    derivedValues,
  );
  const visibleQuestionIds = new Set<string>();

  for (const block of renderBlocks) {
    if (!visibleBlockIds.has(block.id)) continue;
    const visibleQIds = computeVisibleQuestionIds(
      allBlockRules,
      block.questions.map((question) => question.id),
      answers,
      derivedValues as Record<string, number>,
      buildOptionsByQuestionId(block.questions),
    );
    visibleQIds.forEach((id) => visibleQuestionIds.add(id));
    const blockQuestions = block.questions
      .filter((q) => !assignedIds.has(q.id));
    blockQuestions.forEach((q) => assignedIds.add(q.id));
    if (blockQuestions.length > 0) {
      blockSections.push({
        id: block.id,
        label: block.label,
        questions: blockQuestions,
        visibleQIds,
        documentationPresentation: block.documentationPresentation,
      });
    }
  }
  if (!snapshotBlocks) {
    const legacyBlocks = buildFrozenBlocks(selectedBlockIds);
    const legacyVisibleBlockIds = computeVisibleBlockIds(
      legacyBlocks.flatMap((block) => block.conditionalRules),
      legacyBlocks,
      answers,
      derivedValues,
    );
    for (const block of legacyBlocks) {
      if (!legacyVisibleBlockIds.has(block.id)) continue;
      computeVisibleQuestionIds(
        block.conditionalRules,
        block.questions.map((question) => question.id),
        answers,
        derivedValues as Record<string, number>,
        buildOptionsByQuestionId(block.questions),
      ).forEach((id) => visibleQuestionIds.add(id));
    }
  }

  const globalVisibleQIds = new Set<string>();
  blockSections.forEach(({ visibleQIds }) => visibleQIds.forEach((id) => globalVisibleQIds.add(id)));
  const remaining = questions.filter((q) => !assignedIds.has(q.id));
  if (remaining.length > 0) {
    blockSections.push({ id: "__remaining__", label: "Weitere Angaben", questions: remaining, visibleQIds: globalVisibleQIds });
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
    const normalizedText = normalizeTextForPvs(text);
    for (const paragraph of normalizedText.replaceAll("\r\n", "\n").split("\n")) {
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

  function drawWrappedValue(value: string) {
    drawTextBlock(value, { size: 9, lineHeight });
    y -= 5;
  }

  function drawRepGroupEntries(questionLabel: string, entries: RepGroupEntry[], showQuestionLabel = true) {
    if (entries.length === 0) return;
    if (showQuestionLabel) {
      drawTextBlock(`${questionLabel}:`, { size: 9, bold: true, lineHeight });
      y -= 2;
    }
    for (const entry of entries) {
      drawTextBlock(entry.title ?? `${entry.index}. Eintrag`, {
        size: 10,
        bold: true,
        color: [0.2, 0.2, 0.2],
        x: marginLeft + 10,
        maxWidth: contentWidth - 10,
        lineHeight,
      });
      y -= 1;
      for (const field of entry.fields) {
        if (field.documentationText) drawWrappedValue(field.documentationText);
        else drawWrappedPair(field.label, field.value);
      }
      y -= 3;
    }
    y -= sectionGap / 2;
  }

  if (!isNewBlockBased) {
    drawText(title, { size: 16, bold: true });
    y -= 4;
  }

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

  const digitalRequestSnapshot = formatDigitalRequestSnapshot(session.digital_request_snapshot);
  if (digitalRequestSnapshot) {
    y -= sectionGap;
    drawText(digitalRequestSnapshot.heading, { size: 11, bold: true });
    for (const field of digitalRequestSnapshot.fields) {
      drawWrappedPair(field.label, field.value);
    }
  }

  const derivedValueLines = buildDerivedValueLines(derivedValues);
  const attentionHintLines = computeQuestionnaireAttentionHints(
    answers,
    visibleQuestionIds,
  ).map((hint) => hint.label);
  if (!isNewBlockBased && (derivedValueLines.length > 0 || attentionHintLines.length > 0)) {
    y -= sectionGap;
    ensureSpace(lineHeight * 2);
    drawText("Berechnete Werte", { size: 11, bold: true });
    for (const dvLine of derivedValueLines) {
      drawText(dvLine, { size: 9 });
    }
    for (const hintLine of attentionHintLines) {
      drawText(hintLine, { size: 9 });
    }
  }

  y -= sectionGap;

  for (const section of blockSections) {
    const snapshotBlock = renderBlocks.find((block) => block.id === section.id);
    const questionsById = new Map(section.questions.map((question) => [question.id, question]));
    const composedQuestionIds = new Set<string>();
    for (const question of section.questions) {
      const raw = (answers[question.id] ?? "").trim();
      if (raw !== "") {
          getStructuredDocumentationQuestionIds(question, raw)
            .forEach((id) => {
              if (id !== question.id) composedQuestionIds.add(id);
            });
      }
    }
    const useInlineDocumentation = isNewBlockBased &&
      section.documentationPresentation?.layout === "inline";
    const inlineDocumentation = useInlineDocumentation
      ? resolveInlineDocumentation(section, answers, section.visibleQIds)
      : null;
    if (useInlineDocumentation && !inlineDocumentation) continue;
    if (
      useDocumentedContent &&
      snapshotBlock &&
      !hasDocumentedBlockContent(snapshotBlock, answers, section.visibleQIds)
    ) continue;
    if (
      !useDocumentedContent &&
      opts.omitEmptyBlocksInPdf &&
      section.questions.every((question) => {
        if (!section.visibleQIds.has(question.id)) return true;
        const value = answers[question.id] ?? "";
        return value.trim() === "" || value === "[]";
      })
    ) continue;
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

    if (inlineDocumentation) {
      drawWrappedValue(inlineDocumentation);
      y -= sectionGap;
      continue;
    }

    const medicalStatementSentences: string[] = [];
    for (const q of section.questions) {
      const value = answers[q.id] ?? "";
      const isVisible = section.visibleQIds.has(q.id);
      const omitQuestionLabel = (useDocumentedContent || omitMatchingBlockQuestionLabels) && q.text === section.label;
      const useLegacyHealthCheckOutput = !useDocumentedContent &&
        session.internal_workflow_id === "health_check_v1";

      if (q.type === "confirmation" && value === "true") {
        drawWrappedPair("Bestätigt", q.text);
        continue;
      }

      if (
        (q.presentation === "health_check_follow_up" ||
          (useLegacyHealthCheckOutput && q.id === "HEALTH_CHECK_FOLLOW_UP_REQUIRED")) &&
        value.trim() !== ""
      ) {
        drawText(
          value === "nein"
            ? "Keine weitere Abklärung oder Kontrolle erforderlich."
            : "Weiteres Vorgehen erforderlich",
          { size: 9 },
        );
        y -= 5;
        continue;
      }

      if (!isVisible) {
        if (opts.omitUnanswered) continue;
        drawWrappedPair(q.text, "Nicht abgefragt");
        continue;
      }
      if (composedQuestionIds.has(q.id)) continue;
      if (q.documentationText) {
        drawWrappedValue(q.documentationText);
        continue;
      }
      if ((useDocumentedContent || opts.omitUnanswered) && value.trim() === "") continue;
      if (q.id === "FACHAERZTE") {
        const entries = parseFacharztEntries(value);
        entries.length > 0 ? drawRepGroupEntries(q.text, entries) : drawWrappedPair(q.text, "");
        continue;
      }
      if (q.type === "repeatable_group") {
        const structuredVaccinations = formatStructuredVaccinationEntries(value, q);
        if (structuredVaccinations.length > 0) {
          if (!omitQuestionLabel) drawTextBlock(`${q.text}:`, { size: 9, bold: true, lineHeight });
          for (const line of structuredVaccinations) drawWrappedValue(line);
          continue;
        }
        const entries = parseRepeatableGroupEntries(value, q.id, q);
        entries.length > 0
          ? drawRepGroupEntries(q.text, entries, !omitQuestionLabel)
          : drawWrappedPair(q.text, "");
        continue;
      }
      if (
        useLegacyHealthCheckOutput &&
        q.type === "yes_no" &&
        getQuestionOptionValues(q).includes(value)
      ) {
        drawWrappedPair(q.text, value);
        continue;
      }
      const structuredText = resolveStructuredQuestionDocumentation(
        q,
        value,
        answers,
        questionsById,
      );
      const resolved = structuredText !== null
        ? { documentationTexts: structuredText ? [structuredText] : [] }
        : resolveQuestionDocumentation(q, value, {
            includeUnit: isNewBlockBased,
          });
      if (section.id === "MEDICAL_STATEMENT") {
        medicalStatementSentences.push(...resolved.documentationTexts);
      } else {
        for (const documentationText of resolved.documentationTexts) drawWrappedValue(documentationText);
      }
      if (resolved.fallbackValue !== undefined) {
        const fallbackValue = q.type === "yes_no"
          ? formatYesNoValue(resolved.fallbackValue)
          : resolved.fallbackValue;
        omitQuestionLabel ? drawWrappedValue(fallbackValue) : drawWrappedPair(q.text, fallbackValue);
      }
    }

    if (medicalStatementSentences.length > 0) {
      drawWrappedValue(joinMedicalStatementSentences(medicalStatementSentences));
    }

    if (snapshotBlock?.paperSignature) {
      ensureSpace(lineHeight * 4);
      y -= sectionGap;
      drawText("____________________________", { size: 10 });
      drawText(snapshotBlock.paperSignature.label, { size: 9 });
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

  const patientSignature = getInternalPatientSignatureMetadata(session.frozen_blocks);
  if (patientSignature.required) {
    ensureSpace(lineHeight * 6);
    y -= sectionGap;
    const submittedDate = session.submitted_at
      ? session.submitted_at.toLocaleDateString("de-DE", { dateStyle: "short", timeZone: "Europe/Berlin" })
      : "–";
    drawText(`Ort, Datum: ${patientSignature.city ? `${patientSignature.city}, ` : ""}${submittedDate}`, { size: 10 });
    y -= 4;
    drawText("Unterschrift Patient/in:", { size: 10, bold: true });
    y -= 5;
    drawText("________________________________", { size: 10 });
  }

  const bytes = await pdfDoc.save();

  const filename = opts.filename ?? buildQuestionnaireExportFilename(session, {
    blockCatalog,
    filenameLabel: opts.filenameLabel,
    extension: "pdf",
  });

  return { bytes, filename };
}
