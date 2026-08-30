/**
 * Phase 3d: Geteilte Sanitization von eingehenden Patient-Antworten.
 *
 * Verhalten 1:1 extrahiert aus `app/api/q/[token]/route.ts` (Phase 2):
 *   - nur Strings als Werte akzeptieren
 *   - nur questionIds, die in der Session als `deduplicated_questions`
 *     eingefroren sind UND im globalen `QUESTION_CATALOG` existieren
 *   - max. {@link MAX_ANSWER_LENGTH} Zeichen pro Antwort (`slice`)
 *
 * Mehrsprachigkeit (additiv):
 *   - Optionaler Parameter `language`. Bei `language === "en"` werden für
 *     Felder vom Typ `select` / `multi_select` englisch eingegebene Optionen
 *     vor dem Speichern auf das deutsche Original-Optionlabel zurückgemappt
 *     (per Index-Mapping `options_en[i] -> options[i]`).
 *   - Existieren keine `options_en` oder passt eine Eingabe zu keiner EN-Option,
 *     bleibt das bestehende Verhalten unverändert (Wert wird unverändert
 *     übernommen). So bleibt der Praxis-/PDF-/Krankenblatt-Output garantiert
 *     deutsch, ohne dass Auswertungen sprachsensitiv werden müssen.
 *
 * Bewusst KEINE neue Required-/Pflichtfeldlogik: das bleibt der jeweiligen
 * Block-/UI-Schicht überlassen (z. B. `required` im Block-Katalog), damit
 * sich der Server-Vertrag des Token-Flows nicht verschiebt.
 */

import { QUESTION_CATALOG } from "./blockCatalog";
import { isConfirmedAnswer } from "./confirmation";
import type { QuestionnaireLanguage } from "./i18n";
import { ALLOWED_ANSWER_CHARACTERS_REGEX } from "./validateAnswerCharacters";

/** Pro-Antwort-Längenlimit. Identisch zur Phase-2-Token-Flow-Konstante. */
export const MAX_ANSWER_LENGTH = 2000;

/**
 * Mappt einen einzelnen, vom Patienten gewählten Optionswert (möglicherweise
 * englisch) auf das kanonische deutsche Originallabel. Trifft auf nichts zu,
 * wird der Wert unverändert zurückgegeben.
 */
function mapOptionToCanonical(
  questionId: string,
  rawOption: string,
): string {
  const trimmed = rawOption.trim();
  if (trimmed === "") return rawOption;

  const def = QUESTION_CATALOG[questionId];
  if (!def || !def.options || !def.options_en) return rawOption;
  if (def.options_en.length !== def.options.length) return rawOption;

  // Bereits ein DE-Originalwert? Dann unverändert lassen.
  if (def.options.includes(trimmed)) return trimmed;

  const enIndex = def.options_en.indexOf(trimmed);
  if (enIndex >= 0) {
    return def.options[enIndex];
  }
  return rawOption;
}

/**
 * Normalisiert den Wert einer einzelnen Frage auf die kanonische deutsche
 * Optionsschreibweise (für `select` / `multi_select`). Andere Typen werden
 * unverändert zurückgegeben.
 */
function canonicalizeAnswerValue(
  questionId: string,
  value: string,
): string {
  const def = QUESTION_CATALOG[questionId];
  if (!def) return value;

  if (def.type === "select") {
    return mapOptionToCanonical(questionId, value);
  }

  if (def.type === "multi_select") {
    // Format: kommagetrennte Liste (vgl. QuestionnaireFormClient).
    const parts = value.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return value;
    const mapped = parts.map((p) => mapOptionToCanonical(questionId, p));
    return mapped.join(", ");
  }

  return value;
}

/**
 * Validiert und bereinigt eine repeatable_group-Antwort.
 * Verwendet die eingefrorene QuestionDefinition wenn vorhanden,
 * sonst Fallback auf QUESTION_CATALOG (Legacy-Sessions).
 *
 * @returns JSON-String des bereinigten Arrays oder null bei komplettem Fehler
 */
function sanitizeRepeatableGroupArray(
  questionId: string,
  rawValue: string,
  frozenDef?: import("./blockCatalog").QuestionDefinition,
): string | null {
  const def = frozenDef ?? QUESTION_CATALOG[questionId];
  if (!def || def.type !== "repeatable_group" || !def.groupSchema) return null;

  const maxEntries = def.maxEntries ?? 20;

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawValue);
  } catch {
    return null;
  }

  if (!Array.isArray(parsed)) return null;

  const result: Record<string, string>[] = [];

  for (const entry of parsed.slice(0, maxEntries)) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      continue;
    }

    const clean: Record<string, string> = {};
    let entryInvalid = false;
    for (const field of def.groupSchema) {
      const val = (entry as Record<string, unknown>)[field.key];
      if (typeof val !== "string") continue;
      const sliced = val.slice(0, MAX_ANSWER_LENGTH);
      // Freitextfelder: ungültige Zeichen → gesamte Antwort verwerfen (wie normale Freitexte)
      if (field.type === "text" || field.type === "textarea") {
        if (sliced.trim() !== "" && !ALLOWED_ANSWER_CHARACTERS_REGEX.test(sliced)) {
          entryInvalid = true;
          break;
        }
      }
      clean[field.key] = sliced;
    }

    if (!entryInvalid && Object.values(clean).some((v) => v.trim() !== "")) {
      result.push(clean);
    }
  }

  return result.length > 0 ? JSON.stringify(result) : null;
}

