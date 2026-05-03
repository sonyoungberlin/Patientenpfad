/**
 * Phase 3d: Tests für lib/websiteForms/practiceVisibility.ts.
 */

import {
  isAwaitingEmailConfirmation,
  isQuestionnaireVisibleToPractice,
  PRACTICE_VISIBLE_SESSION_FILTER,
} from "@/lib/websiteForms/practiceVisibility";

describe("isQuestionnaireVisibleToPractice", () => {
  it("interne Sessions immer sichtbar — egal welcher Status", () => {
    expect(
      isQuestionnaireVisibleToPractice({
        source: "internal_link",
        status: "pending",
        confirmed_at: null,
      }),
    ).toBe(true);
    expect(
      isQuestionnaireVisibleToPractice({
        source: "internal_link",
        status: "completed",
        confirmed_at: null,
      }),
    ).toBe(true);
  });

  it("Website-Sessions: nur sichtbar wenn completed UND confirmed_at != null", () => {
    expect(
      isQuestionnaireVisibleToPractice({
        source: "website",
        status: "awaiting_email_confirmation",
        confirmed_at: null,
      }),
    ).toBe(false);
    expect(
      isQuestionnaireVisibleToPractice({
        source: "website",
        status: "completed",
        confirmed_at: null, // ungewöhnlich, aber defensiv
      }),
    ).toBe(false);
    expect(
      isQuestionnaireVisibleToPractice({
        source: "website",
        status: "pending",
        confirmed_at: new Date(),
      }),
    ).toBe(false);
    expect(
      isQuestionnaireVisibleToPractice({
        source: "website",
        status: "completed",
        confirmed_at: new Date(),
      }),
    ).toBe(true);
  });
});

describe("PRACTICE_VISIBLE_SESSION_FILTER", () => {
  it("enthält OR mit interne-OR-website-confirmed Klauseln", () => {
    expect(PRACTICE_VISIBLE_SESSION_FILTER.OR).toBeDefined();
    const ors = PRACTICE_VISIBLE_SESSION_FILTER.OR as Array<Record<string, unknown>>;
    expect(ors).toHaveLength(2);
    expect(ors[0]).toEqual({ source: { not: "website" } });
    expect(ors[1]).toEqual({
      AND: [
        { source: "website" },
        { status: "completed" },
        { confirmed_at: { not: null } },
      ],
    });
  });
});

describe("isAwaitingEmailConfirmation", () => {
  it("ist true nur für 'awaiting_email_confirmation'", () => {
    expect(isAwaitingEmailConfirmation({ status: "awaiting_email_confirmation" })).toBe(
      true,
    );
    expect(isAwaitingEmailConfirmation({ status: "completed" })).toBe(false);
    expect(isAwaitingEmailConfirmation({ status: "pending" })).toBe(false);
  });
});
