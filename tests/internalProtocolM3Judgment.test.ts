/**
 * Tests für die Trennung von M3-Urteil (clarificationJudgement) und M2-Antwortstand (status).
 *
 * Prüft:
 * 1. clarificationJudgement wird separat von checkpoint.status gespeichert.
 * 2. M2-Antwortänderungen überschreiben ein gesetztes clarificationJudgement nicht.
 * 3. Bestehende Snapshots ohne clarificationJudgement bleiben gültig (Altdaten).
 * 4. M4 (synthesizeCheckpoint) verwendet die Antworten – das Urteil kommt aus clarificationJudgement.
 * 5. isProtocolWorkflowCheckpoint akzeptiert das neue optionale Feld.
 * 6. isProtocolClarificationJudgement validiert korrekt.
 */

import {
  isProtocolWorkflowCheckpoint,
  isInternalProtocolWorkflowSnapshot,
  isProtocolClarificationJudgement,
  buildInitialProtocolWorkflowCheckpoints,
  buildInitialInternalProtocolWorkflowSnapshot,
  type ProtocolWorkflowCheckpoint,
  type InternalProtocolWorkflowSnapshot,
  type ProtocolClarificationJudgement,
} from "@/lib/workflow/internalProtocol/workflowAdapter";
import {
  synthesizeCheckpoint,
  clarificationJudgementLabel,
} from "@/lib/workflow/internalProtocol/synthesis";
import { getPatientWithoutAppointmentSections } from "@/lib/workflow/internalProtocol/patientWithoutAppointment";

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function makeCheckpointWithJudgement(
  id: string,
  judgement: ProtocolClarificationJudgement,
): ProtocolWorkflowCheckpoint {
  return {
    id,
    title: "Test",
    status: "OPEN",
    answers: {},
    clarificationJudgement: judgement,
  };
}

// ---------------------------------------------------------------------------
// 1. isProtocolClarificationJudgement – Guard-Funktion
// ---------------------------------------------------------------------------

