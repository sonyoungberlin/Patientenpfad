#!/usr/bin/env node
/**
 * CLI zum Erzeugen eines Passwort-Hashes — ohne Datenbankzugriff.
 *
 * Verwendung:
 *   node scripts/hash-password.mjs "<neuesPasswort>"
 *
 * Verhalten:
 *   - validiert die Passwortlaenge (min. 10 Zeichen, identisch zu
 *     `MIN_PASSWORD_LENGTH` in `lib/password.ts`)
 *   - hasht das Passwort mit Node-builtin `crypto.scrypt` im selben Format
 *     wie `lib/password.ts` (`scrypt$N$r$p$saltBase64$hashBase64`), sodass
 *     `verifyPassword` den Hash unveraendert akzeptiert
 *   - gibt ausschliesslich den Hash auf stdout aus (eine Zeile)
 *   - oeffnet KEINE Datenbankverbindung und nutzt KEIN Prisma
 *   - loggt NIEMALS das Klartext-Passwort
 *   - beendet mit Exit-Code != 0 bei ungueltigem Aufruf oder Passwort
 */
import { randomBytes, scrypt as scryptCallback } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCallback);

// Muss zu `lib/password.ts` passen, sonst sind erzeugte Hashes nicht
// verifizierbar.
const MIN_PASSWORD_LENGTH = 10;
const ALGO = "scrypt";
const DEFAULT_N = 1 << 15; // 32768
const DEFAULT_R = 8;
const DEFAULT_P = 1;
const KEY_LEN = 64;
const SALT_LEN = 16;
const MAX_MEM = 128 * 1024 * 1024;

/**
 * Erzeugt denselben Hash-String wie `hashPassword` in `lib/password.ts`.
 * Format: `scrypt$N$r$p$saltBase64$hashBase64`
 */
async function hashPassword(password) {
  if (typeof password !== "string" || password.length === 0) {
    throw new Error("password must be a non-empty string");
  }
  const salt = randomBytes(SALT_LEN);
  const derived = await scrypt(password, salt, KEY_LEN, {
    N: DEFAULT_N,
    r: DEFAULT_R,
    p: DEFAULT_P,
    maxmem: MAX_MEM,
  });
  return [
    ALGO,
    DEFAULT_N,
    DEFAULT_R,
    DEFAULT_P,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

function printUsageAndExit() {
  console.error("Verwendung:");
  console.error('  node scripts/hash-password.mjs "<neuesPasswort>"');
  process.exit(2);
}

async function main() {
  const [, , password] = process.argv;

  if (typeof password !== "string" || password.length === 0) {
    printUsageAndExit();
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(
      `Fehler: Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`,
    );
    process.exit(2);
  }

  const passwordHash = await hashPassword(password);
  // Nur den Hash ausgeben — kein Klartext, keine zusaetzlichen Logs auf stdout.
  process.stdout.write(passwordHash + "\n");
}

main().catch((err) => {
  // Fehlertext ohne Argumente ausgeben, damit niemals Passwort leakt.
  const msg = err instanceof Error ? err.message : "unbekannter Fehler";
  console.error(`Fehler: ${msg}`);
  process.exit(1);
});
