import {
  isQuestionnaireExportFinal,
  QUESTIONNAIRE_EXPORT_FINALITY_FILTER,
} from "@/lib/questionnaire/exportFinality";

const completed = { status: "completed" };

describe("questionnaire export finality", () => {
  it.each([
    ["normal completed", completed, true],
    ["normal pending", { status: "pending" }, false],
    ["public waiting parent", {
      ...completed,
      public_check_in_handoff: { status: "waiting", follow_up_session: null },
    }, false],
    ["public closed parent", {
      ...completed,
      public_check_in_handoff: { status: "closed", follow_up_session: null },
    }, true],
    ["public parent with pending child", {
      ...completed,
      public_check_in_handoff: {
        status: "questionnaire_ready",
        follow_up_session: { status: "pending" },
      },
    }, false],
    ["public parent with completed child", {
      ...completed,
      public_check_in_handoff: {
        status: "questionnaire_ready",
        follow_up_session: { status: "completed" },
      },
    }, true],
    ["kiosk waiting parent", {
      ...completed,
      kiosk_handoff_status: "waiting",
    }, false],
    ["kiosk closed parent", {
      ...completed,
      kiosk_handoff_status: "closed",
    }, true],
    ["kiosk parent with pending child", {
      ...completed,
      kiosk_handoff_status: "questionnaire_ready",
      kiosk_follow_up_session: { status: "pending" },
    }, false],
    ["kiosk parent with completed child", {
      ...completed,
      kiosk_handoff_status: "questionnaire_ready",
      kiosk_follow_up_session: { status: "completed" },
    }, true],
    ["public completed child", {
      ...completed,
      public_check_in_handoff: null,
    }, true],
    ["public pending child", {
      status: "pending",
      public_check_in_handoff: null,
    }, false],
    ["kiosk completed child", {
      ...completed,
      kiosk_handoff_status: null,
    }, true],
    ["kiosk pending child", {
      status: "pending",
      kiosk_handoff_status: null,
    }, false],
  ])("evaluates %s", (_label, session, expected) => {
    expect(isQuestionnaireExportFinal(session)).toBe(expected);
  });

  it("bildet dieselben Parent-Freigaben im atomaren Prisma-Filter ab", () => {
    expect(QUESTIONNAIRE_EXPORT_FINALITY_FILTER).toEqual(expect.objectContaining({
      status: "completed",
      OR: expect.arrayContaining([
        { kiosk_handoff_status: "closed" },
        expect.objectContaining({ kiosk_handoff_status: "questionnaire_ready" }),
        { public_check_in_handoff: { is: { status: "closed" } } },
        expect.objectContaining({ public_check_in_handoff: expect.any(Object) }),
      ]),
    }));
  });
});