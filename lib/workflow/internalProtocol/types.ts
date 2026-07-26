/**
 * Typen für praxisinterne Prozessregelungen.
 *
 * Vollständig isoliert von den bestehenden klinischen Workflow-Typen
 * (WorkflowProcessSnapshot, ProcessPointStatus, WorkflowM2AnswerValue usw.).
 * Kein Import aus lib/workflow/types.ts oder lib/workflow/processCatalog.ts.
 */

// ---------------------------------------------------------------------------
// Primärtypen
// ---------------------------------------------------------------------------

/** Themen-IDs für praxisinterne Prozessregelungen. */
export type InternalProtocolTopicId = "patienten-ohne-termin";

/**
 * Antwortoptionen für M2-Fragen im Rahmen praxisinterner Prozessregelungen.
 * Erweiterung gegenüber dem klinischen Workflow um CONDITIONAL und NOT_RELEVANT.
 */
export type InternalProtocolAnswerValue =
  | "YES"
  | "NO"
  | "CONDITIONAL"
  | "UNCLEAR"
  | "NOT_RELEVANT";

/**
 * Status eines Checkpoints im Rahmen einer praxisinternen Prozessregel.
 * Semantisch getrennt von ProcessPointStatus des klinischen Workflows.
 */
export type InternalProtocolStatus =
  | "CONFIRMED"
  | "PROVISIONAL"
  | "OPEN"
  | "NOT_APPLICABLE";

// ---------------------------------------------------------------------------
// Snapshot-Shapes
// ---------------------------------------------------------------------------

/** Snapshot eines einzelnen Klärungsbereichs einer praxisinternen Prozessregel. */
export interface InternalProtocolCheckpointSnapshot {
  id: string;
  title: string;
  status: InternalProtocolStatus;
  m2_answers?: Record<string, InternalProtocolAnswerValue>;
  decision_text?: string;
}

/**
 * Vollständiger Snapshot einer praxisinternen Prozessregel-Sitzung.
 * Wird in WorkflowSession.process_snapshot (Json?) gespeichert.
 * Unterscheidbar von WorkflowProcessSnapshot durch processKind.
 */
export interface InternalProtocolSnapshot {
  processKind: "internal-protocol";
  topicId: InternalProtocolTopicId;
  protocolCheckpoints: InternalProtocolCheckpointSnapshot[];
  sessionNote?: string;
}

// ---------------------------------------------------------------------------
// Type Guards
// ---------------------------------------------------------------------------

/** Prüft ob ein Wert eine gültige InternalProtocolTopicId ist. */
export function isInternalProtocolTopicId(
  value: unknown,
): value is InternalProtocolTopicId {
  return value === "patienten-ohne-termin";
}

/** Prüft ob ein Wert ein gültiger InternalProtocolStatus ist. */
export function isInternalProtocolStatus(
  value: unknown,
): value is InternalProtocolStatus {
  return (
    value === "CONFIRMED" ||
    value === "PROVISIONAL" ||
    value === "OPEN" ||
    value === "NOT_APPLICABLE"
  );
}

/** Prüft ob ein Wert ein gültiger InternalProtocolAnswerValue ist. */
export function isInternalProtocolAnswerValue(
  value: unknown,
): value is InternalProtocolAnswerValue {
  return (
    value === "YES" ||
    value === "NO" ||
    value === "CONDITIONAL" ||
    value === "UNCLEAR" ||
    value === "NOT_RELEVANT"
  );
}

/**
 * Vollständige Laufzeit-Validierung eines InternalProtocolSnapshot.
 *
 * Prüft:
 * - Objektform
 * - processKind === "internal-protocol"
 * - gültige topicId
 * - protocolCheckpoints ist ein Array
 * - jeder Checkpoint hat id (string), title (string), gültigen status
 * - optionale m2_answers enthalten ausschließlich gültige Antwortwerte
 * - optionaler decision_text ist ein String
 * - optionale sessionNote ist ein String
 */
export function isValidInternalProtocolSnapshot(
  value: unknown,
): value is InternalProtocolSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const v = value as Record<string, unknown>;

  if (v.processKind !== "internal-protocol") return false;
  if (!isInternalProtocolTopicId(v.topicId)) return false;
  if (!Array.isArray(v.protocolCheckpoints)) return false;

  for (const item of v.protocolCheckpoints as unknown[]) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const cp = item as Record<string, unknown>;

    if (typeof cp.id !== "string" || cp.id.length === 0) return false;
    if (typeof cp.title !== "string" || cp.title.length === 0) return false;
    if (!isInternalProtocolStatus(cp.status)) return false;

    if (cp.m2_answers !== undefined) {
      if (
        !cp.m2_answers ||
        typeof cp.m2_answers !== "object" ||
        Array.isArray(cp.m2_answers)
      ) {
        return false;
      }
      for (const ans of Object.values(
        cp.m2_answers as Record<string, unknown>,
      )) {
        if (!isInternalProtocolAnswerValue(ans)) return false;
      }
    }

    if (cp.decision_text !== undefined && typeof cp.decision_text !== "string") {
      return false;
    }
  }

  if (v.sessionNote !== undefined && typeof v.sessionNote !== "string") {
    return false;
  }

  return true;
}
