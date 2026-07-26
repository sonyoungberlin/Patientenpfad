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
// Browser- und server-kompatible UUID-Generierung (kein Node-only-Import)
// ---------------------------------------------------------------------------

/**
 * Erzeugt eine UUID v4. Nutzt die Web Crypto API (browser + Node.js ≥ 19),
 * fällt andernfalls auf einen Math.random-basierten Ersatz zurück.
 * Kein Import aus dem Node-only-Modul "crypto".
 */
function generateUUID(): string {
  if (typeof (globalThis as Record<string, unknown>).crypto === "object") {
    const webCrypto = (globalThis as Record<string, unknown>).crypto as {
      randomUUID?: () => string;
    };
    if (typeof webCrypto.randomUUID === "function") {
      return webCrypto.randomUUID();
    }
  }
  // Fallback für ältere Umgebungen ohne Web Crypto API
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
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
 * Optionen zum Injizieren stabiler Metadaten in einen neuen Snapshot.
 *
 * Beide Felder sind optional. Fehlt ein Feld, wird ein neuer Wert generiert:
 * - protocolId: neue UUID v4 via globalThis.crypto.randomUUID() (kein Node-Import)
 * - createdAt:  aktueller ISO-8601-Zeitstempel
 */
export interface CreateProtocolSnapshotOptions {
  /** Stabile ID, die wiederverwendet werden soll (z. B. Session-ID). */
  protocolId?: string;
  /** Stabiler Erstellungszeitpunkt als ISO-8601-String. */
  createdAt?: string;
}

/**
 * Erzeugt einen neuen InternalProtocolSnapshot aus einem Array von ProtocolSection.
 *
 * - Erstellt ausschließlich tiefe Kopien aller Sections, Regeln, Quellen,
 *   Fragen und Optionen. Keine Referenzen auf die Eingabedaten.
 * - Initialisiert alle Antwortplätze mit null (= noch unbeantwortet).
 * - Setzt version auf 1.
 * - protocolId und createdAt werden aus options übernommen, falls angegeben;
 *   andernfalls werden neue Werte generiert (browser- und serverkompatibel).
 *
 * @param sections Abschnitte, die dem Snapshot zugrunde liegen sollen.
 * @param options  Optionale stabile Metadaten (protocolId, createdAt).
 * @returns Neuer, vollständig eigenständiger InternalProtocolSnapshot.
 */
export function createProtocolSnapshot(
  sections: ProtocolSection[],
  options?: CreateProtocolSnapshotOptions,
): InternalProtocolSnapshot {
  const copiedSections = sections.map(cloneSection);
  return {
    protocolId: options?.protocolId ?? generateUUID(),
    version: 1,
    createdAt: options?.createdAt ?? new Date().toISOString(),
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
