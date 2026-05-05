/**
 * Phase 3b: Eingabe-Normalisierung und Validierung für
 * `PracticeQuestionnaireForm` (öffentliche Website-Fragebögen).
 *
 * Wird sowohl vom JSON-API-Pfad als auch vom HTML-Form-POST-Pfad benutzt,
 * damit Schreibpfade konsistente Felder produzieren. Liefert entweder
 * normierte Werte oder strukturierte Feldfehler.
 *
 * Phase 3b speichert ausschließlich die Block-Auswahl, **nicht** die
 * abgeleiteten `deduplicated_questions` — ein Praxis-Formular ist ein
 * Template, das im (späteren) Submit-Flow zum Erzeugungszeitpunkt frisch
 * über `BLOCK_CATALOG` aufgelöst wird.
 */

import { BLOCK_CATALOG } from "@/lib/questionnaire/blockCatalog";
import {
  isBlockEnReady,
  type QuestionnaireLanguage,
} from "@/lib/questionnaire/i18n";
import { slugErrorMessage, validateSlug } from "./slug";

export const MIN_TITLE_LENGTH = 1;
export const MAX_TITLE_LENGTH = 120;
export const MAX_INTRO_LENGTH = 2000;

export type WebsiteFormFieldErrors = Partial<{
  title: string;
  slug: string;
  intro_text: string;
  selected_block_ids: string;
  is_active: string;
  patient_language: string;
}>;

export type ValidatedWebsiteFormInput = {
  title: string;
  slug: string;
  intro_text: string | null;
  selected_block_ids: string[];
  is_active: boolean;
  patient_language: QuestionnaireLanguage;
};

/**
 * Roh-Eingabe (aus JSON.body oder FormData), bevor sie validiert wird.
 *
 * `selected_block_ids` darf entweder ein Array sein (JSON) oder eine
 * Liste von Strings, die ein Aufrufer per `formData.getAll(...)` aufgebaut
 * hat. Andere Typen führen zu einem Validierungsfehler.
 */
export type RawWebsiteFormInput = {
  title?: unknown;
  slug?: unknown;
  intro_text?: unknown;
  selected_block_ids?: unknown;
  is_active?: unknown;
  patient_language?: unknown;
};

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true" || v === "on" || v === "1" || v === "yes") return true;
    if (v === "false" || v === "off" || v === "0" || v === "no" || v === "") {
      return false;
    }
  }
  return fallback;
}

/**
 * Normalisiert und validiert eine Roh-Eingabe.
 *
 * Liefert bei Erfolg `{ ok: true, value }` mit dem konsumierbaren Datensatz,
 * sonst `{ ok: false, fieldErrors }` mit pro-Feld-Fehlermeldungen (deutsch).
 *
 * `is_active` ist optional und defaultet auf `true`. Wenn ein Aufrufer
 * explizit `false` übergibt (z. B. via Toggle-Form), wird `false`
 * übernommen.
 */
