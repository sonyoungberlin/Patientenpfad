import { ActiveCheckpoint, BlockStatus } from "@/lib/types";

export function deriveBlockStatus(
  activeCheckpoints: ActiveCheckpoint[],
): BlockStatus {
  return activeCheckpoints.length === 0
    ? BlockStatus.GEKLAERT
    : BlockStatus.OFFEN;
}
