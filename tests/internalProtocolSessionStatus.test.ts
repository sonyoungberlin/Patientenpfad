/**
 * Tests für deriveInternalProtocolSessionStatus und internalProtocolSessionStatusLabel
 */

import {
  deriveInternalProtocolSessionStatus,
  internalProtocolSessionStatusLabel,
} from "@/lib/workflow/internalProtocol/sessionStatus";
import {
  buildInitialInternalProtocolWorkflowSnapshot,
  buildTargetStateSnapshotFromCurrent,
} from "@/lib/workflow/internalProtocol/workflowAdapter";
import { setCheckpointJudgement } from "@/lib/workflow/internalProtocol/workflowSnapshotUpdater";

function makeAllJudged(snapshot: ReturnType<typeof buildInitialInternalProtocolWorkflowSnapshot>) {
  return snapshot.checkpoints.reduce(
    (s, cp) => setCheckpointJudgement(s, cp.id, "SUFFICIENTLY_CLARIFIED"),
    snapshot,
  );
}

describe("deriveInternalProtocolSessionStatus", () => {
  it("CURRENT_STATE ohne Urteile → CURRENT_STATE_IN_PROGRESS", () => {
    const snapshot = buildInitialInternalProtocolWorkflowSnapshot("CURRENT_STATE");
    expect(deriveInternalProtocolSessionStatus(snapshot)).toBe("CURRENT_STATE_IN_PROGRESS");
  });

  it("CURRENT_STATE mit allen Urteilen → CURRENT_STATE_COMPLETED", () => {
    const snapshot = makeAllJudged(buildInitialInternalProtocolWorkflowSnapshot("CURRENT_STATE"));
    expect(deriveInternalProtocolSessionStatus(snapshot)).toBe("CURRENT_STATE_COMPLETED");
  });

  it("TARGET_STATE ohne Urteile → TARGET_STATE_IN_PROGRESS", () => {
    const base = buildInitialInternalProtocolWorkflowSnapshot("CURRENT_STATE");
    const target = buildTargetStateSnapshotFromCurrent(base, "src-1");
    expect(deriveInternalProtocolSessionStatus(target)).toBe("TARGET_STATE_IN_PROGRESS");
  });

  it("TARGET_STATE mit allen Urteilen → TARGET_STATE_COMPLETED", () => {
    const base = buildInitialInternalProtocolWorkflowSnapshot("CURRENT_STATE");
    const target = buildTargetStateSnapshotFromCurrent(base, "src-1");
    const judged = makeAllJudged(target);
    expect(deriveInternalProtocolSessionStatus(judged)).toBe("TARGET_STATE_COMPLETED");
  });

  it("Snapshot ohne processMode gilt als CURRENT_STATE", () => {
    // buildInitialInternalProtocolWorkflowSnapshot ohne Argument → kein processMode
    const snapshot = buildInitialInternalProtocolWorkflowSnapshot();
    // Ohne Urteile → IN_PROGRESS
    expect(deriveInternalProtocolSessionStatus(snapshot)).toBe("CURRENT_STATE_IN_PROGRESS");
  });

  it("Teilweise beurteilte Checkpoints → noch IN_PROGRESS", () => {
    const snapshot = buildInitialInternalProtocolWorkflowSnapshot("CURRENT_STATE");
    // Nur ersten Checkpoint beurteilen
    const partial = setCheckpointJudgement(snapshot, snapshot.checkpoints[0].id, "SUFFICIENTLY_CLARIFIED");
    expect(deriveInternalProtocolSessionStatus(partial)).toBe("CURRENT_STATE_IN_PROGRESS");
  });
});

describe("internalProtocolSessionStatusLabel", () => {
  it("CURRENT_STATE_IN_PROGRESS enthält 'Bestandsaufnahme' und 'Bearbeitung'", () => {
    const label = internalProtocolSessionStatusLabel("CURRENT_STATE_IN_PROGRESS");
    expect(label).toContain("Bestandsaufnahme");
    expect(label).toContain("Bearbeitung");
  });

  it("CURRENT_STATE_COMPLETED enthält 'Bestandsaufnahme' und 'abgeschlossen'", () => {
    const label = internalProtocolSessionStatusLabel("CURRENT_STATE_COMPLETED");
    expect(label).toContain("Bestandsaufnahme");
    expect(label).toContain("abgeschlossen");
  });

  it("TARGET_STATE_IN_PROGRESS enthält 'Zielprozess' und 'Bearbeitung'", () => {
    const label = internalProtocolSessionStatusLabel("TARGET_STATE_IN_PROGRESS");
    expect(label).toContain("Zielprozess");
    expect(label).toContain("Bearbeitung");
  });

  it("TARGET_STATE_COMPLETED enthält 'Zielprozess' und 'abgeschlossen'", () => {
    const label = internalProtocolSessionStatusLabel("TARGET_STATE_COMPLETED");
    expect(label).toContain("Zielprozess");
    expect(label).toContain("abgeschlossen");
  });
});

