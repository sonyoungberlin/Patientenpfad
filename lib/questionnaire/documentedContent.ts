import type { QuestionDefinition } from "./blockCatalog";
import type { FrozenBlock } from "./frozenBlocks";
import {
  parseStructuredVaccinationAnswer,
  structuredVaccinationAnswerHasContent,
} from "./vaccinationReview";

function hasNonEmptyValue(value: string | undefined): boolean {
  return typeof value === "string" && value.trim() !== "" && value !== "[]";
}

function repeatableGroupHasContent(value: string, question: QuestionDefinition): boolean {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return false;
  }
  if (question.presentation === "vaccination_matrix" && parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const structured = parseStructuredVaccinationAnswer(value);
    return structured ? structuredVaccinationAnswerHasContent(structured) : false;
  }
  if (!Array.isArray(parsed)) return false;

  return parsed.some((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
    const values = Object.entries(entry as Record<string, unknown>)
      .filter(([key]) => question.presentation !== "vaccination_matrix" || key !== "vaccination_id")
      .map(([, entryValue]) => entryValue);
    return values.some((entryValue) => typeof entryValue === "string" && entryValue.trim() !== "");
  });
}

export function hasDocumentedAnswer(
  question: QuestionDefinition,
  answers: Record<string, string>,
): boolean {
  const value = answers[question.id];
  if (!hasNonEmptyValue(value)) return false;
  if (question.type !== "repeatable_group") return true;
  return repeatableGroupHasContent(value, question);
}

export function hasDocumentedBlockContent(
  block: FrozenBlock,
  answers: Record<string, string>,
  visibleQuestionIds?: ReadonlySet<string>,
): boolean {
  return block.questions.some((question) =>
    (visibleQuestionIds === undefined || visibleQuestionIds.has(question.id)) &&
    hasDocumentedAnswer(question, answers),
  );
}

export function isDocumentedContentSnapshot(
  blocks: ReadonlyArray<FrozenBlock> | null | undefined,
): boolean {
  return blocks?.some((block) => block.outputSemantics === "documented-content-v1") ?? false;
}

export function isNewBlockBasedInternalSession(input: {
  sessionKind: string;
  internalWorkflowId: unknown;
  frozenBlocks: ReadonlyArray<FrozenBlock> | null | undefined;
}): boolean {
  const blocks = input.frozenBlocks;
  return input.sessionKind === "internal_documentation" &&
    input.internalWorkflowId === null &&
    Array.isArray(blocks) &&
    blocks.length > 0 &&
    blocks.every((block) => block.outputSemantics === "documented-content-v1");
}