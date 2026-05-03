/**
 * Phase 3d: Eingangsvalidierung für Public-Form-Submissions.
 *
 * Bewusst minimal:
 *   - E-Mail: trim+lowercase, einfache `@`-Plus-Domain-Prüfung, max 254 Zeichen
 *     (RFC 5321 SMTP-Limit).
 *   - Honeypot: Wenn das versteckte Feld ausgefüllt ist, wird es als Bot-
 *     Treffer markiert. Der Aufrufer entscheidet, was damit passiert
 *     (siehe `app/api/p/[slug]/submit/route.ts`).
 *
 * KEINE neue Required-/Pflichtfeldlogik (siehe Plan-Anpassung 4).
 */

/** RFC 5321 maximale E-Mail-Länge. */
export const MAX_EMAIL_LENGTH = 254;

/** Name des versteckten Honeypot-Feldes im HTML-Formular. */
export const HONEYPOT_FIELD_NAME = "company_website";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SubmitInputError =
  | "missing_email"
  | "email_too_long"
  | "invalid_email"
  | "answers_not_object";

export function normalizeEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim().toLowerCase();
  return trimmed.length === 0 ? null : trimmed;
}

export function validateSubmitterEmail(
  input: unknown,
):
  | { ok: true; email: string }
  | { ok: false; error: SubmitInputError } {
  const normalized = normalizeEmail(input);
  if (!normalized) return { ok: false, error: "missing_email" };
  if (normalized.length > MAX_EMAIL_LENGTH) {
    return { ok: false, error: "email_too_long" };
  }
  if (!EMAIL_REGEX.test(normalized)) {
    return { ok: false, error: "invalid_email" };
  }
  return { ok: true, email: normalized };
}

/**
 * Honeypot: echte Nutzer:innen sehen das versteckte Feld nicht und lassen
 * es leer. Bots füllen oft alle Felder aus. Trim, damit Whitespace nicht
 * zu falsch-positiven Treffern führt.
 */
export function isHoneypotTriggered(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return value.trim().length > 0;
}

/**
 * Knappe deutschsprachige Fehlermeldung für 400-Antworten. Bewusst generisch,
 * um keine Enumerationsoberfläche zu bieten.
 */
export function submitErrorMessage(error: SubmitInputError): string {
  switch (error) {
    case "missing_email":
      return "Bitte geben Sie Ihre E-Mail-Adresse an.";
    case "email_too_long":
      return "Die E-Mail-Adresse ist zu lang.";
    case "invalid_email":
      return "Bitte geben Sie eine gültige E-Mail-Adresse an.";
    case "answers_not_object":
      return "Eingaben konnten nicht verarbeitet werden.";
  }
}
