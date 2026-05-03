/**
 * SMTP-Transport für die Bestätigungs-E-Mail eines öffentlichen
 * Website-Form-Submits.
 *
 * Mandantenfähigkeit (Phase Practice-SMTP):
 *   - Es gibt KEINEN globalen Single-Transporter mehr. Pro eindeutiger
 *     Konfiguration (Host/Port/User/From/Secure) wird genau ein
 *     Nodemailer-Transporter in einer Map zwischengespeichert.
 *   - Cache-Key bewusst OHNE Passwort, damit Klartext-Passwörter nirgends
 *     auch nur indirekt in In-Memory-Strukturen referenziert werden.
 *   - Die Map ist auf eine Höchstgröße begrenzt (LRU per Reinsertion),
 *     um bei vielen Practices nicht unbegrenzt Verbindungen zu halten.
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
  /**
   * Absender. Entweder als bereits zusammengesetzter Header-String
   * (z. B. `"Praxis <noreply@example.com>"`) oder als strukturiertes
   * Objekt — Letzteres bevorzugt, weil Nodemailer den Display-Name
   * dann RFC-konform encodiert.
   */
  from: string | { name: string; address: string };
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

// Multi-Tenant-Cache: pro Konfig-Identität (Cache-Key) genau ein
// Transporter. LRU per Reinsertion in eine Map; obergrenze schützt vor
// unbegrenztem Wachstum bei vielen Practices.
const TRANSPORTER_CACHE_LIMIT = 64;
const transporterCache = new Map<string, Transporter>();

function fromCacheFragment(from: SmtpConfig["from"]): string {
  if (typeof from === "string") return from;
  return `${from.name}<${from.address}>`;
}

export function transporterCacheKey(cfg: SmtpConfig): string {
  // Bewusst OHNE Passwort — der Cache referenziert niemals Klartext.
  return [
    cfg.host,
    cfg.port,
    cfg.user,
    fromCacheFragment(cfg.from),
    cfg.secure ? "1" : "0",
  ].join("|");
}

function getTransporter(cfg: SmtpConfig): Transporter {
  const key = transporterCacheKey(cfg);
  const existing = transporterCache.get(key);
  if (existing) {
    // LRU-Bumping: zuletzt benutzt → ans Ende.
    transporterCache.delete(key);
    transporterCache.set(key, existing);
    return existing;
  }
  const transporter = nodemailer.createTransport({
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
  transporterCache.set(key, transporter);
  // Eviction wenn Limit überschritten: ältesten Eintrag entfernen.
  while (transporterCache.size > TRANSPORTER_CACHE_LIMIT) {
    const oldestKey = transporterCache.keys().next().value as
      | string
      | undefined;
    if (!oldestKey) break;
    const evicted = transporterCache.get(oldestKey);
    transporterCache.delete(oldestKey);
    // Verbindung sauber schließen, damit kein Socket-Leak entsteht.
    try {
      evicted?.close();
    } catch {
      // ignorieren
    }
  }
  return transporter;
}

/** Nur für Tests: Cache leeren, damit Mocks/Configs frisch geladen werden. */
export function __resetSmtpTransporterCacheForTests(): void {
  for (const t of transporterCache.values()) {
    try {
      t.close();
    } catch {
      // ignorieren
    }
  }
  transporterCache.clear();
}

/** Nur für Tests: aktuelle Cache-Größe inspizieren. */
export function __smtpTransporterCacheSizeForTests(): number {
  return transporterCache.size;
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
