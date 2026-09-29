import type { PracticeCaseProfile, PracticeCheckpoint, PracticeCheckpointAnchor } from "./types";
import type { PracticeCheckpointDefinitionView } from "./practiceDefinition";

export type CheckpointDecision = "PFLICHT" | "OPTIONAL" | "NICHT_RELEVANT";

export interface PracticeWorkflowCheckpointState {
  checkpointId: string;
  checkpointTitle: string;
  selectedAnchorIds: string[];
  decision?: CheckpointDecision;
  /** Kurze praxisindividuelle Beschreibung, wie diese Praxis den Checkpoint konkret umsetzt. */
  umsetzung?: string;
  /** Snapshot der verfügbaren Orientierungsanker zum Zeitpunkt der Session-Erstellung. */
  checkpointAnchors?: PracticeCheckpointAnchor[];
  /** Checkpoint-Beschreibung zum Zeitpunkt der Session-Erstellung. */
  checkpointDescription?: string;
}

export interface PracticeWorkflowSnapshot {
  processKind: "practice-workflow";
  snapshotVersion?: 2;
  caseProfileId: string;
  caseProfileTitle: string;
  checkpoints: PracticeWorkflowCheckpointState[];
  /** ISO-8601-Timestamp; fehlt = In Bearbeitung, gesetzt = Abgeschlossen */
  completedAt?: string;
}

export interface PublishedPracticeWorkflowSnapshot extends PracticeWorkflowSnapshot {
  completedAt: string;
  checkpoints: Array<PracticeWorkflowCheckpointState & {
    decision: CheckpointDecision;
    definition: {
      checkpointDescription?: string;
      checkpointAnchors: PracticeCheckpointAnchor[];
      selectedAnchorIds: string[];
      implementation?: string;
    };
  }>;
}

export function isPracticeWorkflowSnapshot(
  value: unknown,
): value is PracticeWorkflowSnapshot {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.processKind === "practice-workflow" &&
    v.snapshotVersion === 2 &&
    typeof v.caseProfileId === "string" &&
    typeof v.caseProfileTitle === "string" &&
    Array.isArray(v.checkpoints)
  );
}

export function isPublishedPracticeWorkflowSnapshot(
  value: unknown,
): value is PublishedPracticeWorkflowSnapshot {
  if (!isPracticeWorkflowSnapshot(value)) return false;
  if (typeof value.completedAt !== "string") return false;
  return value.checkpoints.every((checkpoint) => {
    const publishedCheckpoint = checkpoint as PublishedPracticeWorkflowSnapshot["checkpoints"][number];
    if (!publishedCheckpoint.decision || !publishedCheckpoint.definition) return false;
    const anchors = publishedCheckpoint.definition.checkpointAnchors;
    const selectedAnchorIds = publishedCheckpoint.definition.selectedAnchorIds;
    if (!Array.isArray(anchors) || !Array.isArray(selectedAnchorIds)) return false;
    if (!anchors.every((anchor) => anchor && typeof anchor.id === "string" && typeof anchor.text === "string")) return false;
    if (new Set(anchors.map((anchor) => anchor.id)).size !== anchors.length) return false;
    return selectedAnchorIds.every((anchorId) =>
      typeof anchorId === "string" && anchors.some((anchor) => anchor.id === anchorId),
    );
  });
}

export function buildInitialPracticeWorkflowSnapshot(
  profile: PracticeCaseProfile,
  getCheckpoint: (id: string) => PracticeCheckpoint | undefined,
): PracticeWorkflowSnapshot {
  return {
    processKind: "practice-workflow",
    snapshotVersion: 2,
    caseProfileId: profile.id,
    caseProfileTitle: profile.title,
    checkpoints: profile.checkpointRefs.map((ref) => {
      const cp = getCheckpoint(ref.checkpointId);
      return {
        checkpointId: ref.checkpointId,
        checkpointTitle: cp?.title ?? ref.checkpointId,
        selectedAnchorIds: [],
        ...(cp?.description != null ? { checkpointDescription: cp.description } : {}),
        ...(cp?.orientationAnchors != null
          ? { checkpointAnchors: [...cp.orientationAnchors] }
          : {}),
      };
    }),
  };
}

export function markSnapshotCompleted(
  snapshot: PracticeWorkflowSnapshot,
): PracticeWorkflowSnapshot {
  return { ...snapshot, completedAt: new Date().toISOString() };
}

export function buildPublishedPracticeWorkflowSnapshot(
  snapshot: PracticeWorkflowSnapshot,
  definitions: PracticeCheckpointDefinitionView[],
): PublishedPracticeWorkflowSnapshot {
  const byId = new Map(definitions.map((definition) => [definition.checkpointId, definition]));
  return {
    ...snapshot,
    checkpoints: snapshot.checkpoints.map((checkpoint) => {
      const definition = byId.get(checkpoint.checkpointId);
      if (!definition || !checkpoint.decision) {
        throw new Error(`Checkpoint ${checkpoint.checkpointId} ist nicht vollständig definiert.`);
      }
      return {
        ...checkpoint,
        decision: checkpoint.decision,
        definition: {
          ...(definition.checkpointDescription ? { checkpointDescription: definition.checkpointDescription } : {}),
          checkpointAnchors: definition.checkpointAnchors,
          selectedAnchorIds: definition.selectedAnchorIds,
          ...(definition.implementation ? { implementation: definition.implementation } : {}),
        },
      };
    }),
    completedAt: new Date().toISOString(),
  };
}
