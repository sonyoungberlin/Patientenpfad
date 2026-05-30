/**
 * Renderer für den „Persönlichen Versorgungsplan".
 *
 * Erzeugt einen kopierbaren Plaintext aus dem aktuellen Formular-State.
 *
 * Regeln:
 *   - Nur Felder mit Inhalt erscheinen im Output.
 *   - Checkboxen: nur wenn `true` → „✓ {label}".
 *   - Text / Date / Textarea: nur wenn getrimmt nicht leer.
 *   - Sektionen: nur ausgeben wenn ≥ 1 Feld in der Sektion einen sichtbaren
 *     Wert hat. Andernfalls wird die Sektion komplett übersprungen.
 *   - Zwischen Sektionen eine Leerzeile.
 *   - Textarea mit Zeilenumbrüchen: Label als erste Zeile, Inhalt eingerückt.
 *   - Reine Funktion, keine Seiteneffekte.
 */

import { CARE_PLAN_SECTIONS, type CarePlanField } from "./carePlanCatalog";

// ---------------------------------------------------------------------------
// State-Typ
// ---------------------------------------------------------------------------

/**
 * Formular-State des Versorgungsplans.
 *
 * Checkboxen: boolean
 * Text / Date / Textarea: string
 *
 * Bewusst NICHT Record<string, string> – Checkboxen tragen native boolean-Werte.
 */
export type CarePlanAnswers = Record<string, string | boolean>;

// ---------------------------------------------------------------------------
// Interne Helfer
// ---------------------------------------------------------------------------

/**
 * Prüft, ob ein einzelnes Feld einen sichtbaren Wert hat.
 */
function hasValue(field: CarePlanField, answers: CarePlanAnswers): boolean {
  const raw = answers[field.id];
  if (field.kind === "checkbox") {
    return raw === true;
  }
  if (typeof raw === "string") {
    return raw.trim() !== "";
  }
  return false;
}

/**
 * Gibt die Ausgabezeilen für ein einzelnes Feld zurück.
 * Gibt ein leeres Array zurück, wenn das Feld keinen sichtbaren Wert hat.
 */
function renderField(field: CarePlanField, answers: CarePlanAnswers): string[] {
  const raw = answers[field.id];

  if (field.kind === "checkbox") {
    if (raw === true) {
      return [`✓ ${field.label}`];
    }
    return [];
  }

  if (typeof raw !== "string") return [];
  const trimmed = raw.trim();
  if (trimmed === "") return [];

  // Textarea: mehrzeilige Ausgabe
  if (field.kind === "textarea") {
    const lines = trimmed.split(/\r?\n/);
    if (lines.length === 1) {
      // Einzeilig: kompaktes Format
      return [`${field.label}: ${lines[0]}`];
    }
    // Mehrzeilig: Label als Kopfzeile, Inhalt eingerückt
    return [`${field.label}:`, ...lines.map((l) => `  ${l}`)];
  }

  // text / date: einzeilig
  return [`${field.label}: ${trimmed}`];
}

// ---------------------------------------------------------------------------
// Öffentliche API
// ---------------------------------------------------------------------------

/**
 * Erzeugt den kopierbaren Versorgungsplan-Text aus dem Formular-State.
 *
 * @param answers - Aktueller Formular-State aus VersorgungsplanPanel
 * @returns Formatierter Plaintext (Zeilen mit \n getrennt)
 */
export function buildCarePlanText(answers: CarePlanAnswers): string {
  const outputLines: string[] = ["Persönlicher Versorgungsplan"];

  for (const section of CARE_PLAN_SECTIONS) {
    // Sektion überspringen wenn kein Feld einen sichtbaren Wert hat
    const sectionHasContent = section.fields.some((f) => hasValue(f, answers));
    if (!sectionHasContent) continue;

    // Leerzeile + Sektions-Titel
    outputLines.push("");
    outputLines.push(section.title);

    // Felder der Sektion
    for (const field of section.fields) {
      const lines = renderField(field, answers);
      outputLines.push(...lines);
    }
  }

  return outputLines.join("\n");
}
