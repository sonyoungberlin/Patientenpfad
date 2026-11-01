import type { SemanticDocument, SemanticDocumentItem } from "./appTextXml";
import type { DocumentationSegment, QuestionDefinition } from "./blockCatalog";
import { computeVisibleBlockIds, computeVisibleQuestionIds } from "./conditionalLogic";
import { computeAllDerivedValues } from "./derivedValues";
import { formatDocumentationSegmentAnswer } from "./formatAnswer";
import type { FrozenBlock } from "./frozenBlocks";
import { buildOptionsByQuestionId, parseMultiSelectValue } from "./multiSelect";
import { getQuestionOptionValues } from "./questionOptions";
import { sortFrozenBlocksByLayout } from "./internalBlockLayout";

type VariantOutputText = {
  outputMode?: "text" | "none";
  documentationText?: string;
  documentationSegments?: DocumentationSegment[];
};

type VariantBlockOutput = VariantOutputText & {
  sharedDocumentationText?: string;
  fieldTexts?: Record<string, VariantOutputText>;
  optionTexts?: Record<string, Record<string, VariantOutputText>>;
};

export type PracticeOutputProjection = {
  noteText: string;
  compactText: string;
  outputStatus: "text" | "none" | "empty" | "unconfigured";
  semanticDocument: SemanticDocument;
};

function outputText(
  output: VariantOutputText,
  questionsById: ReadonlyMap<string, QuestionDefinition>,
  answers: Record<string, string>,
): string | null {
  if (output.outputMode === "none") return null;
  if (output.documentationSegments) {
    let hasMissingAnswer = false;
    const resolve = (segments: DocumentationSegment[]): string => segments.map((segment) => {
      if (segment.kind === "text") return segment.text;
      if (segment.kind === "conditional") {
        const controllingQuestion = questionsById.get(segment.questionId);
        const raw = answers[segment.questionId] ?? "";
        const matches = controllingQuestion?.type === "multi_select"
          ? parseMultiSelectValue(raw, getQuestionOptionValues(controllingQuestion)).includes(segment.optionValue)
          : raw === segment.optionValue;
        return matches ? resolve(segment.segments) : "";
      }
      const question = questionsById.get(segment.questionId);
      const raw = (answers[segment.questionId] ?? "").trim();
      if (!question || !raw) {
        hasMissingAnswer = true;
        return "";
      }
      return formatDocumentationSegmentAnswer(question, raw);
    }).join("");
    const resolved = resolve(output.documentationSegments);
    return hasMissingAnswer || !resolved.trim() ? null : resolved;
  }
  const text = output.documentationText?.trim();
  return text || null;
}

function collectReferences(
  segments: DocumentationSegment[] | undefined,
  answers: Record<string, string>,
  questionsById: ReadonlyMap<string, QuestionDefinition>,
  result: Set<string>,
): void {
  for (const segment of segments ?? []) {
    if (segment.kind === "answerRef") {
      result.add(segment.questionId);
    } else if (segment.kind === "conditional") {
      const question = questionsById.get(segment.questionId);
      const raw = answers[segment.questionId] ?? "";
      const matches = question?.type === "multi_select"
        ? parseMultiSelectValue(raw, getQuestionOptionValues(question)).includes(segment.optionValue)
        : raw === segment.optionValue;
      if (matches) collectReferences(segment.segments, answers, questionsById, result);
    }
  }
}

function selectedValues(question: QuestionDefinition, raw: string): string[] {
  if (!raw.trim()) return [];
  return question.type === "multi_select"
    ? parseMultiSelectValue(raw, getQuestionOptionValues(question))
    : [raw];
}

function blockItemType(block: FrozenBlock): SemanticDocumentItem["type"] {
  const itemType = block.documentationItemType ?? block.questions[0]?.documentationItemType;
  return itemType === "measurement" || itemType === "listItem" || itemType === "freeText"
    ? itemType
    : "bodyText";
}

