import type { PracticeWorkflowSnapshot } from "@/lib/practiceProcesses/workflowSnapshot";
import type { InternalProtocolWorkflowSnapshot } from "@/lib/workflow/internalProtocol/workflowAdapter";
import { getPracticeProcessMode } from "@/lib/workflow/internalProtocol/workflowAdapter";

export type SessionStatus = "IN_PROGRESS" | "COMPLETED";

export function deriveSessionStatus(snapshot: PracticeWorkflowSnapshot): SessionStatus {
  return snapshot.completedAt !== undefined ? "COMPLETED" : "IN_PROGRESS";
}

/** Alle Checkpoints entschieden → M4 kann geöffnet werden. Sagt nichts über completedAt. */
export function allDecided(snapshot: PracticeWorkflowSnapshot): boolean {
  return snapshot.checkpoints.every((cp) => cp.decision !== undefined);
}

export function sessionStatusLabel(status: SessionStatus): string {
  return status === "COMPLETED" ? "Abgeschlossen" : "In Bearbeitung";
}

// ---------------------------------------------------------------------------
// InternalProtocol-Sessionstatus (4-stufig, für bestehende Sitzungen)
// ---------------------------------------------------------------------------

export type InternalProtocolSessionStatus =
  | "CURRENT_STATE_IN_PROGRESS"
  | "CURRENT_STATE_COMPLETED"
  | "TARGET_STATE_IN_PROGRESS"
  | "TARGET_STATE_COMPLETED";

export function deriveInternalProtocolSessionStatus(
  snapshot: InternalProtocolWorkflowSnapshot,
): InternalProtocolSessionStatus {
  const mode = getPracticeProcessMode(snapshot);
  const allJudged = snapshot.checkpoints.every(
    (cp) => cp.clarificationJudgement !== undefined,
  );
  if (mode === "TARGET_STATE") {
    return allJudged ? "TARGET_STATE_COMPLETED" : "TARGET_STATE_IN_PROGRESS";
  }
  return allJudged ? "CURRENT_STATE_COMPLETED" : "CURRENT_STATE_IN_PROGRESS";
}

export function internalProtocolSessionStatusLabel(
  status: InternalProtocolSessionStatus,
): string {
  switch (status) {
    case "CURRENT_STATE_IN_PROGRESS": return "Bestandsaufnahme – in Bearbeitung";
    case "CURRENT_STATE_COMPLETED":   return "Bestandsaufnahme – abgeschlossen";
    case "TARGET_STATE_IN_PROGRESS":  return "Zielprozess – in Bearbeitung";
    case "TARGET_STATE_COMPLETED":    return "Zielprozess – abgeschlossen";
  }
}

