import type {
  BlockDocumentationPresentation,
  QuestionDefinition,
} from "./blockCatalog";

type InlineDocumentationBlock = {
  questions: QuestionDefinition[];
  documentationPresentation?: BlockDocumentationPresentation;
};

function appendUnit(value: string, question: QuestionDefinition): string {
  if (!question.unit) return value;
  return `${value}${question.unitSeparator ?? " "}${question.unit}`;
}

export function resolveInlineDocumentation(
  block: InlineDocumentationBlock,
  answers: Record<string, string>,
  visibleQuestionIds?: ReadonlySet<string>,
): string | null {
  const presentation = block.documentationPresentation;
  if (presentation?.layout !== "inline") return null;

  const questionsById = new Map(block.questions.map((question) => [question.id, question]));
  const parts: string[] = [];

  for (const item of presentation.items) {
    const questions = item.questionIds
      .filter((questionId) => visibleQuestionIds?.has(questionId) ?? true)
      .map((questionId) => questionsById.get(questionId))
      .filter((question): question is QuestionDefinition => question !== undefined);
    if (questions.length !== item.questionIds.length) continue;

    const values = questions.map((question) => (answers[question.id] ?? "").trim());
    const populated = values.filter((value) => value !== "");
    if (populated.length === 0) continue;
    if ((item.requireAll ?? questions.length > 1) && populated.length !== questions.length) continue;

    const value = appendUnit(populated.join(item.valueSeparator ?? ""), questions[0]);
    parts.push(`${item.label}${item.labelSeparator ?? ": "}${value}`);
  }

  return parts.length > 0 ? parts.join(presentation.separator) : null;
}