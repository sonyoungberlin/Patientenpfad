import type {
  PracticeWorkflowDraftSnapshot,
  PracticeWorkflowCheckpointState,
} from "./workflowSnapshot";
import type { PracticeCheckpointDefinitionSnapshot } from "./practiceDefinition";
import { getUnresolvedSelectedAnchorIds } from "./practiceDefinition";
import type { PracticeWorkflowBuilderCheckpoint } from "./workflowSnapshot";

function anchorTextsFor(cp: PracticeWorkflowCheckpointState, definition?: PracticeCheckpointDefinitionSnapshot): string[] {
  const ids = definition?.selectedAnchorIds ?? [];
  if (ids.length === 0) return [];
  const anchors = definition?.checkpointAnchors ?? [];
  return anchors.filter((a) => ids.includes(a.id)).map((a) => a.text);
}

export function buildM4Text(
  snapshot: PracticeWorkflowDraftSnapshot,
  definitions: PracticeCheckpointDefinitionSnapshot[],
  builderCheckpoints: PracticeWorkflowBuilderCheckpoint[],
): string {
  const definitionById = new Map(definitions.map((definition) => [definition.checkpointId, definition]));
  const builderCheckpointById = new Map(builderCheckpoints.map((checkpoint) => [checkpoint.checkpointId, checkpoint]));
  const lines: string[] = [];
  lines.push(`Praxisfall: ${snapshot.caseProfileTitle}`);
  lines.push("");

  const pflicht = snapshot.checkpoints.filter((cp) => cp.decision === "PFLICHT");
  const optional = snapshot.checkpoints.filter((cp) => cp.decision === "OPTIONAL");
  const nichtRelevant = snapshot.checkpoints.filter((cp) => cp.decision === "NICHT_RELEVANT");

  if (pflicht.length > 0) {
    lines.push("Pflicht:");
    for (const cp of pflicht) {
      lines.push(`- ${cp.checkpointTitle}`);
      appendCheckpointContext(lines, builderCheckpointById.get(cp.checkpointId));
      const definition = definitionById.get(cp.checkpointId);
      const anchors = anchorTextsFor(cp, definition);
      if (anchors.length > 0) {
        lines.push("  Zu berücksichtigen:");
        for (const text of anchors) lines.push(`  - ${text}`);
      }
      const unresolvedIds = getUnresolvedSelectedAnchorIds(
        definition?.selectedAnchorIds ?? [],
        builderCheckpointById.get(cp.checkpointId)?.orientationAnchors ?? [],
      );
      if (unresolvedIds.length > 0) {
        lines.push(`  Nicht mehr aktuelle Anchor-ID(s): ${unresolvedIds.join(", ")} (nicht automatisch ersetzt)`);
      }
      if (definition?.implementation) lines.push(`  ${definition.implementation}`);
    }
  }

  if (optional.length > 0) {
    if (pflicht.length > 0) lines.push("");
    lines.push("Optional:");
    for (const cp of optional) {
      lines.push(`- ${cp.checkpointTitle}`);
      appendCheckpointContext(lines, builderCheckpointById.get(cp.checkpointId));
      const definition = definitionById.get(cp.checkpointId);
      const anchors = anchorTextsFor(cp, definition);
      if (anchors.length > 0) {
        lines.push("  Zu berücksichtigen:");
        for (const text of anchors) lines.push(`  - ${text}`);
      }
      const unresolvedIds = getUnresolvedSelectedAnchorIds(
        definition?.selectedAnchorIds ?? [],
        builderCheckpointById.get(cp.checkpointId)?.orientationAnchors ?? [],
      );
      if (unresolvedIds.length > 0) {
        lines.push(`  Nicht mehr aktuelle Anchor-ID(s): ${unresolvedIds.join(", ")} (nicht automatisch ersetzt)`);
      }
      if (definition?.implementation) lines.push(`  ${definition.implementation}`);
    }
  }

  if (nichtRelevant.length > 0) {
    if (pflicht.length > 0 || optional.length > 0) lines.push("");
    lines.push("Nicht relevant:");
    for (const cp of nichtRelevant) {
      lines.push(`- ${cp.checkpointTitle}`);
      appendCheckpointContext(lines, builderCheckpointById.get(cp.checkpointId));
    }
  }

  function appendCheckpointContext(
    lines: string[],
    checkpoint: PracticeWorkflowBuilderCheckpoint | undefined,
  ) {
    if (checkpoint?.description) lines.push(`  ${checkpoint.description}`);
    if (checkpoint?.orientationHint) {
      lines.push(`  Orientierung (keine verbindliche Praxisdefinition): ${checkpoint.orientationHint}`);
    }
  }

  return lines.join("\n");
}