describe("isProtocolClarificationJudgement", () => {
  it.each([
    "SUFFICIENTLY_CLARIFIED",
    "OPEN",
    "NOT_RELEVANT",
  ] as ProtocolClarificationJudgement[])(
    "akzeptiert '%s' als gültig",
    (val) => {
      expect(isProtocolClarificationJudgement(val)).toBe(true);
    },
  );

  it.each([
    null,
    undefined,
    "",
    "CONFIRMED",
    "NOT_APPLICABLE",
    "OPEN_NEW",
    0,
    false,
    {},
  ])("lehnt %p ab", (val) => {
    expect(isProtocolClarificationJudgement(val)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. isProtocolWorkflowCheckpoint – akzeptiert clarificationJudgement optional
// ---------------------------------------------------------------------------

describe("isProtocolWorkflowCheckpoint – clarificationJudgement optional", () => {
  const base: ProtocolWorkflowCheckpoint = {
    id: "PC-C01",
    title: "Geltungsbereich",
    status: "OPEN",
    answers: {},
  };

  it("akzeptiert Checkpoint ohne clarificationJudgement (Altdaten)", () => {
    expect(isProtocolWorkflowCheckpoint(base)).toBe(true);
  });

  it.each([
    "SUFFICIENTLY_CLARIFIED",
    "OPEN",
    "NOT_RELEVANT",
  ] as ProtocolClarificationJudgement[])(
    "akzeptiert clarificationJudgement '%s'",
    (j) => {
      expect(
        isProtocolWorkflowCheckpoint({ ...base, clarificationJudgement: j }),
      ).toBe(true);
    },
  );

  it("lehnt ungültiges clarificationJudgement ab", () => {
    expect(
      isProtocolWorkflowCheckpoint({
        ...base,
        clarificationJudgement: "CONFIRMED",
      }),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. clarificationJudgement und status sind getrennte Felder
// ---------------------------------------------------------------------------

describe("clarificationJudgement ist von status unabhängig", () => {
  it("checkpoint.status bleibt OPEN wenn clarificationJudgement gesetzt wird", () => {
    const cp = makeCheckpointWithJudgement("PC-C01", "SUFFICIENTLY_CLARIFIED");
    expect(cp.status).toBe("OPEN");
    expect(cp.clarificationJudgement).toBe("SUFFICIENTLY_CLARIFIED");
  });

  it("M2-Antwortänderung überschreibt clarificationJudgement nicht", () => {
    const cp = makeCheckpointWithJudgement("PC-C01", "SUFFICIENTLY_CLARIFIED");
    // Simuliert M2-Speichern: nur answers ändern, clarificationJudgement bleibt
    const updated: ProtocolWorkflowCheckpoint = {
      ...cp,
      answers: { "POT-Q-C01-01": "YES", "POT-Q-C01-02": null },
    };
    expect(updated.clarificationJudgement).toBe("SUFFICIENTLY_CLARIFIED");
    expect(updated.answers["POT-Q-C01-01"]).toBe("YES");
  });

  it("M2-Antworten können null sein ohne clarificationJudgement zu löschen", () => {
    const cp = makeCheckpointWithJudgement("PC-C02", "NOT_RELEVANT");
    const withNewAnswers: ProtocolWorkflowCheckpoint = {
      ...cp,
      answers: { "POT-Q-C02-01": null },
    };
    expect(withNewAnswers.clarificationJudgement).toBe("NOT_RELEVANT");
  });

  it("clarificationJudgement kann unabhängig von status geändert werden", () => {
    const cp: ProtocolWorkflowCheckpoint = {
      id: "PC-C03",
      title: "Standardablauf",
      status: "CONFIRMED",
      answers: { "POT-Q-C03-01": ["POT-Q-C03-01-A"] },
      clarificationJudgement: "OPEN",
    };
    // Urteil in M3 geändert – status aus M2 bleibt unverändert
    const judged: ProtocolWorkflowCheckpoint = {
      ...cp,
      clarificationJudgement: "SUFFICIENTLY_CLARIFIED",
    };
    expect(judged.status).toBe("CONFIRMED"); // M2-Status unverändert
    expect(judged.clarificationJudgement).toBe("SUFFICIENTLY_CLARIFIED");
  });
});

// ---------------------------------------------------------------------------
// 4. Altdaten ohne clarificationJudgement bleiben gültig
// ---------------------------------------------------------------------------

describe("Altdaten ohne clarificationJudgement bleiben gültig", () => {
  it("Snapshot ohne clarificationJudgement besteht den Guard-Test", () => {
    const snap: InternalProtocolWorkflowSnapshot = {
      processKind: "internal-protocol",
      topicId: "patienten-ohne-termin",
      checkpoints: [
        { id: "PC-C01", title: "Test", status: "OPEN", answers: {} },
      ],
    };
    expect(isInternalProtocolWorkflowSnapshot(snap)).toBe(true);
  });

  it("clarificationJudgement als undefined gilt als nicht gesetzt", () => {
    const cp: ProtocolWorkflowCheckpoint = {
      id: "PC-C01",
      title: "Test",
      status: "OPEN",
      answers: {},
    };
    expect(cp.clarificationJudgement).toBeUndefined();
  });

  it("buildInitialProtocolWorkflowCheckpoints erzeugt Checkpoints ohne clarificationJudgement", () => {
    const checkpoints = buildInitialProtocolWorkflowCheckpoints();
    for (const cp of checkpoints) {
      expect(cp.clarificationJudgement).toBeUndefined();
    }
  });

  it("buildInitialInternalProtocolWorkflowSnapshot erzeugt Snapshot ohne clarificationJudgement in Checkpoints", () => {
    const snapshot = buildInitialInternalProtocolWorkflowSnapshot();
    for (const cp of snapshot.checkpoints) {
      expect(cp.clarificationJudgement).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// 5. M4: synthesizeCheckpoint nutzt Antworten; Urteil kommt aus clarificationJudgement
// ---------------------------------------------------------------------------

describe("M4 verwendet Antworten für Inhalt, Urteil aus clarificationJudgement", () => {
  const sections = getPatientWithoutAppointmentSections();
  const section = sections.find((s) => s.id === "PC-C02")!;

  it("synthesizeCheckpoint nutzt answers – unabhängig von clarificationJudgement", () => {
    const withJudgement: ProtocolWorkflowCheckpoint = {
      id: "PC-C02",
      title: "Zuständigkeit",
      status: "OPEN",
      answers: { "POT-Q-C02-01": "POT-Q-C02-01-A" },
      clarificationJudgement: "NOT_RELEVANT",
    };
    const withoutJudgement: ProtocolWorkflowCheckpoint = {
      id: "PC-C02",
      title: "Zuständigkeit",
      status: "OPEN",
      answers: { "POT-Q-C02-01": "POT-Q-C02-01-A" },
    };
    // Gleiches Synthese-Ergebnis – clarificationJudgement beeinflusst Inhalt nicht
    expect(synthesizeCheckpoint(section, withJudgement)).toEqual(
      synthesizeCheckpoint(section, withoutJudgement),
    );
  });

  it("Urteil SUFFICIENTLY_CLARIFIED kommt aus clarificationJudgement, nicht aus synthesizeCheckpoint", () => {
    const cp = makeCheckpointWithJudgement("PC-C02", "SUFFICIENTLY_CLARIFIED");
    expect(cp.clarificationJudgement).toBe("SUFFICIENTLY_CLARIFIED");
    // synthesizeCheckpoint gibt keine Items zurück (keine Antworten)
    const items = synthesizeCheckpoint(section, cp);
    // Items enthalten keine Urteils-Information – das ist Aufgabe des M4-Clients
    expect(Array.isArray(items)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 6. clarificationJudgementLabel – Labels
// ---------------------------------------------------------------------------

describe("clarificationJudgementLabel", () => {
  it.each([
    ["SUFFICIENTLY_CLARIFIED", "Ausreichend geklärt"],
    ["OPEN", "Noch offen"],
    ["NOT_RELEVANT", "Nicht relevant"],
  ] as [ProtocolClarificationJudgement, string][])(
    "'%s' → '%s'",
    (judgement, expected) => {
      expect(clarificationJudgementLabel(judgement)).toBe(expected);
    },
  );
});
