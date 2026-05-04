/**
 * Mail-Layer für den „Passwort setzen per Link"-Flow.
 *
 * Wird von `POST /api/auth/request-password-setup` aufgerufen. Versendet
 * eine E-Mail mit einem Einmal-Link, über den der Empfänger sein Passwort
 * setzen kann.
 *
 * Transport-Auswahl analog zu `sendWebsiteFormConfirmationEmail` — aber
 * **ohne** Practice-First-Pfad: ein Account ist nicht zwingend an genau
 * eine Practice gebunden, und der Setup-Flow ist konzeptionell ein
 * Plattform-Mail (Admin → Account-Inhaber), kein Praxis-Mail.
 *
 *   - `MAIL_TRANSPORT=console` (Default): loggt Empfänger, Subject und URL
 *     über `console.info`. Erlaubt vollständiges Durchspielen ohne SMTP-Provider.
 *   - `MAIL_TRANSPORT=smtp`: versendet via Nodemailer mit der GLOBAL aus
 *     den ENV-Variablen `SMTP_*` gelesenen Konfiguration.
 *   - `MAIL_TRANSPORT=practice_only`: WIRD GEWORFEN — der Setup-Flow ist
 *     bewusst nicht an eine Practice gebunden, daher kein Versand möglich.
 *   - andere Werte: defensives Fallback auf `console`.
 *
 * Sicherheits-/Logging-Invarianten:
 *   - Klartext-Token erscheint nur in der Mail-URL und (bei console-Transport)
 *     im lokalen Log — niemals in produktiven SMTP-Fehlern.
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
  | "smtp_env"
  | "console"
  | "none";

function selectTransport(): "console" | "smtp" | "practice_only" {
  const raw = process.env.MAIL_TRANSPORT?.trim().toLowerCase();
  if (!raw || raw === "console") return "console";
  if (raw === "smtp") return "smtp";
  if (raw === "practice_only") return "practice_only";
  console.warn(
    `[mail] Unbekannter MAIL_TRANSPORT="${raw}" – fällt auf console zurück.`,
  );
  return "console";
}

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
 * Versendet die Setup-E-Mail. Liefert den tatsächlich verwendeten Transport
 * für strukturierte Logs zurück. Wirft im `practice_only`-Modus sowie bei
 * jedem echten SMTP-Übertragungsfehler — der Aufrufer behandelt das
 * (im Setup-Flow) als unauffälligen Server-Fehler, ohne Account-Existenz
 * zu leaken.
 */
export async function sendPasswordSetupEmail(
  input: PasswordSetupMailInput,
): Promise<ResolvedPasswordSetupMailTransport> {
  const { subject, text } = buildPasswordSetupEmailBody(input.setupUrl);
  const transport = selectTransport();

  if (transport === "practice_only") {
    throw new Error(
      "MAIL_TRANSPORT=practice_only: Account-Passwort-Setup-Mail nicht möglich.",
    );
  }

  if (transport === "console") {
    console.info("[mail:console] Passwort-Setup-E-Mail", {
      to: input.to,
      subject,
      setupUrl: input.setupUrl,
      bodyPreview: text.slice(0, 80),
    });
    return "console";
  }

  if (transport === "smtp") {
    const cfg: SmtpConfig = readSmtpConfigFromEnv();
    await sendViaSmtp(cfg, { to: input.to, subject, text });
    return "smtp_env";
  }

  const exhaustive: never = transport;
  throw new Error(`Unsupported MAIL_TRANSPORT: ${String(exhaustive)}`);
}
