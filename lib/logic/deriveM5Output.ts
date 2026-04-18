import { CheckpointCategory, type ActiveCheckpoint } from "@/lib/types";

export type M5Entry = {
  checkpoint_id: string;
  text: string;
};

/**
 * Per-checkpoint M5 documentation texts, keyed by checkpoint ID.
 * Each entry maps a status to the exact documentation sentence.
 */
export const M5_TEXTS: Record<
  string,
  { OK: string; TO_DO: string; ZURÜCKSTELLEN?: string }
> = {
  K01: {
    OK: "Erreichbarkeit des Patienten ist ausreichend gegeben.",
    TO_DO: "Erreichbarkeit des Patienten ist nicht ausreichend gegeben.",
  },
  K02: {
    OK: "Wahrnehmung von Terminen ist ausreichend möglich.",
    TO_DO: "Wahrnehmung von Terminen ist nicht ausreichend möglich.",
    ZURÜCKSTELLEN: "Wahrnehmung von Terminen ist unklar.",
  },
  K03: {
    OK: "Diagnosenlage ist ausreichend geklärt.",
    TO_DO: "Diagnosenlage ist aktuell nicht ausreichend geklärt.",
    ZURÜCKSTELLEN: "Diagnosenlage ist unklar.",
  },
  K04: {
    OK: "Medikation ist ausreichend geprüft.",
    TO_DO: "Medikation ist nicht ausreichend geprüft.",
    ZURÜCKSTELLEN: "Medikation ist unklar.",
  },
  K05: {
    OK: "Medizinische Mitbehandlung ist ausreichend bekannt.",
    TO_DO: "Medizinische Mitbehandlung ist aktuell nicht ausreichend bekannt.",
    ZURÜCKSTELLEN: "Medizinische Mitbehandlung ist unklar.",
  },
  K06: {
    OK: "Unterstützung im Alltag ist ausreichend organisiert.",
    TO_DO: "Unterstützung im Alltag ist aktuell nicht ausreichend organisiert.",
    ZURÜCKSTELLEN: "Unterstützung im Alltag ist unklar.",
  },
  K07: {
    OK: "Vorübergehender Unterstützungsbedarf ist ausreichend geklärt.",
    TO_DO:
      "Vorübergehender Unterstützungsbedarf ist aktuell nicht ausreichend geklärt.",
    ZURÜCKSTELLEN: "Vorübergehender Unterstützungsbedarf ist unklar.",
  },
  K08: {
    OK: "Digitale Kommunikation ist ausreichend möglich.",
    TO_DO: "Digitale Kommunikation ist nicht ausreichend möglich.",
    ZURÜCKSTELLEN: "Digitale Kommunikation ist unklar.",
  },
};

/**
 * Resolves a single M5 documentation sentence for a checkpoint.
 *
 * Uses per-checkpoint texts from M5_TEXTS when available.
 * Falls back to the generic category-based pattern for unknown checkpoint IDs.
 */
export function resolveM5Text(cp: {
  id: string;
  title: string;
  category: CheckpointCategory;
  status: string;
}): string {
  const entry = M5_TEXTS[cp.id];
  if (entry) {
    const text =
      entry[cp.status as keyof typeof entry];
    if (text) return text;
  }

  // Fallback: generic pattern for checkpoint IDs not in M5_TEXTS
  if (cp.category === CheckpointCategory.M) {
    if (cp.status === "OK") return `${cp.title} ist ausreichend geklärt.`;
    if (cp.status === "TO_DO")
      return `${cp.title} ist aktuell nicht ausreichend geklärt.`;
    return `${cp.title} ist unklar.`;
  }
  // category O
  if (cp.status === "OK") return `${cp.title} ist geklärt.`;
  return `${cp.title} ist aktuell nicht ausreichend geklärt.`;
}

/**
 * M3 → M5: Returns exactly one documentation sentence per checkpoint.
 */
export function deriveM5Output(checkpoints: ActiveCheckpoint[]): M5Entry[] {
  return checkpoints.map((cp) => ({
    checkpoint_id: cp.id,
    text: resolveM5Text(cp),
  }));
}
