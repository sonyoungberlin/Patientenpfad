import { buildOfficeSummaryText } from "@/lib/office/summary";
import { OfficeCheckpointKind, OfficeCheckpointState } from "@/lib/office/types";

function hrCheckpoint(
  id: string,
  state: OfficeCheckpointState,
  overrides: Record<string, unknown> = {},
) {
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

describe("office hr governance summary", () => {
  it("zeigt FREIGEGEBEN wenn HR-GOV-A bis D alle YES sind", () => {
    const output = buildOfficeSummaryText({
      topicTitle: "Arzt anstellen / Nachbesetzung",
      checkpoints: [
        hrCheckpoint("HR-GOV-A", OfficeCheckpointState.YES),
        hrCheckpoint("HR-GOV-B", OfficeCheckpointState.YES),
        hrCheckpoint("HR-GOV-C", OfficeCheckpointState.YES),
        hrCheckpoint("HR-GOV-D", OfficeCheckpointState.YES),
      ],
    });

    expect(output).toContain("Governance-Freigabe");
    expect(output).toContain("FREIGEGEBEN");
    expect(output).not.toContain("Nächste Klärungsschritte");
  });

  it("zeigt NICHT_FREIGEGEBEN und einen Blockerhinweis wenn ein NO vorliegt", () => {
    const output = buildOfficeSummaryText({
      topicTitle: "Arzt anstellen / Nachbesetzung",
      checkpoints: [
        hrCheckpoint("HR-GOV-A", OfficeCheckpointState.YES),
        hrCheckpoint("HR-GOV-B", OfficeCheckpointState.NO),
        hrCheckpoint("HR-GOV-C", OfficeCheckpointState.YES),
        hrCheckpoint("HR-GOV-D", OfficeCheckpointState.YES),
      ],
    });

    expect(output).toContain("NICHT_FREIGEGEBEN");
    expect(output).toContain("NO_BLOCKER");
  });

  it("zeigt AUSSTEHEND und naechste Klaerungsschritte wenn ein OPEN vorliegt", () => {
    const output = buildOfficeSummaryText({
      topicTitle: "Arzt anstellen / Nachbesetzung",
      checkpoints: [
        hrCheckpoint("HR-GOV-A", OfficeCheckpointState.YES),
        hrCheckpoint("HR-GOV-B", OfficeCheckpointState.OPEN, {
          missing_note: "Rueckmeldung vom Zulassungsausschuss fehlt",
          answer_source: "Zulassungsausschuss",
        }),
        hrCheckpoint("HR-GOV-C", OfficeCheckpointState.YES),
        hrCheckpoint("HR-GOV-D", OfficeCheckpointState.YES),
      ],
    });

    expect(output).toContain("AUSSTEHEND");
    expect(output).toContain("Nächste Klärungsschritte");
    expect(output).toContain("OPEN_EXTERNAL_CONFIRMATION");
  });

  it("wertet Legacy-HR-Snapshots mit HR-01 bis HR-05 aus", () => {
    const output = buildOfficeSummaryText({
      topicTitle: "Arzt anstellen / Nachbesetzung",
      checkpoints: [
        hrCheckpoint("HR-01", OfficeCheckpointState.YES),
        hrCheckpoint("HR-02", OfficeCheckpointState.YES),
        hrCheckpoint("HR-03", OfficeCheckpointState.YES),
        hrCheckpoint("HR-04", OfficeCheckpointState.YES),
        hrCheckpoint("HR-05", OfficeCheckpointState.YES),
      ],
    });

    expect(output).toContain("FREIGEGEBEN");
    expect(output).toContain("HR-GOV-A bis HR-GOV-D sind auf YES.");
  });

  it("laesst Nicht-HR-Topics generisch", () => {
    const output = buildOfficeSummaryText({
      topicTitle: "Test Topic",
      checkpoints: [
        {
          id: "CP-01",
          title: "Checkpoint 1",
          kind: OfficeCheckpointKind.FACT,
          state: OfficeCheckpointState.OPEN,
          missing_note: "Fehlt",
          answer_source: "Manager",
        },
      ],
    });

    expect(output).not.toContain("Governance-Freigabe");
    expect(output).toContain("Ist-Stand");
  });
});
