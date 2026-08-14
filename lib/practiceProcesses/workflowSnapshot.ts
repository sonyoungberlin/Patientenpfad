import type { PracticeCaseProfile, PracticeCheckpoint } from "./types";

export type CheckpointDecision = "PFLICHT" | "OPTIONAL" | "NICHT_RELEVANT";
export type OrientationAnswer = "YES" | "NO" | "UNCLEAR" | null;

export interface PracticeWorkflowCheckpointState {
  checkpointId: string;
  checkpointTitle: string;
  orientationAnswers: Record<string, OrientationAnswer>;
  decision?: CheckpointDecision;
  /** Kurze praxisindividuelle Festlegung: wie setzt diese Praxis den Checkpoint konkret um. */
  praxisprozess?: string;
}

export interface PracticeWorkflowSnapshot {
  processKind: "practice-workflow";
  caseProfileId: string;
  caseProfileTitle: string;
  checkpoints: PracticeWorkflowCheckpointState[];
  /** ISO-8601-Timestamp; fehlt = In Bearbeitung, gesetzt = Abgeschlossen */
  completedAt?: string;
}

export function isPracticeWorkflowSnapshot(
  value: unknown,
): value is PracticeWorkflowSnapshot {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.processKind === "practice-workflow" &&
    typeof v.caseProfileId === "string" &&
    typeof v.caseProfileTitle === "string" &&
    Array.isArray(v.checkpoints)
  );
}

export function buildInitialPracticeWorkflowSnapshot(
  profile: PracticeCaseProfile,
  getCheckpoint: (id: string) => PracticeCheckpoint | undefined,
): PracticeWorkflowSnapshot {
  return {
    processKind: "practice-workflow",
    caseProfileId: profile.id,
    caseProfileTitle: profile.title,
    checkpoints: profile.checkpointRefs.map((ref) => {
      const cp = getCheckpoint(ref.checkpointId);
      return {
        checkpointId: ref.checkpointId,
        checkpointTitle: cp?.title ?? ref.checkpointId,
        orientationAnswers: Object.fromEntries(
          (cp?.orientationAnchors ?? []).map((a) => [a.id, null as OrientationAnswer]),
        ),
      };
    }),
  };
}

export function markSnapshotCompleted(
  snapshot: PracticeWorkflowSnapshot,
): PracticeWorkflowSnapshot {
  return { ...snapshot, completedAt: new Date().toISOString() };
}
