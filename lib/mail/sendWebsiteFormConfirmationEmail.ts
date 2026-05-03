/**
 * Mail-Layer für die Bestätigungs-E-Mail eines öffentlichen
 * Website-Form-Submits.
 *
 * Eine einzige öffentliche Funktion: {@link sendWebsiteFormConfirmationEmail}.
 *
 * Auswahl-Logik (Practice-First):
 *   1. Wenn `practiceId` übergeben wird, versucht die Funktion zuerst, eine
 *      Practice-spezifische SMTP-Konfig zu laden (siehe
 *      `lib/mail/practiceSmtp.ts`). Bei Erfolg wird die Mail über genau
 *      diese Konfig versendet — kein Cross-Tenant-Risiko.
 *   2. Andernfalls greift die ENV-`MAIL_TRANSPORT`-Auswahl als Fallback:
 *
 *        - `console` (Default, auch in Tests, sowie wenn die Variable nicht
 *          gesetzt ist): loggt Empfänger, Subject und die Bestätigungs-URL
 *          über `console.info`. So lassen sich Submit-/Confirm-Flows lokal
 *          vollständig durchspielen, ohne externen Provider.
 *        - `smtp`: versendet eine echte E-Mail via Nodemailer mit der
 *          GLOBAL aus den ENV-Variablen `SMTP_*` gelesenen Konfiguration.
 *          Dieser Pfad ist NUR Übergangs-/Dev-Fallback. Empfehlung: nach
 *          erfolgter Migration aller Practices auf `practice_only` setzen.
 *        - `practice_only`: striktes Mandantenmodell. Fehlt eine
 *          Practice-Konfig, WIRD GEWORFEN — kein globaler ENV-Versand,
 *          kein Console-Fallback. Empfohlene Production-Einstellung.
 *        - andere Werte: defensives Fallback auf `console` mit Warnung
 *          im Log.
 *
 * Mailfehler dürfen **nicht** dazu führen, dass die bereits angelegte
 * Session gelöscht wird; der Aufrufer (Submit-Endpoint) loggt den Fehler
 * und liefert eine generische Antwort.
 */

import {
  readSmtpConfigFromEnv,
  sendViaSmtp,
  type SmtpConfig,
} from "@/lib/mail/smtpTransport";
import { loadPracticeSmtpConfig } from "@/lib/mail/practiceSmtp";

export type MailTransport = "console" | "smtp" | "practice_only";

export type ResolvedMailTransport =
  | "practice"
  | "smtp_env"
  | "console"
  | "none";

export type WebsiteFormConfirmationMailInput = {
  to: string;
  /** Vollständige Bestätigungs-URL inkl. Klartext-Token. */
  confirmationUrl: string;
  /**
   * Practice, der das Form gehört. Wenn vorhanden und vollständig
   * konfiguriert, wird die Mail über die Practice-SMTP versendet.
   */
  practiceId?: string | null;
};

function selectFallbackTransport(): MailTransport {
  const raw = process.env.MAIL_TRANSPORT?.trim().toLowerCase();
  if (!raw || raw === "console") return "console";
  if (raw === "smtp") return "smtp";
  if (raw === "practice_only") return "practice_only";
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

/**
 * Versendet die Bestätigungs-E-Mail.
 *
 * Liefert den tatsächlich verwendeten Transport zurück (rein informativ,
 * für strukturierte Logs im Submit-Endpoint). Wirft im `practice_only`-
 * Modus ohne Practice-Konfig sowie bei jedem echten SMTP-Übertragungs-
 * fehler — der Aufrufer behandelt das als `mail_failed`.
 */
export async function sendWebsiteFormConfirmationEmail(
  input: WebsiteFormConfirmationMailInput,
): Promise<ResolvedMailTransport> {
  const { subject, text } = buildConfirmationEmailBody(input.confirmationUrl);

  // 1. Practice-First: wenn eine Practice-ID anliegt, versuche zuerst die
  // Practice-spezifische Konfig.
  if (input.practiceId) {
    const practiceCfg = await loadPracticeSmtpConfig(input.practiceId);
    if (practiceCfg) {
      await sendViaSmtp(practiceCfg, { to: input.to, subject, text });
      return "practice";
    }
  }

  // 2. Fallback gemäß ENV.
  const fallback = selectFallbackTransport();

  if (fallback === "practice_only") {
    // Strict-Mode: kein globaler Versand, kein Console-Fallback.
    throw new Error(
      "MAIL_TRANSPORT=practice_only: keine Practice-SMTP-Konfig vorhanden.",
    );
  }

  if (fallback === "console") {
    // Bewusst NUR die URL loggen, nicht die Antworten / nicht den DB-State.
    console.info("[mail:console] Bestätigungs-E-Mail", {
      to: input.to,
      subject,
      confirmationUrl: input.confirmationUrl,
      bodyPreview: text.slice(0, 80),
    });
    return "console";
  }

  if (fallback === "smtp") {
    // readSmtpConfigFromEnv wirft bei fehlender/ungültiger Config — der
    // Aufrufer (Submit-Endpoint) behandelt den Fehler in seinem
    // mail_failed-Pfad. Bewusst KEIN Fallback auf console.
    const cfg: SmtpConfig = readSmtpConfigFromEnv();
    await sendViaSmtp(cfg, { to: input.to, subject, text });
    return "smtp_env";
  }

  const exhaustive: never = fallback;
  throw new Error(`Unsupported MAIL_TRANSPORT: ${String(exhaustive)}`);
}
