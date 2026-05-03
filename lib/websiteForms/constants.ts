/**
 * Phase 3d: Konstanten für Website-Form-Sessions.
 *
 * Bewusst klein gehalten — die Werte landen so im DB-Status-String und
 * im `source`-Whitelist-Wert (siehe Schema-Kommentar bei
 * `PatientQuestionnaireSession.source`).
 */

/** `PatientQuestionnaireSession.source`-Wert für Website-Submits. */
export const WEBSITE_SESSION_SOURCE = "website" as const;

/**
 * Status für Website-Submits, die noch auf die E-Mail-Bestätigung warten.
 *
 * Diese Sessions erscheinen NICHT in der Praxis-Liste `/questionnaires`,
 * NICHT im PDF-Export und NICHT im Detail-Endpoint. Erst der erfolgreiche
 * Confirm-Pfad setzt `status = "completed"` und `confirmed_at`.
 */
export const STATUS_AWAITING_EMAIL_CONFIRMATION =
  "awaiting_email_confirmation" as const;
