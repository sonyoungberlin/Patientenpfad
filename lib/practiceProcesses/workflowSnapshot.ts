import type { PracticeCaseProfile, PracticeCheckpoint } from "./types";
import { isPracticeCheckpointDefinitionDefined } from "./practiceDefinition";

export const PRACTICE_WORKFLOW_SNAPSHOT_VERSION = 2 as const;
export type CheckpointDecision = "PFLICHT" | "OPTIONAL" | "NICHT_RELEVANT";

export interface PracticeWorkflowCheckpointState {
  checkpointId: string;
  checkpointTitle: string;
  decision?: CheckpointDecision;
}

export interface PracticeWorkflowDraftSnapshot {
  processKind: "practice-workflow";
  snapshotVersion: typeof PRACTICE_WORKFLOW_SNAPSHOT_VERSION;
  caseProfileId: string;
  caseProfileTitle: string;
  checkpoints: PracticeWorkflowCheckpointState[];
}

export interface PublishedPracticeWorkflowCheckpoint extends PracticeWorkflowCheckpointState {
  definition: {
    checkpointId: string;
    checkpointTitle: string;
    checkpointDescription?: string;
    checkpointAnchors: PracticeCheckpoint["orientationAnchors"];
    selectedAnchorIds: string[];
    implementation: string;
  };
}

export interface PublishedPracticeWorkflowSnapshot {
  processKind: "practice-workflow";
  snapshotVersion: typeof PRACTICE_WORKFLOW_SNAPSHOT_VERSION;
  caseProfileId: string;
  caseProfileTitle: string;
  checkpoints: PublishedPracticeWorkflowCheckpoint[];
  completedAt: string;
}

export type PracticeWorkflowSnapshot = PracticeWorkflowDraftSnapshot | PublishedPracticeWorkflowSnapshot;

function isBaseSnapshot(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Record<string, unknown>;
  return snapshot.processKind === "practice-workflow" &&
    typeof snapshot.caseProfileId === "string" &&
    typeof snapshot.caseProfileTitle === "string";
}

function isDecision(value: unknown): value is CheckpointDecision {
  return value === "PFLICHT" || value === "OPTIONAL" || value === "NICHT_RELEVANT";
}

function isDraftCheckpoint(value: unknown): value is PracticeWorkflowCheckpointState {
  if (!value || typeof value !== "object") return false;
  const checkpoint = value as Record<string, unknown>;
  return typeof checkpoint.checkpointId === "string" &&
    typeof checkpoint.checkpointTitle === "string" &&
    (checkpoint.decision === undefined || isDecision(checkpoint.decision)) &&
    !Object.prototype.hasOwnProperty.call(checkpoint, "selectedAnchorIds") &&
    !Object.prototype.hasOwnProperty.call(checkpoint, "implementation");
}

function isPublishedCheckpoint(value: unknown): value is PublishedPracticeWorkflowCheckpoint {
  if (!isDraftCheckpoint(value) || !value || typeof value !== "object") return false;
  const definition = (value as unknown as Record<string, unknown>).definition;
  if (!definition || typeof definition !== "object") return false;
  const candidate = definition as Record<string, unknown>;
  return candidate.checkpointId === (value as PracticeWorkflowCheckpointState).checkpointId &&
    typeof candidate.checkpointTitle === "string" &&
    typeof candidate.implementation === "string" &&
    Array.isArray(candidate.selectedAnchorIds) &&
    candidate.selectedAnchorIds.every((id) => typeof id === "string") &&
    Array.isArray(candidate.checkpointAnchors) &&
    isPracticeCheckpointDefinitionDefined({
      selectedAnchorIds: candidate.selectedAnchorIds,
      implementation: candidate.implementation,
    });
}

export function isPracticeWorkflowDraftSnapshot(value: unknown): value is PracticeWorkflowDraftSnapshot {
  if (!isBaseSnapshot(value)) return false;
  const snapshot = value as Record<string, unknown>;
  return snapshot.snapshotVersion === PRACTICE_WORKFLOW_SNAPSHOT_VERSION &&
    Array.isArray(snapshot.checkpoints) && snapshot.checkpoints.every(isDraftCheckpoint);
}

export function isPublishedPracticeWorkflowSnapshot(value: unknown): value is PublishedPracticeWorkflowSnapshot {
  if (!isBaseSnapshot(value)) return false;
  const snapshot = value as Record<string, unknown>;
  return snapshot.snapshotVersion === PRACTICE_WORKFLOW_SNAPSHOT_VERSION &&
    typeof snapshot.completedAt === "string" &&
    Array.isArray(snapshot.checkpoints) && snapshot.checkpoints.every(isPublishedCheckpoint);
}

export function isPracticeWorkflowSnapshot(value: unknown): value is PracticeWorkflowSnapshot {
  return isPracticeWorkflowDraftSnapshot(value) || isPublishedPracticeWorkflowSnapshot(value);
}

export function buildInitialPracticeWorkflowSnapshot(
  profile: PracticeCaseProfile,
  getCheckpoint: (id: string) => PracticeCheckpoint | undefined,
): PracticeWorkflowDraftSnapshot {
  return {
    processKind: "practice-workflow",
    snapshotVersion: PRACTICE_WORKFLOW_SNAPSHOT_VERSION,
    caseProfileId: profile.id,
    caseProfileTitle: profile.title,
    checkpoints: profile.checkpointRefs.map((ref) => ({
      checkpointId: ref.checkpointId,
      checkpointTitle: getCheckpoint(ref.checkpointId)?.title ?? ref.checkpointId,
    })),
  };
}
