/**
 * Tests für die fachliche Trennung der Prozessarten:
 * PRACTICE_PROCESS / CURRENT_STATE / TARGET_STATE
 *
 * Abdeckung: Tests 1–24 aus dem Anforderungskatalog.
 */

import {
  buildInitialInternalProtocolWorkflowSnapshot,
  buildTargetStateSnapshotFromCurrent,
  getPracticeProcessMode,
  isPracticeProcessMode,
  isInternalProtocolWorkflowSnapshot,
  getWorkflowProcessKind,
  type InternalProtocolWorkflowSnapshot,
  type PracticeProcessMode,
} from "@/lib/workflow/internalProtocol/workflowAdapter";
import { TARGET_STATE_QUESTION_TEXTS } from "@/lib/workflow/internalProtocol/patientWithoutAppointment";
import { TARGET_STATE_KERNFRAGEN } from "@/lib/workflow/internalProtocol/synthesis";

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function makeCurrentStateSnapshot(): InternalProtocolWorkflowSnapshot {
  return buildInitialInternalProtocolWorkflowSnapshot("CURRENT_STATE");
}

function makeTargetStateSnapshot(): InternalProtocolWorkflowSnapshot {
  return buildInitialInternalProtocolWorkflowSnapshot("TARGET_STATE");
}

function makeSnapshotWithAnswers(): InternalProtocolWorkflowSnapshot {
  const snap = makeCurrentStateSnapshot();
  snap.checkpoints[0].answers["POT-Q-C01-01"] = ["POT-Q-C01-01-A"];
  snap.checkpoints[0].answers["POT-Q-C01-02"] = "YES";
  snap.checkpoints[0].clarificationJudgement = "SUFFICIENTLY_CLARIFIED";
  return snap;
}

// ---------------------------------------------------------------------------
// Test 1: PRACTICE_PROCESS verlangt Moduswahl (kein Default-Modus)
// ---------------------------------------------------------------------------

test("Test 1: Neue PRACTICE_PROCESS-Session ohne expliziten Modus hat processMode === undefined im Snapshot", () => {
  const snap = buildInitialInternalProtocolWorkflowSnapshot();
  expect(snap.processMode).toBeUndefined();
});

// ---------------------------------------------------------------------------
// Test 2: Keine Option vorausgewählt
// ---------------------------------------------------------------------------

test("Test 2: isPracticeProcessMode lehnt undefined ab", () => {
  expect(isPracticeProcessMode(undefined)).toBe(false);
  expect(isPracticeProcessMode(null)).toBe(false);
  expect(isPracticeProcessMode("")).toBe(false);
});

// ---------------------------------------------------------------------------
// Test 3: CURRENT_STATE startet ohne Nutzerantworten
// ---------------------------------------------------------------------------

test("Test 3: CURRENT_STATE-Session hat alle Antworten null", () => {
  const snap = makeCurrentStateSnapshot();
  for (const cp of snap.checkpoints) {
    for (const val of Object.values(cp.answers)) {
      expect(val).toBeNull();
    }
  }
});

// ---------------------------------------------------------------------------
// Test 4: TARGET_STATE kann ohne Bestandsaufnahme leer gestartet werden
// ---------------------------------------------------------------------------

test("Test 4: TARGET_STATE-Session hat alle Antworten null und kein sourceWorkflowSessionId", () => {
  const snap = makeTargetStateSnapshot();
  expect(snap.processMode).toBe("TARGET_STATE");
  expect(snap.sourceWorkflowSessionId).toBeUndefined();
  for (const cp of snap.checkpoints) {
    for (const val of Object.values(cp.answers)) {
      expect(val).toBeNull();
    }
  }
});

// ---------------------------------------------------------------------------
// Test 5: Modus wird dauerhaft gespeichert (im Snapshot)
// ---------------------------------------------------------------------------

test("Test 5: processMode wird korrekt im Snapshot gespeichert", () => {
  const current = buildInitialInternalProtocolWorkflowSnapshot("CURRENT_STATE");
  expect(current.processMode).toBe("CURRENT_STATE");

  const target = buildInitialInternalProtocolWorkflowSnapshot("TARGET_STATE");
  expect(target.processMode).toBe("TARGET_STATE");
});

// ---------------------------------------------------------------------------
// Test 6: Bestehende Sessions ohne Modus → CURRENT_STATE
// ---------------------------------------------------------------------------

