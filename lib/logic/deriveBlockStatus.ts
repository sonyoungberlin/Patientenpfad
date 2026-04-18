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

  if (organizationalCheckpoints.every((checkpoint) => checkpoint.status === "OK")) {
    return BlockStatus.GEKLAERT;
  }

  if (organizationalCheckpoints.every((checkpoint) => checkpoint.status === "TO_DO")) {
    return BlockStatus.OFFEN;
  }

  return BlockStatus.TEILWEISE_OFFEN;
}
