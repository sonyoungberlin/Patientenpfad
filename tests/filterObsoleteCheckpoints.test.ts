import { filterObsoleteCheckpoints } from "@/lib/logic/checkpointCatalog";
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

function makeStandard(id: string, block_id = "some_block"): StandardCheckpoint {
  return {
    id,
    block_id,
    type: CheckpointType.BEDARF,
    category: CheckpointCategory.O,
    perspectives: [CheckpointPerspective.MFA, CheckpointPerspective.PATIENT],
    relevance: CheckpointRelevance.P,
    title: `Checkpoint ${id}`,
    status: "TO_DO",
    m4: { type: "NOTICE", text: "test" },
  };
}

function makeMultiSelect(id: string): ActiveCheckpointMultiSelect {
  return {
    id,
    block_id: "some_block",
    type: CheckpointType.BEDARF,
    category: CheckpointCategory.O,
    perspectives: [],
    relevance: CheckpointRelevance.A,
    mode: CheckpointMode.MULTI_SELECT,
    title: `MultiSelect ${id}`,
    options: ["A"],
    selections: [],
    enabled: false,
  };
}

describe("filterObsoleteCheckpoints", () => {
  it("behält bekannte Standard-Checkpoints (K01, K12)", () => {
    const input: ActiveCheckpoint[] = [makeStandard("K01"), makeStandard("K12")];
    const result = filterObsoleteCheckpoints(input);
    expect(result.map((c) => c.id)).toEqual(["K01", "K12"]);
  });

  it("entfernt veraltete pflegebeobachtung-Checkpoints K13–K18", () => {
    const obsolete = ["K13", "K14", "K15", "K16", "K17", "K18"].map((id) =>
      makeStandard(id, "pflegebeobachtung"),
    );
    const valid = makeStandard("K12", "pflegebeobachtung");
    const input: ActiveCheckpoint[] = [valid, ...obsolete];
    const result = filterObsoleteCheckpoints(input);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("K12");
  });

  it("behält MULTI_SELECT-Checkpoints K10 und K11", () => {
    const input: ActiveCheckpoint[] = [makeMultiSelect("K10"), makeMultiSelect("K11")];
    const result = filterObsoleteCheckpoints(input);
    expect(result.map((c) => c.id)).toEqual(["K10", "K11"]);
  });

  it("gibt leere Liste zurück bei leerer Eingabe", () => {
    expect(filterObsoleteCheckpoints([])).toEqual([]);
  });

  it("entfernt vollständig unbekannte IDs", () => {
    const input: ActiveCheckpoint[] = [makeStandard("UNKNOWN_99"), makeStandard("K03")];
    const result = filterObsoleteCheckpoints(input);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("K03");
  });

  it("alle aktuellen Katalog-Checkpoints K01–K09, K12 passieren den Filter", () => {
    const knownIds = ["K01", "K02", "K03", "K04", "K05", "K06", "K07", "K08", "K09", "K12"];
    const input: ActiveCheckpoint[] = knownIds.map((id) => makeStandard(id));
    const result = filterObsoleteCheckpoints(input);
    expect(result).toHaveLength(knownIds.length);
  });
});
