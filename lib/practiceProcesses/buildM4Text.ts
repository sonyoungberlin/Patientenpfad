import type {
  PracticeWorkflowDraftSnapshot,
  PracticeWorkflowCheckpointState,
} from "./workflowSnapshot";
import type { PracticeCheckpointDefinitionSnapshot } from "./practiceDefinition";

function anchorTextsFor(cp: PracticeWorkflowCheckpointState, definition?: PracticeCheckpointDefinitionSnapshot): string[] {
  const ids = definition?.selectedAnchorIds ?? [];
  if (ids.length === 0) return [];
  const anchors = definition?.checkpointAnchors ?? [];
  return anchors.filter((a) => ids.includes(a.id)).map((a) => a.text);
}

export function buildM4Text(
  snapshot: PracticeWorkflowDraftSnapshot,
  definitions: PracticeCheckpointDefinitionSnapshot[],
): string {
  const definitionById = new Map(definitions.map((definition) => [definition.checkpointId, definition]));
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
      const definition = definitionById.get(cp.checkpointId);
      const anchors = anchorTextsFor(cp, definition);
      if (anchors.length > 0) {
        lines.push("  Zu berücksichtigen:");
        for (const text of anchors) lines.push(`  - ${text}`);
      }
      if (definition?.implementation) lines.push(`  ${definition.implementation}`);
    }
  }

  if (optional.length > 0) {
    if (pflicht.length > 0) lines.push("");
    lines.push("Optional:");
    for (const cp of optional) {
      lines.push(`- ${cp.checkpointTitle}`);
      const definition = definitionById.get(cp.checkpointId);
      const anchors = anchorTextsFor(cp, definition);
      if (anchors.length > 0) {
        lines.push("  Zu berücksichtigen:");
        for (const text of anchors) lines.push(`  - ${text}`);
      }
      if (definition?.implementation) lines.push(`  ${definition.implementation}`);
    }
  }

  if (nichtRelevant.length > 0) {
    if (pflicht.length > 0 || optional.length > 0) lines.push("");
    lines.push("Nicht relevant:");
    for (const cp of nichtRelevant) {
      lines.push(`- ${cp.checkpointTitle}`);
    }
  }

  return lines.join("\n");
}
