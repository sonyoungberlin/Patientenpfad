/**
 * Phase 4: Eingefrorene Block-Struktur für PatientQuestionnaireSession.
 *
 * Ein FrozenBlock ist ein JSON-serialisierbarer Snapshot eines Blocks
 * zum Zeitpunkt der Session-Erstellung. Er enthält alle für das Rendering
 * und Sanitizing benötigten Daten, sodass spätere Änderungen am
 * BLOCK_CATALOG oder QUESTION_CATALOG bestehende Sessions nicht beeinflussen.
 *
 * Enthaltene Informationen je Block:
 *   - Block-Metadaten (id, label, displayOrder usw.)
 *   - Vollständige QuestionDefinitions (inkl. groupSchema, maxEntries,
 *     addEntryLabel, options, conditionalOn/Value/Values, ...)
 *   - ConditionalRules des Blocks (showQuestion + showBlock)
 *   - initiallyVisible: von der Praxis bewusst ausgewählt (true) vs.
 *     nur über showBlock erreichbarer Folgeblock (false)
 *
 * Transitive Folgeblöcke (via showBlock-Regeln) werden automatisch mit
 * eingefroren, damit sie beim ersten Sichtbarwerden sofort korrekt
 * gerendert werden können.
 */

import {
  BLOCK_CATALOG,
  QUESTION_CATALOG,
  resolveQuestionIdsForBlocks,
  type QuestionDefinition,
  type QuestionnaireBlock,
} from "./blockCatalog";
import type { ConditionalRule } from "./conditionalLogic";

// ---------------------------------------------------------------------------
// Typ
// ---------------------------------------------------------------------------

export type FrozenBlock = {
  id: string;
  label: string;
  label_en?: string;
  description?: string;
  description_en?: string;
  hint?: string;
  hint_en?: string;
  displayOrder: number;
  /** Vollständige QuestionDefinition-Snapshots; bereits dedupliziert. */
  questions: QuestionDefinition[];
  /** Alle ConditionalRules dieses Blocks (showQuestion + showBlock). */
  conditionalRules: ConditionalRule[];
  /** true = von der Praxis ausgewählt; false = nur via showBlock erreichbar. */
  initiallyVisible: boolean;
};

// ---------------------------------------------------------------------------
// Aufbau
// ---------------------------------------------------------------------------

/**
 * Erstellt einen unveränderlichen Block-Snapshot für eine neue Session.
 *
 * Algorithmus:
 *   1. Beginnt mit den von der Praxis gewählten Startblöcken.
 *   2. Traversiert transitiv alle via showBlock erreichbaren Folgeblöcke
 *      (BFS, Cycle-Schutz via visited-Set).
 *   3. Sortiert alle Blöcke nach displayOrder.
 *   4. Kopiert QuestionDefinitions als tiefe Snapshots; Fragen, die in
 *      mehreren Blöcken auftauchen, werden dem ersten (nach displayOrder)
 *      zugeordnet und danach nicht mehr wiederholt (identisch zu
 *      buildQuestionnaireQuestions).
 *   5. Setzt initiallyVisible entsprechend der Praxisauswahl.
 */
export function buildFrozenBlocks(
  selectedBlockIds: string[],
  blockCatalog: Record<string, QuestionnaireBlock> = BLOCK_CATALOG,
  questionCatalog: Record<string, QuestionDefinition> = QUESTION_CATALOG,
): FrozenBlock[] {
  const selectedSet = new Set(
    selectedBlockIds.filter((id) => id in blockCatalog),
  );

  // BFS: alle erreichbaren Block-IDs sammeln
  const visited = new Set<string>();
  const queue = [...selectedSet];

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    if (!(id in blockCatalog)) continue;
    visited.add(id);

    for (const rule of blockCatalog[id].conditionalRules ?? []) {
      if (rule.action === "showBlock" && !visited.has(rule.targetId)) {
        queue.push(rule.targetId);
      }
    }
  }

  // Sortierung nach displayOrder
  const orderedIds = [...visited].sort(
    (a, b) => blockCatalog[a].displayOrder - blockCatalog[b].displayOrder,
  );

  // Blöcke mit tiefen Question-Snapshots aufbauen; globale Deduplizierung
  const seenQuestionIds = new Set<string>();
  const result: FrozenBlock[] = [];
  const resolvedQuestionIds = resolveQuestionIdsForBlocks(selectedBlockIds, blockCatalog);

  for (const id of orderedIds) {
    const block = blockCatalog[id];
    const questions: QuestionDefinition[] = [];

    for (const questionId of resolvedQuestionIds.get(id) ?? block.questionIds) {
      if (seenQuestionIds.has(questionId)) continue;
      const q = questionCatalog[questionId];
      if (!q) continue;
      seenQuestionIds.add(questionId);
      // Tiefer Snapshot: keine Referenz auf mutable Catalog-Objekte
      questions.push(structuredClone(q));
    }

    const frozenBlock: FrozenBlock = {
      id: block.id,
      label: block.label,
      displayOrder: block.displayOrder,
      questions,
      conditionalRules: structuredClone(block.conditionalRules ?? []),
      initiallyVisible: selectedSet.has(id),
    };
    if (block.label_en !== undefined) frozenBlock.label_en = block.label_en;
    if (block.description !== undefined) frozenBlock.description = block.description;
    if (block.description_en !== undefined) frozenBlock.description_en = block.description_en;
    if (block.hint !== undefined) frozenBlock.hint = block.hint;
    if (block.hint_en !== undefined) frozenBlock.hint_en = block.hint_en;

    result.push(frozenBlock);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Parse-Helfer
// ---------------------------------------------------------------------------

/** Parst einen rohen DB-Wert sicher zu FrozenBlock[] oder null. */
export function parseFrozenBlocks(raw: unknown): FrozenBlock[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  return raw as FrozenBlock[];
}
