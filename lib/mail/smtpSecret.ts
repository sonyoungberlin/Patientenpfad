/**
 * AES-256-GCM Verschlüsselung für Practice-SMTP-Passwörter.
 *
 * Sicherheits-/Logging-Invarianten:
 *   - Klartext-Passwort wird NIEMALS persistiert (nur in Speicher beim
 *     unmittelbaren Versand) und NIEMALS geloggt.
 *   - Cipher-Format ist versioniert (`v1:`), damit spätere Key-Rotation
 *     ohne Schemabruch möglich ist.
 *   - Domain-Trennung über AAD `practice-smtp-pass-v1`, damit ein Cipher
 *     aus diesem Helper nicht in einem anderen Kontext entschlüsselt
 *     werden kann.
 *   - Decrypt-Fehler (falscher Key, manipuliertes Cipher, falsche AAD)
 *     werfen einen generischen `Error` ohne Cipher-Inhalt.
 *
 * ENV: `MAIL_SECRET_KEY` muss exakt 32 Bytes (base64-kodiert) liefern.
 * Generierung: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "crypto";

const ALGO = "aes-256-gcm" as const;
const IV_LEN = 12;
const KEY_LEN = 32;
const AAD = Buffer.from("practice-smtp-pass-v1");
const VERSION_PREFIX = "v1";

export class MailSecretKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MailSecretKeyError";
  }
}

export class SmtpPasswordCipherError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SmtpPasswordCipherError";
  }
}

function loadKey(env: NodeJS.ProcessEnv): Buffer {
  const raw = env.MAIL_SECRET_KEY;
  if (typeof raw !== "string" || raw.trim() === "") {
    throw new MailSecretKeyError(
      "MAIL_SECRET_KEY ist nicht gesetzt — Practice-SMTP-Passwörter können nicht ver-/entschlüsselt werden.",
    );
  }
  let buf: Buffer;
  try {
    buf = Buffer.from(raw.trim(), "base64");
  } catch {
    throw new MailSecretKeyError(
      "MAIL_SECRET_KEY ist kein gültiges Base64.",
    );
  }
  if (buf.length !== KEY_LEN) {
    throw new MailSecretKeyError(
      `MAIL_SECRET_KEY muss nach Base64-Decode genau ${KEY_LEN} Bytes haben (war: ${buf.length}).`,
    );
  }
  return buf;
}

/** Liefert true, wenn `MAIL_SECRET_KEY` gültig konfiguriert ist. Wirft nicht. */
export function isMailSecretConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  try {
    loadKey(env);
    return true;
  } catch {
    return false;
  }
}

/**
 * Verschlüsselt ein Klartext-Passwort und gibt den persistierbaren
 * Cipher-String zurück. Der Klartext darf NIEMALS in Logs/Errors landen.
 */
export function encryptSmtpPassword(
  plain: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (typeof plain !== "string" || plain.length === 0) {
    throw new SmtpPasswordCipherError("Passwort darf nicht leer sein.");
  }
  const key = loadKey(env);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  cipher.setAAD(AAD);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION_PREFIX,
    iv.toString("base64"),
    ct.toString("base64"),
    tag.toString("base64"),
  ].join(":");
}

/**
 * Entschlüsselt einen mit {@link encryptSmtpPassword} erzeugten String.
 * Wirft `SmtpPasswordCipherError` bei jeder Form von Format-/Auth-Fehlern.
 */
export function decryptSmtpPassword(
  blob: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (typeof blob !== "string" || blob.length === 0) {
    throw new SmtpPasswordCipherError("Cipher-Blob ist leer.");
  }
  const parts = blob.split(":");
  if (parts.length !== 4) {
    throw new SmtpPasswordCipherError("Cipher-Blob hat ungültiges Format.");
  }
  const [version, ivB64, ctB64, tagB64] = parts;
  // Konstantzeit-Vergleich der Version, defensiv.
  const versionBuf = Buffer.from(version);
  const expectedBuf = Buffer.from(VERSION_PREFIX);
  if (
    versionBuf.length !== expectedBuf.length ||
    !timingSafeEqual(versionBuf, expectedBuf)
  ) {
    throw new SmtpPasswordCipherError("Cipher-Version nicht unterstützt.");
  }
  const key = loadKey(env);
  let iv: Buffer;
  let ct: Buffer;
  let tag: Buffer;
  try {
    iv = Buffer.from(ivB64, "base64");
    ct = Buffer.from(ctB64, "base64");
    tag = Buffer.from(tagB64, "base64");
  } catch {
    throw new SmtpPasswordCipherError("Cipher-Blob hat ungültiges Base64.");
  }
  if (iv.length !== IV_LEN || tag.length !== 16) {
    throw new SmtpPasswordCipherError("Cipher-Blob hat ungültige Längen.");
  }
  try {
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAAD(AAD);
    decipher.setAuthTag(tag);
    const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
    return pt.toString("utf8");
  } catch {
    // Bewusst KEIN Error-Detail / KEIN Cipher-Inhalt im Fehler.
    throw new SmtpPasswordCipherError("Cipher-Blob konnte nicht entschlüsselt werden.");
  }
}
