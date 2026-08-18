import {
  buildInitialPracticeWorkflowSnapshot,
} from "../lib/practiceProcesses/workflowSnapshot";
import type {
  PracticeWorkflowSnapshot,
  PracticeWorkflowCheckpointState,
} from "../lib/practiceProcesses/workflowSnapshot";
import {
  toggleAnchorSelection,
  setUmsetzung,
} from "../lib/workflow/internalProtocol/workflowSnapshotUpdater";
import { buildPracticeProcessTransfer } from "../lib/practiceProcesses/processTransfer";
import { buildM4Text } from "../lib/practiceProcesses/buildM4Text";
import type { PracticeCaseProfile, PracticeCheckpoint } from "../lib/practiceProcesses/types";

// ---------------------------------------------------------------------------
// Test-Fixtures (synthetisch, unabhängig vom echten Katalog)
// ---------------------------------------------------------------------------

const MOCK_CHECKPOINT: PracticeCheckpoint = {
  id: "cp-test",
  title: "Test Checkpoint",
  orientationAnchors: [
    { id: "cp-test-a1", text: "Frage 1" },
    { id: "cp-test-a2", text: "Frage 2" },
  ],
};

const MOCK_PROFILE: PracticeCaseProfile = {
  id: "profil-test",
  title: "Test Profil",
  checkpointRefs: [{ checkpointId: "cp-test" }],
};

function makeCheckpoint(
  overrides: Partial<PracticeWorkflowCheckpointState> & { checkpointId: string },
): PracticeWorkflowCheckpointState {
  return {
    checkpointId: overrides.checkpointId,
    checkpointTitle: overrides.checkpointTitle ?? "Test Checkpoint",
    selectedAnchorIds: overrides.selectedAnchorIds ?? [],
    decision: overrides.decision,
    umsetzung: overrides.umsetzung,
  };
}

function makeSnapshot(
  overrides?: Partial<PracticeWorkflowSnapshot>,
): PracticeWorkflowSnapshot {
  return {
    processKind: "practice-workflow",
    caseProfileId: "profil-test",
    caseProfileTitle: "Test Profil",
    checkpoints: overrides?.checkpoints ?? [
      makeCheckpoint({ checkpointId: "cp-test", decision: "PFLICHT" }),
    ],
    completedAt: overrides?.completedAt,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Anchor-Auswahl: buildInitialPracticeWorkflowSnapshot", () => {
  it("T1: neue Session startet mit selectedAnchorIds: []", () => {
    const snapshot = buildInitialPracticeWorkflowSnapshot(
      MOCK_PROFILE,
      () => MOCK_CHECKPOINT,
    );
    expect(snapshot.checkpoints[0].selectedAnchorIds).toEqual([]);
  });

  it("T11: neuer Snapshot enthält kein orientationAnswers-Feld", () => {
    const snapshot = buildInitialPracticeWorkflowSnapshot(
      MOCK_PROFILE,
      () => MOCK_CHECKPOINT,
    );
    expect(snapshot.checkpoints[0]).not.toHaveProperty("orientationAnswers");
  });
});

describe("Anchor-Auswahl: toggleAnchorSelection", () => {
  it("T2: Auswahl fügt Anchor-ID hinzu", () => {
    const snapshot = makeSnapshot({
      checkpoints: [makeCheckpoint({ checkpointId: "cp-test" })],
    });
    const result = toggleAnchorSelection(snapshot, "cp-test", "a1");
    expect(result.checkpoints[0].selectedAnchorIds).toContain("a1");
  });

  it("T3: erneutes Toggle entfernt die ID wieder", () => {
    const snapshot = makeSnapshot({
      checkpoints: [makeCheckpoint({ checkpointId: "cp-test", selectedAnchorIds: ["a1"] })],
    });
    const result = toggleAnchorSelection(snapshot, "cp-test", "a1");
    expect(result.checkpoints[0].selectedAnchorIds).not.toContain("a1");
  });

  it("T4: alte Session ohne selectedAnchorIds kann getoggelt werden", () => {
    // Simuliert einen alten Snapshot aus der DB ohne selectedAnchorIds
    const oldSnapshot = {
      processKind: "practice-workflow" as const,
      caseProfileId: "profil-test",
      caseProfileTitle: "Test Profil",
      checkpoints: [
        {
          checkpointId: "cp-test",
          checkpointTitle: "Patient bekannt",
          // kein selectedAnchorIds – altes Format
        } as PracticeWorkflowCheckpointState,
      ],
    };
    expect(() => toggleAnchorSelection(oldSnapshot, "cp-test", "a1")).not.toThrow();
    const result = toggleAnchorSelection(oldSnapshot, "cp-test", "a1");
    expect(result.checkpoints[0].selectedAnchorIds).toContain("a1");
  });

  it("T5: falsche checkpointId verändert nichts", () => {
    const snapshot = makeSnapshot({
      checkpoints: [makeCheckpoint({ checkpointId: "cp-test", selectedAnchorIds: ["a1"] })],
    });
    const result = toggleAnchorSelection(snapshot, "cp-andere", "a1");
    expect(result).toEqual(snapshot);
  });

  it("T6: mehrere Toggles bauen die Auswahl korrekt auf", () => {
    let snapshot = makeSnapshot({
      checkpoints: [makeCheckpoint({ checkpointId: "cp-test" })],
    });
    snapshot = toggleAnchorSelection(snapshot, "cp-test", "a1");
    snapshot = toggleAnchorSelection(snapshot, "cp-test", "a2");
    expect(snapshot.checkpoints[0].selectedAnchorIds).toEqual(["a1", "a2"]);
  });
});

