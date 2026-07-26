/**
 * Dokumentmodell für praxisinterne Prozessregelungen (SOP).
 *
 * Wandelt einen InternalProtocolSnapshot in ein strukturiertes Dokument um,
 * das Metadaten, Sections mit offiziellen Leitplanken, Praxisfragen und
 * aktuelle Antworten enthält.
 *
 * Noch keine Formatierung (PDF, DOCX, Markdown).
 * Noch keine Textgenerierung, Zusammenfassung oder SOP-Sätze.
 *
 * Kein Import aus lib/workflow/types.ts, lib/workflow/processCatalog.ts
 * oder anderen klinischen Workflow-Modulen.
 */

import type { InternalProtocolSnapshot } from "./snapshot";
import type {
  ProtocolQuestion,
  ProtocolQuestionKind,
  ProtocolAnswerOption,
  ProtocolSection,
} from "./questions";
import type { OfficialRule, OfficialSource } from "./officialContent";

// ---------------------------------------------------------------------------
// Dokumenttypen
// ---------------------------------------------------------------------------

/**
 * Eine Praxisfrage im Dokument, angereichert mit der aktuellen Antwort.
 *
 * Enthält alle Felder der Quellfrage plus das Feld answer aus dem Snapshot.
 * Die Typisierung von answer ist bewusst offen (unknown) – die fachliche
 * Modellierung erfolgt in einem späteren Schritt.
 */
export interface ProtocolDocumentQuestion {
  id: string;
  text: string;
  kind: ProtocolQuestionKind;
  hint?: string;
  required?: boolean;
  /** Nur bei SINGLE_SELECT und MULTI_SELECT. */
  options?: ProtocolAnswerOption[];
  /** Nur bei FREE_TEXT. */
  placeholder?: string;
  /** Aktuelle Antwort aus dem Snapshot. null = noch unbeantwortet. */
  answer: unknown;
}

/**
 * Ein Abschnitt des Dokuments.
 *
 * Enthält offizielle Leitplanken und Praxisfragen mit aktuellen Antworten.
 */
export interface ProtocolDocumentSection {
  id: string;
  title: string;
  /** Offizielle Leitplanken (tiefe Kopien). */
  officialRules: OfficialRule[];
  /** Praxisfragen mit aktuellen Antworten (tiefe Kopien). */
  questions: ProtocolDocumentQuestion[];
}

/**
 * Das vollständige Dokument einer praxisinternen Prozessregelung.
 *
 * Enthält Metadaten und alle Abschnitte in der Reihenfolge des Snapshots.
 * Noch kein Ausgabeformat.
 */
export interface ProtocolDocument {
  /** Dokumenttitel. */
  title: string;
  /** Prozess-ID aus dem Snapshot (UUID). */
  protocolId: string;
  /** Schema-Version aus dem Snapshot. */
  version: number;
  /** Erstellungsdatum (ISO-8601) aus dem Snapshot. */
  createdAt: string;
  /** Abschnitte in der Reihenfolge des Snapshots. */
  sections: ProtocolDocumentSection[];
}

// ---------------------------------------------------------------------------
// Interne tiefe Kopierfunktionen
// ---------------------------------------------------------------------------

function cloneOption(o: ProtocolAnswerOption): ProtocolAnswerOption {
  return { ...o };
}

function buildDocumentQuestion(
  q: ProtocolQuestion,
  answer: unknown,
): ProtocolDocumentQuestion {
  const doc: ProtocolDocumentQuestion = {
    id: q.id,
    text: q.text,
    kind: q.kind,
    answer,
  };

  if (q.hint !== undefined) doc.hint = q.hint;
  if (q.required !== undefined) doc.required = q.required;

  if (q.kind === "SINGLE_SELECT" || q.kind === "MULTI_SELECT") {
    doc.options = q.options.map(cloneOption);
  }

  if (q.kind === "FREE_TEXT" && q.placeholder !== undefined) {
    doc.placeholder = q.placeholder;
  }

  return doc;
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

function buildDocumentSection(
  section: ProtocolSection,
  answers: Record<string, unknown>,
): ProtocolDocumentSection {
  return {
    id: section.id,
    title: section.title,
    officialRules: section.officialRules.map(cloneRule),
    questions: section.questions.map((q) =>
      buildDocumentQuestion(q, Object.hasOwn(answers, q.id) ? answers[q.id] : null),
    ),
  };
}

// ---------------------------------------------------------------------------
// Öffentliche API
// ---------------------------------------------------------------------------

/**
 * Erzeugt ein ProtocolDocument aus einem InternalProtocolSnapshot.
 *
 * - Übernimmt Metadaten (protocolId, version, createdAt) aus dem Snapshot.
 * - Erstellt tiefe Kopien aller Sections, Regeln, Quellen, Fragen und Optionen.
 * - Bettet die aktuellen Antworten aus snapshot.answers in jede Frage ein.
 * - Verändert den übergebenen Snapshot nicht.
 *
 * @param snapshot Snapshot, aus dem das Dokument erzeugt werden soll.
 * @param title    Dokumenttitel (verpflichtend).
 * @returns        Neues, vollständig eigenständiges ProtocolDocument.
 */
export function createProtocolDocument(
  snapshot: InternalProtocolSnapshot,
  title: string,
): ProtocolDocument {
  return {
    title,
    protocolId: snapshot.protocolId,
    version: snapshot.version,
    createdAt: snapshot.createdAt,
    sections: snapshot.sections.map((s) =>
      buildDocumentSection(s, snapshot.answers),
    ),
  };
}
