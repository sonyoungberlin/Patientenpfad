/**
 * Tests für lib/workflow/internalProtocol/questions.ts
 */

import {
  isProtocolQuestionKind,
  isProtocolAnswerOption,
  isProtocolQuestion,
  isProtocolSection,
  type ProtocolAnswerOption,
  type ProtocolQuestion,
  type ProtocolSection,
} from "@/lib/workflow/internalProtocol/questions";
import type { OfficialRule } from "@/lib/workflow/internalProtocol/officialContent";

// ---------------------------------------------------------------------------
// Hilfsobjekte
// ---------------------------------------------------------------------------

function makeOption(overrides: Partial<ProtocolAnswerOption> = {}): ProtocolAnswerOption {
  return {
    id: "OPT-A",
    label: "MFA am Empfang",
    outputText: "Die erste Einschätzung erfolgt durch die MFA am Empfang.",
    ...overrides,
  };
}

function makeYesNoQ(overrides: Partial<Record<string, unknown>> = {}): ProtocolQuestion {
  return {
    id: "Q-01",
    text: "Ist ein Arzt verfügbar?",
    kind: "YES_NO_UNCLEAR",
    ...overrides,
  } as ProtocolQuestion;
}

function makeSingleQ(overrides: Partial<Record<string, unknown>> = {}): ProtocolQuestion {
  return {
    id: "Q-02",
    text: "Wer trifft die Entscheidung?",
    kind: "SINGLE_SELECT",
    options: [makeOption(), makeOption({ id: "OPT-B", label: "Arzt", outputText: "Die Entscheidung trifft der Arzt." })],
    ...overrides,
  } as ProtocolQuestion;
}

function makeMultiQ(overrides: Partial<Record<string, unknown>> = {}): ProtocolQuestion {
  return {
    id: "Q-03",
    text: "Welche Stellen werden informiert?",
    kind: "MULTI_SELECT",
    options: [
      makeOption({ id: "OPT-X", label: "Labor", outputText: "Das Labor wird informiert." }),
    ],
    ...overrides,
  } as ProtocolQuestion;
}

function makeFreeTextQ(overrides: Partial<Record<string, unknown>> = {}): ProtocolQuestion {
  return {
    id: "Q-04",
    text: "Welche Besonderheiten sind zu beachten?",
    kind: "FREE_TEXT",
    ...overrides,
  } as ProtocolQuestion;
}

function makeRule(overrides: Partial<OfficialRule> = {}): OfficialRule {
  return {
    id: "RULE-01",
    text: "Patienten ohne Termin sind zu registrieren.",
    bindingLevel: "MANDATORY",
    source: {
      id: "SRC-01",
      author: "G-BA",
      title: "Musterprozess-Richtlinie",
      reviewedAt: "2026-07-01",
    },
    ...overrides,
  };
}