export function validateWebsiteFormInput(
  raw: RawWebsiteFormInput,
):
  | { ok: true; value: ValidatedWebsiteFormInput }
  | { ok: false; fieldErrors: WebsiteFormFieldErrors } {
  const fieldErrors: WebsiteFormFieldErrors = {};

  // ---- title ----
  let title = "";
  if (typeof raw.title !== "string") {
    fieldErrors.title = "Titel ist erforderlich.";
  } else {
    title = raw.title.trim();
    if (title.length < MIN_TITLE_LENGTH) {
      fieldErrors.title = "Titel ist erforderlich.";
    } else if (title.length > MAX_TITLE_LENGTH) {
      fieldErrors.title = `Titel darf höchstens ${MAX_TITLE_LENGTH} Zeichen lang sein.`;
    }
  }

  // ---- slug ----
  let slug = "";
  const slugResult = validateSlug(
    typeof raw.slug === "string" ? raw.slug.trim() : raw.slug,
  );
  if (!slugResult.ok) {
    fieldErrors.slug = slugErrorMessage(slugResult.error);
  } else {
    slug = slugResult.slug;
  }

  // ---- intro_text (optional) ----
  let introText: string | null = null;
  if (raw.intro_text !== undefined && raw.intro_text !== null) {
    if (typeof raw.intro_text !== "string") {
      fieldErrors.intro_text = "Intro-Text muss Text sein.";
    } else {
      const trimmed = raw.intro_text.trim();
      if (trimmed.length === 0) {
        introText = null;
      } else if (trimmed.length > MAX_INTRO_LENGTH) {
        fieldErrors.intro_text = `Intro-Text darf höchstens ${MAX_INTRO_LENGTH} Zeichen lang sein.`;
      } else {
        introText = trimmed;
      }
    }
  }

  // ---- selected_block_ids ----
  let selectedBlockIds: string[] = [];
  if (!Array.isArray(raw.selected_block_ids)) {
    fieldErrors.selected_block_ids = "Bitte mindestens einen Fragebogen-Block auswählen.";
  } else {
    const stringIds = raw.selected_block_ids.filter(
      (id): id is string => typeof id === "string",
    );
    const known = stringIds.filter((id) => id in BLOCK_CATALOG);
    // Duplikate dedupliziert, Reihenfolge des ersten Auftretens beibehalten.
    const seen = new Set<string>();
    selectedBlockIds = known.filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    if (selectedBlockIds.length === 0) {
      fieldErrors.selected_block_ids =
        "Bitte mindestens einen gültigen Fragebogen-Block auswählen.";
    }
  }

  // ---- patient_language ----
  // Strikte Validierung: Wenn der Aufrufer einen Wert übergibt, muss er
  // exakt "de" oder "en" sein. Andernfalls Feldfehler — kein stilles
  // Zurückfallen auf "de", damit die UI eine Fehlbedienung sichtbar macht.
  // Bei `undefined`/`null` (Feld nicht übermittelt) wird der Default "de"
  // angewendet.
  let patientLanguage: QuestionnaireLanguage = "de";
  if (raw.patient_language !== undefined && raw.patient_language !== null) {
    if (raw.patient_language === "de" || raw.patient_language === "en") {
      patientLanguage = raw.patient_language;
    } else {
      fieldErrors.patient_language = "Sprache muss \"de\" oder \"en\" sein.";
    }
  }

  // ---- EN-Readiness der ausgewählten Blöcke ----
  // Variante A (analog `/api/questionnaire`): bei `patient_language="en"`
  // dürfen nur Blöcke gespeichert werden, deren Block- und Fragenfelder
  // vollständig übersetzt sind. Sonst Hard-Reject.
  if (
    patientLanguage === "en" &&
    !fieldErrors.selected_block_ids &&
    selectedBlockIds.length > 0
  ) {
    const notEnReady = selectedBlockIds.filter((id) => !isBlockEnReady(id));
    if (notEnReady.length > 0) {
      fieldErrors.selected_block_ids =
        "Einige ausgewählte Blöcke sind nicht vollständig auf Englisch übersetzt. " +
        "Bitte entfernen Sie sie oder wählen Sie Deutsch als Sprache.";
    }
  }

  // ---- is_active ----
  const isActive = normalizeBoolean(raw.is_active, true);

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    value: {
      title,
      slug,
      intro_text: introText,
      selected_block_ids: selectedBlockIds,
      is_active: isActive,
      patient_language: patientLanguage,
    },
  };
}

/**
 * Liefert eine kompakte erste Fehlermeldung als String — nützlich für
 * API-Antworten, die nur ein `error`-Feld erwarten.
 */
export function firstFieldError(errors: WebsiteFormFieldErrors): string {
  const order: (keyof WebsiteFormFieldErrors)[] = [
    "title",
    "slug",
    "intro_text",
    "patient_language",
    "selected_block_ids",
    "is_active",
  ];
  for (const key of order) {
    const msg = errors[key];
    if (msg) return msg;
  }
  return "Ungültige Eingabe.";
}
