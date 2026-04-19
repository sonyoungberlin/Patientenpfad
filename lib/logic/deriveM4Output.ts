import { isStandardCheckpoint, type ActiveCheckpoint } from "@/lib/types";

/**
 * M3 → M4: Returns the patient-facing action/notice text for every checkpoint
 * whose status is "TO_DO". Checkpoints with any other status produce no output.
 * MULTI_SELECT checkpoints have no M4 and are skipped.
 */
export function deriveM4Output(checkpoints: ActiveCheckpoint[]): string[] {
  return checkpoints
    .filter(isStandardCheckpoint)
    .filter((cp) => cp.status === "TO_DO")
    .map((cp) => cp.m4.text);
}
