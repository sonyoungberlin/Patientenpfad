import type { CheckpointDecision, PracticeWorkflowSnapshot } from "./workflowSnapshot";

export interface PracticeProcessTransferV1 {
  schemaVersion: 1;
  documentType: "practice-process";
  caseProfileId: string;
  caseProfileTitle: string;
  completedAt: string;
  checkpoints: {
    checkpointId: string;
    checkpointTitle: string;
    decision: CheckpointDecision;
    umsetzung?: string;
    selectedAnchorIds: string[];
    /** 1-basierte Position gemäß Snapshot-Reihenfolge */
    order: number;
  }[];
}

/**
 * Erzeugt ein versioniertes Austauschformat aus einem abgeschlossenen Snapshot.
 * Gibt null zurück wenn completedAt fehlt oder ein Checkpoint keine decision hat.
 */
export function buildPracticeProcessTransfer(
  snapshot: PracticeWorkflowSnapshot,
): PracticeProcessTransferV1 | null {
  if (!snapshot.completedAt) return null;
  if (snapshot.checkpoints.some((cp) => cp.decision === undefined)) return null;

  return {
    schemaVersion: 1,
    documentType: "practice-process",
    caseProfileId: snapshot.caseProfileId,
    caseProfileTitle: snapshot.caseProfileTitle,
    completedAt: snapshot.completedAt,
    checkpoints: snapshot.checkpoints.map((cp, index) => ({
      checkpointId: cp.checkpointId,
      checkpointTitle: cp.checkpointTitle,
      decision: cp.decision as CheckpointDecision,
      ...(cp.umsetzung !== undefined ? { umsetzung: cp.umsetzung } : {}),
      selectedAnchorIds: cp.selectedAnchorIds ?? [],
      order: index + 1,
    })),
  };
}
