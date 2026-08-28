import {
  updateSnapshotAnswer,
  setCheckpointJudgement,
} from "@/lib/workflow/internalProtocol/workflowSnapshotUpdater";
import {
  buildInitialInternalProtocolWorkflowSnapshot,
} from "@/lib/workflow/internalProtocol/workflowAdapter";
import type { InternalProtocolWorkflowSnapshot } from "@/lib/workflow/internalProtocol/workflowAdapter";

// Snapshot mit einer gesetzten Antwort und einem Urteil als Ausgangszustand
function makeSnapshot(overrides?: Partial<InternalProtocolWorkflowSnapshot>): InternalProtocolWorkflowSnapshot {
  const base = buildInitialInternalProtocolWorkflowSnapshot("CURRENT_STATE");
  return { ...base, ...overrides };
}

// ---------------------------------------------------------------------------
// updateSnapshotAnswer
// ---------------------------------------------------------------------------

describe("updateSnapshotAnswer – Antwort aktualisieren", () => {
  it("setzt die Antwort im richtigen Checkpoint", () => {
    const snap = makeSnapshot();
    const updated = updateSnapshotAnswer(snap, "POT-Q-C01-01", ["POT-Q-C01-01-A"]);
    const cp = updated.checkpoints.find((c) => c.id === "PC-C01")!;
    expect(cp.answers["POT-Q-C01-01"]).toEqual(["POT-Q-C01-01-A"]);
  });

  it("überschreibt eine bestehende Antwort", () => {
    let snap = makeSnapshot();
    snap = updateSnapshotAnswer(snap, "POT-Q-C01-02", "YES");
    const updated = updateSnapshotAnswer(snap, "POT-Q-C01-02", "NO");
    const cp = updated.checkpoints.find((c) => c.id === "PC-C01")!;
    expect(cp.answers["POT-Q-C01-02"]).toBe("NO");
  });

  it("akzeptiert null als Antwort (Zurücksetzen)", () => {
    let snap = makeSnapshot();
    snap = updateSnapshotAnswer(snap, "POT-Q-C01-02", "YES");
    const updated = updateSnapshotAnswer(snap, "POT-Q-C01-02", null);
    const cp = updated.checkpoints.find((c) => c.id === "PC-C01")!;
    expect(cp.answers["POT-Q-C01-02"]).toBeNull();
  });

  it("akzeptiert MULTI_SELECT-Arrays", () => {
    const snap = makeSnapshot();
    const updated = updateSnapshotAnswer(snap, "POT-Q-C03-01", ["POT-Q-C03-01-A", "POT-Q-C03-01-B"]);
    const cp = updated.checkpoints.find((c) => c.id === "PC-C03")!;
    expect(cp.answers["POT-Q-C03-01"]).toEqual(["POT-Q-C03-01-A", "POT-Q-C03-01-B"]);
  });
});

describe("updateSnapshotAnswer – M3-Urteil zurücksetzen", () => {
  it("löscht das Urteil des betroffenen Checkpoints", () => {
    const snap = makeSnapshot();
    // Urteil setzen
    const withJudgement = setCheckpointJudgement(snap, "PC-C01", "SUFFICIENTLY_CLARIFIED");
    expect(withJudgement.checkpoints.find((c) => c.id === "PC-C01")!.clarificationJudgement)
      .toBe("SUFFICIENTLY_CLARIFIED");

    // Antwort ändern → Urteil muss weg sein
    const updated = updateSnapshotAnswer(withJudgement, "POT-Q-C01-02", "YES");
    const cp = updated.checkpoints.find((c) => c.id === "PC-C01")!;
    expect(cp.clarificationJudgement).toBeUndefined();
  });

  it("lässt Urteile anderer Checkpoints unberührt", () => {
    const snap = makeSnapshot();
    const withJudgements =
      setCheckpointJudgement(
        setCheckpointJudgement(snap, "PC-C01", "SUFFICIENTLY_CLARIFIED"),
        "PC-C02",
        "OPEN",
      );

    // Antwort in PC-C01 ändern
    const updated = updateSnapshotAnswer(withJudgements, "POT-Q-C01-02", "NO");

    // PC-C01-Urteil ist weg
    expect(updated.checkpoints.find((c) => c.id === "PC-C01")!.clarificationJudgement)
      .toBeUndefined();
    // PC-C02-Urteil bleibt
    expect(updated.checkpoints.find((c) => c.id === "PC-C02")!.clarificationJudgement)
      .toBe("OPEN");
  });

  it("lässt Antworten anderer Checkpoints unberührt", () => {
    const snap = makeSnapshot();
    const withAnswer = updateSnapshotAnswer(snap, "POT-Q-C02-01", "POT-Q-C02-01-A");
    const updated = updateSnapshotAnswer(withAnswer, "POT-Q-C01-02", "YES");
    const cp02 = updated.checkpoints.find((c) => c.id === "PC-C02")!;
    expect(cp02.answers["POT-Q-C02-01"]).toBe("POT-Q-C02-01-A");
  });
});

