/**
 * Tests für die Isolation neuer Arbeitsprozess-Sitzungen (Neustart).
 *
 * Prüft:
 * 1. Zwei neu angelegte Sitzungen erhalten unterschiedliche Snapshots (unabhängige Objekte).
 * 2. Antworten aus Sitzung A erscheinen nicht in Sitzung B.
 * 3. M3-Urteile aus Sitzung A erscheinen nicht in Sitzung B.
 * 4. Änderungen an Prefill-Werten in Sitzung A verändern die Vorlage für Sitzung B nicht.
 * 5. Eine neue Sitzung enthält keine vom Benutzer bestätigten Antworten.
 * 6. templateAnswers der neuen Sitzung ist identisch mit der Prozessvorlage (static).
 * 7. Eine bestehende Sitzung bleibt nach dem Start einer neuen Sitzung unverändert.
 */

import {
  buildInitialInternalProtocolWorkflowSnapshot,
  buildPrefillProtocolWorkflowCheckpoints,
  isInternalProtocolWorkflowSnapshot,
  type InternalProtocolWorkflowSnapshot,
  type ProtocolClarificationJudgement,
} from "@/lib/workflow/internalProtocol/workflowAdapter";

// ---------------------------------------------------------------------------
// Hilfsfunktion: Neue Sitzung erzeugen (wie der create-Endpunkt)
// ---------------------------------------------------------------------------

function createNewSession(): InternalProtocolWorkflowSnapshot {
  return buildInitialInternalProtocolWorkflowSnapshot();
}

// ---------------------------------------------------------------------------
// 1. Zwei neue Sitzungen sind unabhängige Objekte
// ---------------------------------------------------------------------------

describe("Neustart: Sitzungen sind unabhängige Objekte", () => {
  it("zwei neue Sitzungen sind verschiedene Objekte (keine Referenz-Identität)", () => {
    const a = createNewSession();
    const b = createNewSession();
    expect(a).not.toBe(b);
    expect(a.checkpoints).not.toBe(b.checkpoints);
  });

  it("mutation von Sitzung A verändert Sitzung B nicht", () => {
    const a = createNewSession();
    const b = createNewSession();
    a.checkpoints[0].answers["POT-Q-C01-01"] = ["MUTIERT"];
    expect(b.checkpoints[0].answers["POT-Q-C01-01"]).toBeNull();
  });

  it("templateAnswers ist in beiden Sitzungen identisch (kommt aus Prozessvorlage)", () => {
    const a = createNewSession();
    const b = createNewSession();
    expect(a.templateAnswers).toEqual(b.templateAnswers);
  });
});

// ---------------------------------------------------------------------------
// 2. Antworten aus Sitzung A erscheinen nicht in Sitzung B
// ---------------------------------------------------------------------------

