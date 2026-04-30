import { NextRequest } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import { BLOCK_CATALOG } from "@/lib/questionnaire/blockCatalog";
import type { QuestionDefinition } from "@/lib/questionnaire/blockCatalog";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const account = await getSessionAccount(req);
  if (!account) {
    return new Response(JSON.stringify({ ok: false, error: "Nicht angemeldet." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!account.is_approved) {
    return new Response(JSON.stringify({ ok: false, error: "Account nicht freigeschaltet." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const session = await prisma.patientQuestionnaireSession.findUnique({
    where: { id },
    select: {
      id: true,
      owner_account_id: true,
      status: true,
      patient_reference: true,
      submitted_at: true,
      selected_block_ids: true,
      deduplicated_questions: true,
      answers: true,
    },
  });

  if (!session) {
    return new Response(JSON.stringify({ ok: false, error: "Session nicht gefunden." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (session.owner_account_id !== account.id) {
    return new Response(JSON.stringify({ ok: false, error: "Keine Berechtigung." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (session.status !== "completed") {
    return new Response(
      JSON.stringify({ ok: false, error: "PDF nur für abgeschlossene Fragebögen verfügbar." }),
      { status: 409, headers: { "Content-Type": "application/json" } },
    );
  }

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

  // Build per-block question lists for structured output
  const blockSections: { label: string; questions: QuestionDefinition[] }[] = [];
  const assignedIds = new Set<string>();

  for (const blockId of selectedBlockIds) {
    const block = BLOCK_CATALOG[blockId];
    if (!block) continue;
    const blockQuestions = block.questionIds
      .map((qid) => questions.find((q) => q.id === qid))
      .filter((q): q is QuestionDefinition => q !== undefined && !assignedIds.has(q.id));
    blockQuestions.forEach((q) => assignedIds.add(q.id));
    if (blockQuestions.length > 0) {
      blockSections.push({ label: block.label, questions: blockQuestions });
    }
  }

  // Any remaining questions not assigned to a block (e.g. deduplication edge cases)
  const remaining = questions.filter((q) => !assignedIds.has(q.id));
  if (remaining.length > 0) {
    blockSections.push({ label: "Weitere Angaben", questions: remaining });
  }

  // Build PDF
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
    opts: { size?: number; bold?: boolean; color?: [number, number, number] } = {},
  ) {
    const size = opts.size ?? 10;
    const usedFont = opts.bold ? boldFont : font;
    const [r, g, b] = opts.color ?? [0, 0, 0];
    ensureSpace(size + 4);
    page.drawText(text, {
      x: marginLeft,
      y,
      size,
      font: usedFont,
      color: rgb(r, g, b),
      maxWidth: contentWidth,
    });
    y -= size + 4;
  }

  function drawWrappedPair(label: string, value: string) {
    const size = 9;
    const labelText = `${label}:`;

    // Estimate lines needed (rough: ~80 chars per line at size 9)
    const charsPerLine = Math.floor(contentWidth / (size * 0.52));
    const valueLines = Math.ceil((value.length || 1) / charsPerLine);
    ensureSpace((1 + valueLines) * (size + 4));

    page.drawText(labelText, {
      x: marginLeft,
      y,
      size,
      font: boldFont,
      color: rgb(0, 0, 0),
      maxWidth: contentWidth,
    });
    y -= size + 3;

    const displayValue = value && value.trim() !== "" ? value : "–";
    page.drawText(displayValue, {
      x: marginLeft + 12,
      y,
      size,
      font,
      color: displayValue === "–" ? rgb(0.5, 0.5, 0.5) : rgb(0, 0, 0),
      maxWidth: contentWidth - 12,
    });
    y -= size + 5;
  }

  // Title
  drawText("Fragebogen – Patientenangaben", { size: 16, bold: true });
  y -= 4;

  // Metadata
  const submittedStr = session.submitted_at
    ? session.submitted_at.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })
    : "–";
  drawText(`Datum: ${submittedStr}`, { size: 9, color: [0.3, 0.3, 0.3] });
  drawText(`Patientenreferenz: ${session.patient_reference ?? "–"}`, {
    size: 9,
    color: [0.3, 0.3, 0.3],
  });

  y -= sectionGap;

  // Sections
  for (const section of blockSections) {
    ensureSpace(lineHeight * 3);

    // Section heading
    y -= 4;
    drawText(section.label, { size: 11, bold: true });

    // Separator line
    ensureSpace(4);
    page.drawLine({
      start: { x: marginLeft, y: y + 2 },
      end: { x: marginLeft + contentWidth, y: y + 2 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
    y -= 6;

    for (const q of section.questions) {
      drawWrappedPair(q.text, answers[q.id] ?? "");
    }

    y -= sectionGap;
  }

  const pdfBytes = await pdfDoc.save();

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="fragebogen-${id}.pdf"`,
    },
  });
}
