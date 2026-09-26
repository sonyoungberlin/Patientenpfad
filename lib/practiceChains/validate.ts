import type {
  ChainValidationIssue,
  PracticeCaseChainDefinition,
} from "./types";

export function parseChainDefinition(value: unknown): PracticeCaseChainDefinition | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.steps) || !Array.isArray(candidate.transitions)) return null;
  if (candidate.startStepId !== null && typeof candidate.startStepId !== "string") return null;
  if (!candidate.steps.every((step) => {
    if (!step || typeof step !== "object") return false;
    const item = step as Record<string, unknown>;
    return typeof item.id === "string" && typeof item.catalogEntryId === "string";
  })) return null;
  if (!candidate.transitions.every((transition) => {
    if (!transition || typeof transition !== "object") return false;
    const item = transition as Record<string, unknown>;
    if (typeof item.id !== "string" || typeof item.fromStepId !== "string") return false;
    if (item.kind === "DIRECT") return item.targetStepId == null || typeof item.targetStepId === "string";
    if (item.kind !== "QUESTION" || !item.question || typeof item.question !== "object") return false;
    const question = item.question as Record<string, unknown>;
    return typeof question.prompt === "string" && Array.isArray(question.answers) && question.answers.every((answer) => {
      if (!answer || typeof answer !== "object") return false;
      const item = answer as Record<string, unknown>;
      return typeof item.id === "string" && typeof item.label === "string" && (item.targetStepId == null || typeof item.targetStepId === "string");
    });
  })) return null;
  return value as PracticeCaseChainDefinition;
}

