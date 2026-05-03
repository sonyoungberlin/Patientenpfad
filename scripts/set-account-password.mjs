#!/usr/bin/env node
/**
 * Admin-CLI zum Setzen eines Passworts fuer einen bestehenden Account.
 *
 * Verwendung:
 *   node scripts/set-account-password.mjs <email> "<neuesPasswort>"
 *
 * Verhalten:
 *   - sucht den Account per E-Mail
 *   - validiert die Passwortlaenge (min. 10 Zeichen, identisch zu
 *     `MIN_PASSWORD_LENGTH` in `lib/password.ts`)
 *   - hasht das Passwort mit Node-builtin `crypto.scrypt` im selben Format
 *     wie `lib/password.ts` (`scrypt$N$r$p$saltBase64$hashBase64`), sodass
 *     `verifyPassword` den Hash unveraendert akzeptiert
 *   - schreibt `Account.password_hash`
 *   - loggt NIEMALS Klartext-Passwort oder Hash
 *   - beendet mit Exit-Code != 0 bei nicht gefundenem Account oder
 *     ungueltigem Passwort
 *   - disconnected den Prisma-Client sauber
 *
 * Voraussetzung: DATABASE_URL muss in der Umgebung gesetzt sein.
 */

import { PrismaClient } from "@prisma/client";
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
  console.error('  node scripts/set-account-password.mjs <email> "<neuesPasswort>"');
  process.exit(2);
}

async function main() {
  const [, , rawEmail, password] = process.argv;

  if (!rawEmail || typeof password !== "string") {
    printUsageAndExit();
  }

  const email = rawEmail.trim().toLowerCase();
  if (!email.includes("@")) {
    console.error("Fehler: Ungültige E-Mail-Adresse.");
    process.exit(2);
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(
      `Fehler: Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`,
    );
    process.exit(2);
  }

  const prisma = new PrismaClient();
  try {
    const account = await prisma.account.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
    if (!account) {
      console.error(`Fehler: Kein Account mit E-Mail "${email}" gefunden.`);
      process.exit(3);
    }

    const password_hash = await hashPassword(password);
    await prisma.account.update({
      where: { id: account.id },
      data: { password_hash },
    });

    // Bewusst keinerlei Passwort- oder Hash-Inhalt loggen.
    console.log(`✓ Passwort für "${account.email}" wurde gesetzt.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  // Fehlertext ohne Argumente ausgeben, damit niemals Passwort/Hash leakt.
  const msg = err instanceof Error ? err.message : "unbekannter Fehler";
  console.error(`Fehler: ${msg}`);
  process.exit(1);
});
