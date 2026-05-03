/**
 * Mail-Layer für die Bestätigungs-E-Mail eines öffentlichen
 * Website-Form-Submits.
 *
 * Eine einzige öffentliche Funktion: {@link sendWebsiteFormConfirmationEmail}.
 * Transport-Auswahl per ENV `MAIL_TRANSPORT`:
 *
 *   - `console` (Default, auch in Tests, sowie wenn die Variable nicht
 *     gesetzt ist): loggt Empfänger, Subject und die Bestätigungs-URL über
 *     `console.info`. So lassen sich Submit-/Confirm-Flows lokal vollständig
 *     durchspielen, ohne externen Provider.
 *   - `smtp`: versendet eine echte E-Mail via Nodemailer. Konfiguration über
 *     `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
 *     (Pflicht) und `SMTP_SECURE` (optional). Bei fehlender oder ungültiger
 *     Konfiguration WIRD GEWORFEN — es gibt KEINEN stillen Fallback auf
 *     `console`, damit eine fehlerhafte Produktiv-Konfiguration sichtbar
 *     wird.
 *   - andere Werte: defensives Fallback auf `console` mit Warnung im Log.
 *
 * Mailfehler dürfen **nicht** dazu führen, dass die bereits angelegte
 * Session gelöscht wird; der Aufrufer (Submit-Endpoint) loggt den Fehler
 * und liefert eine generische Antwort.
 */

import {
  readSmtpConfigFromEnv,
  sendViaSmtp,
} from "@/lib/mail/smtpTransport";

export type MailTransport = "console" | "smtp";

export type WebsiteFormConfirmationMailInput = {
  to: string;
  /** Vollständige Bestätigungs-URL inkl. Klartext-Token. */
  confirmationUrl: string;
};

function selectTransport(): MailTransport {
  const raw = process.env.MAIL_TRANSPORT?.trim().toLowerCase();
  if (!raw || raw === "console") return "console";
  if (raw === "smtp") return "smtp";
  // Unbekannter Transport → defensives Fallback auf console.
  console.warn(
    `[mail] Unbekannter MAIL_TRANSPORT="${raw}" – fällt auf console zurück.`,
  );
  return "console";
}

export function buildConfirmationEmailBody(
  confirmationUrl: string,
): { subject: string; text: string } {
  return {
    subject: "Bitte bestätigen Sie Ihre Übermittlung",
    text:
      "Vielen Dank für Ihre Übermittlung.\n\n" +
      "Bitte bestätigen Sie sie über folgenden Link:\n" +
      `${confirmationUrl}\n\n` +
      "Der Link ist 48 Stunden gültig. Erst nach dieser Bestätigung\n" +
      "werden Ihre Angaben an die Praxis übermittelt.\n\n" +
      "Falls Sie dieses Formular nicht abgesendet haben, können Sie\n" +
      "diese E-Mail ignorieren – ohne Bestätigung passiert nichts.\n",
  };
}

export async function sendWebsiteFormConfirmationEmail(
  input: WebsiteFormConfirmationMailInput,
): Promise<void> {
  const transport = selectTransport();
  const { subject, text } = buildConfirmationEmailBody(input.confirmationUrl);

  if (transport === "console") {
    // Bewusst NUR die URL loggen, nicht die Antworten / nicht den DB-State.
    console.info("[mail:console] Bestätigungs-E-Mail", {
      to: input.to,
      subject,
      confirmationUrl: input.confirmationUrl,
      bodyPreview: text.slice(0, 80),
    });
    return;
  }

  if (transport === "smtp") {
    // readSmtpConfigFromEnv wirft bei fehlender/ungültiger Config — der
    // Aufrufer (Submit-Endpoint) behandelt den Fehler in seinem
    // mail_failed-Pfad. Bewusst KEIN Fallback auf console.
    const cfg = readSmtpConfigFromEnv();
    await sendViaSmtp(cfg, { to: input.to, subject, text });
    return;
  }

  const exhaustive: never = transport;
  throw new Error(`Unsupported MAIL_TRANSPORT: ${String(exhaustive)}`);
}
