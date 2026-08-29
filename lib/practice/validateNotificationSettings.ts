/**
 * Validator für /api/practice/notification-settings.
 *
 * Prüft E-Mail-Adressen für die Praxis-Benachrichtigung bei neuen
 * digitalen Anfragen und Bewerbungsanfragen.
 *
 * Regeln:
 *  - Leer / null / undefined → null  (deaktiviert Benachrichtigung)
 *  - String: trim, dann Format-Check (RFC-5321-light-Regex)
 *  - Max. 254 Zeichen (nach trim, RFC-5321)
 *  - Kein Komma oder Semikolon (kein Multi-Recipient in v1)
 */

const EMAIL_MAX = 254;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface NotificationSettingsData {
  digital_request_notification_email?: string | null;
  office_application_notification_email?: string | null;
}

export interface NotificationSettingsValidationResult {
  data: NotificationSettingsData;
  error: string | null;
}

function validateEmailField(
  raw: unknown,
  fieldLabel: string,
): { value: string | null; error: string | null } {
  if (raw === undefined || raw === null) {
    return { value: undefined as unknown as null, error: null };
  }
  if (typeof raw !== "string") {
    return {
      value: null,
      error: `${fieldLabel}: Ungültiger Typ – erwartet String.`,
    };
  }
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { value: null, error: null };
  }
  if (trimmed.includes(",") || trimmed.includes(";")) {
    return {
      value: null,
      error: `${fieldLabel}: Mehrere Adressen sind nicht erlaubt.`,
    };
  }
  if (trimmed.length > EMAIL_MAX) {
    return {
      value: null,
      error: `${fieldLabel}: Adresse zu lang (max. ${EMAIL_MAX} Zeichen).`,
    };
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return {
      value: null,
      error: `${fieldLabel}: Ungültige E-Mail-Adresse.`,
    };
  }
  return { value: trimmed, error: null };
}

/**
 * Validiert den Body für POST /api/practice/notification-settings.
 *
 * Fehlende Schlüssel → Feld nicht im Ergebnis-Objekt (Partial-Update).
 */
export function validateNotificationSettings(
  body: Record<string, unknown>,
): NotificationSettingsValidationResult {
  const data: NotificationSettingsData = {};

  if ("digitalRequestNotificationEmail" in body) {
    const { value, error } = validateEmailField(
      body.digitalRequestNotificationEmail,
      "Patientenanfrage-Benachrichtigung",
    );
    if (error) return { data: {}, error };
    data.digital_request_notification_email = value;
  }

  if ("officeApplicationNotificationEmail" in body) {
    const { value, error } = validateEmailField(
      body.officeApplicationNotificationEmail,
      "Bewerbungsanfrage-Benachrichtigung",
    );
    if (error) return { data: {}, error };
    data.office_application_notification_email = value;
  }

  return { data, error: null };
}
