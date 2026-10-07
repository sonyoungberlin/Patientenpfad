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
  resolveDefinitionsForPublish,
  upsertPracticeCheckpointDefinition,
} from "@/lib/practiceProcesses/practiceDefinitionService";

describe("Current PracticeCheckpointDefinition", () => {
  beforeEach(() => jest.clearAllMocks());

  it("akzeptiert Anchor-only und Text-only, aber keine leere Definition", () => {
    expect(parsePracticeDefinitionInput({ selectedAnchorIds: [], implementation: "  " })).toBeNull();
    expect(parsePracticeDefinitionInput({ selectedAnchorIds: ["anchor-1"], implementation: "  " })).toEqual({
      selectedAnchorIds: ["anchor-1"],
      implementation: "",
    });
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

  it("upsertet eine Anchor-only-Definition mit leerer Umsetzung", async () => {
    definitionModel.upsert.mockResolvedValue({
      id: "definition-1",
      practice_id: "practice-1",
      checkpoint_id: "cp-1",
      selected_anchor_ids: ["anchor-1"],
      implementation: "",
      updated_at: new Date("2026-09-30T12:00:00Z"),
    });

    await upsertPracticeCheckpointDefinition({
      practiceId: "practice-1",
      checkpointId: "cp-1",
      selectedAnchorIds: ["anchor-1"],
      implementation: "",
    });

    expect(definitionModel.upsert).toHaveBeenCalledTimes(1);
  });

  it("weist eine vollständig leere Definition fachlich verständlich zurück", async () => {
    await expect(upsertPracticeCheckpointDefinition({
      practiceId: "practice-1",
      checkpointId: "cp-1",
      selectedAnchorIds: [],
      implementation: "",
    })).rejects.toMatchObject({
      statusCode: 422,
      message: "Bitte mindestens ein Kriterium auswählen oder eine zusätzliche Umsetzung beschreiben.",
    });
    expect(definitionModel.upsert).not.toHaveBeenCalled();
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

  it("blockiert Publish mit stale Anchor-IDs und erlaubt es nach bewusster Korrektur", async () => {
    const definition = {
      id: "definition-1",
      practice_id: "practice-1",
      checkpoint_id: "cp-1",
      selected_anchor_ids: ["anchor-2"],
      implementation: "Standard",
      updated_at: new Date("2026-10-01T12:00:00Z"),
    };
    definitionModel.findMany.mockResolvedValue([definition]);

    await expect(resolveDefinitionsForPublish({
      practiceId: "practice-1",
      checkpoints: [{ checkpointId: "cp-1" }],
    })).rejects.toMatchObject({ statusCode: 422 });

    definitionModel.findMany.mockResolvedValue([{
      ...definition,
      selected_anchor_ids: ["anchor-1"],
    }]);
    await expect(resolveDefinitionsForPublish({
      practiceId: "practice-1",
      checkpoints: [{ checkpointId: "cp-1" }],
    })).resolves.toMatchObject([{
      checkpointId: "cp-1",
      checkpointAnchors: [{ id: "anchor-1", text: "Anker" }],
      selectedAnchorIds: ["anchor-1"],
    }]);
  });
});
