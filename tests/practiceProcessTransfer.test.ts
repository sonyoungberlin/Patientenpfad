import {
  buildPracticeProcessTransfer,
  type PracticeProcessTransferV1,
} from "../lib/practiceProcesses/processTransfer";
import type {
  PracticeWorkflowSnapshot,
  PracticeWorkflowCheckpointState,
} from "../lib/practiceProcesses/workflowSnapshot";

function makeCheckpoint(
  overrides: Partial<PracticeWorkflowCheckpointState> & { checkpointId: string },
): PracticeWorkflowCheckpointState {
  return {
    checkpointId: overrides.checkpointId,
    checkpointTitle: overrides.checkpointTitle ?? "Titel",
    selectedAnchorIds: overrides.selectedAnchorIds ?? [],
    decision: overrides.decision,
    umsetzung: overrides.umsetzung,
  };
}

function makeSnapshot(
  overrides: Partial<PracticeWorkflowSnapshot>,
): PracticeWorkflowSnapshot {
  return {
    processKind: "practice-workflow",
    caseProfileId: "profil-a",
    caseProfileTitle: "Profil A",
    checkpoints: overrides.checkpoints ?? [
      makeCheckpoint({ checkpointId: "cp-1", decision: "PFLICHT" }),
    ],
    completedAt: overrides.completedAt,
  };
}

describe("buildPracticeProcessTransfer", () => {
  it("T1: vollständiger Snapshot erzeugt valides Transfer-Objekt", () => {
    const snapshot = makeSnapshot({
      completedAt: "2026-08-15T10:00:00.000Z",
      checkpoints: [
        makeCheckpoint({ checkpointId: "cp-1", decision: "PFLICHT", umsetzung: "So machen wir das" }),
        makeCheckpoint({ checkpointId: "cp-2", decision: "OPTIONAL" }),
        makeCheckpoint({ checkpointId: "cp-3", decision: "NICHT_RELEVANT" }),
      ],
    });
    const result = buildPracticeProcessTransfer(snapshot);
    expect(result).not.toBeNull();
    const transfer = result as PracticeProcessTransferV1;
    expect(transfer.caseProfileId).toBe("profil-a");
    expect(transfer.caseProfileTitle).toBe("Profil A");
    expect(transfer.completedAt).toBe("2026-08-15T10:00:00.000Z");
    expect(transfer.checkpoints).toHaveLength(3);
  });

  it("T2: fehlendes completedAt (undefined) ergibt null", () => {
    const snapshot = makeSnapshot({ completedAt: undefined });
    expect(buildPracticeProcessTransfer(snapshot)).toBeNull();
  });

  it("T3: completedAt als leerer String ergibt null", () => {
    const snapshot = makeSnapshot({ completedAt: "" });
    expect(buildPracticeProcessTransfer(snapshot)).toBeNull();
  });

  it("T4: ein Checkpoint ohne decision ergibt null", () => {
    const snapshot = makeSnapshot({
      completedAt: "2026-08-15T10:00:00.000Z",
      checkpoints: [
        makeCheckpoint({ checkpointId: "cp-1", decision: "PFLICHT" }),
        makeCheckpoint({ checkpointId: "cp-2" }), // keine decision
      ],
    });
    expect(buildPracticeProcessTransfer(snapshot)).toBeNull();
  });

  it("T5: selectedAnchorIds sind im Transfer enthalten", () => {
    const snapshot = makeSnapshot({
      completedAt: "2026-08-15T10:00:00.000Z",
      checkpoints: [
        makeCheckpoint({
          checkpointId: "cp-1",
          decision: "PFLICHT",
          selectedAnchorIds: ["anker-1"],
        }),
      ],
    });
    const result = buildPracticeProcessTransfer(snapshot)!;
    expect(result.checkpoints[0]).toHaveProperty("selectedAnchorIds");
    expect(result.checkpoints[0].selectedAnchorIds).toEqual(["anker-1"]);
  });

  it("T6: NICHT_RELEVANT-Checkpoints sind im Transfer enthalten", () => {
    const snapshot = makeSnapshot({
      completedAt: "2026-08-15T10:00:00.000Z",
      checkpoints: [
        makeCheckpoint({ checkpointId: "cp-1", decision: "NICHT_RELEVANT" }),
      ],
    });
    const result = buildPracticeProcessTransfer(snapshot)!;
    expect(result.checkpoints[0].decision).toBe("NICHT_RELEVANT");
  });

  it("T7: order ist 1-basiert und folgt der Snapshot-Reihenfolge", () => {
    const snapshot = makeSnapshot({
      completedAt: "2026-08-15T10:00:00.000Z",
      checkpoints: [
        makeCheckpoint({ checkpointId: "cp-a", decision: "PFLICHT" }),
        makeCheckpoint({ checkpointId: "cp-b", decision: "OPTIONAL" }),
        makeCheckpoint({ checkpointId: "cp-c", decision: "NICHT_RELEVANT" }),
      ],
    });
    const result = buildPracticeProcessTransfer(snapshot)!;
    expect(result.checkpoints.map((cp) => cp.order)).toEqual([1, 2, 3]);
  });

  it("T8: schemaVersion ist 1", () => {
    const snapshot = makeSnapshot({ completedAt: "2026-08-15T10:00:00.000Z" });
    const result = buildPracticeProcessTransfer(snapshot)!;
    expect(result.schemaVersion).toBe(1);
  });

  it("T9: documentType ist 'practice-process'", () => {
    const snapshot = makeSnapshot({ completedAt: "2026-08-15T10:00:00.000Z" });
    const result = buildPracticeProcessTransfer(snapshot)!;
    expect(result.documentType).toBe("practice-process");
  });
});
