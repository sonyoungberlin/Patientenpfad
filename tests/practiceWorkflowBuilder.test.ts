const mockLibraryCheckpointFindUnique = jest.fn();
const mockPracticeCheckpointDefinitionFindMany = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    libraryCheckpoint: {
      findUnique: (...args: unknown[]) => mockLibraryCheckpointFindUnique(...args),
    },
    practiceCheckpointDefinition: {
      findMany: (...args: unknown[]) => mockPracticeCheckpointDefinitionFindMany(...args),
    },
  },
}));

import { resolvePracticeWorkflowBuilderCheckpoints } from "@/lib/practiceProcesses/practiceWorkflowBuilder";
import { getUnresolvedSelectedAnchorIds } from "@/lib/practiceProcesses/practiceDefinition";

function definitionRow(checkpointId: string) {
  return {
    id: `definition-${checkpointId}`,
    practice_id: "practice-current",
    checkpoint_id: checkpointId,
    selected_anchor_ids: ["db-a1"],
    implementation: "Praxisumsetzung",
    updated_at: new Date("2026-10-01T12:00:00.000Z"),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLibraryCheckpointFindUnique.mockResolvedValue(null);
  mockPracticeCheckpointDefinitionFindMany.mockResolvedValue([]);
});

describe("resolvePracticeWorkflowBuilderCheckpoints", () => {
  it("liefert DB-only Checkpoints vollständig und lädt Definitionen nur für Praxis und Workflow-IDs", async () => {
    mockLibraryCheckpointFindUnique.mockResolvedValue({
      id: "db-only",
      title: "DB-only Titel",
      description: "DB-only Beschreibung",
      orientation_hint: "DB-only Orientierung",
      anchors: [
        { id: "db-a1", text: "Erster DB-Anker" },
        { id: "db-a2", text: "Zweiter DB-Anker" },
      ],
    });
    mockPracticeCheckpointDefinitionFindMany.mockResolvedValue([definitionRow("db-only")]);

    const result = await resolvePracticeWorkflowBuilderCheckpoints("practice-current", ["db-only"]);

    expect(result).toEqual([{
      checkpointId: "db-only",
      title: "DB-only Titel",
      description: "DB-only Beschreibung",
      orientationHint: "DB-only Orientierung",
      orientationAnchors: [
        { id: "db-a1", text: "Erster DB-Anker" },
        { id: "db-a2", text: "Zweiter DB-Anker" },
      ],
      definition: {
        selectedAnchorIds: ["db-a1"],
        implementation: "Praxisumsetzung",
      },
    }]);
    expect(mockPracticeCheckpointDefinitionFindMany).toHaveBeenCalledWith({
      where: {
        practice_id: "practice-current",
        checkpoint_id: { in: ["db-only"] },
      },
      orderBy: { checkpoint_id: "asc" },
    });
  });

  it("verwendet bei gleicher DB- und Katalog-ID vollständig die DB-Fassung", async () => {
    mockLibraryCheckpointFindUnique.mockResolvedValue({
      id: "patient-bekannt",
      title: "DB-Titel",
      description: "DB-Beschreibung",
      orientation_hint: "DB-Hinweis",
      anchors: [{ id: "db-anchor", text: "DB-Ankertext" }],
    });

    const [checkpoint] = await resolvePracticeWorkflowBuilderCheckpoints(
      "practice-current",
      ["patient-bekannt"],
    );

    expect(checkpoint).toMatchObject({
      title: "DB-Titel",
      description: "DB-Beschreibung",
      orientationHint: "DB-Hinweis",
      orientationAnchors: [{ id: "db-anchor", text: "DB-Ankertext" }],
    });
    expect(checkpoint.orientationAnchors).not.toContainEqual(
      expect.objectContaining({ id: "patient-bekannt-a1" }),
    );
  });

  it("erkennt nach Library-Entfernung eine weiterhin gespeicherte Auswahl als stale", async () => {
    mockLibraryCheckpointFindUnique.mockResolvedValue({
      id: "patient-bekannt",
      title: "Patient bekannt",
      anchors: [{ id: "patient-bekannt-a1", text: "Aktueller Anker" }],
    });
    mockPracticeCheckpointDefinitionFindMany.mockResolvedValue([{
      ...definitionRow("patient-bekannt"),
      selected_anchor_ids: ["patient-bekannt-a2"],
    }]);

    const [checkpoint] = await resolvePracticeWorkflowBuilderCheckpoints(
      "practice-current",
      ["patient-bekannt"],
    );

    expect(checkpoint.definition?.selectedAnchorIds).toEqual(["patient-bekannt-a2"]);
    expect(checkpoint.orientationAnchors).toEqual([
      { id: "patient-bekannt-a1", text: "Aktueller Anker" },
    ]);
    expect(getUnresolvedSelectedAnchorIds(
      checkpoint.definition!.selectedAnchorIds,
      checkpoint.orientationAnchors,
    )).toEqual(["patient-bekannt-a2"]);
    expect(checkpoint.orientationAnchors).not.toContainEqual(
      expect.objectContaining({ id: "patient-bekannt-a2" }),
    );
  });

  it("fällt ohne DB-Zeile auf den statischen Checkpoint zurück", async () => {
    const [checkpoint] = await resolvePracticeWorkflowBuilderCheckpoints(
      "practice-current",
      ["patient-bekannt"],
    );

    expect(checkpoint.title).toBe("Patient bekannt");
    expect(checkpoint.orientationAnchors[0]).toEqual({
      id: "patient-bekannt-a1",
      text: "Patient ist im Praxissystem angelegt",
    });
    expect(mockLibraryCheckpointFindUnique).toHaveBeenCalledWith({
      where: { id: "patient-bekannt" },
    });
  });

  it("fragt Definitionen für genau die deduplizierten Checkpoint-IDs des Workflows ab", async () => {
    await resolvePracticeWorkflowBuilderCheckpoints(
      "practice-current",
      ["patient-bekannt", "patient-bekannt"],
    );

    expect(mockPracticeCheckpointDefinitionFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        practice_id: "practice-current",
        checkpoint_id: { in: ["patient-bekannt"] },
      },
    }));
    expect(mockLibraryCheckpointFindUnique).toHaveBeenCalledTimes(1);
  });

  it("meldet eine Checkpoint-ID ohne DB- oder statische Definition als Fehler", async () => {
    await expect(
      resolvePracticeWorkflowBuilderCheckpoints("practice-current", ["missing"]),
    ).rejects.toThrow("Checkpoint-Vorlage nicht gefunden: missing");
  });
});