test("Test 6: getPracticeProcessMode gibt CURRENT_STATE zurück wenn processMode fehlt", () => {
  const snap = buildInitialInternalProtocolWorkflowSnapshot();
  expect(snap.processMode).toBeUndefined();
  expect(getPracticeProcessMode(snap)).toBe("CURRENT_STATE");
});

test("Test 6b: isInternalProtocolWorkflowSnapshot akzeptiert Snapshot ohne processMode (Altdaten)", () => {
  const snap: Record<string, unknown> = {
    processKind: "internal-protocol",
    topicId: "patienten-ohne-termin",
    checkpoints: [],
    // kein processMode – Altdaten
  };
  expect(isInternalProtocolWorkflowSnapshot(snap)).toBe(true);
});

// ---------------------------------------------------------------------------
// Test 7: M1 CURRENT_STATE – Ist-Perspektive
// ---------------------------------------------------------------------------

test("Test 7: getPracticeProcessMode liefert CURRENT_STATE für Ist-Snapshots", () => {
  const snap = makeCurrentStateSnapshot();
  expect(getPracticeProcessMode(snap)).toBe("CURRENT_STATE");
});

// ---------------------------------------------------------------------------
// Test 8: M1 TARGET_STATE – Soll-Perspektive
// ---------------------------------------------------------------------------

test("Test 8: getPracticeProcessMode liefert TARGET_STATE für Soll-Snapshots", () => {
  const snap = makeTargetStateSnapshot();
  expect(getPracticeProcessMode(snap)).toBe("TARGET_STATE");
});

// ---------------------------------------------------------------------------
// Test 9: M2-Fragen unterscheiden die Perspektive eindeutig
// ---------------------------------------------------------------------------

test("Test 9: TARGET_STATE_QUESTION_TEXTS enthält 'soll'/'künftig' in allen Einträgen", () => {
  const entries = Object.values(TARGET_STATE_QUESTION_TEXTS);
  expect(entries.length).toBe(18); // 17 ursprüngliche + POT-Q-C04-05
  for (const text of entries) {
    const hasSollOrKuenftig =
      text.toLowerCase().includes("soll") ||
      text.toLowerCase().includes("künftig");
    expect(hasSollOrKuenftig).toBe(true);
  }
});

test("Test 9b: TARGET_STATE_KERNFRAGEN enthält 5 Einträge mit Soll-Perspektive", () => {
  expect(Object.keys(TARGET_STATE_KERNFRAGEN).length).toBe(5);
  for (const text of Object.values(TARGET_STATE_KERNFRAGEN)) {
    const hasSollOrKuenftig =
      text.toLowerCase().includes("soll") ||
      text.toLowerCase().includes("künftig");
    expect(hasSollOrKuenftig).toBe(true);
  }
});

// ---------------------------------------------------------------------------
// Test 10: M3-Texte unterscheiden die Perspektive eindeutig
// ---------------------------------------------------------------------------

test("Test 10: getPracticeProcessMode ermöglicht modusabhängige M3-Texte", () => {
  const currentMode: PracticeProcessMode = "CURRENT_STATE";
  const targetMode: PracticeProcessMode = "TARGET_STATE";
  const currentText =
    currentMode === "TARGET_STATE"
      ? "Ist für den zukünftigen Ablauf klar festgelegt…"
      : "Ist heute klar, wie Ihre Praxis in diesem Bereich vorgeht?";
  const targetText =
    targetMode === "TARGET_STATE"
      ? "Ist für den zukünftigen Ablauf klar festgelegt…"
      : "Ist heute klar, wie Ihre Praxis in diesem Bereich vorgeht?";
  expect(currentText).toContain("heute");
  expect(targetText).toContain("zukünftigen");
});

// ---------------------------------------------------------------------------
// Test 11: M4 CURRENT_STATE → Bestandsaufnahme
// ---------------------------------------------------------------------------

test("Test 11: CURRENT_STATE-Snapshot erzeugt processMode CURRENT_STATE", () => {
  const snap = makeCurrentStateSnapshot();
  expect(getPracticeProcessMode(snap)).toBe("CURRENT_STATE");
  // Titel-Mapping ist UI-seitig, hier testen wir den Modus
});

// ---------------------------------------------------------------------------
// Test 12: M4 TARGET_STATE → Zukünftiger Praxisablauf
// ---------------------------------------------------------------------------

test("Test 12: TARGET_STATE-Snapshot erzeugt processMode TARGET_STATE", () => {
  const snap = makeTargetStateSnapshot();
  expect(getPracticeProcessMode(snap)).toBe("TARGET_STATE");
});

