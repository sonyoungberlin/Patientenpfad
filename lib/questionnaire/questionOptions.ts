import type {
  QuestionDefinition,
  QuestionOptionDefinition,
} from "./blockCatalog";

export const UNKNOWN_OPTION_LABEL = "Unbekannter Wert";

function looksLikeTechnicalOptionValue(value: string): boolean {
  return /^[a-z0-9]+(?:[_:-][a-z0-9]+)+$/i.test(value.trim());
}

export function getQuestionOptionValue(option: QuestionOptionDefinition): string {
  return typeof option === "string" ? option : option.value;
}

export function getQuestionOptionLabel(option: QuestionOptionDefinition): string {
  return typeof option === "string" ? option : option.label;
}

export function getQuestionOptionValues(
  question: Pick<QuestionDefinition, "options">,
): string[] {
  return (question.options ?? []).map(getQuestionOptionValue);
}

export function getQuestionOptionLabels(
  question: Pick<QuestionDefinition, "options">,
): string[] {
  return (question.options ?? []).map(getQuestionOptionLabel);
}

export function resolveQuestionOptionDocumentation(
  question: Pick<QuestionDefinition, "options"> | undefined,
  value: string,
): string | undefined {
  const option = question?.options?.find(
    (candidate) => getQuestionOptionValue(candidate) === value,
  );
  return typeof option === "string" ? undefined : option?.documentationText;
}

export function resolveQuestionOptionLabel(
  question: Pick<QuestionDefinition, "options"> | undefined,
  value: string,
): string {
  const option = question?.options?.find(
    (candidate) => getQuestionOptionValue(candidate) === value,
  );
  if (option) return getQuestionOptionLabel(option);
  if (question?.options === undefined && !looksLikeTechnicalOptionValue(value)) {
    return value;
  }
  return UNKNOWN_OPTION_LABEL;
}