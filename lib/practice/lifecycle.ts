import type { LegalProfileValues } from "./legalProfile";
import { validateCompleteLegalProfileInput } from "./legalProfile";

export const PRACTICE_DEACTIVATION_GRACE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

export const PRACTICE_SERVICE_UNAVAILABLE_MESSAGE =
  "Dieser Praxisdienst ist derzeit nicht verfügbar. Bitte wenden Sie sich direkt an Ihre Praxis.";

export function isPracticeActive(practice: {
  is_approved: boolean;
  disabled_at?: Date | null;
}): boolean {
  return practice.is_approved && practice.disabled_at == null;
}

export function getPracticeDeletableAt(disabledAt: Date | null | undefined): Date | null {
  if (!disabledAt) return null;
  return new Date(disabledAt.getTime() + PRACTICE_DEACTIVATION_GRACE_PERIOD_MS);
}

export function isPracticeDeletable(
  disabledAt: Date | null | undefined,
  now = new Date(),
): boolean {
  const deletableAt = getPracticeDeletableAt(disabledAt);
  return deletableAt !== null && deletableAt <= now;
}

export function validatePracticeReactivation(
  profile: Record<string, unknown> | null | undefined,
): { ok: true; value: LegalProfileValues } | { ok: false; error: string } {
  return validateCompleteLegalProfileInput(profile);
}