/**
 * Zeichenvalidierung für Patientenantworten in Freitextfeldern.
 *
 * Hintergrund:
 *   Die Praxis verarbeitet Patientenantworten in deutscher Schrift. Eingaben
 *   in nicht-lateinischen Schriftsystemen (kyrillisch, arabisch, CJK,
 *   Emojis u. a.) sind im Praxisbetrieb nicht zuverlässig lesbar und können
 *   zudem zu Problemen beim PDF-Export führen.
 *
 * Geltungsbereich:
 *   Nur Freitextfelder vom Typ `text` und `textarea`. Auswahlfelder
 *   (`select`, `multi_select`), `yes_no` und `date` sind nicht betroffen,
 *   da deren Werte aus festen Optionen bzw. Browser-Kontrollen stammen.
 *
 * Vertrag:
 *   - Erlaubte Zeichen sind in {@link ALLOWED_ANSWER_CHARACTERS_REGEX}
 *     abschließend definiert.
 *   - Patientenantworten werden niemals automatisch verändert oder ersetzt;
 *     der Helper meldet ausschließlich, welche `questionId`s ungültig sind.
 *   - Die Validierung wird sowohl client- als auch serverseitig ausgeführt;
 *     Server bleibt die letzte Instanz (Bypass-Schutz).
 */

import { QUESTION_CATALOG, type QuestionType } from "./blockCatalog";
import type { QuestionnaireLanguage } from "./i18n";

/**
 * Erlaubte Zeichen für Freitext-Patientenantworten.
 *
 * Erlaubt:
 *   - lateinische Buchstaben A–Z, a–z
 *   - deutsche Umlaute Ä Ö Ü ä ö ü
 *   - ß
 *   - Ziffern 0–9
 *   - Leerzeichen, Tabulator, Zeilenumbrüche (\r, \n) — letztere praktisch
 *     nur in Textareas; in Single-Line-Inputs harmlos
 *   - übliche Satzzeichen: . , ; : ! ? - / ( ) ' " + & @
 *
 * Nicht erlaubt:
 *   - kyrillische, arabische, CJK- und sonstige nicht-lateinische Zeichen
 *   - Emojis und sonstige Symbol-/Pictogrammzeichen
 *
 * Die Klasse ist absichtlich konservativ. Erweiterungen müssen explizit
 * erfolgen, damit nicht versehentlich neue Schriftsysteme zugelassen werden.
 */
