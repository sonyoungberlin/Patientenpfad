/**
 * Typen und Guards für strukturierte praxisinterne Auswahlfragen
 * sowie den gemeinsamen Abschnittstyp (ProtocolSection).
 *
 * Kein Import aus bestehenden klinischen Workflow-Modulen.
 * Keine Snapshot-Erweiterung, keine gespeicherten Antworttypen, keine Laufzeit-Einbindung.
 */

import type { OfficialRule } from "./officialContent";
import { isOfficialRule } from "./officialContent";

// ---------------------------------------------------------------------------
// Fragetypen
// ---------------------------------------------------------------------------

/**
 * Diskriminante für die vier unterstützten Fragetypen.
 *
 * - YES_NO_UNCLEAR: Ja/Nein/Unklar-Frage ohne Optionen
 * - SINGLE_SELECT:  Einzelauswahl aus vorgegebenen Optionen
 * - MULTI_SELECT:   Mehrfachauswahl aus vorgegebenen Optionen
 * - FREE_TEXT:      Freitext-Eingabe ohne Optionen
 */
export type ProtocolQuestionKind =
  | "YES_NO_UNCLEAR"
  | "SINGLE_SELECT"
  | "MULTI_SELECT"
  | "FREE_TEXT";

/** Prüft ob ein Wert ein gültiger ProtocolQuestionKind ist. */
export function isProtocolQuestionKind(
  value: unknown,
): value is ProtocolQuestionKind {
  return (
    value === "YES_NO_UNCLEAR" ||
    value === "SINGLE_SELECT" ||
    value === "MULTI_SELECT" ||
    value === "FREE_TEXT"
  );
}

// ---------------------------------------------------------------------------
// Antwortoptionen
// ---------------------------------------------------------------------------

/**
 * Eine Antwortoption für SELECT-Fragen.
 *
 * outputText ist ein vollständiger verständlicher Satz für den späteren
 * gemeinsamen Prozess-Output. Beispiel:
 *   label: "MFA am Empfang"
 *   outputText: "Die erste organisatorische Einschätzung erfolgt durch die MFA am Empfang."
 */
export interface ProtocolAnswerOption {
  id: string;
  label: string;
  outputText: string;
}

/**
 * Prüft ob ein Wert eine gültige ProtocolAnswerOption ist.
 * Alle drei Felder müssen nichtleere Strings sein.
 */
export function isProtocolAnswerOption(
  value: unknown,
): value is ProtocolAnswerOption {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const v = value as Record<string, unknown>;

  if (typeof v.id !== "string" || v.id.length === 0) return false;
  if (typeof v.label !== "string" || v.label.length === 0) return false;
  if (typeof v.outputText !== "string" || v.outputText.length === 0)
    return false;

  return true;
}

// ---------------------------------------------------------------------------
// Fragetypen (diskriminierte Union)
// ---------------------------------------------------------------------------

/** Gemeinsame Pflichtfelder aller Fragetypen. */
export interface ProtocolQuestionBase {
  id: string;
  text: string;
  hint?: string;
  required?: boolean;
}

/** Ja/Nein/Unklar-Frage. Antwortwerte sind semantisch YES | NO | UNCLEAR. */
export interface YesNoUnclearQuestion extends ProtocolQuestionBase {
  kind: "YES_NO_UNCLEAR";
}

/** Einzelauswahl aus vorgegebenen Optionen. Mindestens eine Option erforderlich. */
export interface SingleSelectQuestion extends ProtocolQuestionBase {
  kind: "SINGLE_SELECT";
  options: readonly ProtocolAnswerOption[];
}

/** Mehrfachauswahl aus vorgegebenen Optionen. Mindestens eine Option erforderlich. */
export interface MultiSelectQuestion extends ProtocolQuestionBase {
  kind: "MULTI_SELECT";
  options: readonly ProtocolAnswerOption[];
}

/** Freitext-Eingabe. Kein Optionsfeld. */
export interface FreeTextQuestion extends ProtocolQuestionBase {
  kind: "FREE_TEXT";
  placeholder?: string;
}

