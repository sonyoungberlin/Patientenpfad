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
  it("akzeptiert für confirmation ausschließlich exakt den String true", () => {
    const questions = [
      {
        id: "PRACTICE_CONFIRMATION_1",
        text: "Erklärung",
        type: "confirmation" as const,
        required: true,
      },
    ];
    expect(
      sanitizeAnswers(
        { PRACTICE_CONFIRMATION_1: "true" },
        questions,
        "de",
        new Map([[questions[0].id, questions[0]]]),
      ),
    ).toEqual({ PRACTICE_CONFIRMATION_1: "true" });

    for (const value of ["false", "ja", "nein", "1", "TRUE", ""]) {
      expect(
        sanitizeAnswers(
          { PRACTICE_CONFIRMATION_1: value },
          questions,
          "de",
          new Map([[questions[0].id, questions[0]]]),
        ),
      ).toEqual({});
    }
  });
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

  describe("FACHAERZTE repeatable group", () => {
    const questions = [{ id: "FACHAERZTE" }];

    it("akzeptiert valides JSON-Array", () => {
      const input = {
        FACHAERZTE: JSON.stringify([
          { erkrankung: "Herz", bereich: "Kardiologie", name: "Dr. M", adresse: "Str. 1" },
          { erkrankung: "Rücken", bereich: "Orthopädie", name: "Dr. S", adresse: "" },
        ]),
      };
      const out = sanitizeAnswers(input, questions);
      expect(out.FACHAERZTE).toBeDefined();
      const parsed = JSON.parse(out.FACHAERZTE);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].name).toBe("Dr. M");
      expect(parsed[1].bereich).toBe("Orthopädie");
    });

    it("verwirft ungültiges JSON", () => {
      const input = { FACHAERZTE: "nicht-json" };
      const out = sanitizeAnswers(input, questions);
      expect(out.FACHAERZTE).toBeUndefined();
    });

    it("verwirft Nicht-Array", () => {
      const input = { FACHAERZTE: JSON.stringify({ foo: "bar" }) };
      const out = sanitizeAnswers(input, questions);
      expect(out.FACHAERZTE).toBeUndefined();
    });

    it("begrenzt auf maxEntries (10)", () => {
      const entries = Array.from({ length: 15 }, (_, i) => ({
        erkrankung: `E${i}`,
        bereich: "Kardiologie",
        name: `Dr. ${i}`,
        adresse: "",
      }));
      const input = { FACHAERZTE: JSON.stringify(entries) };
      const out = sanitizeAnswers(input, questions);
      expect(out.FACHAERZTE).toBeUndefined(); // > maxEntries
    });

    it("kürzt zu lange Werte", () => {
      const long = "x".repeat(3000);
      const input = {
        FACHAERZTE: JSON.stringify([{ erkrankung: long, bereich: "K", name: "D", adresse: "" }]),
      };
      const out = sanitizeAnswers(input, questions);
      const parsed = JSON.parse(out.FACHAERZTE);
      expect(parsed[0].erkrankung.length).toBeLessThanOrEqual(2000);
    });

    it("filtert nur erlaubte Keys", () => {
      const input = {
        FACHAERZTE: JSON.stringify([
          { erkrankung: "Test", bereich: "K", name: "D", adresse: "A", extraKey: "should be removed" },
        ]),
      };
      const out = sanitizeAnswers(input, questions);
      const parsed = JSON.parse(out.FACHAERZTE);
      expect(parsed[0]).not.toHaveProperty("extraKey");
      expect(Object.keys(parsed[0]).sort()).toEqual(["adresse", "bereich", "erkrankung", "name"]);
    });

    it("entfernt leere Einträge", () => {
      const input = {
        FACHAERZTE: JSON.stringify([
          { erkrankung: "Test", bereich: "K", name: "D", adresse: "" },
          { erkrankung: "", bereich: "", name: "", adresse: "" },
          { erkrankung: "Test2", bereich: "O", name: "D2", adresse: "" },
        ]),
      };
      const out = sanitizeAnswers(input, questions);
      const parsed = JSON.parse(out.FACHAERZTE);
      expect(parsed).toHaveLength(2);
    });

    it("liefert undefined für leeres Array", () => {
      const input = { FACHAERZTE: JSON.stringify([]) };
      const out = sanitizeAnswers(input, questions);
      expect(out.FACHAERZTE).toBeUndefined();
    });
  });
});
