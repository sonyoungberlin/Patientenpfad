import {
  readSmtpConfigFromEnv,
  sendViaSmtp,
  type SmtpConfig,
} from "@/lib/mail/smtpTransport";
import { loadPracticeSmtpConfig } from "@/lib/mail/practiceSmtp";

export type DigitalRequestCompletionMailInput = {
  to: string;
  completionMessage: string;
  practiceName: string;
  practiceSignature?: string | null;
  practiceId?: string | null;
};

type MailTransport = "console" | "smtp" | "practice_only";

export function buildDigitalRequestCompletionEmailBody(input: {
  completionMessage: string;
  practiceName: string;
  practiceSignature?: string | null;
}): { subject: string; text: string } {
  const signature = input.practiceSignature?.trim()
    ? `\n\n${input.practiceSignature.trim()}`
    : `\n\nIhre Praxis ${input.practiceName}`;

  return {
    subject: "Rückmeldung Ihrer Praxis",
    text:
      `Guten Tag,\n\n` +
      `${input.completionMessage}\n\n` +
      `Freundliche Grüße` +
      signature +
      "\n",
  };
}

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

export async function sendDigitalRequestCompletionEmail(
  input: DigitalRequestCompletionMailInput,
): Promise<"practice" | "smtp_env" | "console"> {
  const { subject, text } = buildDigitalRequestCompletionEmailBody(input);

  if (input.practiceId) {
    const practiceCfg = await loadPracticeSmtpConfig(input.practiceId);
    if (practiceCfg) {
      await sendViaSmtp(practiceCfg, { to: input.to, subject, text });
      return "practice";
    }
  }

  const fallback = selectFallbackTransport();
  if (fallback === "practice_only") {
    throw new Error(
      "MAIL_TRANSPORT=practice_only: keine Practice-SMTP-Konfig vorhanden.",
    );
  }
  if (fallback === "console") {
    console.info("[mail:console] DigitalRequest-Abschlussantwort", {
      to: input.to,
      subject,
      bodyPreview: text.slice(0, 80),
    });
    return "console";
  }

  const cfg: SmtpConfig = readSmtpConfigFromEnv();
  await sendViaSmtp(cfg, { to: input.to, subject, text });
  return "smtp_env";
}
