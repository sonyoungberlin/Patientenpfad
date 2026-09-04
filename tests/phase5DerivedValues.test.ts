/**
 * Phase 5: Derived Values – AGE, BMI, PACK_YEARS
 *
 * Tests für:
 *  - parseNumericAnswer (numerischer Parser)
 *  - parseISODate, parseHeightToCm (Hilfsfunktionen)
 *  - computeAge (kalenderbasiert)
 *  - computeBMI (VOLLST + Legacy-Fallback)
 *  - computePackYears (Zigaretten-Bedingung)
 *  - computeAllDerivedValues (Aggregat)
 *  - Conditional Logic mit derivedValues (AGE, BMI, PACK_YEARS)
 *  - Hidden-Answer-Problem: serverseitige Filterung
 */

import {
  parseNumericAnswer,
  parseISODate,
  parseHeightToCm,
} from "../lib/questionnaire/parseNumericAnswer";
import {
  computeAge,
  computeBMI,
  computePackYears,
  computeAllDerivedValues,
} from "../lib/questionnaire/derivedValues";
import {
  evaluateCondition,
  computeVisibleQuestionIds,
  computeVisibleBlockIds,
  type ConditionalRule,
} from "../lib/questionnaire/conditionalLogic";
import {
  normalizeSmokingPair,
  parseStrictIntegerAnswer,
  synchronizeSmokingPair,
} from "../lib/questionnaire/smokingInput";

// ---------------------------------------------------------------------------
// parseNumericAnswer
// ---------------------------------------------------------------------------

