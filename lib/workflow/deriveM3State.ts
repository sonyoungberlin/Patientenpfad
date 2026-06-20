import type { ProcessPointSnapshot, WorkflowM3CheckpointSnapshot, WorkflowRole } from "./types";
import { isWorkflowTopicId, type WorkflowTopicId } from "./processCatalog";
import { buildInitialM3Checkpoints } from "./m3Checkpoints";

/**
 * Gibt den initialen M3-Zustand zurück: alle Checkpoints UNKLAR.
 * M3-Status wird nicht automatisch aus M2-Antworten abgeleitet –
 * er muss aktiv durch den Nutzer gesetzt werden.
 * M2-Antworten erscheinen in M3 nur als Prefill-/Kontexttext.
 */
export function deriveM3Checkpoints(
  topicId: string,
  _role: WorkflowRole,
  _processPoints: ProcessPointSnapshot[],
): WorkflowM3CheckpointSnapshot[] {
  if (!isWorkflowTopicId(topicId)) return [];
  return buildInitialM3Checkpoints(topicId as WorkflowTopicId);
}
