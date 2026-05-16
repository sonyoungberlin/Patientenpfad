import {
  OFFICE_TOPIC_APPLICATION_MANAGEMENT,
  OFFICE_TOPIC_CLOSURE_COVERAGE,
  OFFICE_TOPIC_CONTINUING_EDUCATION,
  OFFICE_TOPIC_HIRING_REPLACEMENT,
  OFFICE_TOPIC_KV_BILLING,
  OFFICE_TOPIC_REGRESS,
  OFFICE_TOPIC_REPORTING_DUTIES,
  OFFICE_TOPIC_SEAT_APPROVAL,
  getOfficeCheckpointCatalog,
} from "@/lib/office/checkpointCatalog";
import {
  getM2QuestionsForCheckpoint,
  getM2QuestionsForTopic,
} from "@/lib/office/m2Questions";

const NEW_TOPIC_IDS = [
  OFFICE_TOPIC_REGRESS,
  OFFICE_TOPIC_CLOSURE_COVERAGE,
  OFFICE_TOPIC_SEAT_APPROVAL,
  OFFICE_TOPIC_APPLICATION_MANAGEMENT,
  OFFICE_TOPIC_CONTINUING_EDUCATION,
  OFFICE_TOPIC_REPORTING_DUTIES,
] as const;

describe("office M2 questions", () => {
  it("liefert fuer alte HR-Checkpoint-IDs ueber Legacy-Mapping weiterhin Fragen", () => {
    const legacyToGovernance: Array<[string, string]> = [
      ["HR-01", "HR-GOV-A"],
      ["HR-02", "HR-GOV-A"],
      ["HR-03", "HR-GOV-C"],
      ["HR-04", "HR-GOV-B"],
      ["HR-05", "HR-GOV-D"],
    ];

    for (const [legacyId, governanceId] of legacyToGovernance) {
      const legacyQuestions = getM2QuestionsForCheckpoint(
        OFFICE_TOPIC_HIRING_REPLACEMENT,
        legacyId,
      );
      const governanceQuestions = getM2QuestionsForCheckpoint(
        OFFICE_TOPIC_HIRING_REPLACEMENT,
        governanceId,
      );

      expect(legacyQuestions.length).toBeGreaterThan(0);
      expect(legacyQuestions).toEqual(governanceQuestions);
    }
  });

  it("HR-topic stellt Fragen fuer alle neuen NC-Checkpoint-IDs bereit", () => {
    const hrCheckpointIds = getOfficeCheckpointCatalog(OFFICE_TOPIC_HIRING_REPLACEMENT).map(
      (checkpoint) => checkpoint.id,
    );
    const byCheckpoint = getM2QuestionsForTopic(OFFICE_TOPIC_HIRING_REPLACEMENT);
    const questionCheckpointIds = Object.keys(byCheckpoint).sort();

    const expectedNcIds = [
      "NC-REGISTERSTATUS",
      "NC-APPROBATION",
      "NC-FACHARZTQUALIFIKATION",
      "NC-BERUFSHAFTPFLICHT",
      "NC-TAETIGKEITSUMFANG",
      "NC-EXTERNE_STELLE",
      "NC-ANTRAGSWEG",
      "NC-GENEHMIGUNGSSTATUS",
      "NC-BETRIEBSSTAETTENSTRUKTUR",
      "NC-ARBEITSVERTRAG_FREIGABE",
      "NC-LANR_BSNR_ZUORDNUNG",
      "NC-SYSTEMZUGRIFFE_EINGERICHTET",
    ].sort();

    expect(hrCheckpointIds.sort()).toEqual(expectedNcIds);
    expect(questionCheckpointIds).toEqual(
      expect.arrayContaining([
        ...expectedNcIds,
        "HR-GOV-A",
        "HR-GOV-B",
        "HR-GOV-C",
        "HR-GOV-D",
      ]),
    );

    for (const checkpointId of expectedNcIds) {
      const questions = getM2QuestionsForCheckpoint(
        OFFICE_TOPIC_HIRING_REPLACEMENT,
        checkpointId,
      );
      expect(questions.length).toBeGreaterThanOrEqual(2);
      expect(questions.every((item) => item.id.trim().length > 0)).toBe(true);
      expect(questions.every((item) => item.text.trim().length > 0)).toBe(true);
    }
  });

  it("liefert fuer jeden Checkpoint der neuen Themen mindestens zwei Leitfragen", () => {
    for (const topicId of NEW_TOPIC_IDS) {
      const checkpoints = getOfficeCheckpointCatalog(topicId);

      for (const checkpoint of checkpoints) {
        const questions = getM2QuestionsForCheckpoint(topicId, checkpoint.id);
        expect(questions.length).toBeGreaterThanOrEqual(2);
        expect(questions.every((item) => item.id.trim().length > 0)).toBe(true);
        expect(questions.every((item) => item.text.trim().length > 0)).toBe(true);
      }
    }
  });

  it("fragenmapping der neuen Themen ist konsistent zum Checkpoint-Katalog", () => {
    for (const topicId of NEW_TOPIC_IDS) {
      const byCheckpoint = getM2QuestionsForTopic(topicId);
      const questionCheckpointIds = Object.keys(byCheckpoint).sort();
      const catalogCheckpointIds = getOfficeCheckpointCatalog(topicId)
        .map((checkpoint) => checkpoint.id)
        .sort();

      expect(questionCheckpointIds).toEqual(catalogCheckpointIds);
    }
  });

  // Erweitern, sobald ein Topic auf operative Ja/Nein/Unklar-Fragen migriert wurde.
  const OPERATIONAL_QUESTION_TOPICS = [
    OFFICE_TOPIC_KV_BILLING,
    OFFICE_TOPIC_REGRESS,
    OFFICE_TOPIC_SEAT_APPROVAL,
    OFFICE_TOPIC_APPLICATION_MANAGEMENT,
    OFFICE_TOPIC_CONTINUING_EDUCATION,
    OFFICE_TOPIC_REPORTING_DUTIES,
    OFFICE_TOPIC_HIRING_REPLACEMENT,
    OFFICE_TOPIC_CLOSURE_COVERAGE,
  ] as const;

  const W_PREFIXES = ["Was ", "Welch", "Wer ", "Wodurch"];

  const FORBIDDEN_TERMS = [
    "Compliance",
    "regelkonform",
    "belastbar",
    "ableitbar",
    "ma\u00dfgeblich",
    "massgeblich",
    "sichergestellt",
    "Existiert",
    "wurde bewertet",
    "wurden bewertet",
  ];

  it("migrierte Themen: keine Frage beginnt mit einem W-Fragewort", () => {
    for (const topicId of OPERATIONAL_QUESTION_TOPICS) {
      const byCheckpoint = getM2QuestionsForTopic(topicId);
      for (const [checkpointId, questions] of Object.entries(byCheckpoint)) {
        for (const q of questions) {
          const startsWithW = W_PREFIXES.some((p) => q.text.startsWith(p));
          if (startsWithW) {
            throw new Error(
              `[${topicId}/${checkpointId}/${q.id}] W-Fragewort am Anfang: "${q.text}"`,
            );
          }
        }
      }
    }
  });

  it("keine M2-Frage enthaelt verbotene Governance-Begriffe", () => {
    for (const topicId of OPERATIONAL_QUESTION_TOPICS) {
      const byCheckpoint = getM2QuestionsForTopic(topicId);
      for (const [checkpointId, questions] of Object.entries(byCheckpoint)) {
        for (const q of questions) {
          const textLower = q.text.toLowerCase();
          for (const term of FORBIDDEN_TERMS) {
            if (textLower.includes(term.toLowerCase())) {
              throw new Error(
                `[${topicId}/${checkpointId}/${q.id}] Verbotener Begriff "${term}" in: "${q.text}"`,
              );
            }
          }
        }
      }
    }
  });

  it("jeder Checkpoint der neuen Themen hat checkpointType, failureEffect und outcomeAudience", () => {
    for (const topicId of NEW_TOPIC_IDS) {
      const checkpoints = getOfficeCheckpointCatalog(topicId);
      for (const cp of checkpoints) {
        expect({ id: cp.id, field: "checkpointType", value: cp.checkpointType }).toMatchObject({
          id: cp.id,
          field: "checkpointType",
          value: expect.anything(),
        });
        expect({ id: cp.id, field: "failureEffect", value: cp.failureEffect }).toMatchObject({
          id: cp.id,
          field: "failureEffect",
          value: expect.anything(),
        });
        expect({ id: cp.id, field: "outcomeAudience", value: cp.outcomeAudience }).toMatchObject({
          id: cp.id,
          field: "outcomeAudience",
          value: expect.anything(),
        });
      }
    }
  });
});
