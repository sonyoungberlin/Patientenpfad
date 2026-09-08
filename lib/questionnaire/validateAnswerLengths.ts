import type { QuestionDefinition } from "./blockCatalog";

export type AnswerLengthValidationResult = {
  ok: boolean;
  invalidQuestionIds: string[];
};

export function validateAnswerLengths(
  rawAnswers: unknown,
  definitions: ReadonlyMap<string, QuestionDefinition>,
): AnswerLengthValidationResult {
  if (!rawAnswers || typeof rawAnswers !== "object" || Array.isArray(rawAnswers)) {
    return { ok: true, invalidQuestionIds: [] };
  }

  const invalidQuestionIds = new Set<string>();

  for (const [questionId, rawValue] of Object.entries(
    rawAnswers as Record<string, unknown>,
  )) {
    const definition = definitions.get(questionId);
    if (!definition || typeof rawValue !== "string") continue;

    if (
      (definition.type === "text" || definition.type === "textarea") &&
      definition.maxLength !== undefined &&
      rawValue.length > definition.maxLength
    ) {
      invalidQuestionIds.add(questionId);
      continue;
    }

    if (definition.type !== "repeatable_group" || !definition.groupSchema) continue;

    let entries: unknown;
    try {
      entries = JSON.parse(rawValue);
    } catch {
      continue;
    }
    if (!Array.isArray(entries)) continue;

    const exceedsLimit = entries.some((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
      return definition.groupSchema!.some((field) => {
        if (
          field.maxLength === undefined ||
          (field.type !== "text" && field.type !== "textarea")
        ) return false;
        const value = (entry as Record<string, unknown>)[field.key];
        return typeof value === "string" && value.length > field.maxLength;
      });
    });
    if (exceedsLimit) invalidQuestionIds.add(questionId);
  }

  return {
    ok: invalidQuestionIds.size === 0,
    invalidQuestionIds: [...invalidQuestionIds],
  };
}
