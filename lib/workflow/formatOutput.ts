import type { WorkflowProcessSnapshot, ProcessPointStatus, WorkflowM2AnswerValue } from "./types";
import { getWorkflowTopic, isWorkflowTopicId } from "./processCatalog";
import { getM2QuestionsForCheckpoint } from "./m2Questions";

const STATUS_LABEL: Record<ProcessPointStatus, string> = {
  ERKENNBAR: "erkennbar",
  NICHT_ERFASST: "nicht erfasst",
  UNKLAR: "unklar",
};

const ROLE_LABEL: Record<string, string> = {
  MFA: "MFA",
  ARZT: "Arzt",
};

export function formatProcessOutput(snapshot: WorkflowProcessSnapshot): string {
  const topic = getWorkflowTopic(snapshot.topicId as import("./processCatalog").WorkflowTopicId);
  const role = ROLE_LABEL[snapshot.role] ?? snapshot.role;

  const lines: string[] = [];
  lines.push(`${topic.title} – ${role}`);
  lines.push("");

  if (snapshot.m3Checkpoints && snapshot.m3Checkpoints.length > 0) {
    const { topicId } = snapshot;
    const snapshotRole = snapshot.role;

    const merken = snapshot.m3Checkpoints.filter((c) => c.status === "ERKENNBAR");
    const nochOffen = snapshot.m3Checkpoints.filter(
      (c) => c.status === "UNKLAR" && c.m2_answers && Object.keys(c.m2_answers).length > 0,
    );

    lines.push("Merkzettel für ähnliche Fälle");
    lines.push("");

    if (merken.length > 0) {
      lines.push("Darauf achten:");
      lines.push("");
      for (const checkpoint of merken) {
        lines.push(checkpoint.title);
        if (isWorkflowTopicId(topicId)) {
          const questions = getM2QuestionsForCheckpoint(topicId, checkpoint.id, snapshotRole);
          const answers = checkpoint.m2_answers ?? {};
          for (const q of questions) {
            const val = answers[q.id];
            if (val) lines.push(`- ${q.text}`);
          }
        }
        lines.push("");
      }
    }

    if (nochOffen.length > 0) {
      lines.push("Noch offen:");
      lines.push("");
      for (const checkpoint of nochOffen) {
        lines.push(checkpoint.title);
        if (isWorkflowTopicId(topicId)) {
          const questions = getM2QuestionsForCheckpoint(topicId, checkpoint.id, snapshotRole);
          const answers = checkpoint.m2_answers ?? {};
          for (const q of questions) {
            const val = answers[q.id];
            if (val) lines.push(`- ${q.text}`);
          }
        }
        lines.push("");
      }
    }

    if (topic.sources.length > 0) {
      lines.push("Quellenhinweise");
      for (const source of topic.sources) {
        lines.push(`- ${source}`);
      }
    }
  } else {
    // Fallback für ältere Snapshots ohne M3-Checkpoints
    lines.push("Erfasste Angaben:");
    for (const point of snapshot.processPoints) {
      lines.push(`- ${point.title}: ${STATUS_LABEL[point.status]}`);
      if (point.note) {
        lines.push(`  Notiz: ${point.note}`);
      }
    }
  }

  if (snapshot.sessionNote) {
    lines.push("");
    lines.push("Notizen:");
    lines.push(snapshot.sessionNote);
  }

  return lines.join("\n");
}
