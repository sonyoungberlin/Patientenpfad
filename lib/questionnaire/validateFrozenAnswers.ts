import type { QuestionDefinition } from "./blockCatalog";
import {
  computeVisibleBlockIds,
  computeVisibleQuestionIds,
} from "./conditionalLogic";
import { computeAllDerivedValues } from "./derivedValues";
import { buildOptionsByQuestionId, parseMultiSelectValue } from "./multiSelect";
import { hasDocumentedAnswer } from "./documentedContent";
import type { FrozenBlock } from "./frozenBlocks";
import { getQuestionOptionValue, getQuestionOptionValues } from "./questionOptions";

export type FrozenAnswersValidationResult = {
  ok: boolean;
  invalidQuestionIds: string[];
};

function isAllowedOptionAnswer(question: QuestionDefinition, value: string): boolean {
  const optionValues = getQuestionOptionValues(question);
  if (question.type === "select" || question.type === "yes_no") {
    return optionValues.includes(value);
  }
  if (question.type === "multi_select") {
    const selected = parseMultiSelectValue(value, optionValues);
    return selected.length > 0 && selected.every((option) => optionValues.includes(option));
  }
  if (question.type === "time") return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
  if (question.type === "month") return /^\d{4}-(?:0[1-9]|1[0-2])$/.test(value);
  return true;
}

function hasValidRepeatableGroupEntries(question: QuestionDefinition, value: string): boolean {
  if (!question.groupSchema) return true;
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return false;
  }
  if (!Array.isArray(parsed)) return false;
  if (question.maxEntries !== undefined && parsed.length > question.maxEntries) return false;

  return parsed.every((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
    const record = entry as Record<string, unknown>;
    return question.groupSchema!.every((field) => {
      const controllingValue = typeof record[field.conditionalOn ?? ""] === "string"
        ? record[field.conditionalOn ?? ""] as string
        : "";
      const visible = !field.conditionalOn || (
        field.conditionalValues
          ? field.conditionalValues.includes(controllingValue)
          : controllingValue === field.conditionalValue
      );
      if (!visible) return true;
      const fieldValue = typeof record[field.key] === "string" ? record[field.key] as string : "";
      if (field.required && fieldValue.trim() === "") return false;
      if (fieldValue.trim() === "") return true;
      if (field.type === "select" || field.type === "yes_no") {
        return field.options?.map(getQuestionOptionValue).includes(fieldValue) ?? false;
      }
      if (field.type === "multi_select") {
        const selected = parseMultiSelectValue(fieldValue, field.options ?? []);
        const optionValues = (field.options ?? []).map(getQuestionOptionValue);
        return selected.length > 0 && selected.every((option) => optionValues.includes(option));
      }
      if (field.type === "time" && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(fieldValue)) return false;
      if (field.type === "month" && !/^\d{4}-(?:0[1-9]|1[0-2])$/.test(fieldValue)) return false;
      return true;
    });
  });
}

export function validateFrozenAnswers(
  answers: Record<string, string>,
  frozenBlocks: ReadonlyArray<FrozenBlock>,
): FrozenAnswersValidationResult {
  const derivedValues = computeAllDerivedValues(answers);
  const allRules = frozenBlocks.flatMap((block) => block.conditionalRules);
  const visibleBlockIds = computeVisibleBlockIds(
    allRules,
    frozenBlocks,
    answers,
    derivedValues,
  );
  const optionsByQuestionId = buildOptionsByQuestionId(
    frozenBlocks.flatMap((block) => block.questions),
  );
  const invalidQuestionIds = new Set<string>();

  for (const block of frozenBlocks) {
    if (!visibleBlockIds.has(block.id)) continue;
    const visibleQuestionIds = computeVisibleQuestionIds(
      allRules,
      block.questions.map((question) => question.id),
      answers,
      derivedValues,
      optionsByQuestionId,
    );
    for (const question of block.questions) {
      if (!visibleQuestionIds.has(question.id)) continue;
      const value = answers[question.id] ?? "";
      if (question.required && !hasDocumentedAnswer(question, answers)) {
        invalidQuestionIds.add(question.id);
        continue;
      }
      if (question.type === "repeatable_group" && value.trim() !== "" && !hasValidRepeatableGroupEntries(question, value)) {
        invalidQuestionIds.add(question.id);
        continue;
      }
      if (value.trim() !== "" && !isAllowedOptionAnswer(question, value)) {
        invalidQuestionIds.add(question.id);
      }
    }
  }

  return {
    ok: invalidQuestionIds.size === 0,
    invalidQuestionIds: [...invalidQuestionIds],
  };
}