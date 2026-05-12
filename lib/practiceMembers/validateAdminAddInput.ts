/**
 * Plattform-Admin: Eingabe-Normalisierung und Validierung für das
 * Hinzufügen eines bestehenden Accounts zu einer Practice
 * (`POST /api/admin/practices/[id]/members`).
 *
 * Variante zu `validateAddMemberInput` mit einer einzigen Abweichung:
 * `OWNER` ist hier **erlaubt**. Hintergrund: das Plattform-Admin-Werkzeug
 * unter `/admin/practices` dient zur Korrektur/Zuordnung — der Plattform-
 * Admin darf hier OWNER setzen. Auf den Praxis-eigenen Pfaden bleibt
 * `validateAddMemberInput` unverändert (kein Admin-Bypass).
 *
 * Scope:
 *   - email: trim + lowercase, pragmatische RFC-Form-Prüfung, Pflichtfeld.
 *   - role: muss exakt "OWNER", "ADMIN" oder "USER" sein.
 */

import { PracticeRole } from "@prisma/client";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 200;

export type AdminAddMemberFieldErrors = Partial<{
  email: string;
  role: string;
}>;

export type ValidatedAdminAddMemberInput = {
  email: string;
  role: PracticeRole;
};

export type RawAdminAddMemberInput = {
  email?: unknown;
  role?: unknown;
};

export type ValidateAdminAddMemberResult =
  | { ok: true; value: ValidatedAdminAddMemberInput }
  | { ok: false; fieldErrors: AdminAddMemberFieldErrors };

export function validateAdminAddMemberInput(
  raw: RawAdminAddMemberInput,
): ValidateAdminAddMemberResult {
  const fieldErrors: AdminAddMemberFieldErrors = {};

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
  let role: PracticeRole | null = null;
  const rawRole = typeof raw.role === "string" ? raw.role.trim() : "";
  if (!rawRole) {
    fieldErrors.role = "Rolle ist erforderlich.";
  } else if (rawRole === PracticeRole.OWNER) {
    role = PracticeRole.OWNER;
  } else if (rawRole === PracticeRole.ADMIN) {
    role = PracticeRole.ADMIN;
  } else if (rawRole === PracticeRole.INBOX_ONLY) {
    role = PracticeRole.INBOX_ONLY;
  } else if (rawRole === PracticeRole.USER) {
    fieldErrors.role = "USER kann nicht mehr neu vergeben werden.";
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
 * Fallback. Reihenfolge: email vor role.
 */
export function firstAdminAddMemberFieldError(
  errors: AdminAddMemberFieldErrors,
): string {
  return errors.email ?? errors.role ?? "Eingabe ist ungültig.";
}
