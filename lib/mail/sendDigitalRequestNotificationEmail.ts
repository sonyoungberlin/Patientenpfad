/**
 * Benachrichtigungs-E-Mail für die Praxis bei neuer öffentlicher Anfrage.
 *
 * Wird nach erfolgreichem Speichern einer DigitalRequest ausgelöst
 * (best-effort: kein Rollback bei Fehler).
 *
 * Sicherheitsanforderungen:
 *   - Kein Patientenname, keine Adresse, keine sonstigen PB-Daten im Body.
 *   - Keine medizinischen Inhalte, keine Leistungszusage.
 *
 * Transport (Practice-First, analog sendDigitalRequestTokenEmail):
 *   1. Practice-SMTP, wenn `practiceId` gesetzt und konfiguriert.
 *   2. ENV-`MAIL_TRANSPORT`-Fallback (console / smtp / practice_only).
 */

import {
  readSmtpConfigFromEnv,
  sendViaSmtp,
  type SmtpConfig,
} from "@/lib/mail/smtpTransport";
import { loadPracticeSmtpConfig } from "@/lib/mail/practiceSmtp";

export type DigitalRequestNotificationInput = {
  /** Empfängeradresse – aus Practice.digital_request_notification_email. */
  to: string;
  /** "patient" = neue Patientenanfrage, "office" = neue Bewerbungsanfrage. */
  variant: "patient" | "office";
  /**
   * Practice-ID für die SMTP-Konfiguration. Wenn vorhanden und die
   * Practice hat eine vollständige SMTP-Konfig, wird diese verwendet;
   * andernfalls greift der ENV-Fallback.
   */
  practiceId?: string | null;
};

export type ResolvedMailTransport =
  | "practice"
  | "smtp_env"
  | "console"
  | "none";

type MailTransport = "console" | "smtp" | "practice_only";

function selectFallbackTransport(): MailTransport {
  const raw = process.env.MAIL_TRANSPORT?.trim().toLowerCase();
  if (!raw || raw === "console") return "console";
  if (raw === "smtp") return "smtp";
  if (raw === "practice_only") return "practice_only";
  console.warn(
    `[mail] Unbekannter MAIL_TRANSPORT="${raw}" – fällt auf console zurück.`,
  );
  return "console";
}

/**
 * Baut den E-Mail-Body der Praxis-Benachrichtigung.
 *
 * Bewusst keine personenbezogenen Daten aus der Anfrage,
 * nur ein neutraler Hinweis auf das neue Ereignis.
 */
export function buildNotificationBody(variant: "patient" | "office"): {
  subject: string;
  text: string;
} {
  if (variant === "office") {
    return {
      subject: "Neue Bewerbungsanfrage eingegangen",
      text:
        "In Patientenpfad ist eine neue Bewerbungsanfrage eingegangen.\n" +
        "Bitte öffnen Sie Patientenpfad, um die Anfrage zu bearbeiten.\n",
    };
  }
  return {
    subject: "Neue digitale Anfrage eingegangen",
    text:
      "In Patientenpfad ist eine neue digitale Anfrage für Ihre Praxis eingegangen.\n" +
      "Bitte öffnen Sie Patientenpfad, um die Anfrage zu bearbeiten.\n",
  };
}

/**
 * Versendet die Praxis-Benachrichtigung.
 *
 * Wirft im `practice_only`-Modus ohne Practice-SMTP-Konfig sowie bei
 * SMTP-Übertragungsfehlern — der Aufrufer fängt und loggt den Fehler
 * (best-effort, kein Rollback der DigitalRequest).
 */
export async function sendDigitalRequestNotificationEmail(
  input: DigitalRequestNotificationInput,
): Promise<ResolvedMailTransport> {
  const { subject, text } = buildNotificationBody(input.variant);

  // 1. Practice-First: Practice-SMTP hat Vorrang.
  if (input.practiceId) {
    const practiceCfg = await loadPracticeSmtpConfig(input.practiceId);
    if (practiceCfg) {
      await sendViaSmtp(practiceCfg, { to: input.to, subject, text });
      return "practice";
    }
  }

  // 2. ENV-Fallback.
  const fallback = selectFallbackTransport();

  if (fallback === "practice_only") {
    throw new Error(
      "MAIL_TRANSPORT=practice_only: keine Practice-SMTP-Konfig vorhanden.",
    );
  }

  if (fallback === "console") {
    console.info("[mail:console] DigitalRequest-Notification", {
      subject,
      variant: input.variant,
    });
    return "console";
  }

  if (fallback === "smtp") {
    const cfg: SmtpConfig = readSmtpConfigFromEnv();
    await sendViaSmtp(cfg, { to: input.to, subject, text });
    return "smtp_env";
  }

  const exhaustive: never = fallback;
  throw new Error(`Unsupported MAIL_TRANSPORT: ${String(exhaustive)}`);
}
