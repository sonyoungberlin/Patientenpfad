import {
  buildOfficeBlocks,
  getBlockAnswerSources,
  getPrimaryOpenTextForBlock,
  getTopNextSteps,
} from "@/lib/office/officeBlocks";
import {
  OFFICE_TOPIC_CLOSURE_COVERAGE,
  OFFICE_TOPIC_CME_GENERAL_MEDICINE,
  OFFICE_TOPIC_HIRING_REPLACEMENT,
} from "@/lib/office/checkpointCatalog";
import { OfficeCheckpointKind, OfficeCheckpointState, OfficeCheckpointType, type M2AnswerValue } from "@/lib/office/types";

describe("office blocks", () => {
  it("ordnet Hiring-Checkpoints in deklarierte Bloecke ein", () => {
    const blocks = buildOfficeBlocks({
      topicId: OFFICE_TOPIC_HIRING_REPLACEMENT,
      checkpoints: [
        {
          id: "NC-APPROBATION",
          title: "Approbation",
          kind: OfficeCheckpointKind.DECISION,
          state: OfficeCheckpointState.OPEN,
          m2_answers: { "M2-01": "NO" } as Record<string, M2AnswerValue>,
        },
        {
          id: "NC-GENEHMIGUNGSSTATUS",
          title: "Genehmigungsstatus",
          kind: OfficeCheckpointKind.DECISION,
          state: OfficeCheckpointState.OPEN,
          m2_answers: { "M2-01": "UNCLEAR" } as Record<string, M2AnswerValue>,
        },
        {
          id: "NC-ARBEITSVERTRAG_FREIGABE",
          title: "Arbeitsvertrag freigegeben",
          kind: OfficeCheckpointKind.DECISION,
          state: OfficeCheckpointState.OPEN,
          m2_answers: { "M2-01": "YES" } as Record<string, M2AnswerValue>,
        },
      ],
    });

    expect(blocks.map((block) => block.title)).toEqual([
      "Berufsrechtliche Voraussetzungen",
      "KV / Zulassung / Abrechnung",
      "Vertrag und Startorganisation",
    ]);
  });

  it("setzt Blockstatus auf offen wenn ein Checkpoint state NO hat", () => {
    const blocks = buildOfficeBlocks({
      topicId: OFFICE_TOPIC_CLOSURE_COVERAGE,
      checkpoints: [
        {
          id: "UV-ABRECHNUNGSZUORDNUNG",
          title: "Abrechnungszuordnung Vertretung festgelegt",
          kind: OfficeCheckpointKind.DECISION,
          state: OfficeCheckpointState.NO,
          m2_answers: { "M2-01": "YES" } as Record<string, M2AnswerValue>,
        },
      ],
    });

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.title).toBe("Abrechnung / Zustaendigkeit");
    expect(blocks[0]?.status).toBe("offen");
  });

  it("setzt Blockstatus auf geklaert wenn alle Checkpoints YES sind, auch bei alten M2-Negativantworten", () => {
    const blocks = buildOfficeBlocks({
      topicId: OFFICE_TOPIC_HIRING_REPLACEMENT,
      checkpoints: [
        {
          id: "NC-BETRIEBSSTAETTENSTRUKTUR",
          title: "Betriebsstaettenstruktur",
          kind: OfficeCheckpointKind.DECISION,
          state: OfficeCheckpointState.YES,
          m2_answers: { "M2-01": "NO" } as Record<string, M2AnswerValue>,
        },
      ],
    });

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.status).toBe("geklaert");
  });

  it("verwendet generische Fallback-Regeln fuer checkpointType und default", () => {
    const blocks = buildOfficeBlocks({
      checkpoints: [
        {
          id: "CP-NACHWEIS",
          title: "Nachweis",
          kind: OfficeCheckpointKind.SOURCE,
          checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
          state: OfficeCheckpointState.OPEN,
        },
        {
          id: "CP-UNKNOWN",
          title: "Unbekannt",
          kind: OfficeCheckpointKind.FACT,
          state: OfficeCheckpointState.OPEN,
        },
      ],
    });

    expect(blocks.map((block) => block.title)).toEqual(["Nachweise", "Weitere Klaerung"]);
  });

  it("ordnet Fortbildungs-Overrides korrekt zu", () => {
    const blocks = buildOfficeBlocks({
      topicId: OFFICE_TOPIC_CME_GENERAL_MEDICINE,
      checkpoints: [
        {
          id: "FB-01",
          title: "Fortbildungszeitraum dokumentiert",
          kind: OfficeCheckpointKind.RULE,
          state: OfficeCheckpointState.OPEN,
          m2_answers: { "M2-01": "UNCLEAR" } as Record<string, M2AnswerValue>,
        },
        {
          id: "FB-03",
          title: "Nachweise archiviert",
          kind: OfficeCheckpointKind.RULE,
          state: OfficeCheckpointState.OPEN,
          m2_answers: { "M2-01": "NO" } as Record<string, M2AnswerValue>,
        },
        {
          id: "FB-AUFHOLPLAN",
          title: "Aufholplan dokumentiert",
          kind: OfficeCheckpointKind.RULE,
          state: OfficeCheckpointState.OPEN,
          m2_answers: { "M2-01": "NO" } as Record<string, M2AnswerValue>,
        },
      ],
    });

    expect(blocks.map((block) => block.title)).toEqual([
      "Zeitraum und Punktestand",
      "Nachweise und Meldung",
      "Frist und Massnahmen",
    ]);
  });

  it("liefert einen kompakten primary-open-text je offenem block", () => {
    const blocks = buildOfficeBlocks({
      topicId: OFFICE_TOPIC_HIRING_REPLACEMENT,
      checkpoints: [
        {
          id: "NC-APPROBATION",
          title: "Approbation",
          kind: OfficeCheckpointKind.DECISION,
          state: OfficeCheckpointState.OPEN,
          m2_answers: { "M2-01": "NO" } as Record<string, M2AnswerValue>,
        },
      ],
    });

    expect(blocks).toHaveLength(1);
    expect(getPrimaryOpenTextForBlock(blocks[0]!)).toBe("Nachweis fehlt");
  });

  it("liefert deduplizierte naechste schritte mit max 5 eintraegen", () => {
    const blocks = buildOfficeBlocks({
      topicId: OFFICE_TOPIC_HIRING_REPLACEMENT,
      checkpoints: [
        {
          id: "NC-APPROBATION",
          title: "Approbation",
          kind: OfficeCheckpointKind.DECISION,
          state: OfficeCheckpointState.OPEN,
          m2_answers: {
            "M2-01": "NO",
            "M2-02": "NO",
          } as Record<string, M2AnswerValue>,
        },
        {
          id: "NC-EXTERNE_STELLE",
          title: "Zustaendige externe Stelle",
          kind: OfficeCheckpointKind.DECISION,
          state: OfficeCheckpointState.OPEN,
          m2_answers: {
            "M2-01": "UNCLEAR",
          } as Record<string, M2AnswerValue>,
        },
      ],
    });

    const steps = getTopNextSteps(blocks, 5);
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.length).toBeLessThanOrEqual(5);
    expect(new Set(steps).size).toBe(steps.length);
  });

  it("liefert antwortquellen nur fuer offene actions", () => {
    const blocks = buildOfficeBlocks({
      topicId: OFFICE_TOPIC_HIRING_REPLACEMENT,
      checkpoints: [
        {
          id: "NC-GENEHMIGUNGSSTATUS",
          title: "Genehmigungsstatus",
          kind: OfficeCheckpointKind.DECISION,
          state: OfficeCheckpointState.OPEN,
          m2_answers: { "M2-01": "UNCLEAR" } as Record<string, M2AnswerValue>,
        },
      ],
    });

    const sources = getBlockAnswerSources(blocks[0]!);
    expect(sources).toContain("KV / Zulassungsausschuss");
  });
});
