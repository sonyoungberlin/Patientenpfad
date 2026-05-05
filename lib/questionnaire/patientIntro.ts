/**
 * Gemeinsamer Einleitungstext für Patienten-Fragebögen.
 *
 * Wird sowohl auf der öffentlichen Praxis-Formularseite (`/p/[slug]`,
 * `app/p/[slug]/PublicFormView.tsx`) als auch auf der Token-basierten
 * Fragebogenseite (`/q/[token]`, `app/q/[token]/page.tsx`) oberhalb der
 * Fragen angezeigt. Eine zentrale Konstante stellt sicher, dass beide
 * Pfade exakt denselben Text verwenden.
 */
export const PATIENT_QUESTIONNAIRE_INTRO_TEXT =
  "Bitte füllen Sie die folgenden Angaben vollständig aus. Vielen Dank für Ihre Unterstützung.";

/**
 * Englische Entsprechung für den Token-Fragebogen (`/q/[token]`) bei
 * `patient_language="en"`. Wird bewusst NICHT in `/p/[slug]` verwendet —
 * der Public-Form-Flow ist im aktuellen Scope deutsch.
 */
export const PATIENT_QUESTIONNAIRE_INTRO_TEXT_EN =
  "Please fill in the following information completely. Thank you for your support.";