/**
 * Validiert und bereinigt das FACHAERZTE-Feld (repeatable group).
 * 
 * Erwartet ein JSON-Array von Objekten mit den Keys:
 * - erkrankung (string)
 * - bereich (string)
 * - name (string)
 * - adresse (string)
 * 
 * @param rawValue JSON-String vom Client
 * @param maxEntries Maximale Anzahl Einträge (default 10)
 * @returns Validiertes Array oder null bei Fehler
 */
function sanitizeFacharztArray(
  rawValue: string,
  maxEntries = 10,
): Record<string, string>[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawValue);
  } catch {
    return null;
  }

  if (!Array.isArray(parsed)) return null;
  if (parsed.length > maxEntries) return null;

  const result: Record<string, string>[] = [];
  const allowedKeys = new Set(["erkrankung", "bereich", "name", "adresse"]);

  for (const entry of parsed) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      continue;
    }

    const cleanEntry: Record<string, string> = {};

    for (const key of allowedKeys) {
      const val = (entry as Record<string, unknown>)[key];
      if (typeof val !== "string") continue;

      const trimmed = val.slice(0, MAX_ANSWER_LENGTH).trim();
      cleanEntry[key] = trimmed;
    }

    // Nur Einträge mit mindestens einem nicht-leeren Wert speichern
    const hasValue = Object.values(cleanEntry).some(val => val !== "");
    if (hasValue) {
      result.push(cleanEntry);
    }
  }

  return result;
}

/**
 * Filtert und kürzt rohe Patientenantworten gegen die in der Session
 * eingefrorenen `deduplicated_questions`. Reine Funktion, keine Seiteneffekte.
 *
 * @param rawAnswers      Beliebiges Eingabeobjekt (z. B. aus `req.body.answers`).
 * @param deduplicatedQuestions  In der Session gespeicherte Fragenliste.
 * @param language        Optionale Sprache der Patientensicht. Bei "en" werden
 *                        select/multi_select-Antworten auf DE zurückgemappt.
 *                        Default "de" → keine Reverse-Mapping-Schritt.
 * @param frozenQuestionMap Eingefrorene QuestionDefinition-Map (Phase 4);
 *                          wird für repeatable_group-Lookup bevorzugt.
 *                          Legacy-Sessions übergeben undefined.
 * @returns Map `questionId -> string` mit ausschließlich erlaubten Einträgen.
 */
export function sanitizeAnswers(
  rawAnswers: unknown,
  deduplicatedQuestions: ReadonlyArray<{ id: string }>,
  language: QuestionnaireLanguage = "de",
  frozenQuestionMap?: ReadonlyMap<string, import("./blockCatalog").QuestionDefinition>,
): Record<string, string> {
  if (
    !rawAnswers ||
    typeof rawAnswers !== "object" ||
    Array.isArray(rawAnswers)
  ) {
    return {};
  }

  const allowedQuestionIds = new Set(deduplicatedQuestions.map((q) => q.id));
  const sanitized: Record<string, string> = {};

  for (const [questionId, value] of Object.entries(
    rawAnswers as Record<string, unknown>,
  )) {
    if (!allowedQuestionIds.has(questionId)) continue;
    // Frozen-Map bevorzugen; Fallback auf QUESTION_CATALOG für Legacy-Sessions
    const qDef = frozenQuestionMap?.get(questionId) ?? QUESTION_CATALOG[questionId];
    if (!qDef) continue;
    if (typeof value !== "string") continue;

    if (qDef.type === "confirmation") {
      if (isConfirmedAnswer(value)) sanitized[questionId] = value;
      continue;
    }

    // Spezialfall: FACHAERZTE repeatable group
    if (questionId === "FACHAERZTE") {
      const validated = sanitizeFacharztArray(value);
      if (validated !== null && validated.length > 0) {
        sanitized[questionId] = JSON.stringify(validated);
      }
      continue;
    }

    // Generischer repeatable_group-Typ (VOLLST_* und zukünftige Blöcke)
    if (qDef.type === "repeatable_group") {
      const validated = sanitizeRepeatableGroupArray(questionId, value, qDef);
      if (validated !== null) {
        sanitized[questionId] = validated;
      }
      continue;
    }

    // Phase 5: numerische Felder – nur gültige nicht-negative Zahlen akzeptieren
    if (qDef.type === "number") {
      if (value === "") {
        sanitized[questionId] = "";
      } else {
        const normalized = value.replace(",", ".").trim();
        const num = parseFloat(normalized);
        if (!isNaN(num) && isFinite(num) && num >= 0) {
          sanitized[questionId] = String(num);
        }
      }
      continue;
    }

    const sliced = value.slice(0, MAX_ANSWER_LENGTH);
    sanitized[questionId] =
      language === "en"
        ? canonicalizeAnswerValue(questionId, sliced)
        : sliced;
  }

  return sanitized;
}
