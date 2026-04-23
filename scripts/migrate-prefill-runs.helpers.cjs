/**
 * Pure, testbare Helfer für `scripts/migrate-prefill-runs.mjs`.
 *
 * Bewusst CommonJS, damit sowohl das ESM-Skript (via `createRequire`) als
 * auch Jest-Tests dieselben Funktionen nutzen können.
 */

const ALLOWED_SOURCES = new Set(["mfa", "conversation", "patient"]);
const FALLBACK_SOURCE = "mfa";

/**
 * Prüft, ob ein `ctx_prefill`-Wert tatsächlich gespeicherte Antworten enthält.
 * - null / undefined           → false
 * - Array (auch leeres `[]`)   → false (Init-Wert beim Anlegen)
 * - leeres Objekt `{}`         → false
 * - Objekt mit ≥1 Schlüssel    → true
 */
function hasSavedPrefill(value) {
  if (value === null || value === undefined) return false;
  if (typeof value !== "object") return false;
  if (Array.isArray(value)) return false;
  return Object.keys(value).length > 0;
}

function deriveSource(preparationMode) {
  if (typeof preparationMode === "string" && ALLOWED_SOURCES.has(preparationMode)) {
    return preparationMode;
  }
  return FALLBACK_SOURCE;
}

function deriveCreatedBy(source, ownerAccountId) {
  if (source === "patient") return null;
  return ownerAccountId ?? null;
}

function normalizeActiveCheckpoints(value) {
  if (Array.isArray(value)) return value;
  return [];
}

function parseArgs(argv) {
  const apply = argv.includes("--apply");
  const verbose = argv.includes("--verbose");
  return { apply, verbose };
}

module.exports = {
  ALLOWED_SOURCES,
  FALLBACK_SOURCE,
  hasSavedPrefill,
  deriveSource,
  deriveCreatedBy,
  normalizeActiveCheckpoints,
  parseArgs,
};
