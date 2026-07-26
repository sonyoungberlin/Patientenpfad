/**
 * Tests für lib/workflow/internalProtocol/officialContent.ts
 */

import {
  isOfficialBindingLevel,
  isOfficialSource,
  isOfficialRule,
  type OfficialSource,
  type OfficialRule,
} from "@/lib/workflow/internalProtocol/officialContent";

// ---------------------------------------------------------------------------
// Hilfsobjekte
// ---------------------------------------------------------------------------

function makeSource(overrides: Partial<OfficialSource> = {}): OfficialSource {
  return {
    id: "SRC-01",
    author: "G-BA",
    title: "Musterprozess-Richtlinie",
    reviewedAt: "2026-07-01",
    ...overrides,
  };
}

function makeRule(overrides: Partial<OfficialRule> = {}): OfficialRule {
  return {
    id: "RULE-01",
    text: "Patienten ohne Termin sind zunächst zu registrieren.",
    bindingLevel: "MANDATORY",
    source: makeSource(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// isOfficialBindingLevel
// ---------------------------------------------------------------------------

describe("isOfficialBindingLevel", () => {
  it("akzeptiert MANDATORY", () => {
    expect(isOfficialBindingLevel("MANDATORY")).toBe(true);
  });

  it("akzeptiert RECOMMENDED", () => {
    expect(isOfficialBindingLevel("RECOMMENDED")).toBe(true);
  });

  it("akzeptiert ORIENTATION", () => {
    expect(isOfficialBindingLevel("ORIENTATION")).toBe(true);
  });

  it.each(["VERBINDLICH", "EMPFEHLUNG", "mandatory", ""])(
    "lehnt unbekannten Wert '%s' ab",
    (val) => {
      expect(isOfficialBindingLevel(val)).toBe(false);
    },
  );

  it("lehnt null ab", () => {
    expect(isOfficialBindingLevel(null)).toBe(false);
  });

  it("lehnt undefined ab", () => {
    expect(isOfficialBindingLevel(undefined)).toBe(false);
  });

  it("lehnt leeren String ab", () => {
    expect(isOfficialBindingLevel("")).toBe(false);
  });

  it("lehnt Zahl ab", () => {
    expect(isOfficialBindingLevel(1)).toBe(false);
  });

  it("lehnt Array ab", () => {
    expect(isOfficialBindingLevel(["MANDATORY"])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isOfficialSource
// ---------------------------------------------------------------------------

describe("isOfficialSource", () => {
  it("akzeptiert vollständige gültige Quelle", () => {
    expect(
      isOfficialSource(
        makeSource({
          publicationDate: "2024-01-01",
          url: "https://example.com",
          reference: "§ 5 Abs. 1",
        }),
      ),
    ).toBe(true);
  });

  it("akzeptiert Quelle nur mit Pflichtfeldern", () => {
    expect(isOfficialSource(makeSource())).toBe(true);
  });

  it("lehnt null ab", () => {
    expect(isOfficialSource(null)).toBe(false);
  });

  it("lehnt Array ab", () => {
    expect(isOfficialSource([])).toBe(false);
  });

  it("lehnt leeres Objekt ab", () => {
    expect(isOfficialSource({})).toBe(false);
  });

  it("lehnt fehlende id ab", () => {
    const { id: _id, ...rest } = makeSource();
    expect(isOfficialSource(rest)).toBe(false);
  });

  it("lehnt fehlenden author ab", () => {
    const { author: _author, ...rest } = makeSource();
    expect(isOfficialSource(rest)).toBe(false);
  });

  it("lehnt fehlenden title ab", () => {
    const { title: _title, ...rest } = makeSource();
    expect(isOfficialSource(rest)).toBe(false);
  });

  it("lehnt fehlendes reviewedAt ab", () => {
    const { reviewedAt: _reviewedAt, ...rest } = makeSource();
    expect(isOfficialSource(rest)).toBe(false);
  });

  it("lehnt leere id ab", () => {
    expect(isOfficialSource(makeSource({ id: "" }))).toBe(false);
  });

  it("lehnt leeren author ab", () => {
    expect(isOfficialSource(makeSource({ author: "" }))).toBe(false);
  });

  it("lehnt leeren title ab", () => {
    expect(isOfficialSource(makeSource({ title: "" }))).toBe(false);
  });

  it("lehnt leeres reviewedAt ab", () => {
    expect(isOfficialSource(makeSource({ reviewedAt: "" }))).toBe(false);
  });

  it("lehnt ungültige optionale publicationDate ab (Zahl)", () => {
    expect(isOfficialSource({ ...makeSource(), publicationDate: 2024 })).toBe(
      false,
    );
  });

  it("lehnt ungültige optionale url ab (Zahl)", () => {
    expect(isOfficialSource({ ...makeSource(), url: 42 })).toBe(false);
  });

  it("lehnt ungültige optionale reference ab (Boolean)", () => {
    expect(isOfficialSource({ ...makeSource(), reference: true })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isOfficialRule
// ---------------------------------------------------------------------------

describe("isOfficialRule", () => {
  it("akzeptiert vollständige gültige Regel", () => {
    expect(
      isOfficialRule(makeRule({ title: "Registrierungspflicht", note: "Gilt montags–freitags" })),
    ).toBe(true);
  });

  it("akzeptiert gültige Regel ohne optionale Felder", () => {
    expect(isOfficialRule(makeRule())).toBe(true);
  });

  it("lehnt ungültiges bindingLevel ab", () => {
    expect(isOfficialRule(makeRule({ bindingLevel: "FALSCH" as "MANDATORY" }))).toBe(
      false,
    );
  });

  it("lehnt fehlenden Regeltext ab", () => {
    const { text: _text, ...rest } = makeRule();
    expect(isOfficialRule(rest)).toBe(false);
  });

  it("lehnt leeren Regeltext ab", () => {
    expect(isOfficialRule(makeRule({ text: "" }))).toBe(false);
  });

  it("lehnt leere id ab", () => {
    expect(isOfficialRule(makeRule({ id: "" }))).toBe(false);
  });

  it("lehnt ungültige Quelle ab", () => {
    expect(
      isOfficialRule({ ...makeRule(), source: { id: "", author: "X", title: "Y", reviewedAt: "2026" } }),
    ).toBe(false);
  });

  it("lehnt fehlende Quelle ab", () => {
    const { source: _source, ...rest } = makeRule();
    expect(isOfficialRule(rest)).toBe(false);
  });

  it("lehnt title als Nicht-String ab", () => {
    expect(isOfficialRule({ ...makeRule(), title: 42 })).toBe(false);
  });

  it("lehnt note als Nicht-String ab", () => {
    expect(isOfficialRule({ ...makeRule(), note: true })).toBe(false);
  });

  it("lehnt null ab", () => {
    expect(isOfficialRule(null)).toBe(false);
  });

  it("lehnt Array ab", () => {
    expect(isOfficialRule([makeRule()])).toBe(false);
  });

  it("wirft keine Ausnahme bei ungewöhnlichen Eingaben", () => {
    expect(() => isOfficialRule(undefined)).not.toThrow();
    expect(() => isOfficialRule(Symbol("x"))).not.toThrow();
    expect(() => isOfficialRule(Object.create(null))).not.toThrow();
  });
});
