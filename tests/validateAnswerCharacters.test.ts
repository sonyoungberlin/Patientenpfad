/**
 * Tests für lib/questionnaire/validateAnswerCharacters.ts.
 *
 * Sichern:
 *   - kyrillische / arabische / CJK-Zeichen werden als ungültig erkannt
 *   - Emojis werden als ungültig erkannt
 *   - deutsche Umlaute, ß, ASCII-Buchstaben/Ziffern und übliche Satzzeichen
 *     sind erlaubt
 *   - Validierung greift nur für Freitexttypen (text/textarea)
 *   - Werte für select/multi_select/yes_no/date werden nicht geprüft
 *   - Lokalisierte Fehlermeldungen (DE/EN)
 */

import {
  ALLOWED_ANSWER_CHARACTERS_REGEX,
  ANSWER_CHARACTERS_ERROR_MESSAGE,
  answerCharactersErrorMessage,
  isAnswerTextAllowed,
  validateAnswerCharacters,
} from "@/lib/questionnaire/validateAnswerCharacters";

describe("ALLOWED_ANSWER_CHARACTERS_REGEX", () => {
  it("akzeptiert lateinische Buchstaben, Umlaute, ß, Ziffern und Satzzeichen", () => {
    const allowed = [
      "Mustermann",
      "Müller-Lüdenscheidt",
      "Straße 12",
      "Köln",
      "Heidelberger Straße 3a, 12435 Berlin",
      "0171/123456",
      "patient@example.com",
      "Hallo, wie geht's? (Test) +49 30 1234 & Co.",
      "",
    ];
    for (const v of allowed) {
      expect(ALLOWED_ANSWER_CHARACTERS_REGEX.test(v)).toBe(true);
    }
  });

  it("akzeptiert Zeilenumbrüche und Tabulatoren (für Textareas)", () => {
    expect(ALLOWED_ANSWER_CHARACTERS_REGEX.test("Zeile 1\nZeile 2")).toBe(true);
    expect(ALLOWED_ANSWER_CHARACTERS_REGEX.test("a\tb")).toBe(true);
    expect(ALLOWED_ANSWER_CHARACTERS_REGEX.test("a\r\nb")).toBe(true);
  });

  it("blockiert kyrillische Zeichen", () => {
    expect(ALLOWED_ANSWER_CHARACTERS_REGEX.test("Нет")).toBe(false);
    expect(ALLOWED_ANSWER_CHARACTERS_REGEX.test("Рак")).toBe(false);
    // Auch Mischformen werden blockiert.
    expect(ALLOWED_ANSWER_CHARACTERS_REGEX.test("Patient Нет")).toBe(false);
  });

  it("blockiert arabische Zeichen", () => {
    expect(ALLOWED_ANSWER_CHARACTERS_REGEX.test("مرحبا")).toBe(false);
  });

  it("blockiert chinesische / japanische / koreanische Zeichen", () => {
    expect(ALLOWED_ANSWER_CHARACTERS_REGEX.test("你好")).toBe(false);
    expect(ALLOWED_ANSWER_CHARACTERS_REGEX.test("こんにちは")).toBe(false);
    expect(ALLOWED_ANSWER_CHARACTERS_REGEX.test("안녕하세요")).toBe(false);
  });

  it("blockiert Emojis", () => {
    expect(ALLOWED_ANSWER_CHARACTERS_REGEX.test("😀")).toBe(false);
    expect(ALLOWED_ANSWER_CHARACTERS_REGEX.test("Hallo 👋")).toBe(false);
  });
});

describe("isAnswerTextAllowed", () => {
  it("prüft text- und textarea-Typen", () => {
    expect(isAnswerTextAllowed("Müller", "text")).toBe(true);
    expect(isAnswerTextAllowed("Нет", "text")).toBe(false);
    expect(isAnswerTextAllowed("Hallo\nWelt", "textarea")).toBe(true);
    expect(isAnswerTextAllowed("你好", "textarea")).toBe(false);
  });

  it("ignoriert Auswahlfelder, yes_no und date (Werte werden hier nicht geprüft)", () => {
    expect(isAnswerTextAllowed("Нет", "select")).toBe(true);
    expect(isAnswerTextAllowed("Нет", "multi_select")).toBe(true);
    expect(isAnswerTextAllowed("ja", "yes_no")).toBe(true);
    expect(isAnswerTextAllowed("2024-01-01", "date")).toBe(true);
  });

  it("akzeptiert leere Strings (Required-Logik liegt nicht hier)", () => {
    expect(isAnswerTextAllowed("", "text")).toBe(true);
    expect(isAnswerTextAllowed("", "textarea")).toBe(true);
  });

  it("ignoriert Nicht-String-Werte still", () => {
    expect(isAnswerTextAllowed(undefined, "text")).toBe(true);
    expect(isAnswerTextAllowed(null, "text")).toBe(true);
    expect(isAnswerTextAllowed(42, "text")).toBe(true);
  });
});

