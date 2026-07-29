/**
 * Adapter zwischen praxisinternen Protokollen (lib/workflow/internalProtocol/)
 * und der bestehenden Workflow-Session-Infrastruktur.
 *
 * Kein Import aus lib/workflow/types.ts oder lib/workflow/processCatalog.ts
 * (um Kreisabhängigkeiten zu vermeiden). Kein Import aus klinischen
 * Workflow-Modulen.
 *
 * Dieses Modul definiert das Speicherformat für interne Protokoll-Sitzungen
 * im process_snapshot-JSON-Feld einer WorkflowSession.
 */

// ---------------------------------------------------------------------------
// Speicherformat im process_snapshot-JSON-Feld
// ---------------------------------------------------------------------------

/**
 * Antwortwert für eine einzelne Protokollfrage im Workflow-Kontext.
 *
 * - null        = noch nicht beantwortet
 * - string      = YES_NO_UNCLEAR-Antwort ("YES"|"NO"|"UNCLEAR"),
 *                 SINGLE_SELECT-Option-ID oder FREE_TEXT-Inhalt
 * - string[]    = MULTI_SELECT-Option-IDs
 */
export type ProtocolWorkflowAnswerValue = string | string[] | null;

/** Map von Frage-IDs zu Antwortwerten. */
export type ProtocolWorkflowAnswers = Record<string, ProtocolWorkflowAnswerValue>;

/**
 * Status eines Sections-Checkpoints im internen Protokoll.
 * Semantisch getrennt von ProcessPointStatus der klinischen Workflows.
 */
export type ProtocolCheckpointStatus = "OPEN" | "CONFIRMED" | "NOT_APPLICABLE";

/** Zustand eines einzelnen Protocol-Checkpoints (entspricht einer ProtocolSection). */
export interface ProtocolWorkflowCheckpoint {
  /** ID der ProtocolSection, z. B. "PC-C01". */
  id: string;
  /** Titel der ProtocolSection. */
  title: string;
  /** Aktueller Klärungsstatus. */
  status: ProtocolCheckpointStatus;
  /** Antworten auf alle Fragen dieser Section. */
  answers: ProtocolWorkflowAnswers;
}

/**
 * Snapshot-Format für praxisinterne Protokoll-Sitzungen im process_snapshot-Feld.
 *
 * Erkennbar durch processKind: "internal-protocol". Koexistiert mit dem
 * klinischen WorkflowProcessSnapshot (erkennbar durch Fehlen von processKind).
 */
export interface InternalProtocolWorkflowSnapshot {
  processKind: "internal-protocol";
  topicId: "patienten-ohne-termin";
  checkpoints: ProtocolWorkflowCheckpoint[];
}

// ---------------------------------------------------------------------------
// Type Guards
// ---------------------------------------------------------------------------

/** Prüft ob ein Wert ein gültiger ProtocolCheckpointStatus ist. */
export function isProtocolCheckpointStatus(
  value: unknown,
): value is ProtocolCheckpointStatus {
  return value === "OPEN" || value === "CONFIRMED" || value === "NOT_APPLICABLE";
}

/** Prüft ob ein Wert ein gültiger ProtocolWorkflowAnswerValue ist. */
export function isProtocolWorkflowAnswerValue(
  value: unknown,
): value is ProtocolWorkflowAnswerValue {
  if (value === null) return true;
  if (typeof value === "string") return true;
  if (Array.isArray(value)) return value.every((v) => typeof v === "string");
  return false;
}

/** Prüft ob ein Wert ein gültiger ProtocolWorkflowCheckpoint ist. */
export function isProtocolWorkflowCheckpoint(
  value: unknown,
): value is ProtocolWorkflowCheckpoint {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || v.id.length === 0) return false;
  if (typeof v.title !== "string") return false;
  if (!isProtocolCheckpointStatus(v.status)) return false;
  if (!v.answers || typeof v.answers !== "object" || Array.isArray(v.answers))
    return false;
  for (const val of Object.values(v.answers as Record<string, unknown>)) {
    if (!isProtocolWorkflowAnswerValue(val)) return false;
  }
  return true;
}

/**
 * Prüft ob ein Wert ein gültiger InternalProtocolWorkflowSnapshot ist.
 * Wirft keine Ausnahmen.
 */
export function isInternalProtocolWorkflowSnapshot(
  value: unknown,
): value is InternalProtocolWorkflowSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (v.processKind !== "internal-protocol") return false;
  if (v.topicId !== "patienten-ohne-termin") return false;
  if (!Array.isArray(v.checkpoints)) return false;
  return v.checkpoints.every(isProtocolWorkflowCheckpoint);
}

// ---------------------------------------------------------------------------
// Initialisierung
// ---------------------------------------------------------------------------

import { getPatientWithoutAppointmentSections } from "./patientWithoutAppointment";

/**
 * Erzeugt die initialen Checkpoints für eine neue Protokoll-Sitzung
 * aus den definierten Sections des Pilotprozesses.
 *
 * Alle Checkpoints starten mit status: "OPEN" und leeren Antworten (alle null).
 * Wird für Tests und als Basis für buildPrefillProtocolWorkflowCheckpoints verwendet.
 */
