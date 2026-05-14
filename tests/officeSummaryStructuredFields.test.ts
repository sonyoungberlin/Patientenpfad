import { buildOfficeSummaryText } from "@/lib/office/summary";
import {
  OfficeCheckpointKind,
  OfficeCheckpointState,
  OfficeCheckpointType,
  type M2AnswerValue,
} from "@/lib/office/types";
import { OFFICE_TOPIC_HIRING_REPLACEMENT } from "@/lib/office/checkpointCatalog";

describe("office summary concise structure", () => {
  it("nutzt die neue kurze Office-Dokumentationsstruktur", () => {
    const output = buildOfficeSummaryText({
      topicTitle: "Arzt anstellen / Nachbesetzung",
      topicId: OFFICE_TOPIC_HIRING_REPLACEMENT,
      checkpoints: [
        {
          id: "NC-APPROBATION",
          title: "Approbation",
          kind: OfficeCheckpointKind.DECISION,
          state: OfficeCheckpointState.OPEN,
          m2_answers: {
            "M2-01": "NO",
          } as Record<string, M2AnswerValue>,
        },
      ],
    });

    expect(output).toContain("Office-Dokumentation:");
    expect(output).toContain("Geklaerte Bereiche");
    expect(output).toContain("Offene Bereiche");
    expect(output).toContain("Naechste Schritte");
    expect(output).toContain("Antwortquellen");
    expect(output).not.toContain("Ist-Stand");
    expect(output).not.toContain("Klaerungsstand nach Bereichen");
  });

  it("enthaelt keine redundante doppelphrase bei offenen punkten", () => {
    const output = buildOfficeSummaryText({
      topicTitle: "Test Topic",
      checkpoints: [
        {
          id: "CP-01",
          title: "Checkpoint 1",
          kind: OfficeCheckpointKind.FACT,
          state: OfficeCheckpointState.OPEN,
          m2_answers: {
            "M2-01": "NO",
          } as Record<string, M2AnswerValue>,
        },
      ],
    });

    expect(output).not.toContain("Nicht vollstaendig: Offen:");
  });

  it("zeigt geklaerte und offene bereiche getrennt", () => {
    const output = buildOfficeSummaryText({
      topicTitle: "Arzt anstellen / Nachbesetzung",
      topicId: OFFICE_TOPIC_HIRING_REPLACEMENT,
      checkpoints: [
        {
          id: "NC-APPROBATION",
          title: "Approbation",
          kind: OfficeCheckpointKind.DECISION,
          state: OfficeCheckpointState.YES,
          m2_answers: {
            "M2-01": "NO",
          } as Record<string, M2AnswerValue>,
        },
        {
          id: "NC-GENEHMIGUNGSSTATUS",
          title: "Genehmigungsstatus",
          kind: OfficeCheckpointKind.DECISION,
          state: OfficeCheckpointState.OPEN,
          m2_answers: {
            "M2-01": "UNCLEAR",
          } as Record<string, M2AnswerValue>,
        },
      ],
    });

    expect(output).toContain("Geklaerte Bereiche");
    expect(output).toContain("Berufsrechtliche Voraussetzungen");
    expect(output).toContain("Offene Bereiche");
    expect(output).toContain("KV / Zulassung / Abrechnung");
  });

  it("bildet naechste schritte handlungsorientiert ab", () => {
    const output = buildOfficeSummaryText({
      topicTitle: "Arzt anstellen / Nachbesetzung",
      topicId: OFFICE_TOPIC_HIRING_REPLACEMENT,
      checkpoints: [
        {
          id: "NC-APPROBATION",
          title: "Approbation",
          kind: OfficeCheckpointKind.DECISION,
          state: OfficeCheckpointState.OPEN,
          m2_answers: {
            "M2-01": "NO",
          } as Record<string, M2AnswerValue>,
        },
      ],
    });

    expect(output).toContain("Naechste Schritte");
    expect(output).toContain("Nachweis beschaffen: Approbation");
  });

  it("zeigt antwortquellen fuer offene bereiche", () => {
    const output = buildOfficeSummaryText({
      topicTitle: "Test Topic",
      checkpoints: [
        {
          id: "CP-01",
          title: "Checkpoint 1",
          kind: OfficeCheckpointKind.RULE,
          state: OfficeCheckpointState.OPEN,
          checkpointType: OfficeCheckpointType.EXTERNE_BESTAETIGUNG,
          authority: "KV Berlin",
          m2_answers: {
            "M2-01": "UNCLEAR",
          } as Record<string, M2AnswerValue>,
        },
      ],
    });

    expect(output).toContain("Antwortquellen");
    expect(output).toContain("KV Berlin");
  });

  it("enthaelt keine severity- oder risiko-woerter", () => {
    const output = buildOfficeSummaryText({
      topicTitle: "Test Topic",
      checkpoints: [
        {
          id: "CP-01",
          title: "Checkpoint 1",
          kind: OfficeCheckpointKind.FACT,
          state: OfficeCheckpointState.OPEN,
          m2_answers: {
            "M2-01": "NO",
          } as Record<string, M2AnswerValue>,
        },
      ],
    });

    expect(output).not.toContain("kritisch");
    expect(output).not.toContain("hoch");
    expect(output).not.toContain("mittel");
    expect(output).not.toContain("niedrig");
    expect(output).not.toContain("Risiko");
    expect(output).not.toContain("Warnung");
    expect(output).not.toContain("Eskalation");
  });
});
