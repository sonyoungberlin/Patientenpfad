import {
  isPracticeWorkflowDraftSnapshot,
  isPublishedPracticeWorkflowSnapshot,
  type PracticeWorkflowDraftSnapshot,
} from "@/lib/practiceProcesses/workflowSnapshot";
import { setCheckpointDecision } from "@/lib/workflow/internalProtocol/workflowSnapshotUpdater";
import { resolvePracticeWorkflowResumeStep } from "@/lib/practiceProcesses/resume";

const draft: PracticeWorkflowDraftSnapshot = {
  processKind: "practice-workflow",
  snapshotVersion: 2,
  caseProfileId: "profile-1",
  caseProfileTitle: "Profil",
  checkpoints: [{ checkpointId: "cp-1", checkpointTitle: "Checkpoint" }],
};

const definition = {
  checkpointId: "cp-1",
  checkpointTitle: "Checkpoint",
  checkpointAnchors: [],
  selectedAnchorIds: [],
  implementation: "Praxisstandard",
};

describe("Practice workflow v2", () => {
  it("hält zentrale Definitionen aus Draft-Snapshots heraus", () => {
    expect(isPracticeWorkflowDraftSnapshot(draft)).toBe(true);
    expect(isPracticeWorkflowDraftSnapshot({
      ...draft,
      checkpoints: [{ ...draft.checkpoints[0], implementation: "verboten" }],
    })).toBe(false);
  });

  it("erkennt nur vollständige eingefrorene Published-Snapshots", () => {
    expect(isPublishedPracticeWorkflowSnapshot({
      ...draft,
      checkpoints: [{ ...draft.checkpoints[0], definition }],
      completedAt: "2026-09-29T12:00:00.000Z",
    })).toBe(true);
    expect(isPublishedPracticeWorkflowSnapshot({
      ...draft,
      checkpoints: [{ ...draft.checkpoints[0], definition: { ...definition, implementation: " " } }],
      completedAt: "2026-09-29T12:00:00.000Z",
    })).toBe(false);
    expect(isPublishedPracticeWorkflowSnapshot({
      ...draft,
      checkpoints: [{
        ...draft.checkpoints[0],
        definition: {
          ...definition,
          checkpointAnchors: [{ id: "anchor-1", text: "Kriterium" }],
          selectedAnchorIds: ["anchor-1"],
          implementation: "",
        },
      }],
      completedAt: "2026-09-29T12:00:00.000Z",
    })).toBe(true);
  });

  it("validiert die eingefrorene Anchor-Struktur im Published-Snapshot", () => {
    const published = {
      ...draft,
      checkpoints: [{ ...draft.checkpoints[0], definition }],
      completedAt: "2026-09-29T12:00:00.000Z",
    };

    expect(isPublishedPracticeWorkflowSnapshot(published)).toBe(true);
    expect(isPublishedPracticeWorkflowSnapshot({
      ...published,
      checkpoints: [{ ...published.checkpoints[0], definition: { ...definition, checkpointAnchors: [null] } }],
    })).toBe(false);
    expect(isPublishedPracticeWorkflowSnapshot({
      ...published,
      checkpoints: [{ ...published.checkpoints[0], definition: { ...definition, checkpointAnchors: [{ id: "anchor-1" }] } }],
    })).toBe(false);
  });

  it("speichert in M3 nur die Entscheidung", () => {
    const next = setCheckpointDecision(draft, "cp-1", "PFLICHT");
    expect(next.checkpoints[0]).toEqual({ checkpointId: "cp-1", checkpointTitle: "Checkpoint", decision: "PFLICHT" });
  });

  it("resume führt über Definitionen und Entscheidungen zum nächsten Schritt", () => {
    expect(resolvePracticeWorkflowResumeStep(draft, [])).toBe("m2");
    expect(resolvePracticeWorkflowResumeStep(draft, [{
      id: "definition-1", practiceId: "practice-1", checkpointId: "cp-1",
      selectedAnchorIds: [], implementation: "Standard", updatedAt: "2026-09-29T12:00:00.000Z",
    }])).toBe("m3");
    expect(resolvePracticeWorkflowResumeStep(
      { ...draft, checkpoints: [{ ...draft.checkpoints[0], decision: "OPTIONAL" }] },
      [{
        id: "definition-1", practiceId: "practice-1", checkpointId: "cp-1",
        selectedAnchorIds: [], implementation: "Standard", updatedAt: "2026-09-29T12:00:00.000Z",
      }],
    )).toBe("m4");
    expect(resolvePracticeWorkflowResumeStep(draft, [{
      id: "definition-1", practiceId: "practice-1", checkpointId: "cp-1",
      selectedAnchorIds: ["anchor-1"], implementation: "", updatedAt: "2026-09-30T12:00:00.000Z",
    }])).toBe("m3");
  });
});
