/**
 * Smoke-Test für die pure Logik des Bestands-Migrationsskripts
 * (`scripts/migrate-prefill-runs.mjs`). Die getesteten Helfer leben in
 * `scripts/migrate-prefill-runs.helpers.cjs`, damit Skript und Test exakt
 * dieselben Funktionen verwenden.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const helpers = require("../scripts/migrate-prefill-runs.helpers.cjs") as {
  FALLBACK_SOURCE: string;
  hasSavedPrefill: (v: unknown) => boolean;
  deriveSource: (mode: unknown) => string;
  deriveCreatedBy: (source: string, ownerAccountId: string | null | undefined) => string | null;
  normalizeActiveCheckpoints: (value: unknown) => unknown[];
  parseArgs: (argv: string[]) => { apply: boolean; verbose: boolean };
};

describe("migrate-prefill-runs helpers", () => {
  describe("hasSavedPrefill", () => {
    it.each([
      ["null", null, false],
      ["undefined", undefined, false],
      ["leeres Array (Init-Wert)", [], false],
      ["nicht-leeres Array", [{ a: 1 }], false],
      ["leeres Objekt", {}, false],
      ["String", "ja", false],
      ["Number", 0, false],
      ["Objekt mit Antworten", { K01: { "MFA-K01-01": "ja" } }, true],
    ])("%s → %s", (_name, value, expected) => {
      expect(helpers.hasSavedPrefill(value)).toBe(expected);
    });
  });

  describe("deriveSource", () => {
    it("übernimmt erlaubte preparation_mode-Werte", () => {
      expect(helpers.deriveSource("mfa")).toBe("mfa");
      expect(helpers.deriveSource("conversation")).toBe("conversation");
      expect(helpers.deriveSource("patient")).toBe("patient");
    });

    it("fällt für 'none' / 'skipped' / leer / null defensiv auf 'mfa' zurück", () => {
      expect(helpers.deriveSource("none")).toBe(helpers.FALLBACK_SOURCE);
      expect(helpers.deriveSource("skipped")).toBe(helpers.FALLBACK_SOURCE);
      expect(helpers.deriveSource("")).toBe(helpers.FALLBACK_SOURCE);
      expect(helpers.deriveSource(null)).toBe(helpers.FALLBACK_SOURCE);
      expect(helpers.deriveSource(undefined)).toBe(helpers.FALLBACK_SOURCE);
      expect(helpers.deriveSource(123)).toBe(helpers.FALLBACK_SOURCE);
    });
  });

  describe("deriveCreatedBy", () => {
    it("gibt für 'patient' immer null zurück (kein Account-Bezug)", () => {
      expect(helpers.deriveCreatedBy("patient", "acc-1")).toBeNull();
      expect(helpers.deriveCreatedBy("patient", null)).toBeNull();
    });

    it("gibt für mfa/conversation den owner_account_id zurück (oder null)", () => {
      expect(helpers.deriveCreatedBy("mfa", "acc-1")).toBe("acc-1");
      expect(helpers.deriveCreatedBy("conversation", "acc-2")).toBe("acc-2");
      expect(helpers.deriveCreatedBy("mfa", null)).toBeNull();
      expect(helpers.deriveCreatedBy("mfa", undefined)).toBeNull();
    });
  });

  describe("normalizeActiveCheckpoints", () => {
    it("akzeptiert Arrays unverändert", () => {
      const arr = [{ id: "K01" }];
      expect(helpers.normalizeActiveCheckpoints(arr)).toBe(arr);
    });

    it("ersetzt nicht-Array-Werte durch leeres Array", () => {
      expect(helpers.normalizeActiveCheckpoints(null)).toEqual([]);
      expect(helpers.normalizeActiveCheckpoints(undefined)).toEqual([]);
      expect(helpers.normalizeActiveCheckpoints({ id: "K01" })).toEqual([]);
    });
  });

  describe("parseArgs", () => {
    it("Default ist Dry-Run", () => {
      expect(helpers.parseArgs([])).toEqual({ apply: false, verbose: false });
    });

    it("--apply schaltet Schreiben frei", () => {
      expect(helpers.parseArgs(["--apply"])).toEqual({ apply: true, verbose: false });
    });

    it("--verbose schaltet ausführliches Logging frei", () => {
      expect(helpers.parseArgs(["--verbose"])).toEqual({ apply: false, verbose: true });
    });
  });
});