describe("Neustart: Antworten aus Sitzung A nicht in Sitzung B", () => {
  it("neue Sitzung B hat null-Antworten, unabhängig von Sitzung A", () => {
    const a = createNewSession();
    // Benutzer beantwortet Fragen in Sitzung A
    a.checkpoints[0].answers["POT-Q-C01-01"] = ["POT-Q-C01-01-B"];
    a.checkpoints[0].answers["POT-Q-C01-02"] = "NO";
    a.checkpoints[2].answers["POT-Q-C03-01"] = ["POT-Q-C03-01-A"];

    // Neue Sitzung B starten
    const b = createNewSession();

    // B enthält keine Antworten aus A
    expect(b.checkpoints[0].answers["POT-Q-C01-01"]).toBeNull();
    expect(b.checkpoints[0].answers["POT-Q-C01-02"]).toBeNull();
    expect(b.checkpoints[2].answers["POT-Q-C03-01"]).toBeNull();
  });

  it("alle checkpoints.answers in einer neuen Sitzung sind null", () => {
    const b = createNewSession();
    for (const cp of b.checkpoints) {
      for (const val of Object.values(cp.answers)) {
        expect(val).toBeNull();
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 3. M3-Urteile aus Sitzung A erscheinen nicht in Sitzung B
// ---------------------------------------------------------------------------

describe("Neustart: M3-Urteile aus Sitzung A nicht in Sitzung B", () => {
  it("neue Sitzung B hat keine clarificationJudgements, unabhängig von Sitzung A", () => {
    const a = createNewSession();
    // M3-Urteile in Sitzung A setzen (simuliert Speichern nach M3)
    const judgements: ProtocolClarificationJudgement[] = [
      "SUFFICIENTLY_CLARIFIED",
      "OPEN",
      "NOT_RELEVANT",
      "SUFFICIENTLY_CLARIFIED",
      "OPEN",
    ];
    a.checkpoints.forEach((cp, i) => {
      cp.clarificationJudgement = judgements[i];
    });

    // Neue Sitzung B starten
    const b = createNewSession();

    // B enthält keine Urteile aus A
    for (const cp of b.checkpoints) {
      expect(cp.clarificationJudgement).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Prefill-Vorlage ist unveränderlich (keine Session-Kopie)
// ---------------------------------------------------------------------------

describe("Neustart: templateAnswers kommt aus Prozessvorlage, nicht aus anderer Sitzung", () => {
  it("templateAnswers von Sitzung B entspricht der unveränderten Prozessvorlage, auch wenn A andere Antworten hat", () => {
    const a = createNewSession();
    // Benutzer ändert Antworten in A
    a.checkpoints[0].answers["POT-Q-C01-01"] = ["GEAENDERT"];
    // templateAnswers von A verändern (hypothetisch)
    if (a.templateAnswers) {
      (a.templateAnswers as Record<string, unknown>)["POT-Q-C01-01"] =
        ["GEAENDERT-TEMPLATE"];
    }

    // Neue Sitzung B unabhängig
    const b = createNewSession();
    const prefill = buildPrefillProtocolWorkflowCheckpoints();
    const expectedC01 = prefill[0].answers["POT-Q-C01-01"];
    // B hat die originale Prozessvorlage, nicht die geänderten Werte aus A
    expect(b.templateAnswers?.["POT-Q-C01-01"]).toEqual(expectedC01);
  });

  it("templateAnswers-Mutation in Sitzung A verändern Sitzung B nicht", () => {
    const a = createNewSession();
    const b = createNewSession();
    // Direkte Mutation der templateAnswers von A
    if (a.templateAnswers) {
      (a.templateAnswers as Record<string, unknown>)["POT-Q-C01-02"] = "NO";
    }
    // B bleibt unverändert
    const prefill = buildPrefillProtocolWorkflowCheckpoints();
    const expectedC01Answer = prefill[0].answers["POT-Q-C01-02"];
    expect(b.templateAnswers?.["POT-Q-C01-02"]).toEqual(expectedC01Answer);
  });
});

// ---------------------------------------------------------------------------
// 5. Neue Sitzung startet am Anfang (M1) – Struktur-Check
// ---------------------------------------------------------------------------

describe("Neustart: neue Sitzung hat korrekten Ausgangsstand", () => {
  it("alle Checkpoints starten mit status OPEN", () => {
    const session = createNewSession();
    for (const cp of session.checkpoints) {
      expect(cp.status).toBe("OPEN");
    }
  });

  it("keine clarificationJudgements in neuer Sitzung", () => {
    const session = createNewSession();
    for (const cp of session.checkpoints) {
      expect(cp.clarificationJudgement).toBeUndefined();
    }
  });

  it("neue Sitzung besteht den Snapshot-Guard-Test", () => {
    const session = createNewSession();
    expect(isInternalProtocolWorkflowSnapshot(session)).toBe(true);
  });

  it("neue Sitzung hat 5 Checkpoints (einen pro Klärungsaspekt)", () => {
    const session = createNewSession();
    expect(session.checkpoints).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// 6. Bestehende Sitzung bleibt unverändert nach dem Start einer neuen Sitzung
// ---------------------------------------------------------------------------

describe("Neustart: bestehende Sitzung bleibt unverändert", () => {
  it("Sitzung A bleibt unverändert nach Erstellung von Sitzung B", () => {
    const a = createNewSession();
    // Benutzer bearbeitet Sitzung A vollständig
    a.checkpoints[0].answers["POT-Q-C01-01"] = ["POT-Q-C01-01-A"];
    a.checkpoints[0].clarificationJudgement = "SUFFICIENTLY_CLARIFIED";

    // Sitzung B erstellen
    createNewSession();

    // Sitzung A ist unverändert
    expect(a.checkpoints[0].answers["POT-Q-C01-01"]).toEqual(["POT-Q-C01-01-A"]);
    expect(a.checkpoints[0].clarificationJudgement).toBe("SUFFICIENTLY_CLARIFIED");
  });
});
