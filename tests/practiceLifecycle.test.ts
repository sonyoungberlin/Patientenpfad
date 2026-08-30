import {
  getPracticeDeletableAt,
  isPracticeActive,
  isPracticeDeletable,
  PRACTICE_DEACTIVATION_GRACE_PERIOD_MS,
} from "@/lib/practice/lifecycle";

describe("Practice-Lifecycle", () => {
  const disabledAt = new Date("2026-01-01T00:00:00.000Z");

  it("unterscheidet aktive und deaktivierte Praxen", () => {
    expect(isPracticeActive({ is_approved: true, disabled_at: null })).toBe(true);
    expect(isPracticeActive({ is_approved: false, disabled_at: null })).toBe(false);
    expect(isPracticeActive({ is_approved: true, disabled_at: disabledAt })).toBe(false);
  });

  it("macht eine Praxis exakt nach 30 Tagen löschbar", () => {
    const deletableAt = getPracticeDeletableAt(disabledAt)!;
    expect(deletableAt.getTime()).toBe(disabledAt.getTime() + PRACTICE_DEACTIVATION_GRACE_PERIOD_MS);
    expect(isPracticeDeletable(disabledAt, new Date(deletableAt.getTime() - 1))).toBe(false);
    expect(isPracticeDeletable(disabledAt, deletableAt)).toBe(true);
  });

  it("macht aktive oder nie deaktivierte Praxen nicht löschbar", () => {
    expect(getPracticeDeletableAt(null)).toBeNull();
    expect(isPracticeDeletable(null)).toBe(false);
  });
});