export function validateChainDefinition(
  definition: PracticeCaseChainDefinition,
  referencedCatalogEntryIds: Set<string>,
): ChainValidationIssue[] {
  const issues: ChainValidationIssue[] = [];
  const stepIds = new Set<string>();
  const outgoingByStep = new Map<string, number>();

  if (definition.steps.length === 0) {
    issues.push({ path: "steps", message: "Mindestens ein Praxisfall muss ausgewählt werden." });
  }
  for (const [index, step] of definition.steps.entries()) {
    if (!step.id.trim()) issues.push({ path: `steps.${index}.id`, message: "Schritt-ID fehlt." });
    if (stepIds.has(step.id)) issues.push({ path: `steps.${index}.id`, message: "Schritt-ID ist doppelt." });
    stepIds.add(step.id);
    if (!step.catalogEntryId || !referencedCatalogEntryIds.has(step.catalogEntryId)) {
      issues.push({ path: `steps.${index}.catalogEntryId`, message: "Der Praxisfall gehört nicht zur Praxis oder existiert nicht." });
    }
  }

  if (!definition.startStepId) {
    issues.push({ path: "startStepId", message: "Ein Startschritt muss bestimmt werden." });
  } else if (!stepIds.has(definition.startStepId)) {
    issues.push({ path: "startStepId", message: "Der Startschritt ist nicht in der Kette enthalten." });
  }

  for (const [index, transition] of definition.transitions.entries()) {
    const path = `transitions.${index}`;
    const previous = outgoingByStep.get(transition.fromStepId) ?? 0;
    outgoingByStep.set(transition.fromStepId, previous + 1);
    if (previous > 0) {
      issues.push({ path: `${path}.fromStepId`, message: "Pro Ausgangsschritt darf nur ein Übergang definiert sein; direkte und Frage-Übergänge dürfen nicht kombiniert werden." });
    }
    if (!stepIds.has(transition.fromStepId)) {
      issues.push({ path: `${path}.fromStepId`, message: "Der Ausgangsschritt ist nicht in der Kette enthalten." });
    }
    if (transition.kind === "DIRECT") {
      if (transition.targetStepId !== null && (!transition.targetStepId || !stepIds.has(transition.targetStepId))) {
        issues.push({ path: `${path}.targetStepId`, message: "Wählen Sie einen Zielfall oder ausdrücklich das Ende der Kette." });
      }
      continue;
    }
    if (transition.kind !== "QUESTION") {
      issues.push({ path: `${path}.kind`, message: "Unbekannte Übergangsart." });
      continue;
    }
    if (!transition.question?.prompt.trim()) {
      issues.push({ path: `${path}.question.prompt`, message: "Die Praxisfrage darf nicht leer sein." });
    }
    if (!transition.question || transition.question.answers.length === 0) {
      issues.push({ path: `${path}.question.answers`, message: "Mindestens eine Antwortmöglichkeit muss benannt werden." });
      continue;
    }
    const answerIds = new Set<string>();
    for (const [answerIndex, answer] of transition.question.answers.entries()) {
      const answerPath = `${path}.question.answers.${answerIndex}`;
      if (!answer.id.trim() || answerIds.has(answer.id)) {
        issues.push({ path: `${answerPath}.id`, message: "Antwort-ID fehlt oder ist doppelt." });
      }
      answerIds.add(answer.id);
      if (!answer.label.trim()) {
        issues.push({ path: `${answerPath}.label`, message: "Jede Antwortmöglichkeit braucht eine Bezeichnung." });
      }
      if (answer.targetStepId !== null && (!answer.targetStepId || !stepIds.has(answer.targetStepId))) {
        issues.push({ path: `${answerPath}.targetStepId`, message: "Das Antwortziel ist nicht in der Kette enthalten." });
      }
      const normalizedLabel = answer.label.trim().toLowerCase();
      const duplicateLabel = transition.question.answers.findIndex(
        (candidate, candidateIndex) => candidateIndex < answerIndex && candidate.label.trim().toLowerCase() === normalizedLabel,
      ) >= 0;
      if (duplicateLabel) {
        issues.push({ path: `${answerPath}.label`, message: "Antwortbezeichnungen müssen innerhalb einer Frage eindeutig sein." });
      }
    }
  }

  if (definition.startStepId && stepIds.has(definition.startStepId)) {
    const reachable = new Set<string>();
    const pending = [definition.startStepId];
    while (pending.length > 0) {
      const stepId = pending.shift()!;
      if (reachable.has(stepId)) continue;
      reachable.add(stepId);
      const transition = definition.transitions.find((candidate) => candidate.fromStepId === stepId);
      if (!transition) continue;
      if (transition.kind === "DIRECT") {
        if (transition.targetStepId) pending.push(transition.targetStepId);
      } else {
        for (const answer of transition.question?.answers ?? []) {
          if (answer.targetStepId) pending.push(answer.targetStepId);
        }
      }
    }
    for (const [index, step] of definition.steps.entries()) {
      if (!reachable.has(step.id)) {
        issues.push({ path: `steps.${index}`, message: "Dieser Schritt ist vom Start aus nicht erreichbar." });
      }
    }

    const canReachEndMemo = new Map<string, boolean>();
    function canReachEnd(stepId: string, visiting: Set<string>): boolean {
      const cached = canReachEndMemo.get(stepId);
      if (cached !== undefined) return cached;
      if (visiting.has(stepId)) return false;
      const transition = definition.transitions.find((candidate) => candidate.fromStepId === stepId);
      if (!transition) return false;
      const nextVisiting = new Set(visiting).add(stepId);
      const result = transition.kind === "DIRECT"
        ? (transition.targetStepId === null || Boolean(transition.targetStepId && canReachEnd(transition.targetStepId, nextVisiting)))
        : (transition.question?.answers ?? []).some((answer) => answer.targetStepId === null || (answer.targetStepId !== undefined && canReachEnd(answer.targetStepId, nextVisiting)));
      canReachEndMemo.set(stepId, result);
      return result;
    }
    for (const stepId of reachable) {
      if (!canReachEnd(stepId, new Set())) {
        issues.push({ path: `steps.${stepId}`, message: "Von diesem erreichbaren Schritt führt kein vollständig definierter Weg zum Ende der Kette; prüfen Sie Übergang, Antwortziele oder einen beabsichtigten Rücksprung." });
      }
    }
  }

  return issues;
}