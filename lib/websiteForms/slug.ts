/**
 * Phase 3b: Slug-Validierung für öffentliche Website-Fragebögen
 * (`PracticeQuestionnaireForm.slug`).
 *
 * Der Slug wird in Phase 3c für die öffentliche Route `/p/[slug]` verwendet.
 * Bereits in Phase 3b verhindern wir Kollisionen mit bekannten Top-Level-
 * Routen, damit Praxen keine Slugs anlegen, die später kein gültiges
 * öffentliches Ziel ergeben können.
 *
 * Regeln:
 *   - Lowercase ASCII-Buchstaben, Ziffern, Bindestriche
 *   - Muss mit Buchstabe oder Ziffer beginnen und enden
 *   - Keine doppelten Bindestriche
 *   - Länge 3–40
 *   - Keine reservierten Wörter (siehe RESERVED_SLUGS)
 *
 * Diese Datei hat keine Seiteneffekte und ist isoliert testbar.
 */

export const MIN_SLUG_LENGTH = 3;
export const MAX_SLUG_LENGTH = 40;

/**
 * Reservierte Slugs.
 *
 * Enthält alle bekannten Top-Level-App-Routen sowie für Phase 3c geplante
 * Routen (`p`). Wer hier neue Top-Level-Routen ergänzt, sollte den Slug
 * ebenfalls aufnehmen.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "_next",
  "admin",
  "api",
  "demo",
  "favicon.ico",
  "inquiries",
  "login",
  "logout",
  "p",
  "q",
  "questionnaires",
  "register",
  "robots.txt",
  "sitemap.xml",
  "static",
  "website-forms",
]);

/** Erlaubt: a–z, 0–9, einzelne Bindestriche, beginnt/endet alphanumerisch. */
const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9]|-(?!-))*[a-z0-9]$/;

export type SlugValidationError =
  | "empty"
  | "too_short"
  | "too_long"
  | "invalid_chars"
  | "reserved";

/**
 * Validiert einen rohen Slug-Eingabewert.
 *
 * Trimmt **nicht** und konvertiert **nicht** zu Lowercase — das ist
 * Aufgabe des Aufrufers (z. B. `validateWebsiteFormInput`). Damit lassen
 * sich „User hat Großbuchstaben eingegeben"-Fälle als Validierungsfehler
 * sichtbar machen, statt sie still zu korrigieren.
 */
export function validateSlug(input: unknown):
  | { ok: true; slug: string }
  | { ok: false; error: SlugValidationError } {
  if (typeof input !== "string" || input.length === 0) {
    return { ok: false, error: "empty" };
  }
  if (input.length < MIN_SLUG_LENGTH) {
    return { ok: false, error: "too_short" };
  }
  if (input.length > MAX_SLUG_LENGTH) {
    return { ok: false, error: "too_long" };
  }
  if (!SLUG_REGEX.test(input)) {
    return { ok: false, error: "invalid_chars" };
  }
  if (RESERVED_SLUGS.has(input)) {
    return { ok: false, error: "reserved" };
  }
  return { ok: true, slug: input };
}

/** Deutschsprachige Fehlermeldung für ein `SlugValidationError`. */
export function slugErrorMessage(error: SlugValidationError): string {
  switch (error) {
    case "empty":
      return "Slug ist erforderlich.";
    case "too_short":
      return `Slug muss mindestens ${MIN_SLUG_LENGTH} Zeichen lang sein.`;
    case "too_long":
      return `Slug darf höchstens ${MAX_SLUG_LENGTH} Zeichen lang sein.`;
    case "invalid_chars":
      return "Slug darf nur Kleinbuchstaben, Ziffern und einzelne Bindestriche enthalten und muss mit einem Buchstaben oder einer Ziffer beginnen und enden.";
    case "reserved":
      return "Slug ist reserviert und kann nicht verwendet werden.";
  }
}
