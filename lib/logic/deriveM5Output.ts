import { CheckpointCategory, isMultiSelectCheckpoint, isStandardCheckpoint, isAssessmentCheckpoint, type ActiveCheckpoint, type StandardCheckpoint } from "@/lib/types";

export type M5Entry = {
  checkpoint_id: string;
  text: string;
};

const M5_GROUP_HEADER_NOT_FULLY = "Nicht vollständig geklärt:";
const M5_GROUP_HEADER_FULLY = "Vollständig geklärt:";

/**
 * Summary sentences used when all active standard checkpoints in a block
 * have status TO_DO and there are at least 2 such checkpoints.
 */
export const M5_BLOCK_SUMMARY_TEXTS: Record<string, string> = {
  kommunikation: "Die Kommunikation ist insgesamt nicht ausreichend geklärt.",
  medizinische_lage: "Die medizinische Lage ist insgesamt nicht ausreichend geklärt.",
  versorgung_im_alltag: "Die Versorgung im Alltag ist insgesamt nicht ausreichend geklärt.",
  pflegebeobachtung:
    "Beobachtungen im Alltag / Pflege sind insgesamt nicht ausreichend geklärt.",
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
    OK: "Praktische Möglichkeit der Terminwahrnehmung ist ausreichend gegeben.",
    TO_DO: "Praktische Möglichkeit der Terminwahrnehmung ist nicht ausreichend gegeben.",
    ZURÜCKSTELLEN: "Praktische Möglichkeit der Terminwahrnehmung ist unklar.",
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
  },
  K07: {
    OK: "Vorübergehender Unterstützungsbedarf ist ausreichend geklärt.",
    TO_DO:
      "Vorübergehender Unterstützungsbedarf ist aktuell nicht ausreichend geklärt.",
    ZURÜCKSTELLEN: "Vorübergehender Unterstützungsbedarf ist unklar.",
  },
  K08: {
    OK: "Nutzung digitaler Praxisleistungen ist ausreichend gegeben.",
    TO_DO: "Nutzung digitaler Praxisleistungen ist nicht ausreichend gegeben.",
  },
  K09: {
    OK: "Mitwirkung ist ausreichend gegeben.",
    TO_DO: "Mitwirkung ist nicht ausreichend gegeben.",
  },
  K12: {
    OK: "Alltagssituation / Pflegeeinschätzung wirkt unauffällig.",
    TO_DO: "Alltagssituation / Pflegeeinschätzung ist aktuell nicht ausreichend geklärt.",
    ZURÜCKSTELLEN: "Alltagssituation / Pflegeeinschätzung ist unklar.",
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
 * MULTI_SELECT checkpoints generate text from their selections (only if enabled).
 * ASSESSMENT checkpoints generate text only if enabled === true; otherwise empty.
 */
export function deriveM5Output(checkpoints: ActiveCheckpoint[]): M5Entry[] {
  return checkpoints.map((cp) => {
    if (isMultiSelectCheckpoint(cp)) {
      return {
        checkpoint_id: cp.id,
        text:
          cp.enabled && cp.selections.length > 0
            ? `${cp.title}: ${cp.selections.join(", ")}`
            : "",
      };
    }
    // ASSESSMENT checkpoint: only document if enabled
    if (isAssessmentCheckpoint(cp) && cp.enabled !== true) {
      return { checkpoint_id: cp.id, text: "" };
    }
    return {
      checkpoint_id: cp.id,
      text: resolveM5Text(cp),
    };
  });
}

/**
 * Determines which block_ids should be condensed into a single summary sentence.
 *
 * A block qualifies for condensation when:
 * 1. It has at least 2 active standard checkpoints (multi-select and disabled ASSESSMENT excluded)
 * 2. ALL of those standard checkpoints have status "TO_DO"
 * 3. A summary text exists for the block_id in M5_BLOCK_SUMMARY_TEXTS
 */
export function getCondensedBlockIds(checkpoints: ActiveCheckpoint[]): Set<string> {
  const standardCps = checkpoints.filter(isStandardCheckpoint).filter(
    // Disabled ASSESSMENT checkpoints do not count toward condensation
    (cp) => !isAssessmentCheckpoint(cp) || cp.enabled === true,
  );

  // Group standard checkpoints by block_id
  const byBlock = new Map<string, StandardCheckpoint[]>();
  for (const cp of standardCps) {
    const list = byBlock.get(cp.block_id) ?? [];
    list.push(cp);
    byBlock.set(cp.block_id, list);
  }

  const condensed = new Set<string>();
  for (const [blockId, cps] of byBlock) {
    if (
      cps.length >= 2 &&
      cps.every((cp) => cp.status === "TO_DO") &&
      blockId in M5_BLOCK_SUMMARY_TEXTS
    ) {
      condensed.add(blockId);
    }
  }
  return condensed;
}

/**
 * M3 → M5 with block-level condensation.
 *
 * When all active standard checkpoints of a block have status "TO_DO" and
 * there are at least 2 of them, emits a single summary sentence for that
 * block instead of individual per-checkpoint lines.
 *
 * MULTI_SELECT checkpoints are always rendered individually and never
 * participate in condensation.
 *
 * ASSESSMENT checkpoints with enabled !== true are skipped (empty entry).
 *
 * M4 / patient-facing output is not affected by this function.
 */
export function deriveM5OutputCondensed(checkpoints: ActiveCheckpoint[]): M5Entry[] {
  const notFullyClarified: M5Entry[] = [];
  const fullyClarified: M5Entry[] = [];
  const additionalEntries: M5Entry[] = [];
  const disabledAssessmentEntries: M5Entry[] = [];

  for (const cp of checkpoints) {
    if (isMultiSelectCheckpoint(cp)) {
      // Multi-select stays as an optional existing M5 entry.
      additionalEntries.push({
        checkpoint_id: cp.id,
        text:
          cp.enabled && cp.selections.length > 0
            ? `${cp.title}: ${cp.selections.join(", ")}`
            : "",
      });
      continue;
    }

    // ASSESSMENT checkpoint: only document if enabled
    if (isAssessmentCheckpoint(cp) && cp.enabled !== true) {
      disabledAssessmentEntries.push({ checkpoint_id: cp.id, text: "" });
      continue;
    }

    const pointEntry: M5Entry = {
      checkpoint_id: cp.id,
      text: `- ${cp.title}`,
    };

    if (cp.status === "OK") {
      fullyClarified.push(pointEntry);
      continue;
    }

    // TO_DO and ZURÜCKSTELLEN are both treated as "not fully clarified".
    notFullyClarified.push(pointEntry);
  }

  const result: M5Entry[] = [];

  if (notFullyClarified.length > 0) {
    result.push({ checkpoint_id: "group:not-fully-clarified", text: M5_GROUP_HEADER_NOT_FULLY });
    result.push(...notFullyClarified);
  }

  if (fullyClarified.length > 0) {
    // When both groups are present, prefix the second header with \n so that
    // joining with "\n" produces a blank separator line in both the <pre>
    // display and the copied plain text, without needing a separate empty entry.
    const fullyHeader =
      notFullyClarified.length > 0 ? `\n${M5_GROUP_HEADER_FULLY}` : M5_GROUP_HEADER_FULLY;
    result.push({ checkpoint_id: "group:fully-clarified", text: fullyHeader });
    result.push(...fullyClarified);
  }

  result.push(...additionalEntries);
  result.push(...disabledAssessmentEntries);

  return result;
}
