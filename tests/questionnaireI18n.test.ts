/**
 * Tests für lib/questionnaire/i18n.ts.
 *
 * Sichert ab:
 *  - normalizeQuestionnaireLanguage akzeptiert nur "de" | "en" und fällt
 *    sonst auf "de" zurück.
 *  - localizeQuestion nutzt _en-Felder bei language="en" und fällt sauber
 *    auf das deutsche Original zurück, falls sie fehlen.
 *  - Bei language="de" wird das Original unverändert (per Identität)
 *    zurückgegeben.
 *  - localizeBlock verhält sich analog.
 *  - options_en mit abweichender Länge wird ignoriert (Fallback auf options).
 */

import {
  normalizeQuestionnaireLanguage,
  localizeQuestion,
  localizeBlock,
  isQuestionEnReady,
  isBlockEnReady,
  DEFAULT_QUESTIONNAIRE_LANGUAGE,
} from "@/lib/questionnaire/i18n";
import type {
  QuestionDefinition,
  QuestionnaireBlock,
} from "@/lib/questionnaire/blockCatalog";

describe("normalizeQuestionnaireLanguage", () => {
  it("akzeptiert 'de' und 'en' unverändert", () => {
    expect(normalizeQuestionnaireLanguage("de")).toBe("de");
    expect(normalizeQuestionnaireLanguage("en")).toBe("en");
  });

  it("fällt für alles andere auf den Default zurück", () => {
    expect(normalizeQuestionnaireLanguage(undefined)).toBe(
      DEFAULT_QUESTIONNAIRE_LANGUAGE,
    );
    expect(normalizeQuestionnaireLanguage(null)).toBe("de");
    expect(normalizeQuestionnaireLanguage("EN")).toBe("de");
    expect(normalizeQuestionnaireLanguage(" en ")).toBe("de");
    expect(normalizeQuestionnaireLanguage(42)).toBe("de");
    expect(normalizeQuestionnaireLanguage({})).toBe("de");
  });
});

describe("localizeQuestion", () => {
  const Q: QuestionDefinition = {
    id: "Q1",
    text: "Wie heißen Sie?",
    text_en: "What is your name?",
    type: "text",
    required: true,
    helperText: "Bitte vollständig.",
    helperText_en: "Please use full name.",
  };

  it("liefert bei language='de' das Original unverändert zurück", () => {
    expect(localizeQuestion(Q, "de")).toBe(Q);
  });

  it("verwendet bei language='en' die _en-Felder", () => {
    const out = localizeQuestion(Q, "en");
    expect(out.id).toBe("Q1");
    expect(out.text).toBe("What is your name?");
    expect(out.helperText).toBe("Please use full name.");
    expect(out.type).toBe("text");
    expect(out.required).toBe(true);
  });

  it("fällt bei fehlenden _en-Feldern auf Deutsch zurück", () => {
    const partial: QuestionDefinition = {
      id: "Q2",
      text: "Geburtsdatum",
      type: "date",
      required: true,
    };
    const out = localizeQuestion(partial, "en");
    expect(out.text).toBe("Geburtsdatum");
    expect(out.helperText).toBeUndefined();
  });

  it("verwendet options_en bei gleicher Länge", () => {
    const sel: QuestionDefinition = {
      id: "Q3",
      text: "Wählen Sie",
      text_en: "Choose",
      type: "select",
      required: true,
      options: ["A", "B", "C"],
      options_en: ["a-en", "b-en", "c-en"],
    };
    const out = localizeQuestion(sel, "en");
    expect(out.options).toEqual(["a-en", "b-en", "c-en"]);
  });

  it("ignoriert options_en mit abweichender Länge (Fallback auf DE)", () => {
    const sel: QuestionDefinition = {
      id: "Q4",
      text: "Wählen Sie",
      type: "select",
      required: true,
      options: ["A", "B"],
      options_en: ["only-one"],
    };
    const out = localizeQuestion(sel, "en");
    expect(out.options).toEqual(["A", "B"]);
  });
});

