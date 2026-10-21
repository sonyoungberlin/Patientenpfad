import { getCheckpointFromLib } from "./checkpointLibrary";
import { listPracticeCheckpointDefinitions } from "./practiceDefinitionService";
import type { PracticeWorkflowBuilderCheckpoint } from "./workflowSnapshot";

export async function resolvePracticeWorkflowBuilderCheckpoints(
  practiceId: string,
  checkpointIds: string[],
): Promise<PracticeWorkflowBuilderCheckpoint[]> {
  const uniqueIds = [...new Set(checkpointIds)];
  const [checkpoints, definitions] = await Promise.all([
    Promise.all(uniqueIds.map(async (id) => [id, await getCheckpointFromLib(id)] as const)),
    listPracticeCheckpointDefinitions(practiceId, uniqueIds),
  ]);
  const checkpointById = new Map(checkpoints);
  const definitionById = new Map(definitions.map((definition) => [definition.checkpointId, definition]));

  return checkpointIds.map((checkpointId) => {
    const checkpoint = checkpointById.get(checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint-Vorlage nicht gefunden: ${checkpointId}`);
    }
    const definition = definitionById.get(checkpointId);
    return {
      checkpointId,
      title: checkpoint.title,
      ...(checkpoint.description !== undefined ? { description: checkpoint.description } : {}),
      ...(checkpoint.orientationHint !== undefined ? { orientationHint: checkpoint.orientationHint } : {}),
      orientationAnchors: [...(checkpoint.orientationAnchors ?? [])],
      definition: definition
        ? {
            selectedAnchorIds: [...definition.selectedAnchorIds],
            implementation: definition.implementation,
          }
        : null,
    };
  });
}
