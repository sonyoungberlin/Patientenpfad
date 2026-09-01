/**
 * Mail-Layer für den „Passwort setzen per Link"-Flow.
 *
 * Wird von `POST /api/auth/request-password-setup` aufgerufen. Versendet
 * eine E-Mail mit einem Einmal-Link, über den der Empfänger sein Passwort
 * setzen kann.
 *
 * Account-Mails verwenden immer den globalen Plattform-SMTP aus `SMTP_*`.
 * `MAIL_TRANSPORT` steuert ausschließlich die bestehenden praxisbezogenen
 * Mailpfade und wird hier bewusst nicht ausgewertet. Dadurch blockiert
 * `practice_only` keine Account-Sicherheitsmail.
 *
 * Sicherheits-/Logging-Invarianten:
 *   - Klartext-Token erscheint nur in der Mail-URL, niemals in Logs oder
 *     produktiven SMTP-Fehlern.
 *   - Kein Klartext-Passwort fließt durch diesen Pfad.
 */

import {
  readSmtpConfigFromEnv,
  sendViaSmtp,
  type SmtpConfig,
} from "@/lib/mail/smtpTransport";

export type PasswordSetupMailInput = {
  to: string;
  /** Vollständige Setup-URL inkl. Klartext-Token. */
  setupUrl: string;
};

export type ResolvedPasswordSetupMailTransport =
  | "smtp_env";

export function buildPasswordSetupEmailBody(setupUrl: string): {
  subject: string;
  text: string;
} {
  return {
    subject: "Passwort für Ihr Konto setzen",
    text:
      "Für Ihr Konto wurde ein Link zum Setzen eines Passworts angefordert.\n\n" +
      "Bitte öffnen Sie folgenden Link und vergeben ein Passwort:\n" +
      `${setupUrl}\n\n` +
      "Der Link ist 1 Stunde gültig und kann nur einmal verwendet werden.\n\n" +
      "Falls Sie diesen Link nicht angefordert haben, können Sie diese\n" +
      "E-Mail ignorieren – ohne Aufruf des Links passiert nichts.\n",
  };
}

/**
 * Versendet die Setup-E-Mail über den Plattform-SMTP. Liefert erst nach
 * erfolgreicher SMTP-Übertragung zurück. Fehlende Konfiguration und echte
 * Übertragungsfehler werden geworfen; der Aufrufer behandelt beides ohne
 * Account-Existenz zu leaken.
 */
export async function sendPasswordSetupEmail(
  input: PasswordSetupMailInput,
): Promise<ResolvedPasswordSetupMailTransport> {
  const { subject, text } = buildPasswordSetupEmailBody(input.setupUrl);
  const cfg: SmtpConfig = readSmtpConfigFromEnv();
  await sendViaSmtp(cfg, { to: input.to, subject, text });
  return "smtp_env";
}
