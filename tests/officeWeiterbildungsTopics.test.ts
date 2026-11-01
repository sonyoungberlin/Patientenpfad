import {
  OFFICE_TOPIC_TRAINING_AUTHORITY_APPLICATION,
  OFFICE_TOPIC_TRAINING_PHYSICIAN_HIRING,
  getCurrentOfficeTopicVersion,
  getOfficeCheckpointCatalog,
} from "@/lib/office/checkpointCatalog";
import { getM2QuestionsForTopic } from "@/lib/office/m2Questions";
import { isLegalSourceId } from "@/lib/office/legalSources";
import { isAuthorityId } from "@/lib/office/authorities";
import { isEvidenceId } from "@/lib/office/evidenceCatalog";

const TOPICS = [
  OFFICE_TOPIC_TRAINING_AUTHORITY_APPLICATION,
  OFFICE_TOPIC_TRAINING_PHYSICIAN_HIRING,
] as const;

describe("Office-Topics zur ärztlichen Weiterbildung", () => {
  it("stellt die vereinbarten 7 und 8 Checkpoints bereit", () => {
    expect(
      getOfficeCheckpointCatalog(OFFICE_TOPIC_TRAINING_AUTHORITY_APPLICATION).map(
        (checkpoint) => checkpoint.id,
      ),
    ).toEqual([
      "WBB-01",
      "WBB-02",
      "WBB-03",
      "WBB-04",
      "WBB-05",
      "WBB-06",
      "WBB-07",
    ]);
    expect(
      getOfficeCheckpointCatalog(OFFICE_TOPIC_TRAINING_PHYSICIAN_HIRING).map(
        (checkpoint) => checkpoint.id,
      ),
    ).toEqual([
      "WBA-01",
      "WBA-02",
      "WBA-03",
      "WBA-04",
      "WBA-05",
      "WBA-06",
      "WBA-07",
      "WBA-08",
    ]);
  });

  it("hat je Checkpoint genau eine M2-Frage und alle Registry-Referenzen sind gültig", () => {
    for (const topicId of TOPICS) {
      expect(getCurrentOfficeTopicVersion(topicId)).toBe(1);
      const questions = getM2QuestionsForTopic(topicId);
      const checkpoints = getOfficeCheckpointCatalog(topicId);
      expect(Object.keys(questions).sort()).toEqual(
        checkpoints.map((checkpoint) => checkpoint.id).sort(),
      );

      for (const checkpoint of checkpoints) {
        expect(questions[checkpoint.id]).toHaveLength(1);
        expect(questions[checkpoint.id][0].text).toMatch(/\?$/);
        for (const ref of checkpoint.legalRefs ?? []) expect(isLegalSourceId(ref)).toBe(true);
        for (const ref of checkpoint.authorityKeys ?? []) expect(isAuthorityId(ref)).toBe(true);
        for (const ref of checkpoint.requiredEvidenceKeys ?? []) expect(isEvidenceId(ref)).toBe(true);
        for (const ref of checkpoint.optionalEvidenceKeys ?? []) expect(isEvidenceId(ref)).toBe(true);
      }
    }
  });

  it("ordnet die offiziellen Textquellen den passenden Themen zu", () => {
    const authorityApplication = getOfficeCheckpointCatalog(
      OFFICE_TOPIC_TRAINING_AUTHORITY_APPLICATION,
    );
    const physicianHiring = getOfficeCheckpointCatalog(
      OFFICE_TOPIC_TRAINING_PHYSICIAN_HIRING,
    );

    expect(authorityApplication.find((checkpoint) => checkpoint.id === "WBB-01")?.legalRefs)
      .toContain("AEKB_WBO_2021_PAR_5");
    expect(authorityApplication.find((checkpoint) => checkpoint.id === "WBB-02")?.legalRefs)
      .toContain("AEKB_WBA_GENERAL_MEDICINE_CRITERIA");
    expect(physicianHiring.find((checkpoint) => checkpoint.id === "WBA-03")?.legalRefs)
      .toEqual(expect.arrayContaining([
        "AERZTE_ZV_PAR_32",
        "AERZTE_ZV_PAR_32B",
        "KV_BERLIN_WBA_EMPLOYMENT_INFO",
      ]));
    expect(physicianHiring.find((checkpoint) => checkpoint.id === "WBA-06")?.legalRefs)
      .toEqual(expect.arrayContaining(["SGB_V_PAR_75A", "KV_BERLIN_WBA_FUNDING_INFO"]));
  });
});