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
};

export function createRunnerState(startStepId: string): RunnerState {
  return { currentStepId: startStepId, history: [], finished: false };
}

export function followRunnerTarget(state: RunnerState, targetStepId: string | null): RunnerState {
  if (state.currentStepId === null) return state;
  return targetStepId === null
    ? { ...state, currentStepId: null, history: [...state.history, state.currentStepId], finished: true }
    : { ...state, currentStepId: targetStepId, history: [...state.history, state.currentStepId] };
}

export function goBackRunner(state: RunnerState): RunnerState {
  const history = [...state.history];
  const previous = history.pop();
  return previous === undefined
    ? state
    : { currentStepId: previous, history, finished: false };
}