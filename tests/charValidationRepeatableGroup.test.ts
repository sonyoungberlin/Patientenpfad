/**
 * Zeichenvalidierung für repeatable_group Unterfelder (B.1-Bereinigung).
 *
 * Abdeckung:
 *  1.  Erlaubter deutscher Freitext in einem Repeatable-Entry bleibt erhalten
 *  2.  Umlaute und ß bleiben erlaubt
 *  3.  Ungültiger Freitext (z. B. Kyrillisch) in text-Unterfeld → validateAnswerCharacters
 *      markiert die questionId (identisch zu normalen Freitextfragen)
 *  4.  Ungültige Zeichen in textarea-Unterfeld → gleiches Verhalten
 *  5.  select-Unterfeld: kein Zeichencheck, beliebiger Wert erlaubt
 *  6.  multi_select-Unterfeld: kein Zeichencheck, beliebiger Wert erlaubt
 *  7.  Unbekannte Keys werden weiterhin entfernt
 *  8.  Nicht-String-Werte werden weiterhin verworfen
 *  9.  maxEntries wird weiterhin durchgesetzt
 * 10.  Phase-2/3A/3B-Sanitizer-Regression bleibt grün
 */

import { sanitizeAnswers } from "@/lib/questionnaire/sanitizeAnswers";
import { validateAnswerCharacters } from "@/lib/questionnaire/validateAnswerCharacters";

// ---------------------------------------------------------------------------
// Helfer
// ---------------------------------------------------------------------------

const ERKR_QID = "VOLLST_ERKR_EINTRAEGE";
const FAMIL_QID = "VOLLST_FAMIL_EINTRAEGE";

function erkrEntry(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    diagnose: "Diabetes mellitus Typ 2",
    diagnose_unbekannt: "",
    seit_wann: "vor 2–5 Jahren",
    status: "aktuell in Behandlung / regelmäßiger Kontrolle",
    facharzt: "Ja",
    facharzt_fachrichtung: "Innere Medizin",
    facharzt_name: "Dr. Mueller",
    facharzt_ort: "Berlin",
    medikamente: "Ja",
    medikamente_welche: "Metformin",
    ...overrides,
  };
}

function withErkrAnswer(entries: Record<string, string>[]) {
  return { [ERKR_QID]: JSON.stringify(entries) };
}

const ERKR_QUESTION = [{ id: ERKR_QID, type: "repeatable_group" as const }];
const ERKR_DEDUP = [{ id: ERKR_QID }];

// ---------------------------------------------------------------------------
// 1. Erlaubter deutscher Freitext bleibt erhalten
// ---------------------------------------------------------------------------

describe("RepeatableGroup – erlaubter Freitext", () => {
  it("speichert einen validen deutschen Eintrag", () => {
    const result = sanitizeAnswers(withErkrAnswer([erkrEntry()]), ERKR_DEDUP);
    const parsed = JSON.parse(result[ERKR_QID] ?? "[]");
    expect(parsed).toHaveLength(1);
    expect(parsed[0].diagnose).toBe("Diabetes mellitus Typ 2");
  });

  // 2. Umlaute und ß
  it("erlaubt Umlaute und ß", () => {
    const entry = erkrEntry({ diagnose: "Gallenblasenentzündung (Ätiologie unbekannt)" });
    const answers = withErkrAnswer([entry]);
    const charCheck = validateAnswerCharacters(answers, ERKR_QUESTION);
    expect(charCheck.ok).toBe(true);
    const result = sanitizeAnswers(answers, ERKR_DEDUP);
    const parsed = JSON.parse(result[ERKR_QID] ?? "[]");
    expect(parsed[0].diagnose).toBe("Gallenblasenentzündung (Ätiologie unbekannt)");
  });
});

// ---------------------------------------------------------------------------
// 3. Ungültiger Freitext in text-Unterfeld → identisch zu normalen Freitextfragen
// ---------------------------------------------------------------------------

