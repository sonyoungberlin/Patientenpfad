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
