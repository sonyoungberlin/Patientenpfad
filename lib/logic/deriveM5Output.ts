import { CheckpointCategory, type ActiveCheckpoint } from "@/lib/types";

export type M5Entry = {
  checkpoint_id: string;
  text: string;
};

/**
 * M3 → M5: Returns exactly one documentation sentence per checkpoint.
 *
 * Mapping rules:
 *   category M:
 *     OK            → "{title} ist ausreichend geklärt."
 *     TO_DO         → "{title} ist aktuell nicht ausreichend geklärt."
 *     ZURÜCKSTELLEN → "{title} ist unklar."
 *
 *   category O:
 *     OK            → "{title} ist geklärt."
 *     TO_DO         → "{title} ist aktuell nicht ausreichend geklärt."
 */
export function deriveM5Output(checkpoints: ActiveCheckpoint[]): M5Entry[] {
  return checkpoints.map((cp) => {
    let text: string;

    if (cp.category === CheckpointCategory.M) {
      if (cp.status === "OK") {
        text = `${cp.title} ist ausreichend geklärt.`;
      } else if (cp.status === "TO_DO") {
        text = `${cp.title} ist aktuell nicht ausreichend geklärt.`;
      } else {
        text = `${cp.title} ist unklar.`;
      }
    } else {
      // category O – only OK | TO_DO
      if (cp.status === "OK") {
        text = `${cp.title} ist geklärt.`;
      } else {
        text = `${cp.title} ist aktuell nicht ausreichend geklärt.`;
      }
    }

    return { checkpoint_id: cp.id, text };
  });
}
