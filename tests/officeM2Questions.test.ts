import {
  OFFICE_TOPIC_APPLICATION_MANAGEMENT,
  OFFICE_TOPIC_CLOSURE_COVERAGE,
  OFFICE_TOPIC_CONTINUING_EDUCATION,
  OFFICE_TOPIC_HIRING_REPLACEMENT,
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
});
