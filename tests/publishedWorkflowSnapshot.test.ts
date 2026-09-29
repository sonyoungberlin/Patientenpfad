import {
  isPublishedPracticeWorkflowSnapshot,
  type PublishedPracticeWorkflowSnapshot,
} from "@/lib/practiceProcesses/workflowSnapshot";

function makeSnapshot(
  selectedAnchorIds: string[],
  checkpointAnchors = [{ id: "anchor-1", text: "Erste Orientierung" }],
): PublishedPracticeWorkflowSnapshot {
  return {
    processKind: "practice-workflow",
    snapshotVersion: 2,
    caseProfileId: "profile-1",
    caseProfileTitle: "Testfall",
    completedAt: "2026-09-29T10:00:00.000Z",
    checkpoints: [
      {
        checkpointId: "patient-bekannt",
        checkpointTitle: "Patient bekannt",
        selectedAnchorIds: [],
        decision: "PFLICHT",
        definition: {
          checkpointAnchors,
          selectedAnchorIds,
        },
      },
    ],
  };
}

describe("isPublishedPracticeWorkflowSnapshot", () => {
  it("akzeptiert konsistente eingefrorene Definitionen", () => {
    expect(isPublishedPracticeWorkflowSnapshot(makeSnapshot(["anchor-1"]))).toBe(true);
  });

  it("verwirft unbekannte ausgewählte Anchor-IDs", () => {
    expect(isPublishedPracticeWorkflowSnapshot(makeSnapshot(["anchor-unknown"]))).toBe(false);
  });

  it("verwirft doppelte Anchor-IDs im eingefrorenen Anchor-Katalog", () => {
    expect(
      isPublishedPracticeWorkflowSnapshot(
        makeSnapshot([], [
          { id: "anchor-1", text: "Erste Orientierung" },
          { id: "anchor-1", text: "Doppelte Orientierung" },
        ]),
      ),
    ).toBe(false);
  });
});
