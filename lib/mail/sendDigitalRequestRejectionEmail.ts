/**
 * Mail-Utility für den Ablehnungs-Versand einer DigitalRequest.
 *
 * Eine einzige öffentliche Funktion: {@link sendDigitalRequestRejectionEmail}.
 * Eine reine Render-Funktion: {@link buildDigitalRequestRejectionEmailBody}.
 *
 * Transport-Auswahl (Practice-First, analog
 * `lib/mail/sendDigitalRequestTokenEmail.ts`):
 *   1. Practice-spezifische SMTP-Konfig, wenn `practiceId` übergeben und
 *      in der DB vorhanden und vollständig konfiguriert.
 *   2. ENV-`MAIL_TRANSPORT`-Fallback:
 *        - `console`  → loggt Empfänger (kein echter Versand)
 *        - `smtp`     → globale ENV-SMTP-Konfig
 *        - `practice_only` → wirft, kein globaler Fallback
 *        - andere Werte → Warnung + console
 *
 * Sicherheitsanforderungen:
 *   - Kein AU/Rezept/Überweisung-Wording im Body.
 *   - Keine Leistungszusage.
 *   - Keine Patientendaten außer der Empfängeradresse.
 */

import {
  readSmtpConfigFromEnv,
  sendViaSmtp,
  type SmtpConfig,
} from "@/lib/mail/smtpTransport";
import { loadPracticeSmtpConfig } from "@/lib/mail/practiceSmtp";

export type DigitalRequestRejectionMailInput = {
  /** Empfängeradresse – wird aus DigitalRequest.submitter_email befüllt. */
  to: string;
  /** Anzeigename der Praxis, wird im Betreff und im Bodytext genutzt. */
  practiceName: string;
  /** Optionale Praxis-Signatur (Adresse, Öffnungszeiten o. ä.). */
  practiceSignature?: string | null;
  /**
   * Practice-ID für die SMTP-Konfiguration. Wenn vorhanden und die
   * Practice hat eine vollständige SMTP-Konfig, wird diese verwendet;
   * andernfalls greift der ENV-Fallback.
   */
  practiceId?: string | null;
  /** "patient" (Standard) | "office" – steuert Betreff und Bodytext. */
  variant?: "patient" | "office";
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
 * Baut den neutralen E-Mail-Body für den Ablehnungs-Versand.
 *
 * Bewusst keine medizinischen Inhalte, keine Leistungszusage,
 * kein AU/Rezept/Überweisung-Wording.
 */
export function buildDigitalRequestRejectionEmailBody(input: {
  practiceName: string;
  practiceSignature?: string | null;
  variant?: "patient" | "office";
}): { subject: string; text: string } {
  const signature = input.practiceSignature?.trim()
    ? `\n\n${input.practiceSignature.trim()}`
    : "";

  if (input.variant === "office") {
    return {
      subject: `Ihre Bewerbungsanfrage bei ${input.practiceName}`,
      text:
        `Vielen Dank für Ihr Interesse an unserer Praxis.\n\n` +
        `Leider können wir Ihre Bewerbung derzeit nicht berücksichtigen.\n\n` +
        `Vielen Dank.` +
        signature +
        "\n",
    };
  }

  return {
    subject: `Ihre Anfrage bei der Praxis ${input.practiceName}`,
    text:
      `Ihre digitale Anfrage konnte nicht weiter bearbeitet werden.\n\n` +
      `Bitte wenden Sie sich mit Ihrem Anliegen direkt an die Praxis.\n\n` +
      `Vielen Dank.` +
      signature +
      "\n",
  };
}

/**
 * Versendet die Ablehnungs-E-Mail an die einreichende Person.
 *
 * Liefert den tatsächlich verwendeten Transport zurück. Wirft im
 * `practice_only`-Modus ohne Practice-SMTP-Konfig sowie bei SMTP-
 * Übertragungsfehlern — der Aufrufer behandelt dies als `mail_failed`.
 */
export async function sendDigitalRequestRejectionEmail(
  input: DigitalRequestRejectionMailInput,
): Promise<ResolvedMailTransport> {
  const { subject, text } = buildDigitalRequestRejectionEmailBody({
    practiceName: input.practiceName,
    practiceSignature: input.practiceSignature,
    variant: input.variant,
  });

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
    console.info("[mail:console] DigitalRequest-Ablehnung", {
      to: input.to,
      subject,
      bodyPreview: text.slice(0, 80),
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
