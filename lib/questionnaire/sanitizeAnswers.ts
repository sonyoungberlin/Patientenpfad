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
import type { QuestionnaireLanguage } from "./i18n";

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
 * Filtert und kürzt rohe Patientenantworten gegen die in der Session
 * eingefrorenen `deduplicated_questions`. Reine Funktion, keine Seiteneffekte.
 *
 * @param rawAnswers      Beliebiges Eingabeobjekt (z. B. aus `req.body.answers`).
 * @param deduplicatedQuestions  In der Session gespeicherte Fragenliste.
 * @param language        Optionale Sprache der Patientensicht. Bei "en" werden
 *                        select/multi_select-Antworten auf DE zurückgemappt.
 *                        Default "de" → keine Reverse-Mapping-Schritt.
 * @returns Map `questionId -> string` mit ausschließlich erlaubten Einträgen.
 */
export function sanitizeAnswers(
  rawAnswers: unknown,
  deduplicatedQuestions: ReadonlyArray<{ id: string }>,
  language: QuestionnaireLanguage = "de",
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
    if (!(questionId in QUESTION_CATALOG)) continue;
    if (typeof value !== "string") continue;
    const sliced = value.slice(0, MAX_ANSWER_LENGTH);
    sanitized[questionId] =
      language === "en"
        ? canonicalizeAnswerValue(questionId, sliced)
        : sliced;
  }

  return sanitized;
}
