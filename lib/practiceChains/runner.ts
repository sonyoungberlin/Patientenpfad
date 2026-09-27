import type { PracticeCaseChainDefinition } from "./types";

export type RunnerStep = {
  id: string;
  catalogEntryId?: string;
  title: string;
  description: string | null;
  standards: { title: string; implementation: string | null }[];
};

export type RunnerChain = {
  id: string;
  name: string;
  version: number;
  startStepId: string;
  steps: RunnerStep[];
  transitions: PracticeCaseChainDefinition["transitions"];
  connections: { sourceStepId: string; sourceExitId: string; targetChainId: string; targetStepId: string; targetName: string; targetVersion: number; targetTitle: string }[];
};

export type RunnerState = {
  currentStepId: string | null;
  history: string[];
  finished: boolean;
  error: string | null;
  finishedViaExitId?: string;
};

export const MAX_RUNNER_CONTINUATIONS = 32;

export function getRunnerContinuationStatus(visitedChainIds: string[], targetChainId: string, continuationCount: number) {
  return {
    alreadyVisited: visitedChainIds.includes(targetChainId),
    limited: continuationCount >= MAX_RUNNER_CONTINUATIONS,
  };
}

export function createRunnerState(startStepId: string): RunnerState {
  return { currentStepId: startStepId, history: [], finished: false, error: null };
}

export function followRunnerTarget(state: RunnerState, targetStepId: string | null | undefined, exitId?: string): RunnerState {
  if (state.error) return state;
  if (state.currentStepId === null) return state;
  if (targetStepId === undefined) {
    return { ...state, error: "Dieser Übergang ist unvollständig und kann im Lauf nicht fortgesetzt werden." };
  }
  return targetStepId === null
    ? { ...state, currentStepId: null, history: [...state.history, state.currentStepId], finished: true, error: null, ...(exitId ? { finishedViaExitId: exitId } : {}) }
    : { ...state, currentStepId: targetStepId, history: [...state.history, state.currentStepId], error: null };
}

export function goBackRunner(state: RunnerState): RunnerState {
  const history = [...state.history];
  const previous = history.pop();
  return previous === undefined
    ? { ...state, error: null }
    : { currentStepId: previous, history, finished: false, error: null };
}

export function continueRunner(state: RunnerState, target: RunnerChain, sharedCatalogEntryId?: string, previousCatalogEntryId?: string): RunnerState {
  if (!state.finished || state.currentStepId !== null) return state;
  const targetStep = target.steps.find((step) => step.id === target.startStepId);
  if (!targetStep) return { ...state, error: "Der freigegebene Einstieg ist nicht ausführbar." };
  const history = sharedCatalogEntryId && sharedCatalogEntryId === previousCatalogEntryId ? state.history.slice(0, -1) : state.history;
  return {
    currentStepId: target.startStepId,
    history,
    finished: false,
    error: null,
  };
}