describe("localizeBlock", () => {
  const B: QuestionnaireBlock = {
    id: "B1",
    label: "Kontakt",
    label_en: "Contact",
    description: "Beschreibung",
    description_en: "Description",
    hint: "Hinweis",
    hint_en: "Hint",
    displayOrder: 10,
    questionIds: ["Q1"],
  };

  it("liefert bei 'de' das Original unverändert", () => {
    expect(localizeBlock(B, "de")).toBe(B);
  });

  it("verwendet bei 'en' die _en-Felder", () => {
    const out = localizeBlock(B, "en");
    expect(out.label).toBe("Contact");
    expect(out.description).toBe("Description");
    expect(out.hint).toBe("Hint");
    expect(out.id).toBe("B1");
    expect(out.questionIds).toEqual(["Q1"]);
  });

  it("fällt bei fehlenden _en-Feldern auf Deutsch zurück", () => {
    const partial: QuestionnaireBlock = {
      id: "B2",
      label: "Adresse",
      displayOrder: 20,
      questionIds: [],
    };
    const out = localizeBlock(partial, "en");
    expect(out.label).toBe("Adresse");
  });
});

describe("isQuestionEnReady / isBlockEnReady", () => {
  it("isQuestionEnReady: text_en Pflicht", () => {
    expect(
      isQuestionEnReady({
        id: "Q",
        text: "DE",
        type: "text",
        required: true,
      }),
    ).toBe(false);
    expect(
      isQuestionEnReady({
        id: "Q",
        text: "DE",
        text_en: "EN",
        type: "text",
        required: true,
      }),
    ).toBe(true);
  });

  it("isQuestionEnReady: helperText_en nur Pflicht wenn helperText vorhanden", () => {
    expect(
      isQuestionEnReady({
        id: "Q",
        text: "DE",
        text_en: "EN",
        helperText: "Hinweis",
        type: "text",
        required: false,
      }),
    ).toBe(false);
    expect(
      isQuestionEnReady({
        id: "Q",
        text: "DE",
        text_en: "EN",
        helperText: "Hinweis",
        helperText_en: "Hint",
        type: "text",
        required: false,
      }),
    ).toBe(true);
  });

  it("isQuestionEnReady: options_en muss exakt parallel zu options sein", () => {
    expect(
      isQuestionEnReady({
        id: "Q",
        text: "DE",
        text_en: "EN",
        type: "select",
        required: true,
        options: ["a", "b"],
      }),
    ).toBe(false);
    expect(
      isQuestionEnReady({
        id: "Q",
        text: "DE",
        text_en: "EN",
        type: "select",
        required: true,
        options: ["a", "b"],
        options_en: ["A"],
      }),
    ).toBe(false);
    expect(
      isQuestionEnReady({
        id: "Q",
        text: "DE",
        text_en: "EN",
        type: "select",
        required: true,
        options: ["a", "b"],
        options_en: ["A", ""],
      }),
    ).toBe(false);
    expect(
      isQuestionEnReady({
        id: "Q",
        text: "DE",
        text_en: "EN",
        type: "select",
        required: true,
        options: ["a", "b"],
        options_en: ["A", "B"],
      }),
    ).toBe(true);
  });

  it("isBlockEnReady('IDENTITAET') === true (vollständig übersetzt)", () => {
    expect(isBlockEnReady("IDENTITAET")).toBe(true);
  });

  it("isBlockEnReady('KONTAKT') === true (vollständig übersetzt)", () => {
    expect(isBlockEnReady("KONTAKT")).toBe(true);
  });

  it("isBlockEnReady('ARBEITSUNFAEHIGKEIT') === false (AU_START_DATE etc. ohne text_en)", () => {
    // Beispiel für einen Block, der einzelne, noch nicht übersetzte
    // Fragen hat. Schützt vor versehentlichem Versand gemischter Sprache.
    expect(isBlockEnReady("ARBEITSUNFAEHIGKEIT")).toBe(false);
  });

  it("isBlockEnReady gibt false für unbekannte Block-ID zurück", () => {
    expect(isBlockEnReady("DOES_NOT_EXIST")).toBe(false);
  });
});
