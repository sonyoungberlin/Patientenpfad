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
});
