/**
 * Phase 5: Derived Values – AGE, BMI, PACK_YEARS.
 *
 * Reine Berechnungsfunktionen ohne Seiteneffekte.
 * Werden sowohl client- als auch serverseitig eingesetzt.
 * Keine medizinischen Grenzwerte, keine Kategorien.
 */

import { parseISODate, parseNumericAnswer, parseHeightToCm } from "./parseNumericAnswer";

export type DerivedValueId =
  | "AGE"
  | "BMI"
  | "PACK_YEARS"
  | "SMOKING_DURATION_YEARS"
  | "SMOKING_STOPPED_YEARS_AGO";

/** Berechnete Werte als numerisches Dictionary; fehlt ein Wert, ist er nicht enthalten. */
export type DerivedValues = Partial<Record<DerivedValueId, number>>;

// ---------------------------------------------------------------------------
// AGE
// ---------------------------------------------------------------------------

/**
 * Berechnet das kalenderbasierte Alter in ganzen Jahren.
 *
 * Korrekt für: Geburtstag heute, morgen, gestern, Schaltjahre.
 *
 * @param options.today Injizierbar für deterministische Tests.
 */
export function computeAge(
  answers: Record<string, string>,
  options?: { today?: Date },
): number | null {
  const raw = answers["IDENTITY_BIRTHDATE"] ?? "";
  const birth = parseISODate(raw);
  if (!birth) {
    // Fallback: direkte Altersangabe aus VOLLST_AGE (Einmal-Links ohne Geburtsdatum)
    const direct = parseNumericAnswer(answers["VOLLST_AGE"] ?? "");
    if (direct !== null && direct >= 0) return direct;
    return null;
  }

  const today = options?.today ?? new Date();
  if (birth > today) return null;

  const by = birth.getUTCFullYear();
  const bm = birth.getUTCMonth();
  const bd = birth.getUTCDate();

  const ty = today.getUTCFullYear();
  const tm = today.getUTCMonth();
  const td = today.getUTCDate();

  let age = ty - by;
  // Geburtstag in diesem Jahr noch nicht erreicht
  if (tm < bm || (tm === bm && td < bd)) age -= 1;

  return age;
}

// ---------------------------------------------------------------------------
// BMI
// ---------------------------------------------------------------------------

/**
 * Berechnet den BMI als rohe Zahl (nicht gerundet).
 *
 * Bevorzugt strukturierte Felder VOLLST_HEIGHT/VOLLST_WEIGHT (type "number",
 * bereits in cm/kg); fällt auf ANAMNESE_HEIGHT/ANAMNESE_WEIGHT zurück
 * (Freitext, mit robustem Parser).
 */
export function computeBMI(answers: Record<string, string>): number | null {
  // Strukturierte Eingabe bevorzugen; Fallback auf Kurzanamnese-Freitext
  const heightCm =
    parseNumericAnswer(answers["VOLLST_HEIGHT"] ?? "") ??
    parseHeightToCm(answers["ANAMNESE_HEIGHT"] ?? "");

  const weightKg =
    parseNumericAnswer(answers["VOLLST_WEIGHT"] ?? "") ??
    parseNumericAnswer(answers["ANAMNESE_WEIGHT"] ?? "");

  if (heightCm === null || heightCm <= 0) return null;
  if (weightKg === null || weightKg <= 0) return null;

  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

// ---------------------------------------------------------------------------
// PACK_YEARS
// ---------------------------------------------------------------------------

const NIKOTIN_GATE_SMOKING_VALUES = new Set([
  "Ja, aktuell",
  "Früher, inzwischen aufgehört",
]);

/**
 * Berechnet Pack Years nach der Standardformel:
 *   (Zigaretten pro Tag / 20) × Rauchdauer in Jahren
 *
 * Nur für expliziten Zigarettenkonsum (NIKOTIN_PRODUKT = "Zigaretten").
 * Leeres oder anderes Produkt → null.
 */
export function computePackYears(answers: Record<string, string>): number | null {
  const gate = answers["NIKOTIN_GATE"] ?? "";
  if (!NIKOTIN_GATE_SMOKING_VALUES.has(gate)) return null;

  // Expliziter Zigarettenkonsum erforderlich; kein Fallback bei leerem Produkt
  if ((answers["NIKOTIN_PRODUKT"] ?? "") !== "Zigaretten") return null;

  const zigProTag = parseNumericAnswer(answers["NIKOTIN_ZIG_PRO_TAG"] ?? "");
  const dauerJahre = parseNumericAnswer(answers["NIKOTIN_DAUER_JAHRE"] ?? "");

  if (zigProTag === null || dauerJahre === null) return null;

  return (zigProTag / 20) * dauerJahre;
}

// ---------------------------------------------------------------------------
// SMOKING_DURATION_YEARS
// ---------------------------------------------------------------------------

/** Numerisch geparste Rauchdauer aus NIKOTIN_DAUER_JAHRE. */
export function computeSmokingDurationYears(answers: Record<string, string>): number | null {
  const gate = answers["NIKOTIN_GATE"] ?? "";
  if (!NIKOTIN_GATE_SMOKING_VALUES.has(gate)) return null;
  return parseNumericAnswer(answers["NIKOTIN_DAUER_JAHRE"] ?? "");
}

// ---------------------------------------------------------------------------
// SMOKING_STOPPED_YEARS_AGO
// ---------------------------------------------------------------------------

/** Numerisch geparste "Vor wie vielen Jahren aufgehört" aus NIKOTIN_AUFGEHOERT_VOR. */
export function computeSmokingStoppedYearsAgo(answers: Record<string, string>): number | null {
  if ((answers["NIKOTIN_GATE"] ?? "") !== "Früher, inzwischen aufgehört") return null;
  return parseNumericAnswer(answers["NIKOTIN_AUFGEHOERT_VOR"] ?? "");
}

// ---------------------------------------------------------------------------
// Aggregat
// ---------------------------------------------------------------------------

/**
 * Berechnet alle Derived Values aus dem aktuellen Antwort-State.
 *
 * Nur Werte mit gültigem Ergebnis sind im Rückgabeobjekt enthalten.
 *
 * @param options.today Injizierbar für deterministische Tests (AGE).
 */
export function computeAllDerivedValues(
  answers: Record<string, string>,
  options?: { today?: Date },
): DerivedValues {
  const result: DerivedValues = {};

  const age = computeAge(answers, options);
  if (age !== null) result.AGE = age;

  const bmi = computeBMI(answers);
  if (bmi !== null) result.BMI = bmi;

  const packYears = computePackYears(answers);
  if (packYears !== null) result.PACK_YEARS = packYears;

  const smokingDuration = computeSmokingDurationYears(answers);
  if (smokingDuration !== null) result.SMOKING_DURATION_YEARS = smokingDuration;

  const stoppedYearsAgo = computeSmokingStoppedYearsAgo(answers);
  if (stoppedYearsAgo !== null) result.SMOKING_STOPPED_YEARS_AGO = stoppedYearsAgo;

  return result;
}