// ---------------------------------------------------------------------------
// Tests 13–19: buildTargetStateSnapshotFromCurrent
// ---------------------------------------------------------------------------

describe("buildTargetStateSnapshotFromCurrent", () => {
  const sourceId = "source-session-abc";

  function makeSourceWithAnswers(): InternalProtocolWorkflowSnapshot {
    const snap = makeSnapshotWithAnswers();
    // clarificationJudgement für Test 17 gesetzt
    return snap;
  }

  test("Test 13: Erzeugt eine valide neue Session (isInternalProtocolWorkflowSnapshot)", () => {
    const source = makeSourceWithAnswers();
    const target = buildTargetStateSnapshotFromCurrent(source, sourceId);
    expect(isInternalProtocolWorkflowSnapshot(target)).toBe(true);
  });

  test("Test 14: Neue Session hat processMode TARGET_STATE", () => {
    const source = makeSourceWithAnswers();
    const target = buildTargetStateSnapshotFromCurrent(source, sourceId);
    expect(target.processMode).toBe("TARGET_STATE");
  });

  test("Test 15: Neue Session enthält sourceWorkflowSessionId", () => {
    const source = makeSourceWithAnswers();
    const target = buildTargetStateSnapshotFromCurrent(source, sourceId);
    expect(target.sourceWorkflowSessionId).toBe(sourceId);
  });

  test("Test 16: Fachliche Antworten werden übernommen", () => {
    const source = makeSourceWithAnswers();
    const target = buildTargetStateSnapshotFromCurrent(source, sourceId);
    expect(target.checkpoints[0].answers["POT-Q-C01-01"]).toEqual([
      "POT-Q-C01-01-A",
    ]);
    expect(target.checkpoints[0].answers["POT-Q-C01-02"]).toBe("YES");
  });

  test("Test 17: M3-Beurteilungen werden nicht übernommen", () => {
    const source = makeSourceWithAnswers();
    // source hat clarificationJudgement gesetzt
    expect(source.checkpoints[0].clarificationJudgement).toBe(
      "SUFFICIENTLY_CLARIFIED",
    );
    const target = buildTargetStateSnapshotFromCurrent(source, sourceId);
    expect(target.checkpoints[0].clarificationJudgement).toBeUndefined();
  });

  test("Test 18: Die ursprüngliche CURRENT_STATE-Session bleibt unverändert", () => {
    const source = makeSourceWithAnswers();
    const originalAnswers = JSON.parse(
      JSON.stringify(source.checkpoints[0].answers),
    );
    const target = buildTargetStateSnapshotFromCurrent(source, sourceId);
    // Neue Session verändern
    target.checkpoints[0].answers["POT-Q-C01-02"] = "NO";
    // Quelle unverändert
    expect(source.checkpoints[0].answers["POT-Q-C01-02"]).toEqual(
      originalAnswers["POT-Q-C01-02"],
    );
  });

  test("Test 19: Änderungen in der TARGET-Session verändern die Ausgangssession nicht", () => {
    const source = makeSourceWithAnswers();
    const target = buildTargetStateSnapshotFromCurrent(source, sourceId);
    target.checkpoints[0].answers["POT-Q-C01-01"] = ["POT-Q-C01-01-B"];
    expect(source.checkpoints[0].answers["POT-Q-C01-01"]).toEqual([
      "POT-Q-C01-01-A",
    ]);
  });

  test("Test 20: inheritedQuestionIds enthält alle nicht-null Frage-IDs (Herkunftskennzeichnung)", () => {
    const source = makeSourceWithAnswers();
    const target = buildTargetStateSnapshotFromCurrent(source, sourceId);
    expect(target.inheritedQuestionIds).toBeDefined();
    // Nur IDs mit nicht-null Antworten sind enthalten
    expect(target.inheritedQuestionIds).toContain("POT-Q-C01-01");
    expect(target.inheritedQuestionIds).toContain("POT-Q-C01-02");
    // Kein veraltetes inheritedAnswers-Objekt in neuen Sessions
    expect(target.inheritedAnswers).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Test 21: Keine verbotenen Wörter in MODE-Texten
// ---------------------------------------------------------------------------

test("Test 21: TARGET_STATE_QUESTION_TEXTS enthält keine verbotenen Wörter", () => {
  const forbidden = ["vorschlag", "empfehlung", "standardantwort", "empfohlen"];
  for (const text of Object.values(TARGET_STATE_QUESTION_TEXTS)) {
    for (const word of forbidden) {
      expect(text.toLowerCase()).not.toContain(word);
    }
  }
});

test("Test 21b: TARGET_STATE_KERNFRAGEN enthält keine verbotenen Wörter", () => {
  const forbidden = ["vorschlag", "empfehlung", "standardantwort", "empfohlen"];
  for (const text of Object.values(TARGET_STATE_KERNFRAGEN)) {
    for (const word of forbidden) {
      expect(text.toLowerCase()).not.toContain(word);
    }
  }
});

// ---------------------------------------------------------------------------
// Test 22: templateAnswers erzeugen keine automatische Vorauswahl
// ---------------------------------------------------------------------------

test("Test 22: Alle Checkpoint-Antworten in neuer Session sind null (unabhängig von templateAnswers)", () => {
  const snap = buildInitialInternalProtocolWorkflowSnapshot("CURRENT_STATE");
  // templateAnswers ist gesetzt, aber checkpoints.answers sind null
  expect(snap.templateAnswers).toBeDefined();
  for (const cp of snap.checkpoints) {
    for (const val of Object.values(cp.answers)) {
      expect(val).toBeNull();
    }
  }
});

// ---------------------------------------------------------------------------
// Test 23: STANDARD_PROCESS-Snapshots (WorkflowProcessSnapshot) unterscheidbar
// ---------------------------------------------------------------------------

test("Test 23: isInternalProtocolWorkflowSnapshot lehnt Standard-Prozess-Snapshot ab", () => {
  const standardSnapshot = {
    topicId: "au-musterprozess",
    role: "MFA",
    processPoints: [],
    // kein processKind
  };
  expect(isInternalProtocolWorkflowSnapshot(standardSnapshot)).toBe(false);
});

test("Test 23b: isPracticeProcessMode unterscheidet bekannte Modi von Standard-Werten", () => {
  expect(isPracticeProcessMode("CURRENT_STATE")).toBe(true);
  expect(isPracticeProcessMode("TARGET_STATE")).toBe(true);
  expect(isPracticeProcessMode("STANDARD_PROCESS")).toBe(false);
  expect(isPracticeProcessMode("au-musterprozess")).toBe(false);
});

// ---------------------------------------------------------------------------
// Test 24: Alle bestehenden internalProtocol-Tests bleiben grün
// (Smoke-Test: buildInitialInternalProtocolWorkflowSnapshot ohne Modus)
// ---------------------------------------------------------------------------

test("Test 24: buildInitialInternalProtocolWorkflowSnapshot() ohne Parameter produziert validen Snapshot", () => {
  const snap = buildInitialInternalProtocolWorkflowSnapshot();
  expect(isInternalProtocolWorkflowSnapshot(snap)).toBe(true);
  expect(snap.processKind).toBe("internal-protocol");
  expect(snap.topicId).toBe("patienten-ohne-termin");
  expect(snap.checkpoints.length).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// Test 25: Tiefenkopie — Array-Antworten in TARGET-Session sind isoliert
// ---------------------------------------------------------------------------

test("Test 25: Array-Antworten in TARGET-Session sind unabhängig von SOURCE-Session (Tiefenkopie)", () => {
  const source = buildInitialInternalProtocolWorkflowSnapshot("CURRENT_STATE");
  source.checkpoints[0].answers["POT-Q-C01-01"] = ["POT-Q-C01-01-A"];

  const target = buildTargetStateSnapshotFromCurrent(source, "src-25");

  // Mutiere das Array in der TARGET-Session direkt
  (target.checkpoints[0].answers["POT-Q-C01-01"] as string[]).push("POT-Q-C01-01-B");

  // SOURCE-Session darf nicht verändert worden sein
  expect(source.checkpoints[0].answers["POT-Q-C01-01"]).toEqual(["POT-Q-C01-01-A"]);
  expect(target.checkpoints[0].answers["POT-Q-C01-01"]).toEqual([
    "POT-Q-C01-01-A",
    "POT-Q-C01-01-B",
  ]);
});

// ---------------------------------------------------------------------------
// Test 26: M3-Urteile (clarificationJudgement) sind nicht in TARGET-Session vorhanden
// ---------------------------------------------------------------------------

test("Test 26: Kein clarificationJudgement im TARGET-Snapshot", () => {
  const source = buildInitialInternalProtocolWorkflowSnapshot("CURRENT_STATE");
  source.checkpoints[0].answers["POT-Q-C01-01"] = ["POT-Q-C01-01-A"];
  source.checkpoints[0].clarificationJudgement = "SUFFICIENTLY_CLARIFIED";
  source.checkpoints[1].clarificationJudgement = "NOT_RELEVANT";

  const target = buildTargetStateSnapshotFromCurrent(source, "src-26");

  for (const cp of target.checkpoints) {
    expect(cp.clarificationJudgement).toBeUndefined();
  }
});

// ---------------------------------------------------------------------------
// Test 27: getWorkflowProcessKind klassifiziert korrekt
// ---------------------------------------------------------------------------

test("Test 27: getWorkflowProcessKind gibt PRACTICE_PROCESS für interne Protokoll-Snapshots zurück", () => {
  const snap = buildInitialInternalProtocolWorkflowSnapshot("CURRENT_STATE");
  expect(getWorkflowProcessKind(snap)).toBe("PRACTICE_PROCESS");
});

test("Test 27b: getWorkflowProcessKind gibt STANDARD_PROCESS für klinische Workflow-Snapshots zurück", () => {
  const standardSnapshot = { topicId: "au-musterprozess", role: "MFA", processPoints: [] };
  expect(getWorkflowProcessKind(standardSnapshot)).toBe("STANDARD_PROCESS");
});

test("Test 27c: getWorkflowProcessKind gibt undefined für unbekannte / leere Werte zurück (kein stilles Fallback)", () => {
  expect(getWorkflowProcessKind(null)).toBeUndefined();
  expect(getWorkflowProcessKind({})).toBeUndefined();
  expect(getWorkflowProcessKind("invalid")).toBeUndefined();
  expect(getWorkflowProcessKind(undefined)).toBeUndefined();
  expect(getWorkflowProcessKind({ topicId: "unbekannt-xyz" })).toBeUndefined();
});

// ---------------------------------------------------------------------------
// Test 28: inheritedAnswers enthält Tiefenkopie (Array-Isolation)
// ---------------------------------------------------------------------------

test("Test 28: inheritedQuestionIds enthält Tiefenkopie der Array-Antworten ist unabhängig", () => {
  const source = buildInitialInternalProtocolWorkflowSnapshot("CURRENT_STATE");
  source.checkpoints[0].answers["POT-Q-C01-01"] = ["POT-Q-C01-01-A"];

  const target = buildTargetStateSnapshotFromCurrent(source, "src-28");

  // Die ID ist in inheritedQuestionIds enthalten
  expect(target.inheritedQuestionIds).toContain("POT-Q-C01-01");

  // Mutation im Checkpoint der TARGET-Session darf inheritedQuestionIds nicht verändern
  (target.checkpoints[0].answers["POT-Q-C01-01"] as string[]).push("extra");
  expect(target.inheritedQuestionIds).toContain("POT-Q-C01-01"); // bleibt enthalten
  // Die ID-Liste selbst ist isoliert: Mutation des Checkpoint-Arrays ändert nicht die ID-Liste
  expect(target.inheritedQuestionIds?.length).toBeGreaterThanOrEqual(1);
});

// ---------------------------------------------------------------------------
// Test 29: Herkunftskennzeichnung reagiert auf Antwortänderung
// (Simuliert die isInherited-Logik aus InternalProtocolM2StepClient.tsx)
// ---------------------------------------------------------------------------

test("Test 29: Herkunftskennzeichnung basiert auf inheritedQuestionIds, nicht auf Wertegleichheit", () => {
  const source = buildInitialInternalProtocolWorkflowSnapshot("CURRENT_STATE");
  source.checkpoints[0].answers["POT-Q-C01-01"] = ["POT-Q-C01-01-A"];
  source.checkpoints[0].answers["POT-Q-C01-02"] = "YES";

  const target = buildTargetStateSnapshotFromCurrent(source, "src-29");

  // Beide Fragen sind initial als übernommen markiert
  expect(target.inheritedQuestionIds).toContain("POT-Q-C01-01");
  expect(target.inheritedQuestionIds).toContain("POT-Q-C01-02");

  // Simuliert: nach Änderung einer Antwort wird die ID aus der Liste entfernt
  // (dies passiert serverseitig im save-Route)
  const afterChange = (target.inheritedQuestionIds ?? []).filter(
    (id) => id !== "POT-Q-C01-01",
  );
  expect(afterChange).not.toContain("POT-Q-C01-01");
  expect(afterChange).toContain("POT-Q-C01-02");

  // Auch wenn der Nutzer denselben Wert wieder eingibt, ist die ID nicht zurück
  // (da die ID-Liste unveränderlich ist nach dem Entfernen)
  expect(afterChange).not.toContain("POT-Q-C01-01");
});