describe("RepeatableGroup – ungültige Zeichen in text-Unterfeld", () => {
  const cyrillicEntry = erkrEntry({ diagnose: "Диабет" });
  const answers = withErkrAnswer([cyrillicEntry]);

  it("validateAnswerCharacters liefert ok: false", () => {
    const result = validateAnswerCharacters(answers, ERKR_QUESTION);
    expect(result.ok).toBe(false);
  });

  it("validateAnswerCharacters enthält die questionId im invalidQuestionIds-Array", () => {
    const result = validateAnswerCharacters(answers, ERKR_QUESTION);
    expect(result.invalidQuestionIds).toContain(ERKR_QID);
  });

  it("sanitizer verwirft den Eintrag mit ungültigen Zeichen (defense-in-depth)", () => {
    const result = sanitizeAnswers(answers, ERKR_DEDUP);
    expect(result[ERKR_QID]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 4. Ungültige Zeichen in textarea-Unterfeld (medikamente_welche)
// ---------------------------------------------------------------------------

describe("RepeatableGroup – ungültige Zeichen in textarea-Unterfeld", () => {
  const arabicEntry = erkrEntry({ medikamente_welche: "دواء" });
  const answers = withErkrAnswer([arabicEntry]);

  it("validateAnswerCharacters liefert ok: false", () => {
    const result = validateAnswerCharacters(answers, ERKR_QUESTION);
    expect(result.ok).toBe(false);
  });

  it("sanitizer verwirft den Eintrag mit ungültigen Zeichen (defense-in-depth)", () => {
    const result = sanitizeAnswers(answers, ERKR_DEDUP);
    expect(result[ERKR_QID]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 5. select-Unterfeld: kein Zeichencheck
// ---------------------------------------------------------------------------

describe("RepeatableGroup – select-Unterfeld unverändert", () => {
  it("select mit gültigem Wert bleibt erhalten", () => {
    const answers = withErkrAnswer([erkrEntry({ seit_wann: "vor 2–5 Jahren" })]);
    const charCheck = validateAnswerCharacters(answers, ERKR_QUESTION);
    expect(charCheck.ok).toBe(true);
    const result = sanitizeAnswers(answers, ERKR_DEDUP);
    const parsed = JSON.parse(result[ERKR_QID] ?? "[]");
    expect(parsed[0].seit_wann).toBe("vor 2–5 Jahren");
  });
});

// ---------------------------------------------------------------------------
// 6. multi_select-Unterfeld: kein Zeichencheck
// ---------------------------------------------------------------------------

describe("RepeatableGroup – multi_select-Unterfeld unverändert", () => {
  const familQids = [{ id: FAMIL_QID }];
  const familQuestions = [{ id: FAMIL_QID, type: "repeatable_group" as const }];

  it("multi_select-Wert wird gespeichert und löst keinen Zeichenfehler aus", () => {
    const answers = { [FAMIL_QID]: JSON.stringify([{ erkrankung: "Herzinfarkt", verwandtschaft: "Vater, Geschwister" }]) };
    const charCheck = validateAnswerCharacters(answers, familQuestions);
    expect(charCheck.ok).toBe(true);
    const result = sanitizeAnswers(answers, familQids);
    const parsed = JSON.parse(result[FAMIL_QID] ?? "[]");
    expect(parsed[0].verwandtschaft).toBe("Vater, Geschwister");
  });
});

// ---------------------------------------------------------------------------
// 7. Unbekannte Keys werden weiterhin entfernt
// ---------------------------------------------------------------------------

describe("RepeatableGroup – unbekannte Keys entfernt", () => {
  it("extra Key im Eintrag wird nicht gespeichert", () => {
    const entryWithExtra = { ...erkrEntry(), hacker_field: "injection" };
    const result = sanitizeAnswers(withErkrAnswer([entryWithExtra as Record<string, string>]), ERKR_DEDUP);
    const parsed = JSON.parse(result[ERKR_QID] ?? "[]");
    expect(parsed[0]).not.toHaveProperty("hacker_field");
    expect(parsed[0].diagnose).toBe("Diabetes mellitus Typ 2");
  });
});

// ---------------------------------------------------------------------------
// 8. Nicht-String-Werte werden weiterhin verworfen
// ---------------------------------------------------------------------------

describe("RepeatableGroup – Nicht-String-Werte verworfen", () => {
  it("numerischer Wert in Unterfeld wird ignoriert", () => {
    const rawEntry = { diagnose: "Hypertonie", seit_wann: 42 };
    const answers = { [ERKR_QID]: JSON.stringify([rawEntry]) };
    const result = sanitizeAnswers(answers, ERKR_DEDUP);
    const parsed = JSON.parse(result[ERKR_QID] ?? "[]");
    expect(parsed[0]).not.toHaveProperty("seit_wann");
    expect(parsed[0].diagnose).toBe("Hypertonie");
  });
});

// ---------------------------------------------------------------------------
// 9. maxEntries wird weiterhin durchgesetzt
// ---------------------------------------------------------------------------

describe("RepeatableGroup – maxEntries Grenze", () => {
  it("mehr als maxEntries Einträge werden abgeschnitten", () => {
    const entries = Array.from({ length: 25 }, (_, i) =>
      erkrEntry({ diagnose: `Erkrankung ${i + 1}` }),
    );
    const result = sanitizeAnswers(withErkrAnswer(entries), ERKR_DEDUP);
    const parsed = JSON.parse(result[ERKR_QID] ?? "[]");
    // VOLLST_ERKR_EINTRAEGE.maxEntries = 20
    expect(parsed.length).toBeLessThanOrEqual(20);
  });
});

// ---------------------------------------------------------------------------
// 10. Phase-2/3A/3B-Regression: VOLLST_SUBSTANZEN Sanitizer
// ---------------------------------------------------------------------------

describe("Phase-2/3A/3B Regression – VOLLST_SUBSTANZEN Sanitizer", () => {
  const substEntry = {
    substanz: "Cannabis",
    substanz_andere: "",
    status: "früher",
    haeufigkeit: "wöchentlich",
    dauer: "ca. 5 Jahre",
    beendet_wann: "vor 3 Jahren",
    probleme: "Nein",
    abstinenzversuch: "Nein",
    behandlung: "Nein",
    behandlung_art: "",
    behandlung_name: "",
    behandlung_ort: "",
    reduktion_wunsch: "",
    unterstuetzung_wunsch: "",
  };

  it("valider Substanz-Eintrag bleibt nach der Bereinigung erhalten", () => {
    const answers = { SUBST_EINTRAEGE: JSON.stringify([substEntry]) };
    const result = sanitizeAnswers(answers, [{ id: "SUBST_EINTRAEGE" }]);
    const parsed = JSON.parse(result["SUBST_EINTRAEGE"] ?? "[]");
    expect(parsed).toHaveLength(1);
    expect(parsed[0].substanz).toBe("Cannabis");
  });
});
