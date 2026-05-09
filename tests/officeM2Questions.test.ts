import {
  OFFICE_TOPIC_APPLICATION_MANAGEMENT,
  OFFICE_TOPIC_CLOSURE_COVERAGE,
  OFFICE_TOPIC_CONTINUING_EDUCATION,
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
