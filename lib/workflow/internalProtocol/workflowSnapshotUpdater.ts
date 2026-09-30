import type {
  InternalProtocolWorkflowSnapshot,
  ProtocolWorkflowAnswerValue,
  ProtocolClarificationJudgement,
} from "./workflowAdapter";

/**
 * Einziger erlaubter Pfad für Antwortänderungen im Snapshot.
 * Ermittelt den Checkpoint anhand der questionId selbst.
 * Setzt das M3-Urteil des betroffenen Checkpoints automatisch zurück.
 * Gibt den unveränderten Snapshot zurück, wenn der Wert sich nicht unterscheidet.
 */
export function updateSnapshotAnswer(
  snapshot: InternalProtocolWorkflowSnapshot,
  questionId: string,
  value: ProtocolWorkflowAnswerValue,
): InternalProtocolWorkflowSnapshot {
  const ownerCheckpoint = snapshot.checkpoints.find((cp) => questionId in cp.answers);
  if (ownerCheckpoint === undefined) return snapshot;

  // Keine Mutation wenn der Wert identisch ist (inkl. Reihenfolge-unabhängiger Multi-Select-Prüfung)
  if (answersAreEqual(ownerCheckpoint.answers[questionId] ?? null, value)) return snapshot;

  const updatedCheckpoints = snapshot.checkpoints.map((cp) => {
    if (cp.id !== ownerCheckpoint.id) return cp;
    return {
      id: cp.id,
      title: cp.title,
      status: cp.status,
      answers: { ...cp.answers, [questionId]: value },
      // clarificationJudgement wird bewusst nicht übernommen → M3-Urteil zurückgesetzt
    };
  });

  const prev = snapshot.inheritedQuestionIds;
  const updatedInheritedQuestionIds =
    prev !== undefined && prev.includes(questionId)
      ? prev.filter((id) => id !== questionId)
      : prev;

  return {
    ...snapshot,
    checkpoints: updatedCheckpoints,
    ...(updatedInheritedQuestionIds !== undefined
      ? { inheritedQuestionIds: updatedInheritedQuestionIds }
      : {}),
  };
}

function answersAreEqual(
  a: ProtocolWorkflowAnswerValue,
  b: ProtocolWorkflowAnswerValue,
): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  if (typeof a === "string" && typeof b === "string") return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((v, i) => v === sortedB[i]);
  }
  return false;
}

/**
 * Setzt das M3-Urteil eines Checkpoints. Berührt keine Antworten.
 */
export function setCheckpointJudgement(
  snapshot: InternalProtocolWorkflowSnapshot,
  checkpointId: string,
  judgement: ProtocolClarificationJudgement,
): InternalProtocolWorkflowSnapshot {
  return {
    ...snapshot,
    checkpoints: snapshot.checkpoints.map((cp) =>
      cp.id === checkpointId ? { ...cp, clarificationJudgement: judgement } : cp,
    ),
  };
}

// ---------------------------------------------------------------------------
// PracticeWorkflowSnapshot – Mutation-Funktionen
// ---------------------------------------------------------------------------

import type {
  PracticeWorkflowDraftSnapshot,
  CheckpointDecision,
} from "@/lib/practiceProcesses/workflowSnapshot";

/** Setzt die fachliche M3-Entscheidung für einen Checkpoint. */
export function setCheckpointDecision(
  snapshot: PracticeWorkflowDraftSnapshot,
  checkpointId: string,
  decision: CheckpointDecision,
): PracticeWorkflowDraftSnapshot {
  return {
    ...snapshot,
    checkpoints: snapshot.checkpoints.map((cp) =>
      cp.checkpointId === checkpointId ? { ...cp, decision } : cp,
    ),
  };
}
