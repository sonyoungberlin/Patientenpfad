import { prisma } from "@/lib/prisma";
import { getCheckpointFromLib } from "@/lib/practiceProcesses/checkpointLibrary";

export type CheckpointLabelRecord = {
  id: string;
  name: string;
  checkpointIds: string[];
};

export class CheckpointLabelError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message);
  }
}

export function normalizeCheckpointLabelName(name: string): string {
  return name.normalize("NFKC").trim().toLocaleLowerCase("und");
}

export async function listCheckpointLabels(): Promise<CheckpointLabelRecord[]> {
  const labels = await prisma.checkpointLabel.findMany({
    orderBy: { normalized_name: "asc" },
    include: { assignments: { select: { checkpoint_id: true } } },
  });
  return labels.map((label) => ({
    id: label.id,
    name: label.name,
    checkpointIds: label.assignments.map((assignment) => assignment.checkpoint_id),
  }));
}

export async function getCheckpointLabelIds(checkpointId: string): Promise<string[]> {
  const assignments = await prisma.checkpointLabelAssignment.findMany({
    where: { checkpoint_id: checkpointId },
    select: { label_id: true },
  });
  return assignments.map((assignment) => assignment.label_id);
}

export async function createCheckpointLabel(name: string) {
  const displayName = name.normalize("NFKC").trim();
  const normalizedName = normalizeCheckpointLabelName(displayName);
  if (!displayName) throw new CheckpointLabelError("Ein Labelname ist erforderlich.", 422);
  if (displayName.length > 80) throw new CheckpointLabelError("Labelnamen dürfen höchstens 80 Zeichen lang sein.", 422);

  return prisma.checkpointLabel.create({
    data: { name: displayName, normalized_name: normalizedName },
    select: { id: true, name: true },
  });
}

export async function renameCheckpointLabel(id: string, name: string) {
  const displayName = name.normalize("NFKC").trim();
  const normalizedName = normalizeCheckpointLabelName(displayName);
  if (!displayName) throw new CheckpointLabelError("Ein Labelname ist erforderlich.", 422);
  if (displayName.length > 80) throw new CheckpointLabelError("Labelnamen dürfen höchstens 80 Zeichen lang sein.", 422);

  const result = await prisma.checkpointLabel.updateMany({
    where: { id },
    data: { name: displayName, normalized_name: normalizedName },
  });
  if (!result.count) throw new CheckpointLabelError("Label nicht gefunden.", 404);
  return { id, name: displayName };
}

export async function deleteCheckpointLabel(id: string): Promise<void> {
  const result = await prisma.checkpointLabel.deleteMany({ where: { id } });
  if (!result.count) throw new CheckpointLabelError("Label nicht gefunden.", 404);
}

export async function setCheckpointLabels(checkpointId: string, labelIds: string[]): Promise<string[]> {
  const checkpoint = await getCheckpointFromLib(checkpointId);
  if (!checkpoint) throw new CheckpointLabelError("Checkpoint nicht gefunden.", 404);

  const uniqueIds = [...new Set(labelIds)];
  const labels = uniqueIds.length
    ? await prisma.checkpointLabel.findMany({ where: { id: { in: uniqueIds } }, select: { id: true } })
    : [];
  if (labels.length !== uniqueIds.length) {
    throw new CheckpointLabelError("Mindestens eines der ausgewählten Labels existiert nicht mehr.", 422);
  }

  await prisma.$transaction([
    prisma.checkpointLabelAssignment.deleteMany({ where: { checkpoint_id: checkpointId } }),
    ...(uniqueIds.length
      ? [prisma.checkpointLabelAssignment.createMany({
          data: uniqueIds.map((labelId) => ({ checkpoint_id: checkpointId, label_id: labelId })),
        })]
      : []),
  ]);

  return uniqueIds;
}