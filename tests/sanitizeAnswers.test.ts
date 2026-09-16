/**
 * Phase 3d: Tests für lib/questionnaire/sanitizeAnswers.ts.
 *
 * Verhalten ist 1:1 aus dem Token-Flow extrahiert. Diese Tests sichern,
 * dass die Extraktion ohne Verhaltensänderung stattgefunden hat.
 */

import { sanitizeAnswers, MAX_ANSWER_LENGTH } from "@/lib/questionnaire/sanitizeAnswers";
import type { QuestionDefinition } from "@/lib/questionnaire/blockCatalog";
import { VACCINATION_REVIEW_QUESTION_CATALOG } from "@/lib/questionnaire/vaccinationReviewCatalog";

const KNOWN_QUESTIONS = [
  { id: "CONTACT_PHONE" },
  { id: "CONTACT_EMAIL" },
];

describe("sanitizeAnswers", () => {
  describe("Frozen-Optionsvalidierung", () => {
    function sanitizeFrozen(question: QuestionDefinition, value: string, language: "de" | "en" = "de") {
      return sanitizeAnswers(
        { [question.id]: value },
        [{ id: question.id }],
        language,
        new Map([[question.id, question]]),
      );
    }

    it("akzeptiert nur definierte select- und multi_select-Werte", () => {
      const select: QuestionDefinition = {
        id: "FROZEN_SELECT", text: "Auswahl", type: "select", required: false,
        options: [{ value: "allowed", label: "Erlaubt" }],
      };
      const multi: QuestionDefinition = {
        id: "FROZEN_MULTI", text: "Mehrfach", type: "multi_select", required: false,
        options: [
          { value: "first", label: "Erste" },
          { value: "second", label: "Zweite" },
        ],
      };

      expect(sanitizeFrozen(select, "allowed")).toEqual({ FROZEN_SELECT: "allowed" });
      expect(sanitizeFrozen(select, "unknown")).toEqual({});
      expect(sanitizeFrozen(multi, "first, second")).toEqual({ FROZEN_MULTI: "first, second" });
      expect(sanitizeFrozen(multi, "first, unknown")).toEqual({});
    });

    it("akzeptiert nur definierte yes_no-Werte", () => {
      const question: QuestionDefinition = {
        id: "FROZEN_YES_NO", text: "Status", type: "yes_no", required: false,
        options: ["Ja", "Nein"],
      };
      expect(sanitizeFrozen(question, "Ja")).toEqual({ FROZEN_YES_NO: "Ja" });
      expect(sanitizeFrozen(question, "ja")).toEqual({});
    });

    it("validiert strukturierte Optionen in Repeatable-Unterfeldern", () => {
      const question: QuestionDefinition = {
        id: "FROZEN_GROUP", text: "Gruppe", type: "repeatable_group", required: false,
        groupSchema: [{
          key: "choice", label: "Wahl", type: "select", required: true,
          options: [{ value: "internal", label: "Lesbar" }],
        }],
      };
      const valid = JSON.stringify([{ choice: "internal" }]);
      const invalid = JSON.stringify([{ choice: "unknown" }]);
      expect(sanitizeFrozen(question, valid)).toEqual({ FROZEN_GROUP: valid });
      expect(sanitizeFrozen(question, invalid)).toEqual({});
    });

    it("verwendet Frozen-Optionen und Frozen-EN-Mapping statt des aktuellen Katalogs", () => {
      const frozen: QuestionDefinition = {
        id: "CHECK_IN_PATIENT_TYPE",
        text: "Historische Auswahl",
        type: "select",
        required: true,
        options: [{ value: "historic_patient", label: "Historischer Patient" }],
        options_en: ["Historic patient"],
      };

      expect(sanitizeFrozen(frozen, "Historic patient", "en")).toEqual({
        CHECK_IN_PATIENT_TYPE: "historic_patient",
      });
      expect(sanitizeFrozen(frozen, "new_patient")).toEqual({});
    });

    it("erhält historische Selects ohne Optionsdefinition und yes_no-Schreibweisen", () => {
      const legacySelect: QuestionDefinition = {
        id: "LEGACY_SELECT", text: "Historisch", type: "select", required: false,
      };
      const legacyYesNo: QuestionDefinition = {
        id: "LEGACY_YES_NO", text: "Historischer Status", type: "yes_no", required: false,
      };
      expect(sanitizeFrozen(legacySelect, "Historischer Klartext")).toEqual({
        LEGACY_SELECT: "Historischer Klartext",
      });
      expect(sanitizeFrozen(legacyYesNo, "ja")).toEqual({ LEGACY_YES_NO: "ja" });
      expect(sanitizeFrozen(legacyYesNo, "Ja")).toEqual({ LEGACY_YES_NO: "Ja" });
      expect(sanitizeFrozen(legacyYesNo, "maybe")).toEqual({});
    });

    it("verwirft unbekannte strukturierte Impf-IDs gegen Frozen-Metadaten", () => {
      const question = VACCINATION_REVIEW_QUESTION_CATALOG.VACCINATION_REVIEW_ITEMS;
      const value = JSON.stringify({
        schema_version: 1,
        entries: [{ vaccination_id: "unknown_vaccine", status: "open" }],
      });
      expect(sanitizeFrozen(question, value)).toEqual({});
    });
  });

  it("validiert neue Nikotin-Zahlen strikt und verwirft Einheiten/Präfixe", () => {
    const questions = [
      { id: "NIKOTIN_BEGINN_JAHR" },
      { id: "NIKOTIN_BEGINN_VOR" },
      { id: "NIKOTIN_AUFGEHOERT_JAHR" },
      { id: "NIKOTIN_AUFGEHOERT_VOR" },
      { id: "NIKOTIN_ZIG_PRO_TAG" },
    ];
    const out = sanitizeAnswers({
      NIKOTIN_BEGINN_JAHR: "2021",
      NIKOTIN_BEGINN_VOR: "5 Jahre",
      NIKOTIN_AUFGEHOERT_JAHR: "seit 2021",
      NIKOTIN_AUFGEHOERT_VOR: "ca. 5",
      NIKOTIN_ZIG_PRO_TAG: "20 Stück",
    }, questions);
    expect(out).toEqual({ NIKOTIN_BEGINN_JAHR: "2021" });
  });

  it("behält den Legacy-Parser für alte textbasierte Sessions bei", () => {
    const out = sanitizeAnswers(
      { NIKOTIN_DAUER_JAHRE: "ca. 15" },
      [{ id: "NIKOTIN_DAUER_JAHRE" }],
    );
    expect(out.NIKOTIN_DAUER_JAHRE).toBe("ca. 15");
  });
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

    it("verwirft unbekannte EN-Werte", () => {
      const out = sanitizeAnswers(
        { AU_SYMPTOMS: "Cough, Unbekannt" },
        [{ id: "AU_SYMPTOMS" }],
        "en",
      );
      expect(out.AU_SYMPTOMS).toBeUndefined();
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

    it("Default 'de' verwirft unbekannte Optionswerte", () => {
      const out = sanitizeAnswers(
        { AU_SYMPTOMS: "Cough" },
        [{ id: "AU_SYMPTOMS" }],
      );
      expect(out.AU_SYMPTOMS).toBeUndefined();
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
