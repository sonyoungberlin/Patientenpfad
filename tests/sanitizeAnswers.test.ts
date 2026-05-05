/**
 * Phase 3d: Tests für lib/questionnaire/sanitizeAnswers.ts.
 *
 * Verhalten ist 1:1 aus dem Token-Flow extrahiert. Diese Tests sichern,
 * dass die Extraktion ohne Verhaltensänderung stattgefunden hat.
 */

import { sanitizeAnswers, MAX_ANSWER_LENGTH } from "@/lib/questionnaire/sanitizeAnswers";

const KNOWN_QUESTIONS = [
  { id: "CONTACT_PHONE" },
  { id: "CONTACT_EMAIL" },
];

describe("sanitizeAnswers", () => {
  it("akzeptiert nur questionIds aus deduplicated_questions UND aus QUESTION_CATALOG", () => {
    const out = sanitizeAnswers(
      {
        CONTACT_PHONE: "+49 30 123",
        CONTACT_EMAIL: "p@example.com",
        UNKNOWN_ID: "wird verworfen",
        // Nicht in deduplicated_questions, aber im Katalog:
        PRESCRIPTION_TYPE: "wird verworfen",
      },
      KNOWN_QUESTIONS,
    );
    expect(out).toEqual({
      CONTACT_PHONE: "+49 30 123",
      CONTACT_EMAIL: "p@example.com",
    });
  });

  it("verwirft Nicht-String-Werte still", () => {
    const out = sanitizeAnswers(
      {
        CONTACT_PHONE: 12345,
        CONTACT_EMAIL: { a: 1 },
      },
      KNOWN_QUESTIONS,
    );
    expect(out).toEqual({});
  });

  it("kürzt Antworten auf MAX_ANSWER_LENGTH", () => {
    const long = "x".repeat(MAX_ANSWER_LENGTH + 50);
    const out = sanitizeAnswers({ CONTACT_PHONE: long }, KNOWN_QUESTIONS);
    expect(out.CONTACT_PHONE.length).toBe(MAX_ANSWER_LENGTH);
  });

  it("liefert leeres Objekt für nicht-objekt-Eingaben", () => {
    expect(sanitizeAnswers(null, KNOWN_QUESTIONS)).toEqual({});
    expect(sanitizeAnswers(undefined, KNOWN_QUESTIONS)).toEqual({});
    expect(sanitizeAnswers("string", KNOWN_QUESTIONS)).toEqual({});
    expect(sanitizeAnswers([1, 2, 3], KNOWN_QUESTIONS)).toEqual({});
  });

  it("liefert leeres Objekt, wenn deduplicated_questions leer ist", () => {
    expect(sanitizeAnswers({ CONTACT_PHONE: "x" }, [])).toEqual({});
  });

  describe("Mehrsprachigkeit (language='en')", () => {
    it("mappt einzelne englische select-Option auf das deutsche Original", () => {
      const out = sanitizeAnswers(
        { PRESCRIPTION_TYPE: "Dauermedikation" },
        [{ id: "PRESCRIPTION_TYPE" }],
        "en",
      );
      // PRESCRIPTION_TYPE hat keine options_en → unverändert
      expect(out.PRESCRIPTION_TYPE).toBe("Dauermedikation");
    });

    it("mappt englische multi_select-Optionen Komma-für-Komma auf Deutsch", () => {
      // AU_SYMPTOMS hat options_en in derselben Reihenfolge wie options.
      const out = sanitizeAnswers(
        { AU_SYMPTOMS: "Cough, Fever, Other" },
        [{ id: "AU_SYMPTOMS" }],
        "en",
      );
      expect(out.AU_SYMPTOMS).toBe("Husten, Fieber, Sonstiges");
    });

    it("lässt unbekannte EN-Werte unverändert (keine Erfindung)", () => {
      const out = sanitizeAnswers(
        { AU_SYMPTOMS: "Cough, Unbekannt" },
        [{ id: "AU_SYMPTOMS" }],
        "en",
      );
      expect(out.AU_SYMPTOMS).toBe("Husten, Unbekannt");
    });

    it("akzeptiert auch bereits deutsche Werte unter language='en'", () => {
      const out = sanitizeAnswers(
        { AU_SYMPTOMS: "Husten, Fieber" },
        [{ id: "AU_SYMPTOMS" }],
        "en",
      );
      expect(out.AU_SYMPTOMS).toBe("Husten, Fieber");
    });

    it("verändert Freitext (textarea/text) nicht", () => {
      const out = sanitizeAnswers(
        { CONTACT_PHONE: "Cough" },
        [{ id: "CONTACT_PHONE" }],
        "en",
      );
      expect(out.CONTACT_PHONE).toBe("Cough");
    });

    it("Default 'de' wendet kein Reverse-Mapping an", () => {
      const out = sanitizeAnswers(
        { AU_SYMPTOMS: "Cough" },
        [{ id: "AU_SYMPTOMS" }],
      );
      expect(out.AU_SYMPTOMS).toBe("Cough");
    });
  });
});
