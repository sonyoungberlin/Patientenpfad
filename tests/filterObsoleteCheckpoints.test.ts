import { filterObsoleteCheckpoints } from "@/lib/logic/checkpointCatalog";
import {
  CheckpointCategory,
  CheckpointMode,
  CheckpointPerspective,
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

  it("behält K18 (jetzt im Katalog als Attest/Jobcenter-Checkpoint, auch mit altem block_id)", () => {
    // K18 ist nun im Katalog → filterObsoleteCheckpoints filtert nach ID, nicht nach block_id
    const input = [makeStandard("K18", "pflegebeobachtung")];
    const result = filterObsoleteCheckpoints(input);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("K18");
  });

  it("behält neue Reha-Checkpoints K14/K15 (nicht mehr obsolet)", () => {
    const input = [makeStandard("K14"), makeStandard("K15")];
    const result = filterObsoleteCheckpoints(input);
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.id)).toEqual(["K14", "K15"]);
  });

  it("behält neue Pflege-Checkpoints K16/K17 (nicht mehr obsolet)", () => {
    const input = [makeStandard("K16"), makeStandard("K17")];
    const result = filterObsoleteCheckpoints(input);
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.id)).toEqual(["K16", "K17"]);
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

  it("behält neuen Attest/Jobcenter-Checkpoint K18 (nicht mehr obsolet)", () => {
    const input = [makeStandard("K18")];
    const result = filterObsoleteCheckpoints(input);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("K18");
  });

  it("alle aktuellen Katalog-Checkpoints K01–K09, K12–K18 passieren den Filter", () => {
    const knownIds = ["K01", "K02", "K03", "K04", "K05", "K06", "K07", "K08", "K09", "K12", "K13", "K14", "K15", "K16", "K17", "K18"];
    const input: ActiveCheckpoint[] = knownIds.map((id) => makeStandard(id));
    const result = filterObsoleteCheckpoints(input);
    expect(result).toHaveLength(knownIds.length);
  });
});
