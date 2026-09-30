const definitionModel = {
  findUnique: jest.fn(),
  findMany: jest.fn(),
  upsert: jest.fn(),
};

jest.mock("@/lib/prisma", () => ({ prisma: { practiceCheckpointDefinition: definitionModel } }));
jest.mock("@/lib/practiceProcesses/checkpointLibrary", () => ({
  getCheckpointFromLib: jest.fn(async (id: string) => id === "cp-1"
    ? { id, title: "Checkpoint", orientationAnchors: [{ id: "anchor-1", text: "Anker" }] }
    : undefined),
}));

import {
  normalizeSelectedAnchorIds,
  parsePracticeDefinitionInput,
} from "@/lib/practiceProcesses/practiceDefinition";
import {
  assertDefinitionsComplete,
  upsertPracticeCheckpointDefinition,
} from "@/lib/practiceProcesses/practiceDefinitionService";

describe("Current PracticeCheckpointDefinition", () => {
  beforeEach(() => jest.clearAllMocks());

  it("akzeptiert eine leere Anchor-Auswahl, aber keine leere Implementation", () => {
    expect(parsePracticeDefinitionInput({ selectedAnchorIds: [], implementation: "  " })).toBeNull();
    expect(parsePracticeDefinitionInput({ selectedAnchorIds: [], implementation: " Standard " })).toEqual({
      selectedAnchorIds: [],
      implementation: "Standard",
    });
  });

  it("weist doppelte und ungueltige Anchor-IDs zurueck", () => {
    expect(normalizeSelectedAnchorIds(["anchor-1", "anchor-1"])).toBeNull();
    expect(normalizeSelectedAnchorIds(["anchor-foreign"])).toEqual(["anchor-foreign"]);
  });

  it("upsertet denselben Praxis-/Checkpoint-Datensatz", async () => {
    definitionModel.upsert.mockResolvedValue({
      id: "definition-1",
      practice_id: "practice-1",
      checkpoint_id: "cp-1",
      selected_anchor_ids: [],
      implementation: "Standard",
      updated_at: new Date("2026-09-29T12:00:00Z"),
    });
    await upsertPracticeCheckpointDefinition({
      practiceId: "practice-1",
      checkpointId: "cp-1",
      selectedAnchorIds: [],
      implementation: " Standard ",
    });
    expect(definitionModel.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { practice_id_checkpoint_id: { practice_id: "practice-1", checkpoint_id: "cp-1" } },
      update: expect.objectContaining({ implementation: "Standard" }),
    }));
  });

  it("weist fremde Anchor-IDs und fehlende Definitionen beim Publish-Check zurueck", async () => {
    await expect(upsertPracticeCheckpointDefinition({
      practiceId: "practice-1",
      checkpointId: "cp-1",
      selectedAnchorIds: ["foreign"],
      implementation: "Standard",
    })).rejects.toMatchObject({ statusCode: 422 });

    definitionModel.findMany.mockResolvedValue([]);
    await expect(assertDefinitionsComplete({ practiceId: "practice-1", checkpointIds: ["cp-1"] }))
      .rejects.toMatchObject({ statusCode: 422 });
  });
});
