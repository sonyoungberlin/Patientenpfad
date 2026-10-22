export function containsSensitivePersonalIdentifier(value: string): boolean {
  const normalized = value.replace(/[\s-]/g, "").toUpperCase();
  return (
    /\d{11}/.test(normalized) ||
    /\d{2}\d{6}[A-Z]\d{3}/.test(normalized) ||
    /[A-Z]{2}\d{2}[A-Z0-9]{11,30}/.test(normalized)
  );
}
