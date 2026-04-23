import {
  deriveM5OutputCondensed,
  getCondensedBlockIds,
  M5_BLOCK_SUMMARY_TEXTS,
  resolveM5Text,
} from "@/lib/logic/deriveM5Output";
import {
  CheckpointCategory,
  CheckpointMode,
  CheckpointPerspective,
  CheckpointRelevance,
  CheckpointType,
  type ActiveCheckpoint,
  type ActiveCheckpointMultiSelect,
  type StandardCheckpoint,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStandard(
  overrides: Partial<StandardCheckpoint> & { id: string; block_id: string },
): StandardCheckpoint {
  return {
    type: CheckpointType.VERIFIKATION,
    category: CheckpointCategory.M,
    perspectives: [CheckpointPerspective.MFA, CheckpointPerspective.PATIENT],
    relevance: CheckpointRelevance.P,
    title: overrides.id,
    status: "TO_DO",
    m4: { type: "ACTION", text: `m4 for ${overrides.id}` },
    ...overrides,
  } as StandardCheckpoint;
}

function makeMultiSelect(
  overrides: Partial<ActiveCheckpointMultiSelect> & { id: string; block_id: string },
): ActiveCheckpointMultiSelect {
  return {
    type: CheckpointType.BEDARF,
    category: CheckpointCategory.O,
    perspectives: [],
    relevance: CheckpointRelevance.A,
    mode: CheckpointMode.MULTI_SELECT,
    title: overrides.id,
    options: ["A", "B"],
    selections: [],
    enabled: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// getCondensedBlockIds
// ---------------------------------------------------------------------------

describe("getCondensedBlockIds", () => {
  it("returns block_id when ≥2 standard CPs are all TO_DO", () => {
    const cps: ActiveCheckpoint[] = [
      makeStandard({ id: "K01", block_id: "kommunikation", status: "TO_DO" }),
      makeStandard({ id: "K08", block_id: "kommunikation", status: "TO_DO" }),
    ];
    expect(getCondensedBlockIds(cps)).toEqual(new Set(["kommunikation"]));
  });

  it("does NOT condense when only 1 standard CP in block", () => {
    const cps: ActiveCheckpoint[] = [
      makeStandard({ id: "K03", block_id: "medizinische_lage", status: "TO_DO" }),
    ];
    expect(getCondensedBlockIds(cps)).toEqual(new Set());
  });

  it("does NOT condense when statuses are mixed", () => {
    const cps: ActiveCheckpoint[] = [
      makeStandard({ id: "K03", block_id: "medizinische_lage", status: "TO_DO" }),
      makeStandard({ id: "K04", block_id: "medizinische_lage", status: "OK" }),
    ];
    expect(getCondensedBlockIds(cps)).toEqual(new Set());
  });

  it("does NOT condense when all are OK", () => {
    const cps: ActiveCheckpoint[] = [
      makeStandard({ id: "K01", block_id: "kommunikation", status: "OK" }),
      makeStandard({ id: "K08", block_id: "kommunikation", status: "OK" }),
    ];
    expect(getCondensedBlockIds(cps)).toEqual(new Set());
  });

  it("does NOT condense when one is ZURÜCKSTELLEN", () => {
    const cps: ActiveCheckpoint[] = [
      makeStandard({ id: "K03", block_id: "medizinische_lage", status: "TO_DO" }),
      makeStandard({
        id: "K04",
        block_id: "medizinische_lage",
        category: CheckpointCategory.M,
        status: "ZURÜCKSTELLEN",
      }),
    ];
    expect(getCondensedBlockIds(cps)).toEqual(new Set());
  });

  it("ignores multi-select checkpoints when counting", () => {
    const cps: ActiveCheckpoint[] = [
      makeStandard({ id: "K03", block_id: "medizinische_lage", status: "TO_DO" }),
      makeMultiSelect({ id: "K10", block_id: "medizinische_lage" }),
    ];
    // Only 1 standard CP → no condensation
    expect(getCondensedBlockIds(cps)).toEqual(new Set());
  });

  it("condenses one block but not another", () => {
    const cps: ActiveCheckpoint[] = [
      // kommunikation: all TO_DO, ≥2
      makeStandard({ id: "K01", block_id: "kommunikation", status: "TO_DO" }),
      makeStandard({ id: "K08", block_id: "kommunikation", status: "TO_DO" }),
      // medizinische_lage: mixed
      makeStandard({ id: "K03", block_id: "medizinische_lage", status: "TO_DO" }),
      makeStandard({ id: "K04", block_id: "medizinische_lage", status: "OK" }),
    ];
    expect(getCondensedBlockIds(cps)).toEqual(new Set(["kommunikation"]));
  });
});

// ---------------------------------------------------------------------------
// deriveM5OutputCondensed
// ---------------------------------------------------------------------------

describe("deriveM5OutputCondensed", () => {
  it("kommunikation: ≥2 TO_DO → single block summary", () => {
    const cps: ActiveCheckpoint[] = [
      makeStandard({ id: "K01", block_id: "kommunikation", status: "TO_DO" }),
      makeStandard({ id: "K08", block_id: "kommunikation", status: "TO_DO" }),
      makeStandard({ id: "K09", block_id: "kommunikation", status: "TO_DO" }),
    ];
    const result = deriveM5OutputCondensed(cps);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe(
      "Die Kommunikation ist insgesamt nicht ausreichend geklärt.",
    );
    expect(result[0].checkpoint_id).toBe("block:kommunikation");
  });

  it("medizinische_lage: all TO_DO → single block summary", () => {
    const cps: ActiveCheckpoint[] = [
      makeStandard({ id: "K03", block_id: "medizinische_lage", status: "TO_DO" }),
      makeStandard({ id: "K04", block_id: "medizinische_lage", status: "TO_DO" }),
      makeStandard({ id: "K05", block_id: "medizinische_lage", status: "TO_DO" }),
    ];
    const result = deriveM5OutputCondensed(cps);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe(
      "Die medizinische Lage ist insgesamt nicht ausreichend geklärt.",
    );
  });

  it("versorgung_im_alltag: all TO_DO → single block summary", () => {
    const cps: ActiveCheckpoint[] = [
      makeStandard({ id: "K02", block_id: "versorgung_im_alltag", status: "TO_DO" }),
      makeStandard({ id: "K06", block_id: "versorgung_im_alltag", status: "TO_DO" }),
      makeStandard({ id: "K07", block_id: "versorgung_im_alltag", status: "TO_DO" }),
    ];
    const result = deriveM5OutputCondensed(cps);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe(
      "Die Versorgung im Alltag ist insgesamt nicht ausreichend geklärt.",
    );
  });

  it("mixed status → no condensation, individual lines", () => {
    const cps: ActiveCheckpoint[] = [
      makeStandard({ id: "K03", block_id: "medizinische_lage", status: "TO_DO" }),
      makeStandard({ id: "K04", block_id: "medizinische_lage", status: "OK" }),
    ];
    const result = deriveM5OutputCondensed(cps);
    expect(result).toHaveLength(2);
    expect(result[0].checkpoint_id).toBe("K03");
    expect(result[1].checkpoint_id).toBe("K04");
    // Each should be individual text
    expect(result[0].text).toBe(resolveM5Text(cps[0] as StandardCheckpoint));
    expect(result[1].text).toBe(resolveM5Text(cps[1] as StandardCheckpoint));
  });

  it("only 1 active standard CP in block → no condensation", () => {
    const cps: ActiveCheckpoint[] = [
      makeStandard({ id: "K03", block_id: "medizinische_lage", status: "TO_DO" }),
    ];
    const result = deriveM5OutputCondensed(cps);
    expect(result).toHaveLength(1);
    expect(result[0].checkpoint_id).toBe("K03");
    expect(result[0].text).toBe(resolveM5Text(cps[0] as StandardCheckpoint));
  });

  it("multi-select in same block does not prevent condensation of standard CPs", () => {
    const cps: ActiveCheckpoint[] = [
      makeStandard({ id: "K03", block_id: "medizinische_lage", status: "TO_DO" }),
      makeStandard({ id: "K04", block_id: "medizinische_lage", status: "TO_DO" }),
      makeMultiSelect({
        id: "K10",
        block_id: "medizinische_lage",
        enabled: true,
        selections: ["Multimedikation"],
      }),
    ];
    const result = deriveM5OutputCondensed(cps);
    // 1 block summary + 1 multi-select line
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe(
      "Die medizinische Lage ist insgesamt nicht ausreichend geklärt.",
    );
    expect(result[1].text).toBe("K10: Multimedikation");
  });

  it("multi-select with no selections → empty text, still present but filtered by consumer", () => {
    const cps: ActiveCheckpoint[] = [
      makeStandard({ id: "K03", block_id: "medizinische_lage", status: "TO_DO" }),
      makeStandard({ id: "K04", block_id: "medizinische_lage", status: "TO_DO" }),
      makeMultiSelect({ id: "K10", block_id: "medizinische_lage", enabled: false }),
    ];
    const result = deriveM5OutputCondensed(cps);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe(
      "Die medizinische Lage ist insgesamt nicht ausreichend geklärt.",
    );
    expect(result[1].text).toBe(""); // disabled multi-select
  });

  it("condensed block + non-condensed block in same output", () => {
    const cps: ActiveCheckpoint[] = [
      // kommunikation: all TO_DO → condensed
      makeStandard({ id: "K01", block_id: "kommunikation", status: "TO_DO" }),
      makeStandard({ id: "K08", block_id: "kommunikation", status: "TO_DO" }),
      // medizinische_lage: mixed → individual
      makeStandard({ id: "K03", block_id: "medizinische_lage", status: "OK" }),
      makeStandard({ id: "K04", block_id: "medizinische_lage", status: "TO_DO" }),
    ];
    const result = deriveM5OutputCondensed(cps);
    expect(result).toHaveLength(3);
    expect(result[0].text).toBe(
      "Die Kommunikation ist insgesamt nicht ausreichend geklärt.",
    );
    expect(result[1].checkpoint_id).toBe("K03");
    expect(result[2].checkpoint_id).toBe("K04");
  });

  it("all blocks condensed simultaneously", () => {
    const cps: ActiveCheckpoint[] = [
      makeStandard({ id: "K01", block_id: "kommunikation", status: "TO_DO" }),
      makeStandard({ id: "K08", block_id: "kommunikation", status: "TO_DO" }),
      makeStandard({ id: "K03", block_id: "medizinische_lage", status: "TO_DO" }),
      makeStandard({ id: "K04", block_id: "medizinische_lage", status: "TO_DO" }),
      makeStandard({ id: "K02", block_id: "versorgung_im_alltag", status: "TO_DO" }),
      makeStandard({ id: "K06", block_id: "versorgung_im_alltag", status: "TO_DO" }),
    ];
    const result = deriveM5OutputCondensed(cps);
    expect(result).toHaveLength(3);
    const texts = result.map((r) => r.text);
    expect(texts).toContain(M5_BLOCK_SUMMARY_TEXTS.kommunikation);
    expect(texts).toContain(M5_BLOCK_SUMMARY_TEXTS.medizinische_lage);
    expect(texts).toContain(M5_BLOCK_SUMMARY_TEXTS.versorgung_im_alltag);
  });

  it("preserves order: block summary appears at position of first CP in block", () => {
    const cps: ActiveCheckpoint[] = [
      makeStandard({ id: "K03", block_id: "medizinische_lage", status: "OK" }),
      makeStandard({ id: "K01", block_id: "kommunikation", status: "TO_DO" }),
      makeStandard({ id: "K08", block_id: "kommunikation", status: "TO_DO" }),
      makeStandard({ id: "K04", block_id: "medizinische_lage", status: "TO_DO" }),
    ];
    const result = deriveM5OutputCondensed(cps);
    // K03 individual, then kommunikation summary, then K04 individual
    expect(result[0].checkpoint_id).toBe("K03");
    expect(result[1].checkpoint_id).toBe("block:kommunikation");
    expect(result[2].checkpoint_id).toBe("K04");
  });
});
