import { prisma } from "@/lib/prisma";
import { getCheckpointFromLib } from "./checkpointLibrary";
import {
  normalizePracticeCheckpointDefinitionInput,
  type PracticeCheckpointDefinitionInput,
  type PracticeCheckpointDefinitionView,
} from "./practiceDefinition";

function parseAnchorIds(value: unknown): string[] {
  if (!Array.isArray(value) || !value.every((id) => typeof id === "string")) {
    throw new Error("Ungültige zentrale Checkpoint-Definition.");
  }
  return value;
}

async function mapDefinition(row: {
  id: string; practice_id: string; checkpoint_id: string; selected_anchor_ids: unknown;
  implementation: string | null; created_at: Date; updated_at: Date;
}): Promise<PracticeCheckpointDefinitionView> {
  const checkpoint = await getCheckpointFromLib(row.checkpoint_id);
  if (!checkpoint) throw new Error(`Checkpoint „${row.checkpoint_id}" wurde nicht gefunden.`);
  return {
    id: row.id,
    practiceId: row.practice_id,
    checkpointId: row.checkpoint_id,
    selectedAnchorIds: parseAnchorIds(row.selected_anchor_ids),
    ...(row.implementation ? { implementation: row.implementation } : {}),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    checkpointTitle: checkpoint.title,
    ...(checkpoint.description ? { checkpointDescription: checkpoint.description } : {}),
    checkpointAnchors: [...(checkpoint.orientationAnchors ?? [])],
  };
}

async function validateInput(checkpointId: string, input: PracticeCheckpointDefinitionInput) {
  const checkpoint = await getCheckpointFromLib(checkpointId);
  if (!checkpoint) throw Object.assign(new Error("Checkpoint nicht gefunden."), { statusCode: 404 });
  const normalized = normalizePracticeCheckpointDefinitionInput(input);
  const validIds = new Set((checkpoint.orientationAnchors ?? []).map((anchor) => anchor.id));
  if (normalized.selectedAnchorIds.some((id) => !validIds.has(id))) {
    throw Object.assign(new Error("Ein ausgewählter Orientierungsanker gehört nicht zum Checkpoint."), { statusCode: 422 });
  }
  return { checkpoint, normalized };
}

export async function listPracticeCheckpointDefinitions(practiceId: string, checkpointIds?: string[]) {
  const rows = await prisma.practiceCheckpointDefinition.findMany({
    where: { practice_id: practiceId, ...(checkpointIds ? { checkpoint_id: { in: checkpointIds } } : {}) },
    orderBy: { updated_at: "desc" },
  });
  return Promise.all(rows.map(mapDefinition));
}

export async function getPracticeCheckpointDefinition(practiceId: string, checkpointId: string) {
  const row = await prisma.practiceCheckpointDefinition.findUnique({
    where: { practice_id_checkpoint_id: { practice_id: practiceId, checkpoint_id: checkpointId } },
  });
  return row ? mapDefinition(row) : null;
}

export async function upsertPracticeCheckpointDefinition(
  practiceId: string, checkpointId: string, input: PracticeCheckpointDefinitionInput,
) {
  const { normalized } = await validateInput(checkpointId, input);
  const row = await prisma.practiceCheckpointDefinition.upsert({
    where: { practice_id_checkpoint_id: { practice_id: practiceId, checkpoint_id: checkpointId } },
    create: {
      practice_id: practiceId,
      checkpoint_id: checkpointId,
      selected_anchor_ids: normalized.selectedAnchorIds,
      implementation: normalized.implementation ?? null,
    },
    update: {
      selected_anchor_ids: normalized.selectedAnchorIds,
      implementation: normalized.implementation ?? null,
    },
  });
  return mapDefinition(row);
}

export async function resolveDefinitionsForPublish(practiceId: string, checkpointIds: string[]) {
  const ids = [...new Set(checkpointIds)];
  const rows = await prisma.practiceCheckpointDefinition.findMany({
    where: { practice_id: practiceId, checkpoint_id: { in: ids } },
  });
  const byId = new Map(rows.map((row) => [row.checkpoint_id, row]));
  const missing = ids.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    throw Object.assign(new Error(`Für folgende Checkpoints fehlt eine Praxisdefinition: ${missing.join(", ")}`), { statusCode: 409, missingCheckpointIds: missing });
  }
  const definitions = await Promise.all(ids.map(async (id) => {
    const row = byId.get(id)!;
    const { normalized } = await validateInput(id, {
      selectedAnchorIds: parseAnchorIds(row.selected_anchor_ids),
      ...(row.implementation ? { implementation: row.implementation } : {}),
    });
    return mapDefinition({ ...row, selected_anchor_ids: normalized.selectedAnchorIds, implementation: normalized.implementation ?? null });
  }));
  return definitions;
}