export function buildInitialProtocolWorkflowCheckpoints(): ProtocolWorkflowCheckpoint[] {
  return getPatientWithoutAppointmentSections().map((section) => {
    const answers: ProtocolWorkflowAnswers = {};
    for (const q of section.questions) {
      answers[q.id] = null;
    }
    return {
      id: section.id,
      title: section.title,
      status: "OPEN" as const,
      answers,
    };
  });
}

// ---------------------------------------------------------------------------
// Prefill-Vorschlagswerte für „Patienten ohne Termin"
// ---------------------------------------------------------------------------

/**
 * Praxistaugliche Ausgangsvorschläge für neue Internal-Protocol-Sitzungen.
 *
 * Diese Werte sind Praxisvorschläge, keine gesetzlichen Vorgaben.
 * Alle Fragen-IDs und Option-IDs beziehen sich auf die aktuellen Definitionen
 * in patientWithoutAppointment.ts. Nicht abgedeckte Fragen bleiben null.
 */
const PATIENTEN_OHNE_TERMIN_PREFILL: Readonly<Record<string, ProtocolWorkflowAnswerValue>> = {
  // PC-C01: Geltungsbereich
  "POT-Q-C01-01": ["POT-Q-C01-01-A"],   // Während regulärer Sprechzeiten
  "POT-Q-C01-02": "YES",                 // Gilt für alle Mitarbeitenden

  // PC-C02: Zuständigkeit
  "POT-Q-C02-01": "POT-Q-C02-01-A",     // MFA am Empfang
  "POT-Q-C02-02": "POT-Q-C02-02-B",     // Erfahrene MFA nach Schema, Rücksprache Arzt

  // PC-C03: Standardablauf
  "POT-Q-C03-01": [
    "POT-Q-C03-01-A",  // Name und Geburtsdatum
    "POT-Q-C03-01-B",  // Art und Schwere der Beschwerden
    "POT-Q-C03-01-C",  // Dringlichkeits-Selbsteinschätzung
  ],
  "POT-Q-C03-02": "POT-Q-C03-02-D",     // Situationsabhängige Entscheidung
  "POT-Q-C03-03": "YES",                 // Anliegen vor Entscheidung dokumentieren

  // PC-C04: Ausnahmen und Eskalation
  "POT-Q-C04-01": [
    "POT-Q-C04-01-A",  // Abfrage definierter Warnsymptome
    "POT-Q-C04-01-B",  // Einschätzung durch erfahrene MFA
  ],
  "POT-Q-C04-02": "POT-Q-C04-02-A",     // Sofortige Benachrichtigung + Notruf 112
  "POT-Q-C04-04": "UNCLEAR",             // Eskalationsstufen bekannt: noch unklar

  // PC-C05: Dokumentation und Überprüfung
  "POT-Q-C05-01": "YES",                 // Entscheidungen dokumentieren
  "POT-Q-C05-02": ["POT-Q-C05-02-A"],    // Jährlich im Rahmen des QM-Zyklus (Mehrfachauswahl möglich)
  "POT-Q-C05-03": "POT-Q-C05-03-D",     // Gemeinsam im Praxisteam
} as const;

/**
 * Erzeugt Checkpoints für eine neue Sitzung mit praxistauglichen Vorschlagswerten.
 *
 * - Nur beim Erstellen einer neuen Sitzung verwenden.
 * - Bereits gespeicherte Antworten werden durch diesen Aufruf nicht verändert.
 * - Prefill-Werte basieren ausschließlich auf vorhandenen Option-IDs.
 */
export function buildPrefillProtocolWorkflowCheckpoints(): ProtocolWorkflowCheckpoint[] {
  return getPatientWithoutAppointmentSections().map((section) => {
    const answers: ProtocolWorkflowAnswers = {};
    for (const q of section.questions) {
      const prefill = PATIENTEN_OHNE_TERMIN_PREFILL[q.id];
      answers[q.id] = prefill !== undefined ? prefill : null;
    }
    return {
      id: section.id,
      title: section.title,
      status: "OPEN" as const,
      answers,
    };
  });
}

/**
 * Erzeugt einen neuen InternalProtocolWorkflowSnapshot für den Pilotprozess.
 * Neue Sitzungen erhalten praxistaugliche Vorschlagswerte (Prefill).
 */
export function buildInitialInternalProtocolWorkflowSnapshot(): InternalProtocolWorkflowSnapshot {
  return {
    processKind: "internal-protocol",
    topicId: "patienten-ohne-termin",
    checkpoints: buildPrefillProtocolWorkflowCheckpoints(),
  };
}

// ---------------------------------------------------------------------------
// Hilfsfunktionen für den Client
// ---------------------------------------------------------------------------

/** Anzahl beantworteter Fragen in einem Checkpoint. */
export function countAnsweredQuestions(checkpoint: ProtocolWorkflowCheckpoint): number {
  return Object.values(checkpoint.answers).filter((v) => {
    if (v === null) return false;
    if (Array.isArray(v)) return v.length > 0;
    return v.length > 0;
  }).length;
}

/** Anzahl unbeantworteter Fragen in einem Checkpoint. */
export function countUnansweredQuestions(checkpoint: ProtocolWorkflowCheckpoint): number {
  return Object.values(checkpoint.answers).filter((v) => {
    if (v === null) return true;
    if (Array.isArray(v)) return v.length === 0;
    return v.length === 0;
  }).length;
}
