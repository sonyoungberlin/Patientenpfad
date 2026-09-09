import {
  activeQuestionnaireLifecycleFilter,
  expiredCompletedQuestionnaireFilter,
  expiredPendingQuestionnaireFilter,
  expiredTrashQuestionnaireFilter,
  questionnaireSubmittedCutoff,
  questionnaireTrashCutoff,
  trashQuestionnaireLifecycleFilter,
} from "@/lib/questionnaire/lifecycle";

const NOW = new Date("2026-09-08T12:00:00.000Z");

describe("questionnaire lifecycle filters", () => {
  it("trennt Pending eine Minute vor und nach Linkablauf", () => {
    const active = activeQuestionnaireLifecycleFilter(NOW);
    const expired = expiredPendingQuestionnaireFilter(NOW);

    expect(active).toEqual({
      OR: [
        { session_kind: { not: "patient_communication" } },
        {
          session_kind: "patient_communication",
          OR: expect.arrayContaining([
            { status: "pending", token_expires_at: { gt: NOW } },
          ]),
        },
      ],
    });
    expect(expired).toEqual(expect.objectContaining({
      status: "pending",
      session_kind: "patient_communication",
      token: { not: null },
      token_expires_at: { lte: NOW },
    }));
  });

  it("trennt Completed eine Minute vor und nach sieben Tagen", () => {
    const cutoff = new Date("2026-09-01T12:00:00.000Z");
    expect(questionnaireSubmittedCutoff(NOW)).toEqual(cutoff);
    expect(activeQuestionnaireLifecycleFilter(NOW)).toEqual({
      OR: [
        { session_kind: { not: "patient_communication" } },
        {
          session_kind: "patient_communication",
          OR: expect.arrayContaining([
            { status: "completed", submitted_at: { gt: cutoff } },
          ]),
        },
      ],
    });
    expect(expiredCompletedQuestionnaireFilter(NOW)).toEqual(expect.objectContaining({
      status: "completed",
      session_kind: "patient_communication",
      submitted_at: { lte: cutoff },
    }));
  });

  it("trennt Papierkorb eine Minute vor und nach 48 Stunden", () => {
    const cutoff = new Date("2026-09-06T12:00:00.000Z");
    expect(questionnaireTrashCutoff(NOW)).toEqual(cutoff);
    expect(trashQuestionnaireLifecycleFilter(NOW)).toEqual({
      status: "completed",
      session_kind: "patient_communication",
      deleted_at: { gt: cutoff },
    });
    expect(expiredTrashQuestionnaireFilter(NOW)).toEqual({
      status: "completed",
      session_kind: "patient_communication",
      deleted_at: { lte: cutoff },
    });
  });
});