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

  const allDone = organizationalCheckpoints.every(
    (checkpoint) => checkpoint.status === "DONE",
  );
  if (allDone) {
    return BlockStatus.GEKLAERT;
  }

  const allOpen = organizationalCheckpoints.every(
    (checkpoint) => checkpoint.status === "OPEN",
  );
  if (allOpen) {
    return BlockStatus.OFFEN;
  }

  return BlockStatus.TEILWEISE_OFFEN;
}
