import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCheckpointFromLib } from "./checkpointLibrary";
import {
  checkpointTemplateSnapshot,
  parsePracticeDefinitionContent,
  validatePracticeDefinitionForRelease,
  type PracticeCheckpointDefinitionContent,
  type PracticeCheckpointDefinitionVersionSnapshot,
} from "./practiceDefinition";

export async function getPracticeDefinition(
  practiceId: string,
  checkpointId: string,
) {
  const definition = await prisma.practiceCheckpointDefinition.findUnique({
    where: { practice_id_checkpoint_id: { practice_id: practiceId, checkpoint_id: checkpointId } },
  });
  if (!definition) return null;
  const currentVersion = definition.current_version_id
    ? await prisma.practiceCheckpointDefinitionVersion.findUnique({
        where: { id: definition.current_version_id },
      })
    : null;
  return {
    id: definition.id,
    checkpointId,
    draft: parsePracticeDefinitionContent(definition.draft),
    currentVersion: currentVersion ? mapVersion(currentVersion) : null,
  };
}

export async function getPracticeDefinitionVersions(
  practiceId: string,
  checkpointId: string,
): Promise<PracticeCheckpointDefinitionVersionSnapshot[]> {
  const definition = await prisma.practiceCheckpointDefinition.findUnique({
    where: { practice_id_checkpoint_id: { practice_id: practiceId, checkpoint_id: checkpointId } },
    select: { id: true },
  });
  if (!definition) return [];
  const versions = await prisma.practiceCheckpointDefinitionVersion.findMany({
    where: { definition_id: definition.id },
    orderBy: { version: "desc" },
  });
  return versions.map(mapVersion);
}

export async function listPracticeDefinitionSummaries(practiceId: string) {
  return prisma.practiceCheckpointDefinition.findMany({
    where: { practice_id: practiceId },
    select: {
      checkpoint_id: true,
      current_version_id: true,
      draft: true,
      updated_at: true,
    },
  });
}

export async function getCurrentPracticeDefinitionVersions(
  practiceId: string,
  checkpointIds: string[],
): Promise<Map<string, PracticeCheckpointDefinitionVersionSnapshot>> {
  const definitions = await prisma.practiceCheckpointDefinition.findMany({
    where: {
      practice_id: practiceId,
      checkpoint_id: { in: [...new Set(checkpointIds)] },
      current_version_id: { not: null },
    },
  });
  const versionIds = definitions.flatMap((item) => item.current_version_id ? [item.current_version_id] : []);
  const versions = versionIds.length === 0
    ? []
    : await prisma.practiceCheckpointDefinitionVersion.findMany({ where: { id: { in: versionIds } } });
  const versionById = new Map(versions.map((version) => [version.id, version]));
  return new Map(definitions.flatMap((definition) => {
    const version = definition.current_version_id ? versionById.get(definition.current_version_id) : undefined;
    return version ? [[definition.checkpoint_id, mapVersion(version)]] : [];
  }));
}

export async function savePracticeDefinitionDraft(input: {
  practiceId: string;
  checkpointId: string;
  content: PracticeCheckpointDefinitionContent;
}) {
  const checkpoint = await getCheckpointFromLib(input.checkpointId);
  if (!checkpoint) throw Object.assign(new Error("Checkpoint-Vorlage nicht gefunden."), { statusCode: 404 });
  return prisma.practiceCheckpointDefinition.upsert({
    where: { practice_id_checkpoint_id: { practice_id: input.practiceId, checkpoint_id: input.checkpointId } },
    create: {
      practice_id: input.practiceId,
      checkpoint_id: input.checkpointId,
      draft: input.content as unknown as Prisma.InputJsonValue,
    },
    update: { draft: input.content as unknown as Prisma.InputJsonValue },
  });
}

export async function releasePracticeDefinition(input: {
  practiceId: string;
  checkpointId: string;
  actorAccountId: string;
}): Promise<PracticeCheckpointDefinitionVersionSnapshot> {
  const [definition, checkpoint] = await Promise.all([
    prisma.practiceCheckpointDefinition.findUnique({
      where: { practice_id_checkpoint_id: { practice_id: input.practiceId, checkpoint_id: input.checkpointId } },
    }),
    getCheckpointFromLib(input.checkpointId),
  ]);
  if (!definition || !checkpoint) {
    throw Object.assign(new Error("Definition oder Checkpoint-Vorlage nicht gefunden."), { statusCode: 404 });
  }
  const content = parsePracticeDefinitionContent(definition.draft);
  if (!content) throw Object.assign(new Error("Kein gültiger Definitionsentwurf vorhanden."), { statusCode: 400 });
  const template = checkpointTemplateSnapshot(checkpoint);
  const issues = validatePracticeDefinitionForRelease(content, template);
  if (issues.length > 0) {
    throw Object.assign(new Error("Die Definition ist noch nicht freigabefähig."), { statusCode: 422, issues });
  }

  const released = await prisma.$transaction(async (tx) => {
    const aggregate = await tx.practiceCheckpointDefinitionVersion.aggregate({
      where: { definition_id: definition.id },
      _max: { version: true },
    });
    const version = await tx.practiceCheckpointDefinitionVersion.create({
      data: {
        definition_id: definition.id,
        version: (aggregate._max.version ?? 0) + 1,
        checkpoint_id: input.checkpointId,
        template_snapshot: template as unknown as Prisma.InputJsonValue,
        content: content as unknown as Prisma.InputJsonValue,
        released_by_account_id: input.actorAccountId,
      },
    });
    await tx.practiceCheckpointDefinition.update({
      where: { id: definition.id },
      data: { current_version_id: version.id, draft: Prisma.DbNull },
    });
    return version;
  });
  return mapVersion(released);
}

function mapVersion(row: {
  id: string;
  definition_id: string;
  version: number;
  checkpoint_id: string;
  template_snapshot: unknown;
  content: unknown;
  released_at: Date;
}): PracticeCheckpointDefinitionVersionSnapshot {
  const content = parsePracticeDefinitionContent(row.content);
  if (!content) throw new Error("Ungültige freigegebene Praxisdefinition in der Datenbank.");
  return {
    definitionId: row.definition_id,
    versionId: row.id,
    version: row.version,
    checkpointId: row.checkpoint_id,
    template: row.template_snapshot as PracticeCheckpointDefinitionVersionSnapshot["template"],
    content,
    releasedAt: row.released_at.toISOString(),
  };
}