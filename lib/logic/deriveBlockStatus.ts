import {
  BlockStatus,
  CheckpointCategory,
  type ActiveCheckpoint,
} from "@/lib/types";

export function deriveBlockStatus(
  activeCheckpoints: ActiveCheckpoint[],
  currentStatus: BlockStatus,
): BlockStatus {
  const organizationalCheckpoints = activeCheckpoints.filter(
    (checkpoint) => checkpoint.category === CheckpointCategory.O,
  );

  if (organizationalCheckpoints.length === 0) {
    return currentStatus;
  }

  const doneCount = organizationalCheckpoints.filter(
    (checkpoint) => checkpoint.status === "OK",
  ).length;
  if (doneCount === organizationalCheckpoints.length) {
    return BlockStatus.GEKLAERT;
  }

  const openCount = organizationalCheckpoints.filter(
    (checkpoint) => checkpoint.status === "TO_DO",
  ).length;
  if (openCount === organizationalCheckpoints.length) {
    return BlockStatus.OFFEN;
  }

  return BlockStatus.TEILWEISE_OFFEN;
}