/** Diskriminierte Union aller Fragetypen. */
export type ProtocolQuestion =
  | YesNoUnclearQuestion
  | SingleSelectQuestion
  | MultiSelectQuestion
  | FreeTextQuestion;

/**
 * Prüft ob ein Wert eine gültige ProtocolQuestion ist.
 *
 * Prüft:
 * - id und text sind nichtleere Strings
 * - kind ist gültig
 * - hint ist bei Vorhandensein ein String
 * - required ist bei Vorhandensein ein Boolean
 * - SELECT-Fragen besitzen mindestens eine gültige, eindeutige Option
 * - YES_NO_UNCLEAR und FREE_TEXT benötigen kein Optionsfeld
 * - placeholder bei FREE_TEXT ist bei Vorhandensein ein String
 * Wirft keine Ausnahmen.
 */
export function isProtocolQuestion(
  value: unknown,
): value is ProtocolQuestion {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const v = value as Record<string, unknown>;

  if (typeof v.id !== "string" || v.id.length === 0) return false;
  if (typeof v.text !== "string" || v.text.length === 0) return false;
  if (!isProtocolQuestionKind(v.kind)) return false;

  if (v.hint !== undefined && typeof v.hint !== "string") return false;
  if (v.required !== undefined && typeof v.required !== "boolean") return false;

  if (v.kind === "SINGLE_SELECT" || v.kind === "MULTI_SELECT") {
    if (!Array.isArray(v.options)) return false;
    if (v.options.length === 0) return false;

    const seenIds = new Set<string>();
    for (const opt of v.options as unknown[]) {
      if (!isProtocolAnswerOption(opt)) return false;
      const optObj = opt as ProtocolAnswerOption;
      if (seenIds.has(optObj.id)) return false;
      seenIds.add(optObj.id);
    }
  }

  if (v.kind === "FREE_TEXT") {
    if (v.placeholder !== undefined && typeof v.placeholder !== "string")
      return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Abschnitt (ProtocolSection)
// ---------------------------------------------------------------------------

/**
 * Ein Abschnitt eines praxisinternen Arbeitsprozesses.
 *
 * Verbindet die zwei fachlichen Ebenen:
 *   ├── officialRules: offizielle Regelaussagen mit Quellen (Ebene 1)
 *   └── questions:     strukturierte praxisinterne Auswahlfragen (Ebene 2)
 *
 * Entspricht konzeptuell einem Checkpoint, ohne den bestehenden
 * Checkpoint-Typ zu verändern.
 */
export interface ProtocolSection {
  id: string;
  title: string;
  officialRules: readonly OfficialRule[];
  questions: readonly ProtocolQuestion[];
}

/**
 * Prüft ob ein Wert ein gültiger ProtocolSection ist.
 *
 * Prüft:
 * - id und title sind nichtleere Strings
 * - officialRules und questions sind Arrays
 * - alle enthaltenen Regeln und Fragen sind gültig
 * - Regel-IDs innerhalb des Abschnitts sind eindeutig
 * - Frage-IDs innerhalb des Abschnitts sind eindeutig
 * Wirft keine Ausnahmen.
 */
export function isProtocolSection(value: unknown): value is ProtocolSection {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const v = value as Record<string, unknown>;

  if (typeof v.id !== "string" || v.id.length === 0) return false;
  if (typeof v.title !== "string" || v.title.length === 0) return false;
  if (!Array.isArray(v.officialRules)) return false;
  if (!Array.isArray(v.questions)) return false;

  const ruleIds = new Set<string>();
  for (const rule of v.officialRules as unknown[]) {
    if (!isOfficialRule(rule)) return false;
    const ruleObj = rule as { id: string };
    if (ruleIds.has(ruleObj.id)) return false;
    ruleIds.add(ruleObj.id);
  }

  const questionIds = new Set<string>();
  for (const q of v.questions as unknown[]) {
    if (!isProtocolQuestion(q)) return false;
    const qObj = q as { id: string };
    if (questionIds.has(qObj.id)) return false;
    questionIds.add(qObj.id);
  }

  return true;
}
