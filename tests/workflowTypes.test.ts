/**
 * Tests für lib/workflow/types.ts — Type-Guard-Funktionen
 */

import {
  isWorkflowRole,
  isProcessPointStatus,
  isValidProcessSnapshot,
} from "@/lib/workflow/types";

describe("isWorkflowRole", () => {
  it.each(["MFA", "ARZT"])("akzeptiert '%s'", (value) => {
    expect(isWorkflowRole(value)).toBe(true);
  });

  it.each([null, undefined, "", "mfa", "arzt", "PFLEGE", 42])(
    "lehnt '%s' ab",
    (value) => {
      expect(isWorkflowRole(value)).toBe(false);
    },
  );
});

describe("isProcessPointStatus", () => {
  it.each(["ERKENNBAR", "NICHT_ERFASST", "UNKLAR"])(
    "akzeptiert '%s'",
    (value) => {
      expect(isProcessPointStatus(value)).toBe(true);
    },
  );

  it.each([null, undefined, "", "erkennbar", "OK", "TO_DO"])(
    "lehnt '%s' ab",
    (value) => {
      expect(isProcessPointStatus(value)).toBe(false);
    },
  );
});

describe("isValidProcessSnapshot", () => {
  const validSnapshot = {
    topicId: "au-musterprozess",
    role: "MFA",
    processPoints: [],
  };

  it("akzeptiert gültigen Snapshot", () => {
    expect(isValidProcessSnapshot(validSnapshot)).toBe(true);
  });

  it("akzeptiert Snapshot mit processPoints und sessionNote", () => {
    expect(
      isValidProcessSnapshot({
        ...validSnapshot,
        processPoints: [{ id: "AU-P01", title: "Test", status: "UNKLAR" }],
        sessionNote: "Notiz",
      }),
    ).toBe(true);
  });

  it("lehnt null ab", () => {
    expect(isValidProcessSnapshot(null)).toBe(false);
  });

  it("lehnt Objekt ohne topicId ab", () => {
    expect(isValidProcessSnapshot({ role: "MFA", processPoints: [] })).toBe(
      false,
    );
  });

  it("lehnt Objekt mit ungültiger Rolle ab", () => {
    expect(
      isValidProcessSnapshot({ topicId: "x", role: "PFLEGE", processPoints: [] }),
    ).toBe(false);
  });

  it("lehnt Objekt ohne processPoints ab", () => {
    expect(isValidProcessSnapshot({ topicId: "x", role: "MFA" })).toBe(false);
  });

  it("lehnt non-Array processPoints ab", () => {
    expect(
      isValidProcessSnapshot({ topicId: "x", role: "MFA", processPoints: "[]" }),
    ).toBe(false);
  });
});
