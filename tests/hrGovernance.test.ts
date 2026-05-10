import { OfficeCheckpointKind, OfficeCheckpointState, type OfficeCheckpointSnapshot } from "@/lib/office/types";
import {
  deriveHrM4Actions,
  deriveHrSummaryStatus,
  evaluateHrGovernance,
  mapLegacyHrCheckpointId,
} from "@/lib/office/hrGovernance";

function hrCheckpoint(
  id: string,
  state: OfficeCheckpointState,
  overrides: Partial<OfficeCheckpointSnapshot> = {},
): OfficeCheckpointSnapshot {
  return {
    id,
    title: id,
    kind: OfficeCheckpointKind.DECISION,
    state,
    known_note: "",
    missing_note: "",
    answer_source: "",
    ...overrides,
  };
}

describe("hr governance rule engine", () => {
  it("mappt Legacy-IDs HR-01 bis HR-05", () => {
    expect(mapLegacyHrCheckpointId("HR-01")).toBe("HR-GOV-A");
    expect(mapLegacyHrCheckpointId("HR-02")).toBe("HR-GOV-A");
    expect(mapLegacyHrCheckpointId("HR-03")).toBe("HR-GOV-C");
    expect(mapLegacyHrCheckpointId("HR-04")).toBe("HR-GOV-B");
    expect(mapLegacyHrCheckpointId("HR-05")).toBe("HR-GOV-D");
    expect(mapLegacyHrCheckpointId("OTHER")).toBe("OTHER");
  });

  it("liefert FREIGEGEBEN wenn A-D alle YES sind", () => {
    const checkpoints = [
      hrCheckpoint("HR-GOV-A", OfficeCheckpointState.YES),
      hrCheckpoint("HR-GOV-B", OfficeCheckpointState.YES),
      hrCheckpoint("HR-GOV-C", OfficeCheckpointState.YES),
      hrCheckpoint("HR-GOV-D", OfficeCheckpointState.YES),
    ];

    const result = deriveHrSummaryStatus(checkpoints);
    expect(result.status).toBe("FREIGEGEBEN");
    expect(result.reasons.join(" ")).toContain("YES");
  });

  it("liefert NICHT_FREIGEGEBEN wenn mindestens ein NO vorliegt", () => {
    const checkpoints = [
      hrCheckpoint("HR-GOV-A", OfficeCheckpointState.YES),
      hrCheckpoint("HR-GOV-B", OfficeCheckpointState.NO),
      hrCheckpoint("HR-GOV-C", OfficeCheckpointState.YES),
      hrCheckpoint("HR-GOV-D", OfficeCheckpointState.YES),
    ];

    const result = deriveHrSummaryStatus(checkpoints);
    expect(result.status).toBe("NICHT_FREIGEGEBEN");
    expect(result.reasons.some((r) => r.includes("HR-GOV-B"))).toBe(true);
  });

  it("liefert AUSSTEHEND wenn mindestens ein OPEN vorliegt", () => {
    const checkpoints = [
      hrCheckpoint("HR-GOV-A", OfficeCheckpointState.YES),
      hrCheckpoint("HR-GOV-B", OfficeCheckpointState.OPEN),
      hrCheckpoint("HR-GOV-C", OfficeCheckpointState.YES),
      hrCheckpoint("HR-GOV-D", OfficeCheckpointState.YES),
    ];

    const result = deriveHrSummaryStatus(checkpoints);
    expect(result.status).toBe("AUSSTEHEND");
    expect(result.reasons.some((r) => r.includes("OPEN"))).toBe(true);
  });

  it("liefert AUSSTEHEND wenn ein HR-GOV-Checkpoint fehlt", () => {
    const checkpoints = [
      hrCheckpoint("HR-GOV-A", OfficeCheckpointState.YES),
      hrCheckpoint("HR-GOV-B", OfficeCheckpointState.YES),
      hrCheckpoint("HR-GOV-C", OfficeCheckpointState.YES),
    ];

    const result = deriveHrSummaryStatus(checkpoints);
    expect(result.status).toBe("AUSSTEHEND");
    expect(result.reasons.some((r) => r.includes("fehlt"))).toBe(true);
  });

  it("erzeugt NO_BLOCKER fuer NO", () => {
    const actions = deriveHrM4Actions([
      hrCheckpoint("HR-GOV-A", OfficeCheckpointState.NO),
    ]);

    expect(actions).toHaveLength(1);
    expect(actions[0]?.actionType).toBe("NO_BLOCKER");
    expect(actions[0]?.normalizedId).toBe("HR-GOV-A");
  });

  it("erzeugt OPEN_EXTERNAL_CONFIRMATION bei OPEN mit externer Stelle", () => {
    const actions = deriveHrM4Actions([
      hrCheckpoint("HR-GOV-B", OfficeCheckpointState.OPEN, {
        answer_source: "Rueckmeldung von KV Berlin und Zulassungsausschuss ausstehend",
      }),
      hrCheckpoint("HR-GOV-C", OfficeCheckpointState.OPEN, {
        missing_note: "Bestaetigung durch Aerztekammer oder Versicherung fehlt",
      }),
    ]);

    expect(actions).toHaveLength(2);
    expect(actions.every((a) => a.actionType === "OPEN_EXTERNAL_CONFIRMATION")).toBe(true);
  });

  it("erzeugt OPEN_MISSING_INFO bei OPEN ohne externe Stelle", () => {
    const actions = deriveHrM4Actions([
      hrCheckpoint("HR-GOV-D", OfficeCheckpointState.OPEN, {
        missing_note: "Interne Rueckfrage zur fachlichen Einschaetzung noetig",
        answer_source: "Praxisleitung intern",
      }),
    ]);

    expect(actions).toHaveLength(1);
    expect(actions[0]?.actionType).toBe("OPEN_MISSING_INFO");
  });

  it("evaluateHrGovernance liefert normalisierte checkpoints, summaryStatus und m4Actions", () => {
    const result = evaluateHrGovernance([
      hrCheckpoint("HR-01", OfficeCheckpointState.YES),
      hrCheckpoint("HR-04", OfficeCheckpointState.OPEN, {
        answer_source: "KV Berlin",
      }),
      hrCheckpoint("HR-GOV-C", OfficeCheckpointState.YES),
      hrCheckpoint("HR-GOV-D", OfficeCheckpointState.YES),
    ]);

    expect(result.checkpoints.some((cp) => cp.normalizedId === "HR-GOV-A")).toBe(true);
    expect(result.checkpoints.some((cp) => cp.normalizedId === "HR-GOV-B")).toBe(true);
    expect(result.summaryStatus.status).toBe("AUSSTEHEND");
    expect(result.m4Actions.some((a) => a.actionType === "OPEN_EXTERNAL_CONFIRMATION")).toBe(true);
  });
});
