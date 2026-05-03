/**
 * Option C (minimal): Eingabe-Normalisierung und Validierung für
 * `POST /api/admin/accounts/[id]/default-practice`.
 *
 * Scope:
 *   - action: "set" oder "clear" (Pflicht).
 *   - practice_id: nur bei action="set" Pflicht; nicht-leerer String,
 *     pragmatische Längengrenze (Prisma-cuid ist deutlich kürzer).
 *
 * Bewusst minimal — Membership-Existenz wird in der Route geprüft, nicht
 * hier (sie braucht DB-Zugriff).
 */

const MAX_ID_LENGTH = 64;

export type DefaultPracticeAction = "set" | "clear";

export type DefaultPracticeFieldErrors = Partial<{
  action: string;
  practice_id: string;
}>;

export type ValidatedDefaultPracticeInput =
  | { action: "set"; practice_id: string }
  | { action: "clear" };

export type RawDefaultPracticeInput = {
  action?: unknown;
  practice_id?: unknown;
};

export type ValidateDefaultPracticeResult =
  | { ok: true; value: ValidatedDefaultPracticeInput }
  | { ok: false; fieldErrors: DefaultPracticeFieldErrors };

export function validateDefaultPracticeInput(
  raw: RawDefaultPracticeInput,
): ValidateDefaultPracticeResult {
  const fieldErrors: DefaultPracticeFieldErrors = {};

  const rawAction = typeof raw.action === "string" ? raw.action.trim() : "";
  let action: DefaultPracticeAction | null = null;
  if (!rawAction) {
    fieldErrors.action = "Aktion ist erforderlich.";
  } else if (rawAction === "set") {
    action = "set";
  } else if (rawAction === "clear") {
    action = "clear";
  } else {
    fieldErrors.action = "Ungültige Aktion.";
  }

  let practiceId = "";
  if (action === "set") {
    if (typeof raw.practice_id === "string") {
      practiceId = raw.practice_id.trim();
    }
    if (!practiceId) {
      fieldErrors.practice_id = "Praxis ist erforderlich.";
    } else if (practiceId.length > MAX_ID_LENGTH) {
      fieldErrors.practice_id = "Praxis-ID ist zu lang.";
    }
  }

  if (Object.keys(fieldErrors).length > 0 || !action) {
    return { ok: false, fieldErrors };
  }
  if (action === "set") {
    return { ok: true, value: { action: "set", practice_id: practiceId } };
  }
  return { ok: true, value: { action: "clear" } };
}

export function firstDefaultPracticeFieldError(
  errors: DefaultPracticeFieldErrors,
): string {
  return errors.action ?? errors.practice_id ?? "Eingabe ist ungültig.";
}
