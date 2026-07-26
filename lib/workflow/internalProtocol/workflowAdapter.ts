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
 * Alle Checkpoints starten mit status: "OPEN" und leeren Antworten.
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

/**
 * Erzeugt einen neuen InternalProtocolWorkflowSnapshot für den Pilotprozess.
 */
export function buildInitialInternalProtocolWorkflowSnapshot(): InternalProtocolWorkflowSnapshot {
  return {
    processKind: "internal-protocol",
    topicId: "patienten-ohne-termin",
    checkpoints: buildInitialProtocolWorkflowCheckpoints(),
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
