import type { QuestionOptionDefinition } from "./blockCatalog";
import { getQuestionOptionValue } from "./questionOptions";

/**
 * Liest das bestehende kommagetrennte Multi-Select-Format anhand der
 * kanonischen Optionslabels. Dadurch bleiben Kommas innerhalb eines Labels
 * Teil derselben Option.
 */
export function parseMultiSelectValue(
  value: string,
  options: readonly QuestionOptionDefinition[],
): string[] {
  const input = value.trim();
  if (!input) return [];

  const orderedOptions = options.map(getQuestionOptionValue).sort((a, b) => b.length - a.length);
  const result: string[] = [];
  let rest = input;

  while (rest) {
    const option = orderedOptions.find(
      (candidate) =>
        rest === candidate || rest.startsWith(`${candidate}, `),
    );
    if (!option) {
      return value.split(",").map((part) => part.trim()).filter(Boolean);
    }
    result.push(option);
    rest = rest.slice(option.length);
    if (rest.startsWith(", ")) rest = rest.slice(2);
  }

  return result;
}

export function toggleMultiSelectValue(
  value: string,
  option: QuestionOptionDefinition,
  options: readonly QuestionOptionDefinition[],
): string {
  const optionValue = getQuestionOptionValue(option);
  const current = parseMultiSelectValue(value, options);
  const selected = current.includes(optionValue);
  const noneOptions = new Set(["Nichts davon", "None of the above"]);
  if (!selected && noneOptions.has(optionValue)) return optionValue;

  const next = selected
    ? current.filter((entry) => entry !== optionValue)
    : [...current.filter((entry) => !noneOptions.has(entry)), optionValue];
  return next.join(", ");
}

export function buildOptionsByQuestionId(
  questions: ReadonlyArray<{ id: string; options?: readonly QuestionOptionDefinition[] }>,
): ReadonlyMap<string, readonly string[]> {
  return new Map(
    questions.flatMap((question) =>
      question.options ? [[question.id, question.options.map(getQuestionOptionValue)] as const] : [],
    ),
  );
}