import type { PracticeCheckpoint } from "./types";
import type { PracticeCheckpointAnchor } from "./types";

export const PRACTICE_DEFINITION_SCHEMA_VERSION = 2 as const;

export interface PracticeCheckpointDefinitionSnapshot {
  checkpointId: string;
  checkpointTitle: string;
  checkpointDescription?: string;
  checkpointAnchors: PracticeCheckpoint["orientationAnchors"];
  selectedAnchorIds: string[];
  implementation: string;
}

export interface PracticeCheckpointDefinitionRecord {
  id: string;
  practiceId: string;
  checkpointId: string;
  selectedAnchorIds: string[];
  implementation: string;
  updatedAt: string;
}

export function normalizeSelectedAnchorIds(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string" && item.trim())) {
    return null;
  }
  const ids = value.map((item) => item.trim());
  return new Set(ids).size === ids.length ? ids : null;
}

export function parsePracticeDefinitionInput(
  value: unknown,
): { selectedAnchorIds: string[]; implementation: string } | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const selectedAnchorIds = normalizeSelectedAnchorIds(candidate.selectedAnchorIds);
  const implementation = typeof candidate.implementation === "string"
    ? candidate.implementation.trim()
    : "";
  if (!selectedAnchorIds || (selectedAnchorIds.length === 0 && implementation.length === 0)) return null;
  return { selectedAnchorIds, implementation };
}

export function isPracticeCheckpointDefinitionDefined(
  definition: Pick<PracticeCheckpointDefinitionRecord, "selectedAnchorIds" | "implementation">,
): boolean {
  return definition.selectedAnchorIds.length > 0 || definition.implementation.trim().length > 0;
}

export function getUnresolvedSelectedAnchorIds(
  selectedAnchorIds: readonly string[],
  anchors: readonly PracticeCheckpointAnchor[],
): string[] {
  const knownIds = new Set(anchors.map((anchor) => anchor.id));
  return selectedAnchorIds.filter((id) => !knownIds.has(id));
}

export function checkpointDefinitionSnapshot(
  checkpoint: PracticeCheckpoint,
  definition: { selectedAnchorIds: string[]; implementation: string },
): PracticeCheckpointDefinitionSnapshot {
  return {
    checkpointId: checkpoint.id,
    checkpointTitle: checkpoint.title,
    ...(checkpoint.description ? { checkpointDescription: checkpoint.description } : {}),
    checkpointAnchors: [...(checkpoint.orientationAnchors ?? [])],
    selectedAnchorIds: [...definition.selectedAnchorIds],
    implementation: definition.implementation.trim(),
  };
}