describe("updateSnapshotAnswer – inheritedQuestionIds", () => {
  it("entfernt die questionId aus inheritedQuestionIds", () => {
    const snap: InternalProtocolWorkflowSnapshot = {
      ...makeSnapshot(),
      inheritedQuestionIds: ["POT-Q-C01-01", "POT-Q-C01-02"],
    };
    const updated = updateSnapshotAnswer(snap, "POT-Q-C01-01", "YES");
    expect(updated.inheritedQuestionIds).toEqual(["POT-Q-C01-02"]);
  });

  it("lässt inheritedQuestionIds unverändert, wenn questionId nicht enthalten ist", () => {
    const snap: InternalProtocolWorkflowSnapshot = {
      ...makeSnapshot(),
      inheritedQuestionIds: ["POT-Q-C01-02"],
    };
    const updated = updateSnapshotAnswer(snap, "POT-Q-C01-01", "YES");
    expect(updated.inheritedQuestionIds).toEqual(["POT-Q-C01-02"]);
  });

  it("belässt inheritedQuestionIds als undefined, wenn es nicht gesetzt war", () => {
    const snap = makeSnapshot();
    expect(snap.inheritedQuestionIds).toBeUndefined();
    const updated = updateSnapshotAnswer(snap, "POT-Q-C01-01", "YES");
    expect(updated.inheritedQuestionIds).toBeUndefined();
  });
});

describe("updateSnapshotAnswer – Immutabilität", () => {
  it("gibt ein neues Snapshot-Objekt zurück", () => {
    const snap = makeSnapshot();
    const updated = updateSnapshotAnswer(snap, "POT-Q-C01-02", "YES");
    expect(updated).not.toBe(snap);
  });

  it("gibt ein neues Checkpoints-Array zurück", () => {
    const snap = makeSnapshot();
    const updated = updateSnapshotAnswer(snap, "POT-Q-C01-02", "YES");
    expect(updated.checkpoints).not.toBe(snap.checkpoints);
  });

  it("verändert den ursprünglichen Snapshot nicht", () => {
    const snap = makeSnapshot();
    const originalAnswer = snap.checkpoints[0].answers["POT-Q-C01-02"];
    updateSnapshotAnswer(snap, "POT-Q-C01-02", "YES");
    expect(snap.checkpoints[0].answers["POT-Q-C01-02"]).toBe(originalAnswer);
  });
});

// ---------------------------------------------------------------------------
// setCheckpointJudgement
// ---------------------------------------------------------------------------

describe("setCheckpointJudgement – Urteil setzen", () => {
  it("setzt das Urteil am richtigen Checkpoint", () => {
    const snap = makeSnapshot();
    const updated = setCheckpointJudgement(snap, "PC-C03", "NOT_RELEVANT");
    const cp = updated.checkpoints.find((c) => c.id === "PC-C03")!;
    expect(cp.clarificationJudgement).toBe("NOT_RELEVANT");
  });

  it("überschreibt ein bestehendes Urteil", () => {
    const snap = makeSnapshot();
    const withFirst = setCheckpointJudgement(snap, "PC-C03", "OPEN");
    const updated = setCheckpointJudgement(withFirst, "PC-C03", "SUFFICIENTLY_CLARIFIED");
    const cp = updated.checkpoints.find((c) => c.id === "PC-C03")!;
    expect(cp.clarificationJudgement).toBe("SUFFICIENTLY_CLARIFIED");
  });

  it("lässt Urteile anderer Checkpoints unberührt", () => {
    const snap = makeSnapshot();
    const withFirst = setCheckpointJudgement(snap, "PC-C01", "OPEN");
    const updated = setCheckpointJudgement(withFirst, "PC-C03", "NOT_RELEVANT");
    expect(updated.checkpoints.find((c) => c.id === "PC-C01")!.clarificationJudgement).toBe("OPEN");
    expect(updated.checkpoints.find((c) => c.id === "PC-C03")!.clarificationJudgement).toBe("NOT_RELEVANT");
  });

  it("berührt keine Antworten", () => {
    const snap = makeSnapshot();
    const withAnswer = updateSnapshotAnswer(snap, "POT-Q-C01-02", "YES");
    const updated = setCheckpointJudgement(withAnswer, "PC-C01", "OPEN");
    expect(updated.checkpoints.find((c) => c.id === "PC-C01")!.answers["POT-Q-C01-02"]).toBe("YES");
  });
});

