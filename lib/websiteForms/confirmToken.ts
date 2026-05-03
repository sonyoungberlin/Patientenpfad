/**
 * Phase 3d: Bestätigungs-Token für Website-Form-Submissions.
 *
 * Der Klartext-Token verlässt den Server **nur einmal** als Teil der
 * Bestätigungs-URL in der E-Mail. In der Datenbank wird ausschließlich der
 * SHA-256-Hash gespeichert (`PatientQuestionnaireSession.confirm_token`).
 * Damit wird ein DB-Leak von einem Token-Leak entkoppelt.
 *
 * Das Feld `confirm_token` wurde in Phase 3a eingeführt, war aber bis hierher
 * nicht produktiv genutzt; es gibt deshalb keine Rückwärtskompatibilität.
 */

import { createHash, randomBytes } from "crypto";

/** Lebensdauer des Bestätigungs-Tokens (48 Stunden). */
export const CONFIRM_TOKEN_TTL_MS = 48 * 60 * 60 * 1000;

/** Erwartete Länge des base64url-kodierten Klartext-Tokens (32 Bytes → 43 Zeichen). */
export const CONFIRM_TOKEN_RAW_LENGTH = 43;

/** Hex-Länge des SHA-256-Hashes. */
export const CONFIRM_TOKEN_HASH_LENGTH = 64;

const RAW_TOKEN_REGEX = /^[A-Za-z0-9_-]{43}$/;
const HASH_REGEX = /^[a-f0-9]{64}$/;

/**
 * Erzeugt einen frischen Bestätigungs-Token.
 *
 * - `raw` ist der base64url-kodierte 256-bit-Klartext für die E-Mail-URL.
 * - `hash` ist der hex-kodierte SHA-256-Hash für die DB-Spalte `confirm_token`.
 * - `expiresAt` liegt {@link CONFIRM_TOKEN_TTL_MS} ms in der Zukunft.
 */
export function generateConfirmToken(): {
  raw: string;
  hash: string;
  expiresAt: Date;
} {
  const raw = randomBytes(32).toString("base64url");
  return {
    raw,
    hash: hashConfirmToken(raw),
    expiresAt: new Date(Date.now() + CONFIRM_TOKEN_TTL_MS),
  };
}

/**
 * Bildet den SHA-256-Hash eines Klartext-Tokens. Stabil und deterministisch,
 * wird vom Submit- und Confirm-Pfad verwendet.
 */
export function hashConfirmToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Strenge Format-Prüfung für den Klartext-Token aus der URL. */
export function isValidRawConfirmTokenFormat(input: unknown): input is string {
  return typeof input === "string" && RAW_TOKEN_REGEX.test(input);
}

/** Strenge Format-Prüfung für den persistierten Hex-Hash. */
export function isValidConfirmTokenHashFormat(input: unknown): input is string {
  return typeof input === "string" && HASH_REGEX.test(input);
}
