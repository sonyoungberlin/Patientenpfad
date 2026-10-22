export function containsSensitivePersonalIdentifier(value: string): boolean {
  const normalized = value.replace(/[\s-]/g, "").toUpperCase();
  return (
    /\d{11}/.test(normalized) ||
    /\d{2}\d{6}[A-Z]\d{3}/.test(normalized) ||
    /[A-Z]{2}\d{2}[A-Z0-9]{11,30}/.test(normalized)
  );
}

const STATUS_ONLY_PERSONNEL_CHECKPOINTS = new Set([
  "NC-PERSONALDATEN_LOHNABRECHNUNG",
  "MF-03",
  "AA-09",
  "MA-11",
]);

export function isOfficePersonalStatusOnlyCheckpoint(checkpointId: string): boolean {
  return STATUS_ONLY_PERSONNEL_CHECKPOINTS.has(checkpointId);
}
