import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  getM2QuestionsForCheckpoint,
} from "@/lib/office/m2Questions";
import {
  getOfficeCheckpointCatalog,
  getOfficeTopicVersion,
  isOfficeTopicId,
  OFFICE_TOPIC_HIRING_REPLACEMENT,
  OFFICE_TOPIC_MFA_HIRING,
  OFFICE_TOPIC_MINOR_MFA_APPRENTICE_HIRING,
  OFFICE_TOPIC_PHYSICIAN_EXIT_ORGANIZATION,
  type OfficeTopicId,
} from "@/lib/office/checkpointCatalog";

export type OfficeM2PrintQuestion = { text: string };

export type OfficeM2PrintCheckpoint = {
  title: string;
  questions: OfficeM2PrintQuestion[];
};

export type OfficeM2PrintSection = {
  title: string | null;
  checkpoints: OfficeM2PrintCheckpoint[];
};

export type OfficeM2PrintInput = {
  caseTitle: string;
  topicTitle: string;
  sections: OfficeM2PrintSection[];
  printedAt?: Date;
};

export type M2PrintPdfInput = {
  title: string;
  headerLines?: string[];
  sections: OfficeM2PrintSection[];
  printedAt?: Date;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isVersionedM2(topicId: OfficeTopicId, version: number): boolean {
  return version === 2 && (
    topicId === OFFICE_TOPIC_HIRING_REPLACEMENT ||
    topicId === OFFICE_TOPIC_MFA_HIRING ||
    topicId === OFFICE_TOPIC_PHYSICIAN_EXIT_ORGANIZATION ||
    topicId === OFFICE_TOPIC_MINOR_MFA_APPRENTICE_HIRING
  );
}

export function buildOfficeM2PrintSections(
  topicIdValue: unknown,
  templateVersionValue: unknown,
  checkpointValue: unknown,
): OfficeM2PrintSection[] {
  if (typeof topicIdValue !== "string" || !isOfficeTopicId(topicIdValue)) return [];

  const topicId = topicIdValue;
  const templateVersion = getOfficeTopicVersion(topicId, templateVersionValue);
  const catalogTitles = new Map(
    getOfficeCheckpointCatalog(topicId, templateVersion).map((checkpoint) => [checkpoint.id, checkpoint.title]),
  );
  const checkpoints = Array.isArray(checkpointValue)
    ? checkpointValue.filter((value): value is Record<string, unknown> =>
        isRecord(value) && typeof value.id === "string",
      )
    : [];
  const versioned = isVersionedM2(topicId, templateVersion);
  const grouped = new Map<string | null, OfficeM2PrintCheckpoint[]>();

  for (const checkpoint of checkpoints) {
    const checkpointId = checkpoint.id as string;
    const title = typeof checkpoint.title === "string"
      ? checkpoint.title
      : catalogTitles.get(checkpointId);
    if (!title) continue;

    const questions = getM2QuestionsForCheckpoint(topicId, checkpointId, templateVersion)
      .map((question) => ({ text: question.text }));
    const sectionTitle = versioned
      ? typeof checkpoint.section === "string" && checkpoint.section
        ? checkpoint.section
        : "Weitere Prüfpunkte"
      : null;
    const section = grouped.get(sectionTitle) ?? [];
    section.push({ title, questions });
    grouped.set(sectionTitle, section);
  }

  return Array.from(grouped, ([title, items]) => ({ title, checkpoints: items }));
}

function wrapText(
  text: string,
  fontSize: number,
  maxWidth: number,
  widthOfText: (text: string, fontSize: number) => number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.replaceAll("\r\n", "\n").split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (widthOfText(candidate, fontSize) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = "";
      for (const character of [...word]) {
        if (line && widthOfText(line + character, fontSize) > maxWidth) {
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

export async function buildOfficeM2PrintPdf(input: OfficeM2PrintInput): Promise<Uint8Array> {
  return buildM2PrintPdf({
    title: "M2-Druckversion",
    headerLines: [`Fall: ${input.caseTitle}`, `Office-Thema: ${input.topicTitle}`],
    sections: input.sections,
    printedAt: input.printedAt,
  });
}

export async function buildM2PrintPdf(input: M2PrintPdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const marginLeft = 48;
  const marginRight = 48;
  const marginBottom = 48;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const questionFontSize = 10.5;
  const questionLineHeight = 14;
  let page = pdf.addPage([pageWidth, pageHeight]);
  const pages: ReturnType<typeof pdf.addPage>[] = [page];
  let y = 0;

  const drawPageHeader = () => {
    const headerTop = pageHeight - 42;
    page.drawText(input.title, {
      x: marginLeft,
      y: headerTop,
      size: 11,
      font: bold,
      color: rgb(0, 0, 0),
    });
    const printDate = new Intl.DateTimeFormat("de-DE").format(input.printedAt ?? new Date());
    const dateWidth = regular.widthOfTextAtSize(`Druckdatum: ${printDate}`, 9);
    page.drawText(`Druckdatum: ${printDate}`, {
      x: pageWidth - marginRight - dateWidth,
      y: headerTop,
      size: 9,
      font: regular,
      color: rgb(0, 0, 0),
    });

    let headerY = headerTop - 17;
    for (const headerLine of (input.headerLines ?? []).flatMap((line) =>
      wrapText(line, 9, contentWidth, textWidth),
    )) {
      page.drawText(headerLine, {
        x: marginLeft,
        y: headerY,
        size: 9,
        font: regular,
        color: rgb(0, 0, 0),
      });
      headerY -= 12;
    }
    page.drawLine({
      start: { x: marginLeft, y: headerY - 4 },
      end: { x: pageWidth - marginRight, y: headerY - 4 },
      thickness: 0.7,
      color: rgb(0, 0, 0),
    });
    y = headerY - 22;
  };

  const addPage = () => {
    page = pdf.addPage([pageWidth, pageHeight]);
    pages.push(page);
    drawPageHeader();
  };

  const textWidth = (text: string, size: number) => regular.widthOfTextAtSize(text, size);
  const getQuestionLines = (number: number, text: string) =>
    wrapText(`${number}. ${text}`, questionFontSize, contentWidth, textWidth);
  const questionHeight = (lineCount: number) => lineCount * questionLineHeight + 12 + 17 + 8 + 28 + 12;

  drawPageHeader();
  let questionNumber = 0;

  for (const section of input.sections) {
    if (section.title) {
      const firstCheckpoint = section.checkpoints[0];
      const firstQuestion = firstCheckpoint?.questions[0];
      const nextQuestionHeight = firstQuestion
        ? questionHeight(getQuestionLines(questionNumber + 1, firstQuestion.text).length)
        : 0;
      if (y - (24 + 20 + nextQuestionHeight) < marginBottom) addPage();
      page.drawText(section.title, {
        x: marginLeft,
        y,
        size: 12,
        font: bold,
        color: rgb(0, 0, 0),
      });
      y -= 22;
    }

    for (const checkpoint of section.checkpoints) {
      if (checkpoint.title) {
        const firstQuestion = checkpoint.questions[0];
        const firstQuestionHeight = firstQuestion
          ? questionHeight(getQuestionLines(questionNumber + 1, firstQuestion.text).length)
          : 0;
        if (y - (18 + firstQuestionHeight) < marginBottom) addPage();
        page.drawText(checkpoint.title, {
          x: marginLeft,
          y,
          size: 10.5,
          font: bold,
          color: rgb(0, 0, 0),
        });
        y -= 18;
      }

      for (const question of checkpoint.questions) {
        questionNumber += 1;
        const lines = getQuestionLines(questionNumber, question.text);
        const blockHeight = questionHeight(lines.length);
        if (y - blockHeight < marginBottom) addPage();

        for (const line of lines) {
          page.drawText(line, {
            x: marginLeft,
            y,
            size: questionFontSize,
            font: regular,
            color: rgb(0, 0, 0),
          });
          y -= questionLineHeight;
        }
        y -= 12;

        let optionX = marginLeft;
        for (const label of ["Ja", "Nein", "Unklar"]) {
          page.drawRectangle({
            x: optionX,
            y: y - 1,
            width: 9,
            height: 9,
            borderColor: rgb(0, 0, 0),
            borderWidth: 0.8,
          });
          page.drawText(label, {
            x: optionX + 14,
            y,
            size: 9.5,
            font: regular,
            color: rgb(0, 0, 0),
          });
          optionX += 90;
        }
        y -= 25;

        for (let noteLine = 0; noteLine < 2; noteLine += 1) {
          page.drawLine({
            start: { x: marginLeft, y },
            end: { x: pageWidth - marginRight, y },
            thickness: 0.45,
            color: rgb(0.35, 0.35, 0.35),
          });
          y -= 14;
        }
        y -= 12;
      }
      y -= 3;
    }
  }

  pages.forEach((pageToNumber, index) => {
    const number = `Seite ${index + 1} von ${pages.length}`;
    const width = regular.widthOfTextAtSize(number, 8);
    pageToNumber.drawText(number, {
      x: pageWidth - marginRight - width,
      y: 24,
      size: 8,
      font: regular,
      color: rgb(0, 0, 0),
    });
  });

  return pdf.save();
}