describe("setCheckpointJudgement – Immutabilität", () => {
  it("gibt ein neues Snapshot-Objekt zurück", () => {
    const snap = makeSnapshot();
    const updated = setCheckpointJudgement(snap, "PC-C01", "OPEN");
    expect(updated).not.toBe(snap);
  });

  it("verändert den ursprünglichen Snapshot nicht", () => {
    const snap = makeSnapshot();
    expect(snap.checkpoints[0].clarificationJudgement).toBeUndefined();
    setCheckpointJudgement(snap, "PC-C01", "OPEN");
    expect(snap.checkpoints[0].clarificationJudgement).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Neue Tests: automatische Checkpoint-Erkennung, Idempotenz, unbekannte IDs
// ---------------------------------------------------------------------------

describe("updateSnapshotAnswer – automatische Checkpoint-Erkennung", () => {
  it.each([
    ["POT-Q-C01-01", "PC-C01"],
    ["POT-Q-C01-02", "PC-C01"],
    ["POT-Q-C01-03", "PC-C01"],
    ["POT-Q-C02-01", "PC-C02"],
    ["POT-Q-C02-02", "PC-C02"],
    ["POT-Q-C02-03", "PC-C02"],
    ["POT-Q-C02-04", "PC-C02"],
    ["POT-Q-C03-01", "PC-C03"],
    ["POT-Q-C03-02", "PC-C03"],
    ["POT-Q-C03-03", "PC-C03"],
    ["POT-Q-C04-01", "PC-C04"],
    ["POT-Q-C04-02", "PC-C04"],
    ["POT-Q-C04-03", "PC-C04"],
    ["POT-Q-C04-04", "PC-C04"],
    ["POT-Q-C04-05", "PC-C04"],
    ["POT-Q-C05-01", "PC-C05"],
    ["POT-Q-C05-02", "PC-C05"],
    ["POT-Q-C05-03", "PC-C05"],
  ])("findet %s im Checkpoint %s", (questionId, expectedCheckpointId) => {
    const snap = makeSnapshot();
    const updated = updateSnapshotAnswer(snap, questionId, "YES");
    const cp = updated.checkpoints.find((c) => c.id === expectedCheckpointId)!;
    expect(cp).toBeDefined();
    expect(cp.answers[questionId]).toBe("YES");
  });
});

describe("updateSnapshotAnswer – unbekannte questionId", () => {
  it("gibt denselben Snapshot zurück (kein Fehler)", () => {
    const snap = makeSnapshot();
    const updated = updateSnapshotAnswer(snap, "UNBEKANNT-Q-01", "YES");
    expect(updated).toBe(snap);
  });

  it("gibt dasselbe Objekt zurück, nicht nur eine tiefe Kopie", () => {
    const snap = makeSnapshot();
    const result = updateSnapshotAnswer(snap, "GIBTS-NICHT", null);
    expect(result).toBe(snap);
  });
});

describe("updateSnapshotAnswer – Idempotenz (gleicher Wert → kein Reset)", () => {
  it("gibt denselben Snapshot zurück, wenn YES erneut gesetzt wird", () => {
    const snap = makeSnapshot();
    const after1 = updateSnapshotAnswer(snap, "POT-Q-C01-02", "YES");
    const after2 = updateSnapshotAnswer(after1, "POT-Q-C01-02", "YES");
    expect(after2).toBe(after1);
  });

  it("setzt das Urteil NICHT zurück, wenn der Wert gleich bleibt", () => {
    const snap = makeSnapshot();
    const withAnswer = updateSnapshotAnswer(snap, "POT-Q-C01-02", "YES");
    const withJudgement = setCheckpointJudgement(withAnswer, "PC-C01", "SUFFICIENTLY_CLARIFIED");

    // Gleichen Wert nochmal setzen
    const after = updateSnapshotAnswer(withJudgement, "POT-Q-C01-02", "YES");
    expect(after).toBe(withJudgement); // identisches Objekt
    expect(after.checkpoints.find((c) => c.id === "PC-C01")!.clarificationJudgement)
      .toBe("SUFFICIENTLY_CLARIFIED"); // Urteil bleibt
  });

  it("erkennt null === null als gleich", () => {
    const snap = makeSnapshot(); // Antworten starten als null
    const after = updateSnapshotAnswer(snap, "POT-Q-C01-02", null);
    expect(after).toBe(snap);
  });

  it("erkennt Multi-Select in anderer Reihenfolge als gleich", () => {
    const snap = makeSnapshot();
    const withJudgement = setCheckpointJudgement(
      updateSnapshotAnswer(snap, "POT-Q-C01-01", ["A", "B"]),
      "PC-C01",
      "SUFFICIENTLY_CLARIFIED",
    );
    // Gleiche Auswahl, andere Reihenfolge
    const after = updateSnapshotAnswer(withJudgement, "POT-Q-C01-01", ["B", "A"]);
    expect(after).toBe(withJudgement); // identisches Objekt
    expect(after.checkpoints.find((c) => c.id === "PC-C01")!.clarificationJudgement)
      .toBe("SUFFICIENTLY_CLARIFIED");
  });

  it("erkennt Multi-Select mit unterschiedlichen Werten als verschieden", () => {
    const snap = makeSnapshot();
    const after1 = updateSnapshotAnswer(snap, "POT-Q-C01-01", ["A", "B"]);
    const after2 = updateSnapshotAnswer(after1, "POT-Q-C01-01", ["A", "C"]);
    expect(after2).not.toBe(after1); // anderes Objekt
  });
});
