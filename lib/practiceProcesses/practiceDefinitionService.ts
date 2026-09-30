import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCheckpointFromLib } from "./checkpointLibrary";
import {
  checkpointDefinitionSnapshot,
  parsePracticeDefinitionInput,
  type PracticeCheckpointDefinitionRecord,
} from "./practiceDefinition";

function invalid(message: string, statusCode = 422): never {
  throw Object.assign(new Error(message), { statusCode });
}

async function validateDefinitionInput(checkpointId: string, input: unknown) {
  const parsed = parsePracticeDefinitionInput(input);
  if (!parsed) {
    invalid("Implementation muss nach Trim nicht leer sein; Anchor-Auswahl ist ein eindeutiges Array.");
  }
  const checkpoint = await getCheckpointFromLib(checkpointId);
  if (!checkpoint) invalid("Checkpoint-Vorlage nicht gefunden.", 404);
  const knownIds = new Set((checkpoint.orientationAnchors ?? []).map((anchor) => anchor.id));
  const foreign = parsed.selectedAnchorIds.filter((id) => !knownIds.has(id));
  if (foreign.length > 0) invalid(`Unbekannte Anchor-ID: ${foreign.join(", ")}`);
  return { checkpoint, ...parsed };
}

function mapDefinition(row: {
  id: string;
  practice_id: string;
  checkpoint_id: string;
  selected_anchor_ids: unknown;
  implementation: string;
  updated_at: Date;
}): PracticeCheckpointDefinitionRecord {
  return {
    id: row.id,
    practiceId: row.practice_id,
    checkpointId: row.checkpoint_id,
    selectedAnchorIds: Array.isArray(row.selected_anchor_ids)
      ? row.selected_anchor_ids.filter((id): id is string => typeof id === "string")
      : [],
    implementation: row.implementation,
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function getPracticeCheckpointDefinition(practiceId: string, checkpointId: string) {
  const row = await prisma.practiceCheckpointDefinition.findUnique({
    where: { practice_id_checkpoint_id: { practice_id: practiceId, checkpoint_id: checkpointId } },
  });
  return row ? mapDefinition(row) : null;
}

export async function listPracticeCheckpointDefinitions(practiceId: string, checkpointIds?: string[]) {
  const rows = await prisma.practiceCheckpointDefinition.findMany({
    where: {
      practice_id: practiceId,
      ...(checkpointIds ? { checkpoint_id: { in: [...new Set(checkpointIds)] } } : {}),
    },
    orderBy: { checkpoint_id: "asc" },
  });
  return rows.map(mapDefinition);
}

export async function listPracticeDefinitionSummaries(practiceId: string) {
  return listPracticeCheckpointDefinitions(practiceId);
}

export async function upsertPracticeCheckpointDefinition(input: {
  practiceId: string;
  checkpointId: string;
  selectedAnchorIds: unknown;
  implementation: unknown;
}) {
  const validated = await validateDefinitionInput(input.checkpointId, {
    selectedAnchorIds: input.selectedAnchorIds,
    implementation: input.implementation,
  });
  const row = await prisma.practiceCheckpointDefinition.upsert({
    where: { practice_id_checkpoint_id: { practice_id: input.practiceId, checkpoint_id: input.checkpointId } },
    create: {
      practice_id: input.practiceId,
      checkpoint_id: input.checkpointId,
      selected_anchor_ids: validated.selectedAnchorIds as unknown as Prisma.InputJsonValue,
      implementation: validated.implementation,
    },
    update: {
      selected_anchor_ids: validated.selectedAnchorIds as unknown as Prisma.InputJsonValue,
      implementation: validated.implementation,
    },
  });
  return mapDefinition(row);
}

export async function assertDefinitionsComplete(input: {
  practiceId: string;
  checkpointIds: string[];
}) {
  const checkpointIds = [...new Set(input.checkpointIds)];
  const rows = await listPracticeCheckpointDefinitions(input.practiceId, checkpointIds);
  const byId = new Map(rows.map((row) => [row.checkpointId, row]));
  const missing: string[] = [];
  const invalidIds: string[] = [];
  const snapshots: ReturnType<typeof checkpointDefinitionSnapshot>[] = [];

  for (const checkpointId of checkpointIds) {
    const row = byId.get(checkpointId);
    if (!row) {
      missing.push(checkpointId);
      continue;
    }
    try {
      const validated = await validateDefinitionInput(checkpointId, row);
      snapshots.push(checkpointDefinitionSnapshot(validated.checkpoint, validated));
    } catch {
      invalidIds.push(checkpointId);
    }
  }

  if (missing.length > 0 || invalidIds.length > 0) {
    invalid(`Praxisdefinitionen fehlen oder sind ungültig: ${[...missing, ...invalidIds].join(", ")}`);
  }
  return snapshots;
}

export async function resolveDefinitionsForPublish(input: {
  practiceId: string;
  checkpoints: Array<{ checkpointId: string }>;
}) {
  return assertDefinitionsComplete({
    practiceId: input.practiceId,
    checkpointIds: input.checkpoints.map((checkpoint) => checkpoint.checkpointId),
  });
}