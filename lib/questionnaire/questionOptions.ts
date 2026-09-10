import type {
  QuestionDefinition,
  QuestionOptionDefinition,
} from "./blockCatalog";

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
  return option ? getQuestionOptionLabel(option) : value;
}