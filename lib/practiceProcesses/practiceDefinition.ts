import type { PracticeCheckpoint } from "./types";

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
  if (!selectedAnchorIds || implementation.length === 0) return null;
  return { selectedAnchorIds, implementation };
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