/**
 * Snapshot-Ebene für praxisinterne Prozessregelungen.
 *
 * Kapselt den Inhaltszustand (Sections, Regeln, Fragen) und reserviert Platz
 * für spätere Antworten. Vollständig isoliert von der bestehenden klinischen
 * Workflow-Engine und der WorkflowSession-Ebene. Der Typ InternalProtocolSnapshot
 * in ./types.ts hat denselben Namen, bildet aber den Checkpoint-Status ab.
 *
 * Kein Import aus lib/workflow/types.ts, lib/workflow/processCatalog.ts
 * oder anderen klinischen Workflow-Modulen.
 */

import { randomUUID } from "crypto";

import type {
  ProtocolSection,
  ProtocolQuestion,
  ProtocolAnswerOption,
} from "./questions";
import type { OfficialRule, OfficialSource } from "./officialContent";

// ---------------------------------------------------------------------------
// Antwort-Struktur
// ---------------------------------------------------------------------------

/**
 * Map von Frage-IDs zu Antwortplätzen.
 *
 * Reserviert für jede Frage einen Eintrag. Die konkrete Typisierung der
 * Antwortwerte wird in einem späteren Schritt festgelegt. Initialisiert
 * mit null (= noch unbeantwortet, kein Antwortformat vorgegeben).
 */
export type ProtocolAnswersMap = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Snapshot-Typ
// ---------------------------------------------------------------------------

/**
 * Vollständiger Snapshot eines praxisinternen Regelungsdokuments.
 *
 * Enthält:
 * - Metadaten: protocolId (UUID), version (startet bei 1), createdAt (ISO-8601)
 * - Sections: tiefe Kopien aller ProtocolSection-Objekte zum Erzeugungszeitpunkt
 * - Answers: Platzhalter für spätere Antworten (noch ohne fachliche Typisierung)
 *
 * Nicht zu verwechseln mit InternalProtocolSnapshot aus ./types.ts, der den
 * WorkflowSession-Checkpoint-Status abbildet. Dieser Typ bildet den
 * inhaltlichen Dokumentzustand ab, nicht den Bearbeitungsstatus.
 */
export interface InternalProtocolSnapshot {
  /** Eindeutige ID dieses Snapshots (UUID v4). */
  protocolId: string;
  /** Schema-Version. Startet bei 1. */
  version: number;
  /** Erzeugungszeitpunkt als ISO-8601-String. */
  createdAt: string;
  /** Tiefe Kopien aller Abschnitte zum Erzeugungszeitpunkt. */
  sections: ProtocolSection[];
  /**
   * Platzhalter für Antworten, initialisiert für jede Frage in sections.
   * Key = questionId, Value = null (= noch unbeantwortet, kein Antwortformat
   * vorgegeben). Die konkrete Typisierung erfolgt in einem späteren Schritt.
   */
  answers: ProtocolAnswersMap;
}

// ---------------------------------------------------------------------------
// Interne tiefe Kopierfunktionen
// ---------------------------------------------------------------------------

function cloneOption(o: ProtocolAnswerOption): ProtocolAnswerOption {
  return { ...o };
}

function cloneQuestion(q: ProtocolQuestion): ProtocolQuestion {
  switch (q.kind) {
    case "YES_NO_UNCLEAR":
      return { ...q };
    case "SINGLE_SELECT":
      return { ...q, options: q.options.map(cloneOption) };
    case "MULTI_SELECT":
      return { ...q, options: q.options.map(cloneOption) };
    case "FREE_TEXT":
      return { ...q };
  }
}

function cloneSource(s: OfficialSource): OfficialSource {
  return { ...s };
}

function cloneRule(r: OfficialRule): OfficialRule {
  const clone: OfficialRule = {
    id: r.id,
    text: r.text,
    bindingLevel: r.bindingLevel,
    source: cloneSource(r.source),
  };
  if (r.title !== undefined) clone.title = r.title;
  if (r.note !== undefined) clone.note = r.note;
  return clone;
}

function cloneSection(s: ProtocolSection): ProtocolSection {
  return {
    id: s.id,
    title: s.title,
    officialRules: s.officialRules.map(cloneRule),
    questions: s.questions.map(cloneQuestion),
  };
}

// ---------------------------------------------------------------------------
// Interne Initialisierung leerer Antworten
// ---------------------------------------------------------------------------

function buildEmptyAnswers(sections: ProtocolSection[]): ProtocolAnswersMap {
  const answers: ProtocolAnswersMap = {};
  for (const section of sections) {
    for (const q of section.questions) {
      answers[q.id] = null;
    }
  }
  return answers;
}

// ---------------------------------------------------------------------------
// Öffentliche API
// ---------------------------------------------------------------------------

/**
 * Erzeugt einen neuen InternalProtocolSnapshot aus einem Array von ProtocolSection.
 *
 * - Erstellt ausschließlich tiefe Kopien aller Sections, Regeln, Quellen,
 *   Fragen und Optionen. Keine Referenzen auf die Eingabedaten.
 * - Initialisiert alle Antwortplätze mit null (= noch unbeantwortet).
 * - Setzt version auf 1.
 * - Setzt createdAt auf den aktuellen Zeitstempel (ISO-8601).
 * - Generiert eine neue protocolId (UUID v4).
 *
 * @param sections Abschnitte, die dem Snapshot zugrunde liegen sollen.
 * @returns Neuer, vollständig eigenständiger InternalProtocolSnapshot.
 */
export function createProtocolSnapshot(
  sections: ProtocolSection[],
): InternalProtocolSnapshot {
  const copiedSections = sections.map(cloneSection);
  return {
    protocolId: randomUUID(),
    version: 1,
    createdAt: new Date().toISOString(),
    sections: copiedSections,
    answers: buildEmptyAnswers(copiedSections),
  };
}

/**
 * Erstellt eine vollständige tiefe Kopie eines InternalProtocolSnapshot.
 *
 * Keine Referenz auf einen Wert oder ein Objekt aus dem Ursprungs-Snapshot.
 * Primitive Werte (null) in answers werden direkt übernommen.
 *
 * @param snapshot Zu klonender Snapshot.
 * @returns Neuer, vollständig eigenständiger InternalProtocolSnapshot.
 */
export function cloneProtocolSnapshot(
  snapshot: InternalProtocolSnapshot,
): InternalProtocolSnapshot {
  return {
    protocolId: snapshot.protocolId,
    version: snapshot.version,
    createdAt: snapshot.createdAt,
    sections: snapshot.sections.map(cloneSection),
    answers: { ...snapshot.answers },
  };
}
