/**
 * Liest das bestehende kommagetrennte Multi-Select-Format anhand der
 * kanonischen Optionslabels. Dadurch bleiben Kommas innerhalb eines Labels
 * Teil derselben Option.
 */
export function parseMultiSelectValue(
  value: string,
  options: readonly string[],
): string[] {
  const input = value.trim();
  if (!input) return [];

  const orderedOptions = [...options].sort((a, b) => b.length - a.length);
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
  option: string,
  options: readonly string[],
): string {
  const current = parseMultiSelectValue(value, options);
  const selected = current.includes(option);
  const next = selected
    ? current.filter((entry) => entry !== option)
    : [...current, option];
  return next.join(", ");
}