describe("Anchor-Auswahl: buildM4Text", () => {
  // T7/T8 verwenden den echten Katalog-Checkpoint "patient-bekannt" damit
  // getCheckpoint() die Anchor-Texte auflösen kann.
  it("T7: M4 gibt ausgewählte Anchor-Texte unter 'Zu berücksichtigen' aus", () => {
    const snapshot: PracticeWorkflowSnapshot = {
      processKind: "practice-workflow",
      caseProfileId: "profil-test",
      caseProfileTitle: "Test Profil",
      completedAt: "2026-08-15T10:00:00.000Z",
      checkpoints: [
        {
          checkpointId: "patient-bekannt",
          checkpointTitle: "Patient bekannt",
          decision: "PFLICHT",
          selectedAnchorIds: ["patient-bekannt-a1"],
        },
      ],
    };
    const text = buildM4Text(snapshot);
    expect(text).toContain("Zu berücksichtigen:");
    expect(text).toContain("Patient ist im Praxissystem angelegt");
    expect(text).not.toContain("Name ist erfasst");
  });

  it("T8: M4 erzeugt keinen leeren Zu-berücksichtigen-Block wenn nichts ausgewählt", () => {
    const snapshot: PracticeWorkflowSnapshot = {
      processKind: "practice-workflow",
      caseProfileId: "profil-test",
      caseProfileTitle: "Test Profil",
      completedAt: "2026-08-15T10:00:00.000Z",
      checkpoints: [
        {
          checkpointId: "patient-bekannt",
          checkpointTitle: "Patient bekannt",
          decision: "PFLICHT",
          selectedAnchorIds: [],
        },
      ],
    };
    const text = buildM4Text(snapshot);
    expect(text).not.toContain("Zu berücksichtigen:");
  });
});

describe("Anchor-Auswahl: buildPracticeProcessTransfer", () => {
  it("T9: Transfer enthält die ausgewählten Anchor-IDs", () => {
    const snapshot = makeSnapshot({
      completedAt: "2026-08-15T10:00:00.000Z",
      checkpoints: [
        makeCheckpoint({
          checkpointId: "cp-test",
          decision: "PFLICHT",
          selectedAnchorIds: ["a1", "a2"],
        }),
      ],
    });
    const result = buildPracticeProcessTransfer(snapshot)!;
    expect(result.checkpoints[0].selectedAnchorIds).toEqual(["a1", "a2"]);
  });

  it("T10: Transfer enthält [] bei leerer Auswahl", () => {
    const snapshot = makeSnapshot({
      completedAt: "2026-08-15T10:00:00.000Z",
      checkpoints: [
        makeCheckpoint({ checkpointId: "cp-test", decision: "PFLICHT", selectedAnchorIds: [] }),
      ],
    });
    const result = buildPracticeProcessTransfer(snapshot)!;
    expect(result.checkpoints[0].selectedAnchorIds).toEqual([]);
  });

  it("T10b: Transfer enthält [] auch für alte Sessions ohne selectedAnchorIds", () => {
    const oldSnapshot: PracticeWorkflowSnapshot = {
      processKind: "practice-workflow",
      caseProfileId: "profil-test",
      caseProfileTitle: "Test Profil",
      completedAt: "2026-08-15T10:00:00.000Z",
      checkpoints: [
        {
          checkpointId: "cp-test",
          checkpointTitle: "Patient bekannt",
          decision: "PFLICHT",
        } as PracticeWorkflowCheckpointState,
      ],
    };
    const result = buildPracticeProcessTransfer(oldSnapshot)!;
    expect(result.checkpoints[0].selectedAnchorIds).toEqual([]);
  });
});

describe("setUmsetzung: Freitexteingabe", () => {
  it("speichert Text mit Leerzeichen unverändert", () => {
    const snapshot = makeSnapshot({
      checkpoints: [makeCheckpoint({ checkpointId: "cp-test", decision: "PFLICHT" })],
    });
    const result = setUmsetzung(snapshot, "cp-test",
      "Prüfung im PVS und anschließend Rücksprache mit dem Arzt.");
    expect(result.checkpoints[0].umsetzung).toBe(
      "Prüfung im PVS und anschließend Rücksprache mit dem Arzt.",
    );
  });

  it("speichert Text mit führenden und nachgestellten Leerzeichen unverändert", () => {
    const snapshot = makeSnapshot({
      checkpoints: [makeCheckpoint({ checkpointId: "cp-test", decision: "PFLICHT" })],
    });
    const result = setUmsetzung(snapshot, "cp-test", "  Text mit Einrückung  ");
    expect(result.checkpoints[0].umsetzung).toBe("  Text mit Einrückung  ");
  });

  it("entfernt das Feld bei leerem String", () => {
    const snapshot = makeSnapshot({
      checkpoints: [makeCheckpoint({ checkpointId: "cp-test", decision: "PFLICHT", umsetzung: "vorher" })],
    });
    const result = setUmsetzung(snapshot, "cp-test", "");
    expect(result.checkpoints[0].umsetzung).toBeUndefined();
  });
});
