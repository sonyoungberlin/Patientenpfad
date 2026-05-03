/**
 * Phase P4b: Eingabe-Normalisierung und Validierung für das Hinzufügen
 * eines bestehenden Accounts zur aktuellen Practice
 * (`POST /api/practice/members`).
 *
 * Wird sowohl vom JSON-API-Pfad als auch vom HTML-Form-POST-Pfad benutzt,
 * damit beide Schreibpfade konsistent dieselben Felder produzieren. Liefert
 * entweder normierte Werte oder strukturierte Feldfehler.
 *
 * P4b-Scope:
 *   - email: trim + lowercase, pragmatische RFC-Form-Prüfung, Pflichtfeld.
 *   - role: muss exakt "ADMIN" oder "USER" sein. "OWNER" wird **explizit
 *     verworfen** (Scope: „OWNER nur durch OWNER setzbar, falls überhaupt"
 *     — in P4b: nicht setzbar). Andere Werte → "Ungültige Rolle.".
 */

import { PracticeRole } from "@prisma/client";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 200;

export type AddMemberFieldErrors = Partial<{
  email: string;
  role: string;
}>;

export type ValidatedAddMemberInput = {
  email: string;
  role: typeof PracticeRole.ADMIN | typeof PracticeRole.USER;
};

export type RawAddMemberInput = {
  email?: unknown;
  role?: unknown;
};

export type ValidateAddMemberResult =
  | { ok: true; value: ValidatedAddMemberInput }
  | { ok: false; fieldErrors: AddMemberFieldErrors };

export function validateAddMemberInput(
  raw: RawAddMemberInput,
): ValidateAddMemberResult {
  const fieldErrors: AddMemberFieldErrors = {};

  // --- email ---
  let email = "";
  if (typeof raw.email === "string") {
    email = raw.email.trim().toLowerCase();
  }
  if (!email) {
    fieldErrors.email = "E-Mail ist erforderlich.";
  } else if (email.length > MAX_EMAIL_LENGTH) {
    fieldErrors.email = "E-Mail ist zu lang.";
  } else if (!EMAIL_REGEX.test(email)) {
    fieldErrors.email = "Ungültige E-Mail.";
  }

  // --- role ---
  let role: ValidatedAddMemberInput["role"] | null = null;
  const rawRole = typeof raw.role === "string" ? raw.role.trim() : "";
  if (!rawRole) {
    fieldErrors.role = "Rolle ist erforderlich.";
  } else if (rawRole === PracticeRole.OWNER) {
    fieldErrors.role = "OWNER kann in dieser Phase nicht vergeben werden.";
  } else if (rawRole === PracticeRole.ADMIN) {
    role = PracticeRole.ADMIN;
  } else if (rawRole === PracticeRole.USER) {
    role = PracticeRole.USER;
  } else {
    fieldErrors.role = "Ungültige Rolle.";
  }

  if (Object.keys(fieldErrors).length > 0 || !role) {
    return { ok: false, fieldErrors };
  }
  return { ok: true, value: { email, role } };
}

/**
 * Liefert die erste vorhandene Feld-Fehlermeldung oder einen generischen
 * Fallback. Reihenfolge: email vor role (so wie das Formular gerendert wird).
 */
export function firstAddMemberFieldError(errors: AddMemberFieldErrors): string {
  return errors.email ?? errors.role ?? "Eingabe ist ungültig.";
}
