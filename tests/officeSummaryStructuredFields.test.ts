import { buildOfficeSummaryText } from "@/lib/office/summary";
import { OfficeCheckpointKind, OfficeCheckpointState, OfficeCheckpointType, type M2AnswerValue } from "@/lib/office/types";
import { OFFICE_TOPIC_REGRESS } from "@/lib/office/checkpointCatalog";

describe("office summary structured fields", () => {
  it("zeigt Fristen und Verantwortung an wenn vorhanden", () => {
    const input = {
      topicTitle: "Test Topic",
      checkpoints: [
        {
          id: "CP-01",
          title: "Checkpoint 1",
          kind: OfficeCheckpointKind.FACT,
          state: OfficeCheckpointState.OPEN,
          deadline: "2026-06-15",
          responsible_role: "Geschäftsführer",
        },
      ],
    };

    const output = buildOfficeSummaryText(input);

    expect(output).toContain("Fristen und Verantwortung");
    expect(output).toContain("Checkpoint 1");
    expect(output).toContain("2026-06-15");
    expect(output).toContain("Geschäftsführer");
  });

  it("zeigt nur Frist an wenn Verantwortung leer", () => {
    const input = {
      topicTitle: "Test Topic",
      checkpoints: [
        {
          id: "CP-01",
          title: "Checkpoint 1",
          kind: OfficeCheckpointKind.FACT,
          state: OfficeCheckpointState.OPEN,
          deadline: "2026-06-15",
        },
      ],
    };

    const output = buildOfficeSummaryText(input);

    expect(output).toContain("Fristen und Verantwortung");
    expect(output).toContain("2026-06-15");
    expect(output).not.toContain("Verantwortung: ");
  });

  it("zeigt erforderliche Unterlagen als Checkliste an", () => {
    const input = {
      topicTitle: "Test Topic",
      checkpoints: [
        {
          id: "CP-01",
          title: "Checkpoint 1",
          kind: OfficeCheckpointKind.FACT,
          state: OfficeCheckpointState.OPEN,
          required_documents: ["Anschreiben", "Nachweis", "Bestätigung"],
        },
      ],
    };

    const output = buildOfficeSummaryText(input);

    expect(output).toContain("Erforderliche Unterlagen");
    expect(output).toContain("Checkpoint 1:");
    expect(output).toContain("• Anschreiben");
    expect(output).toContain("• Nachweis");
    expect(output).toContain("• Bestätigung");
  });

  it("zeigt Eskalation an wenn escalation_needed true", () => {
    const input = {
      topicTitle: "Test Topic",
      checkpoints: [
        {
          id: "CP-01",
          title: "Checkpoint 1",
          kind: OfficeCheckpointKind.FACT,
          state: OfficeCheckpointState.OPEN,
          escalation_needed: true,
        },
        {
          id: "CP-02",
          title: "Checkpoint 2",
          kind: OfficeCheckpointKind.DECISION,
          state: OfficeCheckpointState.YES,
          escalation_needed: false,
        },
      ],
    };

    const output = buildOfficeSummaryText(input);

    expect(output).toContain("Eskalation erforderlich");
    expect(output).toContain("- Checkpoint 1");
    const eskalationSection = output.split("Eskalation erforderlich")[1];
    expect(eskalationSection).not.toContain("Checkpoint 2");
  });

  it("zeigt Zustaendige Stellen an wenn authority vorhanden", () => {
    const input = {
      topicTitle: "Test Topic",
      checkpoints: [
        {
          id: "CP-01",
          title: "Checkpoint 1",
          kind: OfficeCheckpointKind.SOURCE,
          state: OfficeCheckpointState.OPEN,
          authority: "Kassenärztliche Vereinigung",
        },
      ],
    };

    const output = buildOfficeSummaryText(input);

    expect(output).toContain("Zustaendige Stellen");
    expect(output).toContain("Checkpoint 1: Kassenärztliche Vereinigung");
  });

  it("bleibt rueckwaertskompatibel mit alten Snapshots ohne neue Felder", () => {
    const input = {
      topicTitle: "Test Topic",
      checkpoints: [
        {
          id: "CP-01",
          title: "Checkpoint 1",
          kind: OfficeCheckpointKind.FACT,
          state: OfficeCheckpointState.OPEN,
          known_note: "Bekannt",
          missing_note: "Fehlt",
          answer_source: "Manager",
        },
      ],
    };

    const output = buildOfficeSummaryText(input);

    expect(output).toContain("Ist-Stand");
    expect(output).toContain("Offene Punkte");
    expect(output).toContain("Zustaendig / Quelle");
    expect(output).not.toContain("!!! FEHLT");
    expect(output).not.toContain("Fristen");
    expect(output).not.toContain("Eskalation");
    expect(output).not.toContain("Erforderliche Unterlagen");
  });

  it("zeigt offene Punkte aus M2 und die abgeleitete Zuständigkeit an", () => {
    const input = {
      topicTitle: "Regressfall",
      topicId: OFFICE_TOPIC_REGRESS,
      checkpoints: [
        {
          id: "RG-01",
          title: "Anlass dokumentiert",
          kind: OfficeCheckpointKind.FACT,
          state: OfficeCheckpointState.OPEN,
          m2_answers: {
            "M2-01": "NO",
            "M2-02": "UNCLEAR",
          } as Record<string, M2AnswerValue>,
        },
        {
          id: "RG-02",
          title: "Fristen geprueft",
          kind: OfficeCheckpointKind.RULE,
          state: OfficeCheckpointState.OPEN,
          checkpointType: OfficeCheckpointType.EXTERNE_BESTAETIGUNG,
          authority: "KV Berlin",
          m2_answers: {
            "M2-01": "YES",
            "M2-02": "YES",
          } as Record<string, M2AnswerValue>,
        },
      ],
    };

    const output = buildOfficeSummaryText(input);

    expect(output).toContain("Offene Punkte");
    expect(output).toContain("Welcher Anlass wurde beanstandet und welcher Zeitraum ist betroffen?");
    expect(output).toContain("Welche Basisfakten sind bereits gesichert dokumentiert?");
    expect(output).toContain("Zustaendig / Quelle");
    expect(output).toContain("KV Berlin");
    expect(output).not.toContain("!!! FEHLT");
  });

  it("leere Arrays und falsche Booleans werden ignoriert", () => {
    const input = {
      topicTitle: "Test Topic",
      checkpoints: [
        {
          id: "CP-01",
          title: "Checkpoint 1",
          kind: OfficeCheckpointKind.FACT,
          state: OfficeCheckpointState.YES,
          deadline: "",
          responsible_role: "",
          authority: "",
          required_documents: [],
          escalation_needed: false,
        },
      ],
    };

    const output = buildOfficeSummaryText(input);

    expect(output).not.toContain("Fristen");
    expect(output).not.toContain("Zustaendige Stellen");
    expect(output).not.toContain("Erforderliche Unterlagen");
    expect(output).not.toContain("Eskalation erforderlich");
  });

  it("kombiniert mehrere Checkpoints mit unterschiedlichen Strukturfeldern", () => {
    const input = {
      topicTitle: "Regressfall",
      checkpoints: [
        {
          id: "RG-01",
          title: "Anlass dokumentiert",
          kind: OfficeCheckpointKind.FACT,
          state: OfficeCheckpointState.OPEN,
          deadline: "2026-06-01",
          responsible_role: "GF",
          required_documents: ["Anschreiben KV"],
          escalation_needed: true,
        },
        {
          id: "RG-02",
          title: "Fristen geprueft",
          kind: OfficeCheckpointKind.RULE,
          state: OfficeCheckpointState.YES,
          authority: "Anwalt",
        },
        {
          id: "RG-03",
          title: "Verantwortung benannt",
          kind: OfficeCheckpointKind.ASSESSMENT,
          state: OfficeCheckpointState.OPEN,
          responsible_role: "Praxismanager",
        },
      ],
    };

    const output = buildOfficeSummaryText(input);

    expect(output).toContain("Fristen und Verantwortung");
    expect(output).toContain("Anlass dokumentiert");
    expect(output).toContain("Frist: 2026-06-01");
    expect(output).toContain("Verantw: GF");
    expect(output).toContain("Verantwortung benannt");
    expect(output).toContain("Verantw: Praxismanager");
    expect(output).toContain("Zustaendige Stellen");
    expect(output).toContain("Fristen geprueft: Anwalt");
    expect(output).toContain("Erforderliche Unterlagen");
    expect(output).toContain("• Anschreiben KV");
    expect(output).toContain("Eskalation erforderlich");
    const eskalationSection = output.split("Eskalation erforderlich")[1];
    expect(eskalationSection).toContain("Anlass dokumentiert");
  });
});