export const ALLOWED_ANSWER_CHARACTERS_REGEX =
  /^[A-Za-zÄÖÜäöüß0-9 \t\r\n.,;:!?\-/()'"+&@]*$/;

/**
 * HTML5-`pattern`-Attribut für `<input type="text">`-Felder.
 *
 * Hinweis:
 *   - `pattern` wird automatisch als `^…$` interpretiert, daher entfallen
 *     hier die Anker.
 *   - Neue Zeilen / Tabs sind in Single-Line-Inputs irrelevant; sie wären
 *     in `<textarea>` zulässig, aber `pattern` greift dort browserseitig
 *     ohnehin nicht.
 */
export const ALLOWED_ANSWER_CHARACTERS_HTML_PATTERN =
  "[A-Za-zÄÖÜäöüß0-9 .,;:!?\\-/()'\"+&@]*";

/** Lokalisierte Fehlermeldung pro Sprache. */
export const ANSWER_CHARACTERS_ERROR_MESSAGE: Record<
  QuestionnaireLanguage,
  string
> = {
  de:
    "Bitte verwenden Sie lateinische Buchstaben. Andere Schriftzeichen können wir in der Praxis nicht zuverlässig verarbeiten.",
  en:
    "Please use Latin letters only. Other writing systems cannot be processed reliably by the practice.",
};

/** Fragetypen, deren Werte als Freitext validiert werden müssen. */
const FREE_TEXT_QUESTION_TYPES: ReadonlySet<QuestionType> = new Set([
  "text",
  "textarea",
]);

/**
 * Prüft alle text/textarea-Unterfelder eines repeatable_group-JSON-Strings.
 * Ungültiges JSON oder fehlendes Schema gilt als erlaubt (Sanitizer verwirft separat).
 */
function isRepeatableGroupTextAllowed(value: unknown, questionId: string): boolean {
  if (typeof value !== "string" || value.length === 0) return true;
  const def = QUESTION_CATALOG[questionId];
  if (!def?.groupSchema) return true;
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { return true; }
  if (!Array.isArray(parsed)) return true;
  for (const entry of parsed) {
    if (typeof entry !== "object" || entry === null) continue;
    for (const field of def.groupSchema) {
      if (!FREE_TEXT_QUESTION_TYPES.has(field.type as QuestionType)) continue;
      const fieldVal = (entry as Record<string, unknown>)[field.key];
      if (typeof fieldVal !== "string" || fieldVal.length === 0) continue;
      if (!ALLOWED_ANSWER_CHARACTERS_REGEX.test(fieldVal)) return false;
    }
  }
  return true;
}

/**
 * Prüft, ob ein einzelner Antwortwert für den gegebenen Fragetyp ausschließlich
 * erlaubte Zeichen enthält.
 *
 * Nicht-Freitext-Typen (`select`, `multi_select`, `yes_no`, `date`) liefern
 * unabhängig vom Wert `true` zurück, da deren Werte aus festen Optionen
 * bzw. Browser-Kontrollen stammen.
 *
 * Spezialfälle:
 *   - FACHAERZTE: Wird serverseitig separat validiert (JSON-Format), daher hier übersprungen.
 *
 * Leere Strings sind erlaubt (Required-Logik liegt nicht hier).
 */
export function isAnswerTextAllowed(
  value: unknown,
  type: QuestionType,
  questionId?: string,
): boolean {
  // FACHAERZTE hat type="textarea", aber Wert ist JSON-String mit Strukturzeichen
  // → wird serverseitig in sanitizeAnswers.ts separat validiert
  if (questionId === "FACHAERZTE") return true;
  if (type === "repeatable_group") {
    return questionId ? isRepeatableGroupTextAllowed(value, questionId) : true;
  }
  if (!FREE_TEXT_QUESTION_TYPES.has(type)) return true;
  if (typeof value !== "string") return true;
  if (value.length === 0) return true;
  return ALLOWED_ANSWER_CHARACTERS_REGEX.test(value);
}

export type AnswerCharactersValidationResult = {
  /** `true`, wenn alle Freitextantworten ausschließlich erlaubte Zeichen enthalten. */
  ok: boolean;
  /** IDs aller Freitextfragen, deren Wert unzulässige Zeichen enthält. */
  invalidQuestionIds: string[];
};

/**
 * Validiert ein Antwort-Objekt gegen die Liste der eingefrorenen Fragen.
 *
 * Es werden ausschließlich Werte geprüft, deren `questionId`
 *   1. in `questions` (eingefrorene Fragenliste der Session/Form) enthalten ist
 *      UND
 *   2. im globalen `QUESTION_CATALOG` einem Freitexttyp (`text` / `textarea`)
 *      zugeordnet ist.
 *
 * Werte mit unbekannter ID, falschem Typ oder Nicht-Freitext-Fragen werden
 * still ignoriert — diese Klassen werden in `sanitizeAnswers` getrennt
 * gefiltert, ohne dass diese Funktion Annahmen darüber trifft.
 */
export function validateAnswerCharacters(
  rawAnswers: unknown,
  questions: ReadonlyArray<{ id: string; type?: QuestionType }>,
): AnswerCharactersValidationResult {
  if (
    !rawAnswers ||
    typeof rawAnswers !== "object" ||
    Array.isArray(rawAnswers)
  ) {
    return { ok: true, invalidQuestionIds: [] };
  }

  const allowedIds = new Set(questions.map((q) => q.id));
  const invalidQuestionIds: string[] = [];

  for (const [questionId, value] of Object.entries(
    rawAnswers as Record<string, unknown>,
  )) {
    if (!allowedIds.has(questionId)) continue;
    
    // FACHAERZTE hat type="textarea", aber Wert ist JSON-String
    // → wird serverseitig in sanitizeAnswers.ts separat validiert
    if (questionId === "FACHAERZTE") continue;
    
    const def = QUESTION_CATALOG[questionId];
    if (!def) continue;
    if (def.type === "repeatable_group") {
      if (!isRepeatableGroupTextAllowed(value, questionId)) {
        invalidQuestionIds.push(questionId);
      }
      continue;
    }
    if (!FREE_TEXT_QUESTION_TYPES.has(def.type)) continue;
    if (typeof value !== "string") continue;
    if (value.length === 0) continue;
    if (!ALLOWED_ANSWER_CHARACTERS_REGEX.test(value)) {
      invalidQuestionIds.push(questionId);
    }
  }

  return { ok: invalidQuestionIds.length === 0, invalidQuestionIds };
}

/** Liefert die lokalisierte Fehlermeldung für die gewählte Patientensprache. */
export function answerCharactersErrorMessage(
  language: QuestionnaireLanguage,
): string {
  return ANSWER_CHARACTERS_ERROR_MESSAGE[language];
}
