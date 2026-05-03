/**
 * Practice-spezifischer SMTP-Resolver.
 *
 * Lädt die SMTP-Felder einer Practice aus der DB, prüft Vollständigkeit
 * und Port-Range, entschlüsselt das Passwort und baut daraus eine
 * `SmtpConfig`, die direkt an `sendViaSmtp` übergeben werden kann.
 *
 * Vertrag mit dem Submit-Pfad:
 *   - Liefert `null`, wenn die Practice nicht existiert, die Konfig
 *     unvollständig ist oder das Passwort nicht entschlüsselt werden kann.
 *     Der Aufrufer behandelt `null` exakt wie „keine Practice-Konfig" und
 *     entscheidet selbst über Fallback (siehe
 *     `lib/mail/sendWebsiteFormConfirmationEmail.ts`).
 *   - Wirft NICHT bei Decrypt-Fehlern, sondern loggt einen anonymisierten
 *     Marker (`practiceId`, kein Cipher, kein Klartext, keine Felder
 *     außer der ID).
 */

import { prisma } from "@/lib/prisma";
import {
  decryptSmtpPassword,
  isMailSecretConfigured,
  SmtpPasswordCipherError,
} from "@/lib/mail/smtpSecret";
import type { SmtpConfig } from "@/lib/mail/smtpTransport";

const LOG_MARKER = "[mail:practice-smtp]";

export type PracticeSmtpRow = {
  id: string;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_secure: boolean | null;
  smtp_user: string | null;
  smtp_pass_encrypted: string | null;
  smtp_from_email: string | null;
  smtp_from_name: string | null;
};

export type PracticeSmtpStatus = {
  configured: boolean;
  /** True, wenn eine vollständige Konfig vorliegt UND Passwort gesetzt ist. */
  passwordSet: boolean;
  /** Einzelne fehlende Felder (für UI-Hinweise). */
  missing: string[];
};

const REQUIRED_FIELDS: (keyof PracticeSmtpRow)[] = [
  "smtp_host",
  "smtp_port",
  "smtp_user",
  "smtp_pass_encrypted",
  "smtp_from_email",
];

function trimOrNull(v: string | null | undefined): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

function isValidPort(p: number | null): p is number {
  return (
    typeof p === "number" &&
    Number.isInteger(p) &&
    p >= 1 &&
    p <= 65535
  );
}

/** Reine Statusprüfung — ohne DB-Zugriff, ohne Decrypt. */
export function describePracticeSmtpStatus(
  row: PracticeSmtpRow | null,
): PracticeSmtpStatus {
  if (!row) {
    return { configured: false, passwordSet: false, missing: REQUIRED_FIELDS.slice() };
  }
  const missing: string[] = [];
  if (!trimOrNull(row.smtp_host)) missing.push("smtp_host");
  if (!isValidPort(row.smtp_port)) missing.push("smtp_port");
  if (!trimOrNull(row.smtp_user)) missing.push("smtp_user");
  if (!trimOrNull(row.smtp_pass_encrypted)) missing.push("smtp_pass_encrypted");
  if (!trimOrNull(row.smtp_from_email)) missing.push("smtp_from_email");
  return {
    configured: missing.length === 0,
    passwordSet: trimOrNull(row.smtp_pass_encrypted) !== null,
    missing,
  };
}

/**
 * Lädt die SMTP-Konfig der Practice und gibt eine versandfertige
 * {@link SmtpConfig} zurück. `null` bei Fehlen, Unvollständigkeit oder
 * Decrypt-Fehler.
 */
export async function loadPracticeSmtpConfig(
  practiceId: string,
): Promise<SmtpConfig | null> {
  if (typeof practiceId !== "string" || practiceId === "") return null;
  if (!isMailSecretConfigured()) {
    // Kein Key konfiguriert → Konfig kann nicht entschlüsselt werden.
    return null;
  }
  let row: PracticeSmtpRow | null;
  try {
    row = (await prisma.practice.findUnique({
      where: { id: practiceId },
      select: {
        id: true,
        smtp_host: true,
        smtp_port: true,
        smtp_secure: true,
        smtp_user: true,
        smtp_pass_encrypted: true,
        smtp_from_email: true,
        smtp_from_name: true,
      },
    })) as PracticeSmtpRow | null;
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error(LOG_MARKER, {
      event: "load_failed",
      practiceId,
      detail: message,
    });
    return null;
  }
  return mapRowToSmtpConfig(row, practiceId);
}

/**
 * Reine Mapping-Funktion. Exportiert für Tests, damit die
 * Decrypt-/Validierungs-Logik ohne Prisma getestet werden kann.
 */
export function mapRowToSmtpConfig(
  row: PracticeSmtpRow | null,
  practiceId: string,
): SmtpConfig | null {
  const status = describePracticeSmtpStatus(row);
  if (!row || !status.configured) return null;
  // Defensiv: nach describePracticeSmtpStatus sind die Pflichtfelder
  // garantiert nicht-leer und der Port liegt im gültigen Range.
  const host = trimOrNull(row.smtp_host)!;
  const port = row.smtp_port as number;
  const user = trimOrNull(row.smtp_user)!;
  const passCipher = trimOrNull(row.smtp_pass_encrypted)!;
  const fromEmail = trimOrNull(row.smtp_from_email)!;
  const fromName = trimOrNull(row.smtp_from_name);

  let pass: string;
  try {
    pass = decryptSmtpPassword(passCipher);
  } catch (err) {
    // Bewusst NUR practiceId + generischer Marker. Kein Cipher, kein
    // Klartext, keine Detail-Message aus dem Crypto-Layer.
    const code =
      err instanceof SmtpPasswordCipherError ? err.name : "unknown";
    console.error(LOG_MARKER, {
      event: "smtp_pass_decrypt_failed",
      practiceId,
      code,
    });
    return null;
  }

  const from = fromName ? { name: fromName, address: fromEmail } : fromEmail;
  return {
    host,
    port,
    user,
    pass,
    from,
    secure: row.smtp_secure === true,
  };
}
