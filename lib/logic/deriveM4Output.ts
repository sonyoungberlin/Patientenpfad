import { type ActiveCheckpoint } from "@/lib/types";

/**
 * M3 → M4: Returns the patient-facing action/notice text for every checkpoint
 * whose status is "TO_DO". Checkpoints with any other status produce no output.
 */
export function deriveM4Output(checkpoints: ActiveCheckpoint[]): string[] {
  return checkpoints
    .filter((cp) => cp.status === "TO_DO")
    .map((cp) => cp.m4.text);
}
