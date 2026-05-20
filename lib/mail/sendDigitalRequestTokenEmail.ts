/**
 * Mail-Utility für den Fragebogen-Link-Versand an eine DigitalRequest-
 * Einreichende (Phase B).
 *
 * Eine einzige öffentliche Funktion: {@link sendDigitalRequestTokenEmail}.
 * Eine reine Render-Funktion: {@link buildDigitalRequestTokenEmailBody}.
 *
 * Transport-Auswahl (Practice-First, analog
 * `lib/mail/sendWebsiteFormConfirmationEmail.ts`):
 *   1. Practice-spezifische SMTP-Konfig, wenn `practiceId` übergeben und
 *      in der DB vorhanden und vollständig konfiguriert.
 *   2. ENV-`MAIL_TRANSPORT`-Fallback:
 *        - `console`  → loggt Empfänger + URL (kein echter Versand)
 *        - `smtp`     → globale ENV-SMTP-Konfig
 *        - `practice_only` → wirft, kein globaler Fallback
 *        - andere Werte → Warnung + console
 *
 * Sicherheitsanforderungen:
 *   - Kein AU/Rezept/Überweisung-Wording im Body.
 *   - Keine Leistungszusage.
 *   - Keine Patientendaten außer der Empfängeradresse.
 *   - Link wird nur als URL übergeben, nie als HTML-Anker (plain text Mail).
 */

import {
  readSmtpConfigFromEnv,
  sendViaSmtp,
  type SmtpConfig,
} from "@/lib/mail/smtpTransport";
import { loadPracticeSmtpConfig } from "@/lib/mail/practiceSmtp";

export type DigitalRequestTokenMailInput = {
  /** Empfängeradresse – wird aus DigitalRequest.submitter_email befüllt. */
  to: string;
  /** Vollständige Fragebogen-URL inkl. Token (z. B. https://…/q/<uuid>). */
  questionnaireUrl: string;
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
 * Baut den neutralen E-Mail-Body für den Fragebogen-Link-Versand.
 *
 * Bewusst keine medizinischen Inhalte, keine Leistungszusage,
 * kein AU/Rezept/Überweisung-Wording.
 */
export function buildDigitalRequestTokenEmailBody(input: {
  questionnaireUrl: string;
  practiceName: string;
  practiceSignature?: string | null;
}): { subject: string; text: string } {
  const signature = input.practiceSignature?.trim()
    ? `\n\n${input.practiceSignature.trim()}`
    : "";

  return {
    subject: `Ihr Fragebogen der Praxis ${input.practiceName}`,
    text:
      `Vielen Dank für Ihre Anfrage.\n\n` +
      `Die Praxis hat Ihnen einen passenden Fragebogen zusammengestellt.\n\n` +
      `Bitte öffnen Sie den folgenden Link und füllen Sie die Angaben aus:\n` +
      `${input.questionnaireUrl}\n` +
      signature +
      "\n",
  };
}

/**
 * Versendet den Fragebogen-Link per E-Mail an die einreichende Person.
 *
 * Liefert den tatsächlich verwendeten Transport zurück. Wirft im
 * `practice_only`-Modus ohne Practice-SMTP-Konfig sowie bei SMTP-
 * Übertragungsfehlern — der Aufrufer behandelt dies als `mail_failed`
 * (analog zum Website-Form-Submit-Endpoint).
 */
export async function sendDigitalRequestTokenEmail(
  input: DigitalRequestTokenMailInput,
): Promise<ResolvedMailTransport> {
  const { subject, text } = buildDigitalRequestTokenEmailBody({
    questionnaireUrl: input.questionnaireUrl,
    practiceName: input.practiceName,
    practiceSignature: input.practiceSignature,
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
    console.info("[mail:console] DigitalRequest-Fragebogen-Link", {
      to: input.to,
      subject,
      questionnaireUrl: input.questionnaireUrl,
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
