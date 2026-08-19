import { getCheckpoint } from "./checkpointCatalog";
import type {
  PracticeWorkflowSnapshot,
  PracticeWorkflowCheckpointState,
} from "./workflowSnapshot";

function anchorTextsFor(cp: PracticeWorkflowCheckpointState): string[] {
  const ids = cp.selectedAnchorIds ?? [];
  if (ids.length === 0) return [];
  // Prefer embedded snapshot anchors, fall back to static catalog for old sessions
  const anchors =
    cp.checkpointAnchors ?? getCheckpoint(cp.checkpointId)?.orientationAnchors ?? [];
  return anchors.filter((a) => ids.includes(a.id)).map((a) => a.text);
}

export function buildM4Text(snapshot: PracticeWorkflowSnapshot): string {
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
      const anchors = anchorTextsFor(cp);
      if (anchors.length > 0) {
        lines.push("  Zu berücksichtigen:");
        for (const text of anchors) lines.push(`  - ${text}`);
      }
      if (cp.umsetzung) lines.push(`  ${cp.umsetzung}`);
    }
  }

  if (optional.length > 0) {
    if (pflicht.length > 0) lines.push("");
    lines.push("Optional:");
    for (const cp of optional) {
      lines.push(`- ${cp.checkpointTitle}`);
      const anchors = anchorTextsFor(cp);
      if (anchors.length > 0) {
        lines.push("  Zu berücksichtigen:");
        for (const text of anchors) lines.push(`  - ${text}`);
      }
      if (cp.umsetzung) lines.push(`  ${cp.umsetzung}`);
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
