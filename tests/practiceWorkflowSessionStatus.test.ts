import {
  deriveSessionStatus,
  allDecided,
  sessionStatusLabel,
} from "@/lib/workflow/internalProtocol/sessionStatus";
import type { PracticeWorkflowSnapshot } from "@/lib/practiceProcesses/workflowSnapshot";

function makeSnapshot(
  overrides?: Partial<PracticeWorkflowSnapshot>,
): PracticeWorkflowSnapshot {
  return {
    processKind: "practice-workflow",
    caseProfileId: "rezeptanfrage-ohne-arzt",
    caseProfileTitle: "Rezeptanfrage ohne Arzt",
    checkpoints: [
      {
        checkpointId: "patient-bekannt",
        checkpointTitle: "Patient bekannt",
        selectedAnchorIds: [],
      },
      {
        checkpointId: "dauermedikation-vorhanden",
        checkpointTitle: "Dauermedikation vorhanden",
        selectedAnchorIds: [],
      },
    ],
    ...overrides,
  };
}

describe("deriveSessionStatus", () => {
  it("gibt IN_PROGRESS zurück wenn completedAt fehlt", () => {
    expect(deriveSessionStatus(makeSnapshot())).toBe("IN_PROGRESS");
  });

  it("gibt COMPLETED zurück wenn completedAt gesetzt ist", () => {
    expect(
      deriveSessionStatus(makeSnapshot({ completedAt: "2026-08-08T10:00:00.000Z" })),
    ).toBe("COMPLETED");
  });

  it("ist unabhängig davon, ob alle decisions gesetzt sind", () => {
    const withDecisions = makeSnapshot({
      checkpoints: [
        {
          checkpointId: "patient-bekannt",
          checkpointTitle: "Patient bekannt",
          selectedAnchorIds: [],
          decision: "PFLICHT",
        },
        {
          checkpointId: "dauermedikation-vorhanden",
          checkpointTitle: "Dauermedikation vorhanden",
          selectedAnchorIds: [],
          decision: "OPTIONAL",
        },
      ],
    });
    // allDecided, aber kein completedAt → noch In Bearbeitung
    expect(deriveSessionStatus(withDecisions)).toBe("IN_PROGRESS");
  });
});

describe("allDecided", () => {
  it("gibt false zurück wenn kein Checkpoint entschieden ist", () => {
    expect(allDecided(makeSnapshot())).toBe(false);
  });

  it("gibt false zurück wenn nur ein Teil entschieden ist", () => {
    const partial = makeSnapshot({
      checkpoints: [
        {
          checkpointId: "patient-bekannt",
          checkpointTitle: "Patient bekannt",
          selectedAnchorIds: [],
          decision: "PFLICHT",
        },
        {
          checkpointId: "dauermedikation-vorhanden",
          checkpointTitle: "Dauermedikation vorhanden",
          selectedAnchorIds: [],
        },
      ],
    });
    expect(allDecided(partial)).toBe(false);
  });

  it("gibt true zurück wenn alle Checkpoints entschieden sind", () => {
    const all = makeSnapshot({
      checkpoints: [
        {
          checkpointId: "patient-bekannt",
          checkpointTitle: "Patient bekannt",
          selectedAnchorIds: [],
          decision: "PFLICHT",
        },
        {
          checkpointId: "dauermedikation-vorhanden",
          checkpointTitle: "Dauermedikation vorhanden",
          selectedAnchorIds: [],
          decision: "NICHT_RELEVANT",
        },
      ],
    });
    expect(allDecided(all)).toBe(true);
  });

  it("gibt true zurück bei leerem checkpoints-Array", () => {
    expect(allDecided(makeSnapshot({ checkpoints: [] }))).toBe(true);
  });
});

describe("sessionStatusLabel", () => {
  it("gibt 'In Bearbeitung' für IN_PROGRESS zurück", () => {
    expect(sessionStatusLabel("IN_PROGRESS")).toBe("In Bearbeitung");
  });

  it("gibt 'Abgeschlossen' für COMPLETED zurück", () => {
    expect(sessionStatusLabel("COMPLETED")).toBe("Abgeschlossen");
  });
});
