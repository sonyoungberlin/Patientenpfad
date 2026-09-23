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
        {
          session_kind: { not: "patient_communication" },
          NOT: expect.any(Object),
        },
        {
          session_kind: "patient_communication",
          OR: expect.arrayContaining([
            expect.objectContaining({ status: "pending", token_expires_at: { gt: NOW } }),
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

  it("blendet direkte technische Vor-Submit-Sessions aus dem fachlichen Lifecycle aus", () => {
    const active = activeQuestionnaireLifecycleFilter(NOW);
    expect(active).toEqual({
      OR: [
        {
          session_kind: { not: "patient_communication" },
          NOT: expect.objectContaining({
            source: { in: ["kiosk_direct", "practice_direct"] },
            status: "pending",
            submitted_at: null,
          }),
        },
        {
          session_kind: "patient_communication",
          OR: expect.arrayContaining([
            expect.objectContaining({
              status: "pending",
              NOT: expect.objectContaining({
                source: { in: ["kiosk_direct", "practice_direct"] },
                submitted_at: null,
              }),
            }),
          ]),
        },
      ],
    });
  });

  it("lässt abgeschlossene direkte Sessions und Check-in-Handoffs im Lifecycle", () => {
    const active = activeQuestionnaireLifecycleFilter(NOW);
    const [internalBranch, patientBranch] = active.OR as Array<Record<string, unknown>>;
    expect(internalBranch).toEqual(expect.objectContaining({
      session_kind: { not: "patient_communication" },
    }));
    expect(patientBranch).toEqual(expect.objectContaining({
      session_kind: "patient_communication",
    }));
    expect(patientBranch.OR).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: "completed", submitted_at: { gt: expect.any(Date) } }),
    ]));
    expect(JSON.stringify(active)).toContain("CHECK_IN");
  });

  it("trennt Completed eine Minute vor und nach sieben Tagen", () => {
    const cutoff = new Date("2026-09-01T12:00:00.000Z");
    expect(questionnaireSubmittedCutoff(NOW)).toEqual(cutoff);
    expect(activeQuestionnaireLifecycleFilter(NOW)).toEqual({
      OR: [
        {
          session_kind: { not: "patient_communication" },
          NOT: expect.any(Object),
        },
        {
          session_kind: "patient_communication",
          OR: expect.arrayContaining([
            expect.objectContaining({ status: "completed", submitted_at: { gt: cutoff } }),
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