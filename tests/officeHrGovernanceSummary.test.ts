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
  it("zeigt fuer HR-Themen keinen Governance-Block mehr", () => {
    const output = buildOfficeSummaryText({
      topicTitle: "Arzt anstellen / Nachbesetzung",
      checkpoints: [
        hrCheckpoint("HR-GOV-A", OfficeCheckpointState.YES),
        hrCheckpoint("HR-GOV-B", OfficeCheckpointState.YES),
        hrCheckpoint("HR-GOV-C", OfficeCheckpointState.YES),
        hrCheckpoint("HR-GOV-D", OfficeCheckpointState.YES),
      ],
    });

    expect(output).toContain("Office-Snapshot: Arzt anstellen / Nachbesetzung");
    expect(output).toContain("Ist-Stand");
    expect(output).not.toContain("Governance-Freigabe");
    expect(output).not.toContain("Nächste Klärungsschritte");
  });

  it("zeigt fuer NO/Open-States weiterhin nur neutrale Ist-Stand- und offene Punkte", () => {
    const output = buildOfficeSummaryText({
      topicTitle: "Arzt anstellen / Nachbesetzung",
      checkpoints: [
        hrCheckpoint("HR-GOV-A", OfficeCheckpointState.NO),
        hrCheckpoint("HR-GOV-B", OfficeCheckpointState.OPEN, {
          missing_note: "Rueckmeldung fehlt",
          answer_source: "Zulassungsausschuss",
        }),
        hrCheckpoint("HR-GOV-C", OfficeCheckpointState.YES),
        hrCheckpoint("HR-GOV-D", OfficeCheckpointState.YES),
      ],
    });

    expect(output).toContain("- [NO] HR-GOV-A");
    expect(output).toContain("- [OPEN] HR-GOV-B");
    expect(output).toContain("Fehlende Informationen");
    expect(output).toContain("Rueckmeldung fehlt");
    expect(output).toContain("Antwortquellen");
    expect(output).toContain("Zulassungsausschuss");
    expect(output).not.toContain("Governance-Freigabe");
  });

  it("behandelt Legacy-HR-IDs neutral ohne HR-GOV-Auswertung", () => {
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

    expect(output).toContain("- [YES] HR-01");
    expect(output).toContain("- [YES] HR-05");
    expect(output).not.toContain("FREIGEGEBEN");
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
