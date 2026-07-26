/**
 * Themenkatalog für praxisinterne Prozessregelungen.
 *
 * Vollständig getrennt von lib/workflow/processCatalog.ts.
 * Kein Import aus bestehenden klinischen Workflow-Dateien.
 */

import {
  type InternalProtocolTopicId,
  isInternalProtocolTopicId,
} from "./types";

// ---------------------------------------------------------------------------
// Themen-Interface
// ---------------------------------------------------------------------------

export interface InternalProtocolTopic {
  readonly id: InternalProtocolTopicId;
  readonly title: string;
  readonly description?: string;
}

// ---------------------------------------------------------------------------
// Pilot-Themenkatalog (intern, nicht direkt exportiert)
// ---------------------------------------------------------------------------

const INTERNAL_PROTOCOL_TOPICS: readonly InternalProtocolTopic[] = [
  {
    id: "patienten-ohne-termin",
    title: "Umgang mit Patienten ohne Termin",
  },
];

// ---------------------------------------------------------------------------
// Öffentliche API
// ---------------------------------------------------------------------------

/**
 * Gibt alle verfügbaren praxisinternen Prozessthemen zurück.
 * Gibt eine defensive Kopie zurück, damit externe Aufrufer den Katalog
 * nicht durch Mutation des Arrays verändern können.
 */
export function listInternalProtocolTopics(): InternalProtocolTopic[] {
  return INTERNAL_PROTOCOL_TOPICS.map((t) => ({ ...t }));
}

/**
 * Gibt ein einzelnes Thema anhand seiner ID zurück.
 * Gibt eine defensive Kopie zurück oder undefined bei unbekannter ID.
 */
export function getInternalProtocolTopic(
  id: InternalProtocolTopicId,
): InternalProtocolTopic | undefined {
  const found = INTERNAL_PROTOCOL_TOPICS.find((t) => t.id === id);
  return found ? { ...found } : undefined;
}

export { isInternalProtocolTopicId };
