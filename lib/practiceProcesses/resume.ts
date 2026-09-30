import type { PracticeWorkflowDraftSnapshot } from "./workflowSnapshot";
import { isPracticeCheckpointDefinitionDefined, type PracticeCheckpointDefinitionRecord } from "./practiceDefinition";

export type PracticeWorkflowResumeStep = "m2" | "m3" | "m4";

export function resolvePracticeWorkflowResumeStep(
  snapshot: PracticeWorkflowDraftSnapshot,
  definitions: PracticeCheckpointDefinitionRecord[],
): PracticeWorkflowResumeStep {
  const ids = new Set(
    definitions
      .filter(isPracticeCheckpointDefinitionDefined)
      .map((definition) => definition.checkpointId),
  );
  const allDefinitions = snapshot.checkpoints.every((checkpoint) => ids.has(checkpoint.checkpointId));
  if (!allDefinitions) return "m2";
  return snapshot.checkpoints.every((checkpoint) => checkpoint.decision !== undefined) ? "m4" : "m3";
}