function makeSection(overrides: Partial<ProtocolSection> = {}): ProtocolSection {
  return {
    id: "SEC-01",
    title: "Zuständigkeit",
    officialRules: [makeRule()],
    questions: [makeYesNoQ()],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// isProtocolQuestionKind
// ---------------------------------------------------------------------------

describe("isProtocolQuestionKind", () => {
  it.each(["YES_NO_UNCLEAR", "SINGLE_SELECT", "MULTI_SELECT", "FREE_TEXT"])(
    "akzeptiert '%s'",
    (kind) => {
      expect(isProtocolQuestionKind(kind)).toBe(true);
    },
  );

  it.each(["yes_no", "FREETEXT", "", "selectone"])(
    "lehnt unbekannten Wert '%s' ab",
    (val) => {
      expect(isProtocolQuestionKind(val)).toBe(false);
    },
  );

  it("lehnt null ab", () => expect(isProtocolQuestionKind(null)).toBe(false));
  it("lehnt undefined ab", () => expect(isProtocolQuestionKind(undefined)).toBe(false));
  it("lehnt Zahl ab", () => expect(isProtocolQuestionKind(1)).toBe(false));
  it("lehnt Array ab", () => expect(isProtocolQuestionKind(["YES_NO_UNCLEAR"])).toBe(false));
});

// ---------------------------------------------------------------------------
// isProtocolAnswerOption
// ---------------------------------------------------------------------------

describe("isProtocolAnswerOption", () => {
  it("akzeptiert gültige Option", () => {
    expect(isProtocolAnswerOption(makeOption())).toBe(true);
  });

  it("lehnt leere id ab", () => {
    expect(isProtocolAnswerOption(makeOption({ id: "" }))).toBe(false);
  });

  it("lehnt leeres label ab", () => {
    expect(isProtocolAnswerOption(makeOption({ label: "" }))).toBe(false);
  });

  it("lehnt leeres outputText ab", () => {
    expect(isProtocolAnswerOption(makeOption({ outputText: "" }))).toBe(false);
  });

  it("lehnt null ab", () => expect(isProtocolAnswerOption(null)).toBe(false));
  it("lehnt Array ab", () => expect(isProtocolAnswerOption([])).toBe(false));
  it("lehnt leeres Objekt ab", () => expect(isProtocolAnswerOption({})).toBe(false));

  it("lehnt fehlende id ab", () => {
    const { id: _id, ...rest } = makeOption();
    expect(isProtocolAnswerOption(rest)).toBe(false);
  });

  it("lehnt fehlenden outputText ab", () => {
    const { outputText: _outputText, ...rest } = makeOption();
    expect(isProtocolAnswerOption(rest)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isProtocolQuestion – YES_NO_UNCLEAR
// ---------------------------------------------------------------------------

describe("isProtocolQuestion – YES_NO_UNCLEAR", () => {
  it("akzeptiert gültige YES_NO_UNCLEAR-Frage", () => {
    expect(isProtocolQuestion(makeYesNoQ())).toBe(true);
  });

  it("akzeptiert mit hint und required", () => {
    expect(isProtocolQuestion(makeYesNoQ({ hint: "Bitte prüfen.", required: true }))).toBe(true);
  });

  it("lehnt leere id ab", () => {
    expect(isProtocolQuestion(makeYesNoQ({ id: "" }))).toBe(false);
  });

  it("lehnt leeren text ab", () => {
    expect(isProtocolQuestion(makeYesNoQ({ text: "" }))).toBe(false);
  });

  it("lehnt ungültige required-Angabe ab (Zahl)", () => {
    expect(isProtocolQuestion(makeYesNoQ({ required: 1 }))).toBe(false);
  });

  it("lehnt ungültige hint-Angabe ab (Zahl)", () => {
    expect(isProtocolQuestion(makeYesNoQ({ hint: 42 }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isProtocolQuestion – SINGLE_SELECT
// ---------------------------------------------------------------------------

describe("isProtocolQuestion – SINGLE_SELECT", () => {
  it("akzeptiert gültige SINGLE_SELECT-Frage", () => {
    expect(isProtocolQuestion(makeSingleQ())).toBe(true);
  });

  it("lehnt SINGLE_SELECT ohne options ab", () => {
    const { options: _options, ...rest } = makeSingleQ() as unknown as Record<string, unknown>;
    expect(isProtocolQuestion(rest as unknown as ProtocolQuestion)).toBe(false);
  });

  it("lehnt SINGLE_SELECT mit leeren options ab", () => {
    expect(isProtocolQuestion(makeSingleQ({ options: [] }))).toBe(false);
  });

  it("lehnt SINGLE_SELECT mit ungültiger Option ab", () => {
    expect(
      isProtocolQuestion(makeSingleQ({ options: [{ id: "", label: "X", outputText: "Y" }] })),
    ).toBe(false);
  });

  it("lehnt SINGLE_SELECT mit duplizierten Option-IDs ab", () => {
    expect(
      isProtocolQuestion(
        makeSingleQ({
          options: [makeOption(), makeOption()], // beide id: "OPT-A"
        }),
      ),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isProtocolQuestion – MULTI_SELECT
// ---------------------------------------------------------------------------

describe("isProtocolQuestion – MULTI_SELECT", () => {
  it("akzeptiert gültige MULTI_SELECT-Frage", () => {
    expect(isProtocolQuestion(makeMultiQ())).toBe(true);
  });

  it("lehnt MULTI_SELECT ohne options ab", () => {
    const { options: _options, ...rest } = makeMultiQ() as unknown as Record<string, unknown>;
    expect(isProtocolQuestion(rest as unknown as ProtocolQuestion)).toBe(false);
  });

  it("lehnt MULTI_SELECT mit leeren options ab", () => {
    expect(isProtocolQuestion(makeMultiQ({ options: [] }))).toBe(false);
  });

  it("lehnt MULTI_SELECT mit duplizierten Option-IDs ab", () => {
    const dup = makeOption({ id: "DUP-1", label: "A", outputText: "Satz A." });
    expect(
      isProtocolQuestion(makeMultiQ({ options: [dup, { ...dup }] })),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isProtocolQuestion – FREE_TEXT
// ---------------------------------------------------------------------------

describe("isProtocolQuestion – FREE_TEXT", () => {
  it("akzeptiert gültige FREE_TEXT-Frage", () => {
    expect(isProtocolQuestion(makeFreeTextQ())).toBe(true);
  });

  it("akzeptiert FREE_TEXT mit placeholder", () => {
    expect(isProtocolQuestion(makeFreeTextQ({ placeholder: "z. B. …" }))).toBe(true);
  });

  it("lehnt FREE_TEXT mit ungültigem placeholder ab (Zahl)", () => {
    expect(isProtocolQuestion(makeFreeTextQ({ placeholder: 123 }))).toBe(false);
  });

  it("lehnt unbekannten kind ab", () => {
    expect(isProtocolQuestion({ id: "Q-05", text: "X?", kind: "UNBEKANNT" } as unknown as ProtocolQuestion)).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// isProtocolQuestion – Guards werfen keine Ausnahmen
// ---------------------------------------------------------------------------

describe("isProtocolQuestion – Guards werfen keine Ausnahmen", () => {
  it.each([null, undefined, "", 42, [], Symbol("x")])(
    "wirft keine Ausnahme für %p",
    (val) => {
      expect(() => isProtocolQuestion(val as unknown as ProtocolQuestion)).not.toThrow();
    },
  );
});

// ---------------------------------------------------------------------------
// isProtocolSection
// ---------------------------------------------------------------------------

describe("isProtocolSection", () => {
  it("akzeptiert gültigen Abschnitt (mit Regeln und Fragen)", () => {
    expect(isProtocolSection(makeSection())).toBe(true);
  });

  it("akzeptiert Abschnitt mit leeren Arrays", () => {
    expect(
      isProtocolSection(makeSection({ officialRules: [], questions: [] })),
    ).toBe(true);
  });

  it("akzeptiert Abschnitt mit mehreren Regeln und Fragen", () => {
    const section: ProtocolSection = {
      id: "SEC-02",
      title: "Ablauf",
      officialRules: [
        makeRule({ id: "RULE-01" }),
        makeRule({ id: "RULE-02", text: "Zweite Regel." }),
      ],
      questions: [makeYesNoQ(), makeFreeTextQ()],
    };
    expect(isProtocolSection(section)).toBe(true);
  });

  it("lehnt leere id ab", () => {
    expect(isProtocolSection(makeSection({ id: "" }))).toBe(false);
  });

  it("lehnt leeren title ab", () => {
    expect(isProtocolSection(makeSection({ title: "" }))).toBe(false);
  });

  it("lehnt fehlende id ab", () => {
    const { id: _id, ...rest } = makeSection();
    expect(isProtocolSection(rest)).toBe(false);
  });

  it("lehnt fehlenden title ab", () => {
    const { title: _title, ...rest } = makeSection();
    expect(isProtocolSection(rest)).toBe(false);
  });

  it("lehnt ungültige Regel in officialRules ab", () => {
    expect(
      isProtocolSection(
        makeSection({ officialRules: [{ id: "RULE-01", text: "", bindingLevel: "MANDATORY", source: makeRule().source }] }),
      ),
    ).toBe(false);
  });

  it("lehnt ungültige Frage in questions ab", () => {
    expect(
      isProtocolSection(
        makeSection({ questions: [{ id: "", text: "X?", kind: "FREE_TEXT" } as ProtocolQuestion] }),
      ),
    ).toBe(false);
  });

  it("lehnt duplizierte Regel-IDs ab", () => {
    const rule1 = makeRule({ id: "RULE-DUP" });
    const rule2 = makeRule({ id: "RULE-DUP", text: "Zweiter Text." });
    expect(isProtocolSection(makeSection({ officialRules: [rule1, rule2] }))).toBe(false);
  });

  it("lehnt duplizierte Frage-IDs ab", () => {
    const q1 = makeYesNoQ({ id: "Q-DUP" });
    const q2 = makeFreeTextQ({ id: "Q-DUP" });
    expect(isProtocolSection(makeSection({ questions: [q1, q2] }))).toBe(false);
  });

  it("lehnt officialRules als Nicht-Array ab", () => {
    expect(isProtocolSection({ ...makeSection(), officialRules: {} as unknown as OfficialRule[] })).toBe(false);
  });

  it("lehnt questions als Nicht-Array ab", () => {
    expect(isProtocolSection({ ...makeSection(), questions: "falsch" as unknown as ProtocolQuestion[] })).toBe(
      false,
    );
  });

  it("lehnt null ab", () => expect(isProtocolSection(null)).toBe(false));
  it("lehnt Array ab", () => expect(isProtocolSection([])).toBe(false));
  it("lehnt leeres Objekt ab", () => expect(isProtocolSection({})).toBe(false));

  it("wirft keine Ausnahme bei ungewöhnlichen Eingaben", () => {
    expect(() => isProtocolSection(undefined)).not.toThrow();
    expect(() => isProtocolSection(Symbol("x"))).not.toThrow();
  });
});
