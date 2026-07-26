/**
 * Checkpoint-Definitionen und Builder für praxisinterne Prozessregelungen.
 *
 * Vollständig getrennt von lib/workflow/m3Checkpoints.ts.
 * Kein Import aus bestehenden klinischen Workflow-Dateien.
 */

import {
  type InternalProtocolTopicId,
  type InternalProtocolCheckpointSnapshot,
} from "./types";

// ---------------------------------------------------------------------------
// Checkpoint-Definitionstyp
// ---------------------------------------------------------------------------

/** Statische Definition eines Klärungsbereichs (unabhängig von Sitzungsdaten). */
export interface InternalProtocolCheckpointDefinition {
  readonly id: string;
  readonly title: string;
}

// ---------------------------------------------------------------------------
// Pilot-Checkpoint-Katalog (intern)
// ---------------------------------------------------------------------------

const PATIENTEN_OHNE_TERMIN_CHECKPOINTS: readonly InternalProtocolCheckpointDefinition[] =
  [
    { id: "PC-C01", title: "Geltungsbereich" },
    { id: "PC-C02", title: "Zuständigkeit und Entscheidungsbefugnis" },
    { id: "PC-C03", title: "Standardablauf" },
    { id: "PC-C04", title: "Ausnahmen und Eskalation" },
    { id: "PC-C05", title: "Dokumentation und Überprüfung" },
  ];

const CHECKPOINTS_BY_TOPIC: Record<
  InternalProtocolTopicId,
  readonly InternalProtocolCheckpointDefinition[]
> = {
  "patienten-ohne-termin": PATIENTEN_OHNE_TERMIN_CHECKPOINTS,
};

// ---------------------------------------------------------------------------
// Öffentliche API
// ---------------------------------------------------------------------------

/**
 * Gibt die Checkpoint-Definitionen für ein Thema zurück.
 * Gibt defensive Kopien der Einträge zurück.
 */
export function getInternalProtocolCheckpoints(
  topicId: InternalProtocolTopicId,
): InternalProtocolCheckpointDefinition[] {
  const defs = CHECKPOINTS_BY_TOPIC[topicId] ?? [];
  return defs.map((d) => ({ ...d }));
}

/**
 * Erzeugt initiale Checkpoint-Snapshots für eine neue Sitzung.
 *
 * Jeder Checkpoint startet mit status: "OPEN".
 * m2_answers und decision_text werden nicht gesetzt.
 * Jeder Aufruf liefert neue, voneinander unabhängige Objekte.
 */
export function buildInitialProtocolCheckpoints(
  topicId: InternalProtocolTopicId,
): InternalProtocolCheckpointSnapshot[] {
  const defs = CHECKPOINTS_BY_TOPIC[topicId] ?? [];
  return defs.map((def) => ({
    id: def.id,
    title: def.title,
    status: "OPEN" as const,
  }));
}
