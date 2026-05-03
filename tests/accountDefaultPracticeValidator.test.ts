/**
 * Tests für lib/accountDefaultPractice/validateInput.ts.
 */

import {
  firstDefaultPracticeFieldError,
  validateDefaultPracticeInput,
} from "@/lib/accountDefaultPractice/validateInput";

describe("validateDefaultPracticeInput", () => {
  it("akzeptiert action=set + practice_id (trim)", () => {
    const r = validateDefaultPracticeInput({
      action: "set",
      practice_id: "  p-1  ",
    });
    expect(r).toEqual({ ok: true, value: { action: "set", practice_id: "p-1" } });
  });

  it("akzeptiert action=clear ohne practice_id", () => {
    const r = validateDefaultPracticeInput({ action: "clear" });
    expect(r).toEqual({ ok: true, value: { action: "clear" } });
  });

  it("verlangt action", () => {
    const r = validateDefaultPracticeInput({});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.action).toBeTruthy();
  });

  it("lehnt unbekannte action ab", () => {
    const r = validateDefaultPracticeInput({ action: "delete" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.action).toBeTruthy();
  });

  it("verlangt practice_id bei action=set", () => {
    const r = validateDefaultPracticeInput({ action: "set" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.practice_id).toBeTruthy();
  });

  it("lehnt zu lange practice_id ab", () => {
    const r = validateDefaultPracticeInput({
      action: "set",
      practice_id: "x".repeat(65),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.practice_id).toBeTruthy();
  });

  it("firstDefaultPracticeFieldError priorisiert action", () => {
    expect(
      firstDefaultPracticeFieldError({
        action: "fehlt",
        practice_id: "fehlt2",
      }),
    ).toBe("fehlt");
    expect(firstDefaultPracticeFieldError({ practice_id: "fehlt2" })).toBe(
      "fehlt2",
    );
    expect(firstDefaultPracticeFieldError({})).toBeTruthy();
  });
});