describe("parseNumericAnswer", () => {
  it("parst eine einfache Ganzzahl", () => {
    expect(parseNumericAnswer("10")).toBe(10);
  });

  it("parst Dezimalwert mit Komma", () => {
    expect(parseNumericAnswer("10,5")).toBe(10.5);
  });

  it("parst Dezimalwert mit Punkt", () => {
    expect(parseNumericAnswer("10.5")).toBe(10.5);
  });

  it("entfernt 'ca.' Präfix", () => {
    expect(parseNumericAnswer("ca. 10")).toBe(10);
  });

  it("entfernt 'ca' ohne Punkt", () => {
    expect(parseNumericAnswer("ca 10")).toBe(10);
  });

  it("entfernt '~' Präfix", () => {
    expect(parseNumericAnswer("~10")).toBe(10);
  });

  it("entfernt 'etwa' Präfix", () => {
    expect(parseNumericAnswer("etwa 10")).toBe(10);
  });

  it("entfernt Einheitensuffix 'kg'", () => {
    expect(parseNumericAnswer("70 kg")).toBe(70);
  });

  it("entfernt Einheitensuffix 'cm'", () => {
    expect(parseNumericAnswer("175 cm")).toBe(175);
  });

  it("kombiniert Näherung + Einheit", () => {
    expect(parseNumericAnswer("ca. 70 kg")).toBe(70);
  });

  it("gibt null für Range '10-15'", () => {
    expect(parseNumericAnswer("10-15")).toBeNull();
  });

  it("gibt null für 'zwischen 10 und 15'", () => {
    expect(parseNumericAnswer("zwischen 10 und 15")).toBeNull();
  });

  it("gibt null für negative Zahl", () => {
    expect(parseNumericAnswer("-5")).toBeNull();
  });

  it("gibt null für leeren String", () => {
    expect(parseNumericAnswer("")).toBeNull();
  });

  it("gibt null für nichtnumerischen Freitext", () => {
    expect(parseNumericAnswer("keine Ahnung")).toBeNull();
  });

  it("gibt null für mehrere Zahlen", () => {
    expect(parseNumericAnswer("10 15")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseISODate
// ---------------------------------------------------------------------------

describe("parseISODate", () => {
  it("parst gültiges Datum", () => {
    const d = parseISODate("1985-03-15");
    expect(d).not.toBeNull();
    expect(d!.getUTCFullYear()).toBe(1985);
    expect(d!.getUTCMonth()).toBe(2); // März = 2
    expect(d!.getUTCDate()).toBe(15);
  });

  it("gibt null für leeren String", () => {
    expect(parseISODate("")).toBeNull();
  });

  it("gibt null für falsches Format", () => {
    expect(parseISODate("15.03.1985")).toBeNull();
    expect(parseISODate("1985/03/15")).toBeNull();
  });

  it("gibt null für unmögliches Datum (31. Feb)", () => {
    expect(parseISODate("2023-02-31")).toBeNull();
  });

  it("gibt null für ungültigen Monat", () => {
    expect(parseISODate("2023-13-01")).toBeNull();
  });

  it("parst Schaltjahrtag korrekt", () => {
    const d = parseISODate("2000-02-29");
    expect(d).not.toBeNull();
    expect(d!.getUTCDate()).toBe(29);
  });
});

// ---------------------------------------------------------------------------
// parseHeightToCm
// ---------------------------------------------------------------------------

describe("parseHeightToCm", () => {
  it("parst '175' als 175 cm", () => {
    expect(parseHeightToCm("175")).toBe(175);
  });

  it("parst '175 cm' als 175 cm", () => {
    expect(parseHeightToCm("175 cm")).toBe(175);
  });

  it("parst '1.75' als 175 cm (Heuristik: ≤ 2.9 = Meter)", () => {
    expect(parseHeightToCm("1.75")).toBe(175);
  });

  it("parst '1,75' als 175 cm", () => {
    expect(parseHeightToCm("1,75")).toBe(175);
  });

  it("parst '1.75 m' als 175 cm", () => {
    expect(parseHeightToCm("1.75 m")).toBe(175);
  });

  it("parst '1,75 m' als 175 cm", () => {
    expect(parseHeightToCm("1,75 m")).toBe(175);
  });

  it("gibt null für '5' (ambig: 5 cm oder 5 m?)", () => {
    expect(parseHeightToCm("5")).toBeNull();
  });

  it("gibt null für leeren String", () => {
    expect(parseHeightToCm("")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// computeAge – kalenderbasiert
// ---------------------------------------------------------------------------

describe("computeAge", () => {
  const baseAnswers = { IDENTITY_BIRTHDATE: "" };

  it("Geburtstag heute → korrektes Alter", () => {
    const today = new Date(Date.UTC(2026, 7, 27)); // 27. Aug 2026
    const answers = { IDENTITY_BIRTHDATE: "1985-08-27" };
    expect(computeAge(answers, { today })).toBe(41);
  });

  it("Geburtstag morgen → noch ein Jahr jünger", () => {
    const today = new Date(Date.UTC(2026, 7, 27)); // 27. Aug 2026
    const answers = { IDENTITY_BIRTHDATE: "1985-08-28" }; // morgen
    expect(computeAge(answers, { today })).toBe(40);
  });

  it("Geburtstag gestern → korrekt", () => {
    const today = new Date(Date.UTC(2026, 7, 27)); // 27. Aug 2026
    const answers = { IDENTITY_BIRTHDATE: "1985-08-26" }; // gestern
    expect(computeAge(answers, { today })).toBe(41);
  });

  it("ungültiges Datum → null", () => {
    const today = new Date(Date.UTC(2026, 7, 27));
    const answers = { IDENTITY_BIRTHDATE: "not-a-date" };
    expect(computeAge(answers, { today })).toBeNull();
  });

  it("zukünftiges Geburtsdatum → null", () => {
    const today = new Date(Date.UTC(2026, 7, 27));
    const answers = { IDENTITY_BIRTHDATE: "2030-01-01" };
    expect(computeAge(answers, { today })).toBeNull();
  });

  it("Schaltjahr: Geburtstag am 29. Feb, heute ist 1. März Nicht-Schaltjahr", () => {
    // 1990-02-29 → ungültig (1990 kein Schaltjahr)
    const answers = { IDENTITY_BIRTHDATE: "1990-02-29" };
    const today = new Date(Date.UTC(2026, 2, 1));
    expect(computeAge(answers, { today })).toBeNull(); // ungültiges Datum
  });

  it("Schaltjahr: Geburtstag am 29. Feb 2000, heute 28. Feb 2026 → noch nicht", () => {
    const today = new Date(Date.UTC(2026, 1, 28)); // 28. Feb 2026
    const answers = { IDENTITY_BIRTHDATE: "2000-02-29" };
    expect(computeAge(answers, { today })).toBe(25); // Geburtstag noch nicht
  });

  it("fehlendes Geburtsdatum → null", () => {
    expect(computeAge(baseAnswers, { today: new Date() })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// computeBMI
// ---------------------------------------------------------------------------

describe("computeBMI", () => {
  it("VOLLST_HEIGHT + VOLLST_WEIGHT → korrekter BMI", () => {
    const answers = { VOLLST_HEIGHT: "175", VOLLST_WEIGHT: "70" };
    const bmi = computeBMI(answers);
    expect(bmi).not.toBeNull();
    expect(bmi!).toBeCloseTo(22.857, 2);
  });

  it("Dezimalgewicht mit Komma (Legacy-Parser via ANAMNESE_WEIGHT)", () => {
    const answers = { ANAMNESE_HEIGHT: "175 cm", ANAMNESE_WEIGHT: "70,5" };
    const bmi = computeBMI(answers);
    expect(bmi).not.toBeNull();
    expect(bmi!).toBeCloseTo(23.02, 1);
  });

  it("Legacy: '175 cm' + '70 kg'", () => {
    const answers = { ANAMNESE_HEIGHT: "175 cm", ANAMNESE_WEIGHT: "70 kg" };
    const bmi = computeBMI(answers);
    expect(bmi).not.toBeNull();
    expect(bmi!).toBeCloseTo(22.857, 2);
  });

  it("Legacy: '1,75 m' + '70,5'", () => {
    const answers = { ANAMNESE_HEIGHT: "1,75 m", ANAMNESE_WEIGHT: "70,5" };
    const bmi = computeBMI(answers);
    expect(bmi).not.toBeNull();
    expect(bmi!).toBeCloseTo(23.02, 1);
  });

  it("unklarer Legacy-Wert → null", () => {
    const answers = { ANAMNESE_HEIGHT: "ca. 175 bis 180", ANAMNESE_WEIGHT: "70" };
    expect(computeBMI(answers)).toBeNull();
  });

  it("VOLLST-Felder haben Vorrang vor Legacy-Feldern", () => {
    // VOLLST_HEIGHT=180 cm, ANAMNESE_HEIGHT=175 cm → 180 soll verwendet werden
    const answers = {
      VOLLST_HEIGHT: "180",
      VOLLST_WEIGHT: "80",
      ANAMNESE_HEIGHT: "175 cm",
      ANAMNESE_WEIGHT: "70 kg",
    };
    const bmi = computeBMI(answers);
    expect(bmi).not.toBeNull();
    // BMI mit 180/80: 80 / (1.8^2) = 24.691
    expect(bmi!).toBeCloseTo(24.691, 2);
  });

  it("fehlende Größe → null", () => {
    expect(computeBMI({ VOLLST_WEIGHT: "70" })).toBeNull();
  });

  it("fehlende Gewicht → null", () => {
    expect(computeBMI({ VOLLST_HEIGHT: "175" })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// computePackYears
// ---------------------------------------------------------------------------

describe("computePackYears", () => {
  it("20 Zigaretten/Tag × 10 Jahre → 10.0 Pack-Years", () => {
    const answers = {
      NIKOTIN_GATE: "Ja, aktuell",
      NIKOTIN_PRODUKT: "Zigaretten",
      NIKOTIN_ZIG_PRO_TAG: "20",
      NIKOTIN_DAUER_JAHRE: "10",
    };
    expect(computePackYears(answers)).toBe(10);
  });

  it("Dezimalwerte: 15 Zigaretten/Tag × 5,5 Jahre → 4.125", () => {
    const answers = {
      NIKOTIN_GATE: "Ja, aktuell",
      NIKOTIN_PRODUKT: "Zigaretten",
      NIKOTIN_ZIG_PRO_TAG: "15",
      NIKOTIN_DAUER_JAHRE: "5,5",
    };
    expect(computePackYears(answers)).toBeCloseTo(4.125, 3);
  });

  it("'ca. 10' Zigaretten/Tag wird verarbeitet", () => {
    const answers = {
      NIKOTIN_GATE: "Früher, inzwischen aufgehört",
      NIKOTIN_PRODUKT: "Zigaretten",
      NIKOTIN_ZIG_PRO_TAG: "ca. 10",
      NIKOTIN_DAUER_JAHRE: "20",
    };
    expect(computePackYears(answers)).toBe(10);
  });

  it("anderes Nikotinprodukt → null", () => {
    const answers = {
      NIKOTIN_GATE: "Ja, aktuell",
      NIKOTIN_PRODUKT: "Zigarren / Zigarillos",
      NIKOTIN_ZIG_PRO_TAG: "5",
      NIKOTIN_DAUER_JAHRE: "10",
    };
    expect(computePackYears(answers)).toBeNull();
  });

  it("Gate = 'Nein, nie regelmäßig' → null", () => {
    const answers = {
      NIKOTIN_GATE: "Nein, nie regelmäßig",
      NIKOTIN_ZIG_PRO_TAG: "20",
      NIKOTIN_DAUER_JAHRE: "10",
    };
    expect(computePackYears(answers)).toBeNull();
  });

  it("fehlendes Gate → null", () => {
    const answers = {
      NIKOTIN_ZIG_PRO_TAG: "20",
      NIKOTIN_DAUER_JAHRE: "10",
    };
    expect(computePackYears(answers)).toBeNull();
  });

  it("fehlende Anzahl Zigaretten → null", () => {
    const answers = {
      NIKOTIN_GATE: "Ja, aktuell",
      NIKOTIN_PRODUKT: "Zigaretten",
      NIKOTIN_DAUER_JAHRE: "10",
    };
    expect(computePackYears(answers)).toBeNull();
  });

  it("fehlende Rauchdauer → null", () => {
    const answers = {
      NIKOTIN_GATE: "Ja, aktuell",
      NIKOTIN_PRODUKT: "Zigaretten",
      NIKOTIN_ZIG_PRO_TAG: "20",
    };
    expect(computePackYears(answers)).toBeNull();
  });

  it("fehlendes Produkt + Werte vorhanden → null (kein Fallback, explizites Zigaretten erforderlich)", () => {
    const answers = {
      NIKOTIN_GATE: "Ja, aktuell",
      NIKOTIN_ZIG_PRO_TAG: "20",
      NIKOTIN_DAUER_JAHRE: "10",
    };
    expect(computePackYears(answers)).toBeNull();
  });
});

describe("gekoppelte Rauchbeginn-/Rauchstopp-Werte", () => {
  const today = new Date("2026-06-15T12:00:00Z");

  it.each([
    ["2021", "", 2021, 5],
    ["", "5", 2021, 5],
    ["2019", "", 2019, 7],
    ["", "7", 2019, 7],
  ])("normalisiert %s / %s zu Jahr %s und %s Jahren", (year, ago, expectedYear, expectedAgo) => {
    expect(normalizeSmokingPair(year, ago, today)).toEqual({ year: expectedYear, yearsAgo: expectedAgo });
  });

    it("akzeptiert und verwirft Rauchstopp-Paare mit Bezugsjahr 2026", () => {
      expect(normalizeSmokingPair("2021", "5", today)).toEqual({ year: 2021, yearsAgo: 5 });
      expect(normalizeSmokingPair("2021", "9", today)).toBeNull();
    });

  it("berechnet 5 Pack-Years für aktuellen Raucher ab 2021", () => {
    expect(computePackYears({
      NIKOTIN_GATE: "Ja, aktuell",
      NIKOTIN_PRODUKT: "Zigaretten",
      NIKOTIN_BEGINN_JAHR: "2021",
      NIKOTIN_ZIG_PRO_TAG: "20",
    }, { today })).toBe(5);
  });

  it("berechnet 15 Pack-Years für ehemaligen Raucher aus Jahresangaben", () => {
    const answers = {
      NIKOTIN_GATE: "Früher, inzwischen aufgehört",
      NIKOTIN_PRODUKT: "Zigaretten",
      NIKOTIN_BEGINN_VOR: "20",
      NIKOTIN_AUFGEHOERT_VOR: "5",
      NIKOTIN_ZIG_PRO_TAG: "20",
    };
    expect(computePackYears(answers, { today })).toBe(15);
    expect(computePackYears({ ...answers, NIKOTIN_BEGINN_JAHR: "2006", NIKOTIN_AUFGEHOERT_JAHR: "2021" }, { today })).toBe(15);
  });

  it("verwirft nicht-numerische und zukünftige Werte", () => {
    for (const value of ["5 Jahre", "seit 2021", "20 Stück", "ca. 20", "~20"]) {
      expect(parseStrictIntegerAnswer(value)).toBeNull();
    }
    expect(normalizeSmokingPair("2027", "", today)).toBeNull();
  });

  it("synchronisiert beide Richtungen ohne widersprüchliche Werte", () => {
    const fromYear = synchronizeSmokingPair("NIKOTIN_BEGINN_JAHR", "2021", {}, today);
    expect(fromYear).toMatchObject({ NIKOTIN_BEGINN_JAHR: "2021", NIKOTIN_BEGINN_VOR: "5" });
    const fromAgo = synchronizeSmokingPair("NIKOTIN_BEGINN_VOR", "7", fromYear, today);
    expect(fromAgo).toMatchObject({ NIKOTIN_BEGINN_JAHR: "2019", NIKOTIN_BEGINN_VOR: "7" });
  });
});

// ---------------------------------------------------------------------------
// Conditional Logic mit Derived Values
// ---------------------------------------------------------------------------

describe("evaluateCondition mit derivedValues", () => {
  it("AGE greaterThanOrEqual 35 → true", () => {
    const rule = {
      target: { kind: "derived" as const, derivedId: "AGE" },
      operator: "greaterThanOrEqual" as const,
      value: 35,
    };
    expect(evaluateCondition(rule, {}, { AGE: 41 })).toBe(true);
  });

  it("AGE greaterThanOrEqual 35 → false wenn 30", () => {
    const rule = {
      target: { kind: "derived" as const, derivedId: "AGE" },
      operator: "greaterThanOrEqual" as const,
      value: 35,
    };
    expect(evaluateCondition(rule, {}, { AGE: 30 })).toBe(false);
  });

  it("BMI kann showQuestion steuern", () => {
    const rules: ConditionalRule[] = [
      {
        action: "showQuestion",
        targetId: "Q_ERNAEHRUNG",
        condition: {
          target: { kind: "derived", derivedId: "BMI" },
          operator: "greaterThan",
          value: 25,
        },
      },
    ];
    const visible = computeVisibleQuestionIds(rules, ["Q_ERNAEHRUNG"], {}, { BMI: 27 });
    expect(visible.has("Q_ERNAEHRUNG")).toBe(true);
  });

  it("PACK_YEARS kann showBlock steuern", () => {
    const blocks = [{ id: "BLOCK_RAUCH", initiallyVisible: false }];
    const rules: ConditionalRule[] = [
      {
        action: "showBlock",
        targetId: "BLOCK_RAUCH",
        condition: {
          target: { kind: "derived", derivedId: "PACK_YEARS" },
          operator: "greaterThanOrEqual",
          value: 10,
        },
      },
    ];
    const visible = computeVisibleBlockIds(rules, blocks, {}, { PACK_YEARS: 15 });
    expect(visible.has("BLOCK_RAUCH")).toBe(true);
  });

  it("Derived-Bedingung nach Input-Änderung wieder false → Block unsichtbar", () => {
    const blocks = [{ id: "BLOCK_BMI_HIGH", initiallyVisible: false }];
    const rules: ConditionalRule[] = [
      {
        action: "showBlock",
        targetId: "BLOCK_BMI_HIGH",
        condition: {
          target: { kind: "derived", derivedId: "BMI" },
          operator: "greaterThan",
          value: 25,
        },
      },
    ];
    // BMI hoch → sichtbar
    const before = computeVisibleBlockIds(rules, blocks, {}, { BMI: 28 });
    expect(before.has("BLOCK_BMI_HIGH")).toBe(true);
    // BMI niedrig → unsichtbar
    const after = computeVisibleBlockIds(rules, blocks, {}, { BMI: 22 });
    expect(after.has("BLOCK_BMI_HIGH")).toBe(false);
  });

  it("derivedValues=undefined → Derived-Bedingung immer false, kein Fehler", () => {
    const rule = {
      target: { kind: "derived" as const, derivedId: "AGE" },
      operator: "greaterThanOrEqual" as const,
      value: 35,
    };
    expect(() => evaluateCondition(rule, {}, undefined)).not.toThrow();
    expect(evaluateCondition(rule, {}, undefined)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Hidden-Answer-Problem: serverseitige Filterung
// ---------------------------------------------------------------------------

describe("Hidden-Answer-Problem: sichtbarkeitsbasierte Filterung", () => {
  it("Antworten unsichtbarer Fragen werden gefiltert wenn Derived Condition nicht erfüllt", () => {
    // Frage Q_X ist nur sichtbar wenn BMI > 25
    const rules: ConditionalRule[] = [
      {
        action: "showQuestion",
        targetId: "Q_X",
        condition: {
          target: { kind: "derived", derivedId: "BMI" },
          operator: "greaterThan",
          value: 25,
        },
      },
    ];
    const allQIds = ["Q_Y", "Q_X"]; // Q_Y immer sichtbar
    const answers = { Q_Y: "Antwort Y", Q_X: "Antwort X" };

    // BMI zu niedrig → Q_X unsichtbar
    const derivedLow = { BMI: 22 };
    const visible = computeVisibleQuestionIds(rules, allQIds, answers, derivedLow);
    const filtered = Object.fromEntries(
      Object.entries(answers).filter(([id]) => visible.has(id)),
    );
    expect(filtered).not.toHaveProperty("Q_X");
    expect(filtered).toHaveProperty("Q_Y");
  });

  it("Antwort wird gespeichert wenn Derived Condition erfüllt", () => {
    const rules: ConditionalRule[] = [
      {
        action: "showQuestion",
        targetId: "Q_X",
        condition: {
          target: { kind: "derived", derivedId: "BMI" },
          operator: "greaterThan",
          value: 25,
        },
      },
    ];
    const allQIds = ["Q_Y", "Q_X"];
    const answers = { Q_Y: "Antwort Y", Q_X: "Antwort X" };

    // BMI hoch → Q_X sichtbar
    const derivedHigh = { BMI: 28 };
    const visible = computeVisibleQuestionIds(rules, allQIds, answers, derivedHigh);
    const filtered = Object.fromEntries(
      Object.entries(answers).filter(([id]) => visible.has(id)),
    );
    expect(filtered).toHaveProperty("Q_X");
    expect(filtered).toHaveProperty("Q_Y");
  });
});

// ---------------------------------------------------------------------------
// computeAllDerivedValues
// ---------------------------------------------------------------------------

describe("computeAllDerivedValues", () => {
  it("leere Antworten → leeres Objekt", () => {
    const result = computeAllDerivedValues({});
    expect(result).toEqual({});
  });

  it("vollständige Antworten → alle drei Werte", () => {
    const today = new Date(Date.UTC(2026, 7, 27));
    const answers = {
      IDENTITY_BIRTHDATE: "1985-08-27",
      VOLLST_HEIGHT: "175",
      VOLLST_WEIGHT: "70",
      NIKOTIN_GATE: "Ja, aktuell",
      NIKOTIN_PRODUKT: "Zigaretten",
      NIKOTIN_ZIG_PRO_TAG: "20",
      NIKOTIN_DAUER_JAHRE: "10",
    };
    const result = computeAllDerivedValues(answers, { today });
    expect(result.AGE).toBe(41);
    expect(result.BMI).toBeCloseTo(22.857, 2);
    expect(result.PACK_YEARS).toBe(10);
  });
});
