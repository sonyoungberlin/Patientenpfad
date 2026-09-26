import type { PracticeCaseChainDefinition } from "./types";

export type RunnerStep = {
  id: string;
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
};

export type RunnerState = {
  currentStepId: string | null;
  history: string[];
  finished: boolean;
  error: string | null;
};

export function createRunnerState(startStepId: string): RunnerState {
  return { currentStepId: startStepId, history: [], finished: false, error: null };
}

export function followRunnerTarget(state: RunnerState, targetStepId: string | null | undefined): RunnerState {
  if (state.error) return state;
  if (state.currentStepId === null) return state;
  if (targetStepId === undefined) {
    return { ...state, error: "Dieser Übergang ist unvollständig und kann im Lauf nicht fortgesetzt werden." };
  }
  return targetStepId === null
    ? { ...state, currentStepId: null, history: [...state.history, state.currentStepId], finished: true, error: null }
    : { ...state, currentStepId: targetStepId, history: [...state.history, state.currentStepId], error: null };
}

export function goBackRunner(state: RunnerState): RunnerState {
  const history = [...state.history];
  const previous = history.pop();
  return previous === undefined
    ? { ...state, error: null }
    : { currentStepId: previous, history, finished: false, error: null };
}