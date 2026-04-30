/**
 * Deduplizierungs-Logik für modulare Fragebogen-Blöcke.
 *
 * Reine Funktion – kein DB-Zugriff, keine Seiteneffekte.
 * Kann direkt in Tests geprüft und beim Anlegen einer
 * PatientQuestionnaireSession verwendet werden.
 */

import {
  BLOCK_CATALOG,
  QUESTION_CATALOG,
  type QuestionDefinition,
} from "./blockCatalog";

/**
 * Berechnet die deduplizierte, geordnete Fragenliste für eine Kombination
 * von Block-IDs.
 *
 * Regeln:
 *  1. Blöcke werden nach ihrem `displayOrder` sortiert (unabhängig von der
 *     Reihenfolge in `selectedBlockIds`).
 *  2. Fragen werden in der Reihenfolge ihres ersten Auftretens gesammelt.
 *  3. Eine questionId erscheint maximal einmal – egal in wie vielen Blöcken
 *     sie vorkommt.
 *  4. Unbekannte Block-IDs und unbekannte questionIds werden stillschweigend
 *     übersprungen.
 *
 * @param selectedBlockIds – Liste der gewählten Block-IDs (z.B. ["AU", "REZEPT"]).
 * @returns Geordnete, deduplizierte Liste von QuestionDefinition-Objekten.
 */
export function buildQuestionnaireQuestions(
  selectedBlockIds: string[],
): QuestionDefinition[] {
  // 1. Nur bekannte Block-IDs behalten und nach displayOrder sortieren.
  const validBlocks = selectedBlockIds
    .filter((id) => id in BLOCK_CATALOG)
    .map((id) => BLOCK_CATALOG[id])
    .sort((a, b) => a.displayOrder - b.displayOrder);

  // 2. Fragen dedupliziert sammeln (erster Auftritt gewinnt).
  const seen = new Set<string>();
  const result: QuestionDefinition[] = [];

  for (const block of validBlocks) {
    for (const questionId of block.questionIds) {
      if (seen.has(questionId)) continue;
      const question = QUESTION_CATALOG[questionId];
      if (!question) continue;
      seen.add(questionId);
      result.push(question);
    }
  }

  return result;
}