describe("validateAnswerCharacters", () => {
  it("liefert ok=true für ausschließlich erlaubte Eingaben", () => {
    const out = validateAnswerCharacters(
      {
        CONTACT_PHONE: "+49 30 123456",
        ANAMNESE_CHRONIC: "Asthma, Heuschnupfen",
        ANAMNESE_ALLERGIES: "Pollen\nNüsse",
      },
      [
        { id: "CONTACT_PHONE" },
        { id: "ANAMNESE_CHRONIC" },
        { id: "ANAMNESE_ALLERGIES" },
      ],
    );
    expect(out).toEqual({ ok: true, invalidQuestionIds: [] });
  });

  it("meldet kyrillische und Emoji-Eingaben als invalid (Freitextfelder)", () => {
    const out = validateAnswerCharacters(
      {
        ANAMNESE_CHRONIC: "Рак",
        ANAMNESE_ALLERGIES: "Нет",
        CONTACT_PHONE: "0171 123😀",
      },
      [
        { id: "ANAMNESE_CHRONIC" },
        { id: "ANAMNESE_ALLERGIES" },
        { id: "CONTACT_PHONE" },
      ],
    );
    expect(out.ok).toBe(false);
    expect(out.invalidQuestionIds.sort()).toEqual(
      ["ANAMNESE_ALLERGIES", "ANAMNESE_CHRONIC", "CONTACT_PHONE"].sort(),
    );
  });

  it("ignoriert nicht-Freitext-Fragetypen (z. B. select)", () => {
    // IDENTITY_INSURANCE_TYPE ist im Katalog 'select'; sein Wert wird nicht
    // gegen die Zeichenklasse geprüft (Werte stammen aus festen Optionen,
    // ggf. aus EN→DE-Reverse-Mapping in sanitizeAnswers).
    const out = validateAnswerCharacters(
      { IDENTITY_INSURANCE_TYPE: "Нет" },
      [{ id: "IDENTITY_INSURANCE_TYPE" }],
    );
    expect(out).toEqual({ ok: true, invalidQuestionIds: [] });
  });

  it("ignoriert questionIds, die nicht in der Fragenliste enthalten sind", () => {
    const out = validateAnswerCharacters(
      { ANAMNESE_CHRONIC: "Нет" },
      [{ id: "CONTACT_PHONE" }],
    );
    expect(out).toEqual({ ok: true, invalidQuestionIds: [] });
  });

  it("ignoriert questionIds, die nicht im globalen QUESTION_CATALOG existieren", () => {
    const out = validateAnswerCharacters(
      { UNKNOWN_QUESTION: "Нет" },
      [{ id: "UNKNOWN_QUESTION" }],
    );
    expect(out).toEqual({ ok: true, invalidQuestionIds: [] });
  });

  it("ist robust gegen ungültige Inputs", () => {
    expect(validateAnswerCharacters(null, [])).toEqual({
      ok: true,
      invalidQuestionIds: [],
    });
    expect(validateAnswerCharacters(undefined, [])).toEqual({
      ok: true,
      invalidQuestionIds: [],
    });
    expect(validateAnswerCharacters([], [])).toEqual({
      ok: true,
      invalidQuestionIds: [],
    });
  });
});

describe("answerCharactersErrorMessage", () => {
  it("liefert die deutsche Meldung für 'de'", () => {
    expect(answerCharactersErrorMessage("de")).toBe(
      ANSWER_CHARACTERS_ERROR_MESSAGE.de,
    );
    expect(answerCharactersErrorMessage("de")).toContain("lateinische Buchstaben");
  });

  it("liefert die englische Meldung für 'en'", () => {
    expect(answerCharactersErrorMessage("en")).toBe(
      ANSWER_CHARACTERS_ERROR_MESSAGE.en,
    );
    expect(answerCharactersErrorMessage("en")).toContain("Latin letters");
  });
});