export function buildPracticeOutputProjection(input: {
  answers: Record<string, string>;
  frozenBlocks: FrozenBlock[];
  outputVariantId: string;
  documentTitle?: string;
}): PracticeOutputProjection {
  const document: SemanticDocument = {
    ...(input.documentTitle ? { documentTitle: input.documentTitle } : {}),
    sections: [
      { slot: 1, items: [] },
      { slot: 2, items: [] },
      { slot: 3, items: [] },
    ],
  };
  const answers = input.answers;
  const compactTextParts: string[] = [];
  let sawNone = false;
  let sawEmpty = false;
  let sawUnconfigured = false;
  const derivedValues = computeAllDerivedValues(answers);
  const blocks = sortFrozenBlocksByLayout(input.frozenBlocks);
  const visibleBlockIds = computeVisibleBlockIds(
    blocks.flatMap((block) => block.conditionalRules),
    blocks,
    answers,
    derivedValues as Record<string, number>,
  );

  for (const block of blocks) {
    if (!visibleBlockIds.has(block.id)) continue;
    const variant = block.documentationOutputVariants?.[input.outputVariantId] as VariantBlockOutput | undefined;
    if (!variant) {
      sawUnconfigured = true;
      continue;
    }

    const visibleQuestionIds = computeVisibleQuestionIds(
      block.conditionalRules,
      block.questions.map((question) => question.id),
      answers,
      derivedValues as Record<string, number>,
      buildOptionsByQuestionId(block.questions),
    );
    const questionsById = new Map(block.questions.map((question) => [question.id, question]));
    const rootConfigured = variant.outputMode === "none" || variant.outputMode === "text" ||
      Boolean(variant.documentationText?.trim()) || Boolean(variant.documentationSegments?.length);
    const references = new Set<string>();

    const optionOutputs: Array<{ sourceQuestionId: string; output: VariantOutputText; text: string }> = [];
    for (const [questionId, optionTexts] of Object.entries(variant.optionTexts ?? {})) {
      const question = questionsById.get(questionId);
      const raw = (answers[questionId] ?? "").trim();
      if (!question || !visibleQuestionIds.has(questionId) || !raw) continue;
      for (const optionValue of selectedValues(question, raw)) {
        const output = optionTexts[optionValue];
        if (!output) {
          if (!rootConfigured) sawUnconfigured = true;
          continue;
        }
        if (output.outputMode === "none") {
          sawNone = true;
          continue;
        }
        if (output.outputMode !== "text" && !output.documentationText?.trim() && !output.documentationSegments?.length) {
          sawUnconfigured = true;
          continue;
        }
        const text = outputText(output, questionsById, answers);
        if (!text) {
          sawEmpty = true;
          continue;
        }
        optionOutputs.push({ sourceQuestionId: questionId, output, text });
        collectReferences(output.documentationSegments, answers, questionsById, references);
      }
    }

    const fieldOutputs: Array<{ questionId: string; output: VariantOutputText; text: string }> = [];
    for (const [questionId, output] of Object.entries(variant.fieldTexts ?? {})) {
      const question = questionsById.get(questionId);
      if (!question || !visibleQuestionIds.has(questionId) || !(answers[questionId] ?? "").trim()) continue;
      if (output.outputMode === "none") {
        sawNone = true;
        continue;
      }
      const text = outputText(output, questionsById, answers);
      if (text) fieldOutputs.push({ questionId, output, text });
      else if (output.outputMode === "text" || output.documentationText?.trim() || output.documentationSegments?.length) sawEmpty = true;
      else sawUnconfigured = true;
    }

    for (const { questionId, output } of fieldOutputs) {
      collectReferences(output.documentationSegments, answers, questionsById, references);
      for (const segment of output.documentationSegments ?? []) {
        if (segment.kind === "answerRef" && segment.questionId !== questionId) references.add(segment.questionId);
      }
    }

    const itemType = blockItemType(block);
    const items: SemanticDocumentItem[] = [];
    if (variant.outputMode === "none") sawNone = true;
    else if (variant.outputMode === "text" || variant.documentationText?.trim() || variant.documentationSegments?.length) {
      if (!outputText(variant, questionsById, answers)) sawEmpty = true;
    }
    const rootOutput = outputText(variant, questionsById, answers);
    if (rootOutput) {
      items.push({ type: itemType, text: rootOutput });
      collectReferences(variant.documentationSegments, answers, questionsById, references);
    }
    if (optionOutputs.length > 0 && variant.sharedDocumentationText?.trim()) {
      items.push({ type: "bodyText", text: variant.sharedDocumentationText.trim() });
    }
    items.push(...optionOutputs.map(({ text }) => ({ type: itemType, text })));
    items.push(...fieldOutputs
      .filter(({ questionId }) => !references.has(questionId))
      .map(({ text }) => ({ type: itemType, text })));

    if (items.length === 0) continue;
  compactTextParts.push(...items.map((item) => item.text));
    const sectionIndex = block.section === 2 ? 1 : block.section === 3 ? 2 : 0;
    document.sections[sectionIndex].items.push({
      type: "heading",
      text: block.label,
      headingLevel: block.structuredHeadingLevel ?? 1,
      headingVisibility: block.structuredHeadingVisibility ?? "visible",
    }, ...items);
  }

  const noteText = document.sections.flatMap((section) => section.items.map((item) => item.text)).join("\n");
  const compactText = compactTextParts.join("\n");
  const outputStatus = compactText.trim()
    ? "text"
    : sawEmpty
      ? "empty"
      : sawUnconfigured
        ? "unconfigured"
        : sawNone
          ? "none"
          : "unconfigured";
  return { noteText, compactText, outputStatus, semanticDocument: document };
}