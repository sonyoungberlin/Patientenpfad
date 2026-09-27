import type { PracticeCaseChainDefinition } from "./types";

export type DiscoveryStep = {
  stepId: string;
  catalogEntryId: string;
  title: string;
};

export type PracticeChainSegment = {
  chainId: string;
  chainName: string;
  chainVersion: number;
  startStepId: string;
  start: DiscoveryStep;
  paths: DiscoveryStep[][];
  pathExitIds: (string | null)[];
  pathExitPrompts: (string | null)[];
  pathExitLabels: (string | null)[];
};

export type DiscoveryChain = {
  id: string;
  name: string;
  version: number;
  definition: PracticeCaseChainDefinition;
  entryTitles: Map<string, string>;
};

function pathKey(path: string[]) {
  return path.join("/");
}

export function discoverPracticeChainSegments(chain: DiscoveryChain): PracticeChainSegment[] {
  const stepById = new Map(chain.definition.steps.map((step) => [step.id, step]));
  const transitionByStep = new Map(chain.definition.transitions.map((transition) => [transition.fromStepId, transition]));
  const segments: PracticeChainSegment[] = [];

  for (const start of chain.definition.steps) {
    const paths: string[][] = [];
    const pathExitIds: (string | null)[] = [];
    const pathExitPrompts: (string | null)[] = [];
    const pathExitLabels: (string | null)[] = [];
    const seenPaths = new Set<string>();
    function addPath(path: string[], exitId: string | null, exitPrompt: string | null, exitLabel: string | null) {
      const key = `${pathKey(path)}:${exitId ?? ""}`;
      if (!seenPaths.has(key)) {
        seenPaths.add(key);
        paths.push(path);
        pathExitIds.push(exitId);
        pathExitPrompts.push(exitPrompt);
        pathExitLabels.push(exitLabel);
      }
    }
    function visit(stepId: string, path: string[]) {
      const transition = transitionByStep.get(stepId);
      if (!transition) {
        addPath(path, null, null, null);
        return;
      }
      if (transition.kind === "DIRECT") {
        if (transition.targetStepId === null) addPath(path, transition.id, null, "Direkter Übergang zum Kettenende");
        else if (transition.targetStepId && !path.includes(transition.targetStepId) && stepById.has(transition.targetStepId)) visit(transition.targetStepId, [...path, transition.targetStepId]);
        return;
      }
      for (const answer of transition.question?.answers ?? []) {
        if (answer.targetStepId === null) addPath(path, answer.id, transition.question?.prompt ?? null, answer.label);
        else if (answer.targetStepId && !path.includes(answer.targetStepId) && stepById.has(answer.targetStepId)) visit(answer.targetStepId, [...path, answer.targetStepId]);
      }
    }
    visit(start.id, [start.id]);
    segments.push({
      chainId: chain.id,
      chainName: chain.name,
      chainVersion: chain.version,
      startStepId: start.id,
      start: {
        stepId: start.id,
        catalogEntryId: start.catalogEntryId,
        title: chain.entryTitles.get(start.catalogEntryId) ?? "Unbekannter Praxisfall",
      },
      pathExitIds,
      pathExitPrompts,
      pathExitLabels,
      paths: paths.map((path) => path.map((stepId) => {
        const step = stepById.get(stepId)!;
        return { stepId, catalogEntryId: step.catalogEntryId, title: chain.entryTitles.get(step.catalogEntryId) ?? "Unbekannter Praxisfall" };
      })),
    });
  }
  return segments;
}

export function findAttachmentCandidates(
  segments: PracticeChainSegment[],
  catalogEntryIds: Set<string>,
  excludedChainId?: string,
) {
  return segments.filter((segment) => catalogEntryIds.has(segment.start.catalogEntryId) && segment.chainId !== excludedChainId);
}

export function getSegmentTerminalCatalogEntryIds(segments: PracticeChainSegment[]) {
  return new Set(segments.flatMap((segment) => segment.paths.map((path) => path.at(-1)?.catalogEntryId).filter((id): id is string => Boolean(id))));
}