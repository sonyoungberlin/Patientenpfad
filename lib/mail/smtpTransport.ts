/**
 * SMTP-Transport für die Bestätigungs-E-Mail eines öffentlichen
 * Website-Form-Submits.
 *
 * Wird ausschließlich aufgerufen, wenn `MAIL_TRANSPORT=smtp` gesetzt ist
 * (siehe `lib/mail/sendWebsiteFormConfirmationEmail.ts`). Liest die
 * Konfiguration aus den ENV-Variablen `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
 * `SMTP_PASS`, `SMTP_FROM` (alle Pflicht) und `SMTP_SECURE` (optional).
 *
 * Sicherheits-/Logging-Invarianten:
 *   - Es werden NIEMALS Passwort, Empfängeradresse oder Bestätigungs-URL in
 *     Fehler-Messages oder Logs ausgegeben.
 *   - Bei fehlender oder ungültiger Konfiguration WIRD GEWORFEN
 *     (`SmtpConfigError`). Es gibt KEINEN stillen Fallback auf den
 *     Console-Transport — der aufrufende Submit-Endpoint behandelt den Fehler
 *     in seinem bestehenden `mail_failed`-Pfad (Session bleibt bestehen,
 *     generischer Erfolgs-Redirect, strukturiertes Server-Log).
 */

import nodemailer, { type Transporter } from "nodemailer";

export type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure: boolean;
};

const REQUIRED_ENV_KEYS = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
] as const;

export class SmtpConfigError extends Error {
  readonly missing: string[];
  readonly invalid: string[];

  constructor(missing: string[], invalid: string[] = []) {
    const parts: string[] = [];
    if (missing.length > 0) parts.push(`missing=[${missing.join(",")}]`);
    if (invalid.length > 0) parts.push(`invalid=[${invalid.join(",")}]`);
    super(`SMTP misconfigured: ${parts.join(" ")}`);
    this.name = "SmtpConfigError";
    this.missing = missing;
    this.invalid = invalid;
  }
}

function trimOrEmpty(v: string | undefined): string {
  return typeof v === "string" ? v.trim() : "";
}

function parseSecure(raw: string | undefined): boolean {
  const v = trimOrEmpty(raw).toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

/**
 * Liest und validiert die SMTP-Konfiguration aus den ENV-Variablen.
 * Wirft `SmtpConfigError`, wenn Pflichtvariablen fehlen oder Werte
 * ungültig sind. Konkrete Werte (insbesondere `SMTP_PASS`) werden niemals
 * in den Error übernommen — nur die Schlüssel-Namen.
 */
export function readSmtpConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): SmtpConfig {
  const missing: string[] = [];
  for (const key of REQUIRED_ENV_KEYS) {
    if (trimOrEmpty(env[key]) === "") {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    throw new SmtpConfigError(missing);
  }

  const portRaw = trimOrEmpty(env.SMTP_PORT);
  const port = Number.parseInt(portRaw, 10);
  const invalid: string[] = [];
  if (
    !Number.isInteger(port) ||
    String(port) !== portRaw ||
    port < 1 ||
    port > 65535
  ) {
    invalid.push("SMTP_PORT");
  }
  if (invalid.length > 0) {
    throw new SmtpConfigError([], invalid);
  }

  return {
    host: trimOrEmpty(env.SMTP_HOST),
    port,
    user: trimOrEmpty(env.SMTP_USER),
    pass: env.SMTP_PASS ?? "",
    from: trimOrEmpty(env.SMTP_FROM),
    secure: parseSecure(env.SMTP_SECURE),
  };
}

// Caching: Transporter pro Konfig wiederverwenden, um TCP-Handshakes
// zwischen mehreren Submits zu sparen. Cache-Key bewusst OHNE Passwort.
let cachedTransporter: Transporter | null = null;
let cachedKey: string | null = null;

function transporterCacheKey(cfg: SmtpConfig): string {
  return [cfg.host, cfg.port, cfg.user, cfg.from, cfg.secure ? "1" : "0"].join("|");
}

function getTransporter(cfg: SmtpConfig): Transporter {
  const key = transporterCacheKey(cfg);
  if (cachedTransporter && cachedKey === key) {
    return cachedTransporter;
  }
  cachedTransporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
    // Konservative Timeouts, damit der Submit-Request bei einem hängenden
    // SMTP-Server nicht ewig blockiert. Der Aufrufer hat einen try/catch,
    // der den Fehler als `mail_failed` loggt.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
  });
  cachedKey = key;
  return cachedTransporter;
}

/** Nur für Tests: Cache leeren, damit Mocks/Configs frisch geladen werden. */
export function __resetSmtpTransporterCacheForTests(): void {
  cachedTransporter = null;
  cachedKey = null;
}

export type SmtpSendInput = {
  to: string;
  subject: string;
  text: string;
};

/**
 * Versendet eine E-Mail über den konfigurierten SMTP-Server.
 * Wirft bei Übertragungsfehlern. Der zurückgeworfene Error enthält keine
 * Empfängeradresse und keinen Mailtext.
 */
export async function sendViaSmtp(
  cfg: SmtpConfig,
  input: SmtpSendInput,
): Promise<void> {
  const transporter = getTransporter(cfg);
  try {
    await transporter.sendMail({
      from: cfg.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
  } catch (err) {
    // Bewusst nur Klasse + Message ohne Adressen / Tokens propagieren.
    const message = err instanceof Error ? err.message : "unknown smtp error";
    throw new Error(`smtp send failed: ${message}`);
  }
}
