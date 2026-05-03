/**
 * Phase 3d: Geteilte Sanitization von eingehenden Patient-Antworten.
 *
 * Verhalten 1:1 extrahiert aus `app/api/q/[token]/route.ts` (Phase 2):
 *   - nur Strings als Werte akzeptieren
 *   - nur questionIds, die in der Session als `deduplicated_questions`
 *     eingefroren sind UND im globalen `QUESTION_CATALOG` existieren
 *   - max. {@link MAX_ANSWER_LENGTH} Zeichen pro Antwort (`slice`)
 *
 * Bewusst KEINE neue Required-/Pflichtfeldlogik: das bleibt der jeweiligen
 * Block-/UI-Schicht überlassen (z. B. `required` im Block-Katalog), damit
 * sich der Server-Vertrag des Token-Flows nicht verschiebt.
 */

import { QUESTION_CATALOG } from "./blockCatalog";

/** Pro-Antwort-Längenlimit. Identisch zur Phase-2-Token-Flow-Konstante. */
export const MAX_ANSWER_LENGTH = 2000;

/**
 * Filtert und kürzt rohe Patientenantworten gegen die in der Session
 * eingefrorenen `deduplicated_questions`. Reine Funktion, keine Seiteneffekte.
 *
 * @param rawAnswers      Beliebiges Eingabeobjekt (z. B. aus `req.body.answers`).
 * @param deduplicatedQuestions  In der Session gespeicherte Fragenliste.
 * @returns Map `questionId -> string` mit ausschließlich erlaubten Einträgen.
 */
export function sanitizeAnswers(
  rawAnswers: unknown,
  deduplicatedQuestions: ReadonlyArray<{ id: string }>,
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
    sanitized[questionId] = value.slice(0, MAX_ANSWER_LENGTH);
  }

  return sanitized;
}
