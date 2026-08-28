/**
 * Numerisches Parsing für Patientenantworten aus Freitextfeldern.
 *
 * Konservativ: Ranges, mehrdeutige oder nicht-numerische Eingaben → null.
 * Keine medizinische Interpretation.
 */

/** Vorsätze, die Patienten vor Zahlen schreiben; werden entfernt. */
const APPROXIMATION_PREFIX = /^(ca\.?\s*|~\s*|etwa\s*|ungefähr\s*)/i;

/** Bekannte Einheiten, die am Ende stehen können (Groß-/Kleinschreibung egal). */
const UNIT_SUFFIX = /\s*(kg|cm|g|ml|l)\s*$/i;

/** Explizite Metereinheit: auf "m" enden, aber nicht "cm" */
const METER_SUFFIX = /\s*m\s*$/i;
const CM_SUFFIX = /cm\s*$/i;

/**
 * Parst einen einzigen positiven Zahlenwert aus einem Patienten-Freitext.
 *
 * Unterstützt: ganzzahlige und Dezimalwerte, Komma als Dezimaltrennzeichen,
 * Näherungsangaben wie "ca. 10" oder "~10", sowie Einheitensuffixe (cm, kg …).
 *
 * @returns Die extrahierte Zahl ≥ 0 oder null bei unklarem/ungültigem Input.
 */
export function parseNumericAnswer(value: string): number | null {
  if (!value || !value.trim()) return null;

  let s = value.trim();

  // Näherungsangaben am Anfang entfernen
  s = s.replace(APPROXIMATION_PREFIX, "").trim();

  // Einheitensuffix entfernen (cm, kg, g, ml, l — nicht m, da m unter 2.5)
  s = s.replace(UNIT_SUFFIX, "").trim();

  // Ranges: "10-15", "10–15", "10 bis 15", "zwischen 10 und 15" → null
  if (/[-–]/.test(s)) return null;
  if (/\b(bis|und|zwischen)\b/i.test(s)) return null;

  // Komma als Dezimaltrennzeichen normalisieren (nur wenn genau ein Komma, kein Punkt)
  if ((s.match(/,/g) ?? []).length === 1 && !s.includes(".")) {
    s = s.replace(",", ".");
  } else if ((s.match(/,/g) ?? []).length > 1) {
    return null; // "1,000,000" oder ähnlich
  }

  // Mehrere Tokens → mehrdeutig → null
  if (/\s/.test(s.trim())) return null;

  const num = parseFloat(s);
  if (isNaN(num) || !isFinite(num)) return null;
  if (num < 0) return null;

  return num;
}

/**
 * Parst ISO-Datum "YYYY-MM-DD" zu einem Date-Objekt (UTC-Mitternacht).
 *
 * @returns Date oder null bei ungültigem Format oder unmöglichem Datum.
 */
export function parseISODate(value: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [yearStr, monthStr, dayStr] = value.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  // Prüfen ob Datum reell ist (Date normalisiert ungültige Tage, z. B. 31. Feb)
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() + 1 !== month ||
    d.getUTCDate() !== day
  ) {
    return null;
  }
  return d;
}

/**
 * Normalisiert einen Größenwert (aus Freitextfeld) auf Zentimeter.
 *
 * Unterstützt:
 *   - "175" / "175 cm" → 175 cm
 *   - "1.75" / "1,75" → 175 cm  (Heuristik: Wert ≤ 2,9 → Meter)
 *   - "1.75 m" / "1,75 m" → 175 cm  (explizite Metereinheit)
 *
 * Für type="number"-Felder (VOLLST_HEIGHT) ist parseNumericAnswer ausreichend;
 * dieser Parser ist primär für das Legacy-Freitextfeld ANAMNESE_HEIGHT gedacht.
 *
 * @returns Höhe in cm (gerundet) oder null bei unklarem Input.
 */
export function parseHeightToCm(value: string): number | null {
  if (!value || !value.trim()) return null;

  const trimmed = value.trim();

  // Explizite Metereinheit (nicht "cm"): "1.75 m", "1,75m"
  const isMeterExplicit = METER_SUFFIX.test(trimmed) && !CM_SUFFIX.test(trimmed);

  // Metersuffix vor dem Numerik-Parsing entfernen, damit kein Leerzeichen stört
  const strippedForParsing = isMeterExplicit
    ? trimmed.replace(METER_SUFFIX, "").trim()
    : trimmed;

  const num = parseNumericAnswer(strippedForParsing);
  if (num === null) return null;
  if (num <= 0) return null;

  if (isMeterExplicit) {
    return Math.round(num * 100);
  }

  // Heuristik für fehlende Einheit:
  // ≤ 2,9 → Meter (z. B. 1,75), ≥ 30 → Zentimeter
  if (num <= 2.9) return Math.round(num * 100);
  if (num >= 30) return num;

  return null; // ambig (z. B. "3", "5")
}
