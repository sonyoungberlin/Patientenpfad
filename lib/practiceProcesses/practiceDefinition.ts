import type { PracticeCheckpointAnchor } from "./types";

export const PRACTICE_CHECKPOINT_IMPLEMENTATION_MAX_LENGTH = 2000;

export type PracticeCheckpointDefinition = {
  id: string;
  practiceId: string;
  checkpointId: string;
  selectedAnchorIds: string[];
  implementation?: string;
  createdAt: string;
  updatedAt: string;
};

export type PracticeCheckpointDefinitionView = PracticeCheckpointDefinition & {
  checkpointTitle: string;
  checkpointDescription?: string;
  checkpointAnchors: PracticeCheckpointAnchor[];
};

export type PracticeCheckpointDefinitionInput = {
  selectedAnchorIds: string[];
  implementation?: string;
};

export function normalizePracticeCheckpointDefinitionInput(
  input: PracticeCheckpointDefinitionInput,
): PracticeCheckpointDefinitionInput {
  if (!Array.isArray(input.selectedAnchorIds)) throw new Error("selectedAnchorIds muss ein Array sein.");
  const selectedAnchorIds = [...new Set(input.selectedAnchorIds)].map((id) => {
    if (typeof id !== "string" || !id.trim()) throw new Error("Ungültige Anchor-ID.");
    return id;
  });
  if (input.implementation !== undefined && typeof input.implementation !== "string") {
    throw new Error("Die Umsetzung ist ungültig.");
  }
  const implementation = input.implementation?.trim() || undefined;
  if (implementation && implementation.length > PRACTICE_CHECKPOINT_IMPLEMENTATION_MAX_LENGTH) {
    throw new Error(`Die Umsetzung darf maximal ${PRACTICE_CHECKPOINT_IMPLEMENTATION_MAX_LENGTH} Zeichen enthalten.`);
  }
  return { selectedAnchorIds, ...(implementation ? { implementation } : {}) };
}