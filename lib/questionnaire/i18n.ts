/**
 * Mehrsprachigkeits-Helfer für den Patient-Renderpfad des
 * Token-Fragebogens (`/q/[token]`).
 *
 * Konventionen:
 *  - Deutsch ist die kanonische Sprache des Katalogs (`text`, `label`, `options`,
 *    `helperText`, `description`, `hint`).
 *  - Englische Felder (`*_en`) sind ausschließlich optional und ergänzen die
 *    deutschen Felder. Fehlt eine Übersetzung, fällt die Lokalisierung
 *    transparent auf die deutsche Originalformulierung zurück.
 *  - Praxis-/interne Sichten (Übersicht, PDF, Krankenblatt) verwenden diesen
 *    Helper bewusst NICHT, damit ihre Ausgabe immer deutsch bleibt.
 *  - IDs (questionId, blockId, displayOrder, type, required) bleiben
 *    grundsätzlich unverändert.
 */

import {
  BLOCK_CATALOG,
  QUESTION_CATALOG,
  type QuestionDefinition,
  type QuestionnaireBlock,
} from "./blockCatalog";

/** Unterstützte Patientensprachen. */
export type QuestionnaireLanguage = "de" | "en";

/** Default-Sprache, falls nichts oder Ungültiges geliefert wurde. */
export const DEFAULT_QUESTIONNAIRE_LANGUAGE: QuestionnaireLanguage = "de";

/**
 * Validiert beliebige Eingaben (Request-Body, URL-Param, DB-Wert) auf
 * den engen Whitelist-Bereich `"de" | "en"` und fällt sonst auf
 * {@link DEFAULT_QUESTIONNAIRE_LANGUAGE} zurück.
 */
export function normalizeQuestionnaireLanguage(
  value: unknown,
): QuestionnaireLanguage {
  if (value === "en") return "en";
  if (value === "de") return "de";
  return DEFAULT_QUESTIONNAIRE_LANGUAGE;
}

/**
 * Liefert eine sprachlokalisierte Sicht auf eine `QuestionDefinition`.
 *
 * Bei `language === "en"` werden die Felder `text_en`, `helperText_en`
 * und `options_en` bevorzugt, sofern vorhanden. Andernfalls werden die
 * deutschen Originalfelder verwendet.
 *
 * Wichtig: `id`, `type`, `required` bleiben unverändert. Wenn
 * `options_en` nicht exakt dieselbe Länge wie `options` hat, fällt die
 * Optionsausgabe konservativ auf die deutsche Liste zurück, damit das
 * Reverse-Mapping in `sanitizeAnswers` (EN → DE per Index) niemals
 * mehrdeutig wird.
 */
export function localizeQuestion(
  question: QuestionDefinition,
  language: QuestionnaireLanguage,
): QuestionDefinition {
  if (language !== "en") return question;

  const text = question.text_en ?? question.text;
  const helperText =
    question.helperText_en ?? question.helperText;

  let options = question.options;
  if (
    question.options &&
    question.options_en &&
    question.options_en.length === question.options.length
  ) {
    options = question.options_en;
  }

  return {
    ...question,
    text,
    helperText,
    options,
  };
}

/**
 * Liefert eine sprachlokalisierte Sicht auf einen `QuestionnaireBlock`.
 * Verhalten analog zu {@link localizeQuestion}; `id`, `displayOrder`
 * und `questionIds` bleiben unverändert.
 */
export function localizeBlock(
  block: QuestionnaireBlock,
  language: QuestionnaireLanguage,
): QuestionnaireBlock {
  if (language !== "en") return block;

  return {
    ...block,
    label: block.label_en ?? block.label,
    description: block.description_en ?? block.description,
    hint: block.hint_en ?? block.hint,
  };
}

// ---------------------------------------------------------------------------
// EN-Readiness (Variante A: keine gemischten Sprachen)
// ---------------------------------------------------------------------------

/**
 * Eine `QuestionDefinition` ist EN-ready, wenn jedes vorhandene
 * patient-sichtbare Textfeld eine englische Entsprechung hat:
 *  - `text_en` MUSS gesetzt sein.
 *  - `helperText_en` MUSS gesetzt sein, falls `helperText` existiert.
 *  - `options_en` MUSS dieselbe Länge wie `options` haben, falls `options`
 *    existiert (jedes Element nicht-leer).
 *
 * IDs, Typen und `required` sind sprachneutral und werden nicht geprüft.
 */
export function isQuestionEnReady(question: QuestionDefinition): boolean {
  if (!question.text_en || question.text_en.trim() === "") return false;

  if (question.helperText !== undefined) {
    if (!question.helperText_en || question.helperText_en.trim() === "") {
      return false;
    }
  }

  if (question.options !== undefined) {
    if (
      !question.options_en ||
      question.options_en.length !== question.options.length ||
      question.options_en.some((o) => typeof o !== "string" || o.trim() === "")
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Ein `QuestionnaireBlock` ist EN-ready, wenn:
 *  - alle vorhandenen patient-sichtbaren Block-Felder übersetzt sind
 *    (`label_en` MUSS gesetzt sein; `description_en` / `hint_en` MÜSSEN
 *    gesetzt sein, falls `description` / `hint` existieren),
 *  - UND alle referenzierten Fragen via {@link isQuestionEnReady} bestanden
 *    haben. Eine fehlende oder unbekannte Fragen-ID gilt als NICHT EN-ready.
 *
 * Diese Funktion ist die einzige Wahrheit für „darf bei `language='en'` an
 * den Patienten gehen?". Sie wird sowohl in der M3-UI (Auswahlfilter) als
 * auch serverseitig in `POST /api/questionnaire` benutzt.
 */
export function isBlockEnReady(blockOrId: QuestionnaireBlock | string): boolean {
  const block: QuestionnaireBlock | undefined =
    typeof blockOrId === "string" ? BLOCK_CATALOG[blockOrId] : blockOrId;
  if (!block) return false;

  if (!block.label_en || block.label_en.trim() === "") return false;
  if (block.description !== undefined) {
    if (!block.description_en || block.description_en.trim() === "") return false;
  }
  if (block.hint !== undefined) {
    if (!block.hint_en || block.hint_en.trim() === "") return false;
  }

  for (const qid of block.questionIds) {
    const q = QUESTION_CATALOG[qid];
    if (!q) return false;
    if (!isQuestionEnReady(q)) return false;
  }

  return true;
}
