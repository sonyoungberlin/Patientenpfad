/**
 * Gemeinsame Formatierungs-Hilfsfunktionen für die praxisseitige Ausgabe
 * von Fragebogen-Antworten.
 *
 * Werden von drei Ausgabepfaden genutzt:
 *   - buildMedicalRecordNote (Krankenblatt-Plaintext)
 *   - PDF-Route (pdf-lib)
 *   - QuestionnaireCard (React Server Component)
 *
 * Keine Seiteneffekte, keine Imports aus Next.js / React.
 */

import { QUESTION_CATALOG } from "./blockCatalog";
import type { QuestionDefinition } from "./blockCatalog";
import type { DerivedValues } from "./derivedValues";

// ---------------------------------------------------------------------------
// yes_no-Normalisierung
// ---------------------------------------------------------------------------

/**
 * Normalisiert die gespeicherten Rohwerte "ja"/"nein" für die Praxisanzeige.
 * Andere Werte werden unverändert zurückgegeben.
 */
export function formatYesNoValue(raw: string): string {
  if (raw === "ja") return "Ja";
  if (raw === "nein") return "Nein";
  return raw;
}

/**
 * Gibt den Anzeigewert einer Frage zurück.
 * yes_no-Typen werden kapitalisiert, andere unverändert ausgegeben.
 * Gibt einen leeren String zurück, wenn rawValue leer ist.
 */
export function formatQuestionValue(
  question: QuestionDefinition | undefined,
  rawValue: string,
): string {
  if (!rawValue || rawValue.trim() === "") return "";
  if (question?.type === "yes_no") return formatYesNoValue(rawValue);
  return rawValue;
}

// ---------------------------------------------------------------------------
// Repeatable-Group-Einträge
// ---------------------------------------------------------------------------

export type RepGroupField = {
  label: string;
  value: string;
  /** Originaltyp des Felds (für Textarea-Zeilenumbrüche o. ä.) */
  fieldType?: string;
};

export type RepGroupEntry = {
  /** 1-basierter Index. */
  index: number;
  fields: RepGroupField[];
};

/**
 * Parst eine repeatable_group-JSON-Antwort in strukturierte Einträge.
 *
 * Verwendet das groupSchema der übergebenen (ggf. eingefrorenen) QuestionDefinition,
 * respektiert bedingte Sichtbarkeit innerhalb des Eintrags
 * (conditionalOn / conditionalValue / conditionalValues) und überspringt
 * leere Felder.
 *
 * @param jsonValue  - Rohwert aus den answers (JSON-String)
 * @param questionId - Fallback-Lookup in QUESTION_CATALOG, wenn questionDef fehlt
 * @param questionDef - Optionale eingefrorene QuestionDefinition
 */
export function parseRepeatableGroupEntries(
  jsonValue: string,
  questionId: string,
  questionDef?: QuestionDefinition,
): RepGroupEntry[] {
  const def = questionDef ?? QUESTION_CATALOG[questionId];
  const schema = def?.groupSchema;
  if (!schema || schema.length === 0) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonValue);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed) || parsed.length === 0) return [];

  const result: RepGroupEntry[] = [];

  parsed.forEach((item, idx) => {
    if (typeof item !== "object" || item === null) return;
    const entry = item as Record<string, unknown>;
    const fields: RepGroupField[] = [];

    for (const field of schema) {
      // Bedingte Sichtbarkeit innerhalb des Eintrags prüfen
      if (field.conditionalOn) {
        const cv = (entry[field.conditionalOn] as string) ?? "";
        const hidden = field.conditionalValues
          ? !field.conditionalValues.includes(cv)
          : cv !== field.conditionalValue;
        if (hidden) continue;
      }

      const val = entry[field.key];
      if (typeof val !== "string" || val.trim() === "") continue;

      let display = val.trim();

      if (field.type === "yes_no") {
        display = formatYesNoValue(display);
      } else if (field.type === "checkbox") {
        // Nicht angekreuzt (leer) → überspringen; angekreuzt ("ja") → "Ja"
        if (display === "") continue;
        if (display === "ja") display = "Ja";
      }

      fields.push({ label: field.label, value: display, fieldType: field.type });
    }

    if (fields.length > 0) {
      result.push({ index: idx + 1, fields });
    }
  });

  return result;
}

// ---------------------------------------------------------------------------
// FACHAERZTE-Sonderfall
// ---------------------------------------------------------------------------

const FACHAERZTE_DISPLAY_FIELDS: ReadonlyArray<{ key: string; label: string }> = [
  { key: "erkrankung", label: "Erkrankung / Grund" },
  { key: "bereich", label: "Facharztbereich" },
  { key: "name", label: "Name Facharzt/Praxis" },
  { key: "adresse", label: "Adresse" },
];

/**
 * Parst das FACHAERZTE-Feld (type="textarea" im Katalog, speichert aber JSON).
 */
export function parseFacharztEntries(jsonValue: string): RepGroupEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonValue);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed) || parsed.length === 0) return [];

  const result: RepGroupEntry[] = [];

  parsed.forEach((item, idx) => {
    if (typeof item !== "object" || item === null) return;
    const entry = item as Record<string, unknown>;
    const fields: RepGroupField[] = [];

    for (const { key, label } of FACHAERZTE_DISPLAY_FIELDS) {
      const val = entry[key];
      if (typeof val !== "string" || val.trim() === "") continue;
      fields.push({ label, value: val.trim() });
    }

    if (fields.length > 0) {
      result.push({ index: idx + 1, fields });
    }
  });

  return result;
}

// ---------------------------------------------------------------------------
// Berechnete Werte
// ---------------------------------------------------------------------------

function formatDeGerman(value: number, decimals: number): string {
  return value.toFixed(decimals).replace(".", ",");
}

function formatPackYears(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded)
    ? String(Math.round(rounded))
    : formatDeGerman(rounded, 1);
}

/**
 * Erzeugt formatierte Zeilen für den „Berechnete Werte"-Abschnitt.
 *
 * Nur Werte, die tatsächlich berechnet wurden, erscheinen in der Ausgabe.
 * SMOKING_DURATION_YEARS und SMOKING_STOPPED_YEARS_AGO werden NICHT angezeigt
 * (interne Hilfswerte).
 */
export function buildDerivedValueLines(dv: DerivedValues): string[] {
  const lines: string[] = [];
  if (dv.AGE !== undefined) {
    lines.push(`Alter: ${Math.round(dv.AGE)} Jahre`);
  }
  if (dv.BMI !== undefined) {
    lines.push(`BMI: ${formatDeGerman(dv.BMI, 1)} kg/m²`);
  }
  if (dv.PACK_YEARS !== undefined) {
    lines.push(`Pack-Years: ${formatPackYears(dv.PACK_YEARS)}`);
  }
  return lines;
}
