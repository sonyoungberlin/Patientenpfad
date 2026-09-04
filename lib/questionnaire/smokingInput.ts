import { parseNumericAnswer } from "./parseNumericAnswer";

export const SMOKING_START_YEAR_ID = "NIKOTIN_BEGINN_JAHR";
export const SMOKING_START_YEARS_AGO_ID = "NIKOTIN_BEGINN_VOR";
export const SMOKING_STOP_YEAR_ID = "NIKOTIN_AUFGEHOERT_JAHR";
export const SMOKING_STOP_YEARS_AGO_ID = "NIKOTIN_AUFGEHOERT_VOR";

export const SMOKING_NUMERIC_QUESTION_IDS = new Set([
  SMOKING_START_YEAR_ID,
  SMOKING_START_YEARS_AGO_ID,
  SMOKING_STOP_YEAR_ID,
  SMOKING_STOP_YEARS_AGO_ID,
  "NIKOTIN_ZIG_PRO_TAG",
]);

/** Strict numeric input: no units, prefixes, whitespace or ranges. */
export function parseStrictNumericAnswer(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "" || !/^\d+(?:[.,]\d+)?$/.test(trimmed)) return null;
  return parseNumericAnswer(trimmed);
}

export function parseStrictIntegerAnswer(value: string): number | null {
  const number = parseStrictNumericAnswer(value);
  return number !== null && Number.isInteger(number) ? number : null;
}

export function getCurrentYear(today = new Date()): number {
  return today.getFullYear();
}

const FIRST_PLAUSIBLE_YEAR = 1900;

export function isPlausibleCalendarYear(year: number, today = new Date()): boolean {
  const currentYear = getCurrentYear(today);
  return Number.isInteger(year) && year >= FIRST_PLAUSIBLE_YEAR && year <= currentYear;
}

export function isPlausibleYearsAgo(yearsAgo: number, today = new Date()): boolean {
  return Number.isInteger(yearsAgo) && yearsAgo >= 0 &&
    isPlausibleCalendarYear(getCurrentYear(today) - yearsAgo, today);
}

export type SmokingPair = { year: number; yearsAgo: number };

export function normalizeSmokingPair(
  yearValue: string,
  yearsAgoValue: string,
  today = new Date(),
): SmokingPair | null {
  const currentYear = getCurrentYear(today);
  const year = parseStrictIntegerAnswer(yearValue);
  const yearsAgo = parseStrictIntegerAnswer(yearsAgoValue);

  if (
    year !== null &&
    yearsAgo !== null &&
    (!isPlausibleCalendarYear(year, today) ||
      !isPlausibleYearsAgo(yearsAgo, today) ||
      currentYear - year !== yearsAgo)
  ) {
    return null;
  }

  if (year !== null && isPlausibleCalendarYear(year, today)) {
    return { year, yearsAgo: currentYear - year };
  }
  if (yearsAgo !== null && isPlausibleYearsAgo(yearsAgo, today)) {
    return { year: currentYear - yearsAgo, yearsAgo };
  }
  return null;
}

export function synchronizeSmokingPair(
  id: string,
  value: string,
  answers: Record<string, string>,
  today = new Date(),
): Record<string, string> {
  const next = { ...answers, [id]: value };
  const currentYear = getCurrentYear(today);
  const number = parseStrictIntegerAnswer(value);
  if (number === null) return next;

  if (id === SMOKING_START_YEAR_ID && isPlausibleCalendarYear(number, today)) {
    next[SMOKING_START_YEARS_AGO_ID] = String(currentYear - number);
  } else if (id === SMOKING_START_YEARS_AGO_ID && isPlausibleYearsAgo(number, today)) {
    next[SMOKING_START_YEAR_ID] = String(currentYear - number);
  } else if (id === SMOKING_STOP_YEAR_ID && isPlausibleCalendarYear(number, today)) {
    next[SMOKING_STOP_YEARS_AGO_ID] = String(currentYear - number);
  } else if (id === SMOKING_STOP_YEARS_AGO_ID && isPlausibleYearsAgo(number, today)) {
    next[SMOKING_STOP_YEAR_ID] = String(currentYear - number);
  }
  return next;
}
