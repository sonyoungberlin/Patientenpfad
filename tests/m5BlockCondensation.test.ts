import {
  deriveM5OutputCondensed,
  getCondensedBlockIds,
} from "@/lib/logic/deriveM5Output";
import {
  CheckpointCategory,
  CheckpointMode,
  CheckpointPerspective,
  CheckpointType,
  type ActiveCheckpoint,
  type ActiveCheckpointMultiSelect,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStandard(
  overrides: Partial<ActiveCheckpoint> & { id: string; block_id: string },
): ActiveCheckpoint {
  return {
    type: CheckpointType.VERIFIKATION,
    category: CheckpointCategory.M,
    perspectives: [CheckpointPerspective.MFA, CheckpointPerspective.PATIENT],
    title: overrides.id,
    status: "TO_DO",
    m4: { type: "ACTION", text: `m4 for ${overrides.id}` },
    ...overrides,
  } as ActiveCheckpoint;
}

function makeMultiSelect(
  overrides: Partial<ActiveCheckpointMultiSelect> & { id: string; block_id: string },
): ActiveCheckpointMultiSelect {
  return {
    type: CheckpointType.BEDARF,
    category: CheckpointCategory.O,
    perspectives: [],
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
  it("gruppiert TO_DO unter 'Nicht vollständig geklärt'", () => {
    const cps: ActiveCheckpoint[] = [
      makeStandard({ id: "K01", block_id: "kommunikation", status: "TO_DO" }),
      makeStandard({ id: "K08", block_id: "kommunikation", status: "TO_DO" }),
      makeStandard({ id: "K09", block_id: "kommunikation", status: "TO_DO" }),
    ];
    const result = deriveM5OutputCondensed(cps);
    expect(result.map((r) => r.text)).toEqual([
      "Nicht vollständig geklärt:",
      "- K01",
      "- K08",
      "- K09",
    ]);
  });

  it("gruppiert OK unter 'Vollständig geklärt'", () => {
    const cps: ActiveCheckpoint[] = [
      makeStandard({ id: "K03", block_id: "medizinische_lage", status: "OK" }),
      makeStandard({ id: "K04", block_id: "medizinische_lage", status: "OK" }),
    ];
    const result = deriveM5OutputCondensed(cps);
    expect(result.map((r) => r.text)).toEqual([
      "Vollständig geklärt:",
      "- K03",
      "- K04",
    ]);
  });

  it("ordnet ZURÜCKSTELLEN ebenfalls als 'Nicht vollständig geklärt' ein", () => {
    const cps: ActiveCheckpoint[] = [
      makeStandard({ id: "K05", block_id: "medizinische_lage", status: "ZURÜCKSTELLEN" }),
    ];
    const result = deriveM5OutputCondensed(cps);
    expect(result.map((r) => r.text)).toEqual([
      "Nicht vollständig geklärt:",
      "- K05",
    ]);
  });

  it("liefert beide Gruppen bei gemischten Status, mit Leerzeile dazwischen", () => {
    const cps: ActiveCheckpoint[] = [
      makeStandard({ id: "K03", block_id: "medizinische_lage", status: "TO_DO" }),
      makeStandard({ id: "K04", block_id: "medizinische_lage", status: "OK" }),
    ];
    const result = deriveM5OutputCondensed(cps);
    expect(result.map((r) => r.text)).toEqual([
      "Nicht vollständig geklärt:",
      "- K03",
      "\nVollständig geklärt:",
      "- K04",
    ]);
    // Im zusammengefügten Text ergibt \n + join("\n") eine Leerzeile zwischen den Gruppen.
    const joined = result.map((e) => e.text).filter((t) => t.length > 0).join("\n");
    expect(joined).toBe(
      "Nicht vollständig geklärt:\n- K03\n\nVollständig geklärt:\n- K04",
    );
  });

  it("behält die Reihenfolge der Punkte innerhalb der Gruppe bei", () => {
    const cps: ActiveCheckpoint[] = [
      makeStandard({ id: "K07", block_id: "versorgung_im_alltag", status: "TO_DO" }),
      makeStandard({ id: "K01", block_id: "kommunikation", status: "TO_DO" }),
      makeStandard({ id: "K03", block_id: "medizinische_lage", status: "TO_DO" }),
    ];
    const result = deriveM5OutputCondensed(cps);
    expect(result.map((r) => r.text)).toEqual([
      "Nicht vollständig geklärt:",
      "- K07",
      "- K01",
      "- K03",
    ]);
  });

  it("multi-select bleibt als zusätzlicher M5-Eintrag erhalten", () => {
    const cps: ActiveCheckpoint[] = [
      makeStandard({ id: "K03", block_id: "medizinische_lage", status: "TO_DO" }),
      makeMultiSelect({
        id: "K10",
        block_id: "medizinische_lage",
        enabled: true,
        selections: ["Multimedikation"],
      }),
    ];
    const result = deriveM5OutputCondensed(cps);
    expect(result.map((r) => r.text)).toEqual([
      "Nicht vollständig geklärt:",
      "- K03",
      "K10: Multimedikation",
    ]);
  });

  it("disabled assessment bleibt als leerer Eintrag erhalten", () => {
    const k12Disabled = {
      ...makeStandard({
        id: "K12",
        block_id: "pflegebeobachtung",
        status: "TO_DO",
        category: CheckpointCategory.O,
      }),
      mode: CheckpointMode.ASSESSMENT,
      enabled: false,
    } as ActiveCheckpoint;

    const cps: ActiveCheckpoint[] = [
      makeStandard({ id: "K01", block_id: "kommunikation", status: "OK" }),
      k12Disabled,
    ];
    const result = deriveM5OutputCondensed(cps);
    expect(result.map((r) => r.text)).toEqual([
      "Vollständig geklärt:",
      "- K01",
      "",
    ]);
  });
});
