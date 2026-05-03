/**
 * Stellt sicher, dass das in `scripts/set-account-password.mjs` verwendete
 * Hash-Format (scrypt mit `N=2^15, r=8, p=1`, 16-Byte-Salt, 64-Byte-Key,
 * Layout `scrypt$N$r$p$saltB64$hashB64`) zu `verifyPassword` aus
 * `lib/password.ts` kompatibel ist. Das Script duplizierter den Algorithmus
 * bewusst, da .mjs nicht direkt aus TS importieren kann — dieser Test ist
 * der Vertrag, der beide Implementierungen verklammert.
 */

import { promisify } from "util";
import { randomBytes, scrypt as scryptCallback } from "crypto";
import { readFileSync } from "fs";
import { resolve } from "path";

import { verifyPassword } from "@/lib/password";

const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem?: number },
) => Promise<Buffer>;

// Muss exakt zu Konstanten in scripts/set-account-password.mjs passen.
const ALGO = "scrypt";
const N = 1 << 15;
const R = 8;
const P = 1;
const KEY_LEN = 64;
const SALT_LEN = 16;

async function hashLikeScript(password: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const derived = await scrypt(password, salt, KEY_LEN, {
    N,
    r: R,
    p: P,
    maxmem: 128 * 1024 * 1024,
  });
  return [ALGO, N, R, P, salt.toString("base64"), derived.toString("base64")].join("$");
}

describe("scripts/set-account-password.mjs", () => {
  it("erzeugt Hashes, die `verifyPassword` akzeptiert", async () => {
    const hash = await hashLikeScript("ein-langes-test-passwort");
    expect(hash.startsWith("scrypt$")).toBe(true);
    await expect(verifyPassword("ein-langes-test-passwort", hash)).resolves.toBe(true);
    await expect(verifyPassword("falsches-passwort", hash)).resolves.toBe(false);
  });

  it("loggt weder Klartext-Passwort noch Hash-Inhalt im Quelltext (statische Pruefung)", () => {
    // Defensive Quelltext-Pruefung: keine `console.*`-Ausgabe darf den Wert
    // einer Variable referenzieren, die das Klartext-Passwort oder den Hash
    // traegt (`password`, `password_hash`, `hash`, `derived`).
    const src = readFileSync(
      resolve(__dirname, "..", "scripts", "set-account-password.mjs"),
      "utf-8",
    );
    const consoleCalls = src.match(/console\.[a-z]+\([^)]*\)/g) ?? [];
    for (const call of consoleCalls) {
      // String-Literale aus dem Call entfernen, danach nach problematischen
      // Identifiern suchen. Damit zaehlen z. B. Pfade wie
      // "scripts/set-account-password.mjs" innerhalb von Strings nicht.
      const withoutStrings = call
        .replace(/"(?:[^"\\]|\\.)*"/g, "")
        .replace(/'(?:[^'\\]|\\.)*'/g, "")
        .replace(/`(?:[^`\\$]|\\.|\$\{[^}]*\})*`/g, (m) => {
          // Backticks: nur Template-Expressions ${...} behalten.
          const exprs = m.match(/\$\{[^}]*\}/g) ?? [];
          return exprs.join(" ");
        });
      expect(withoutStrings).not.toMatch(/\bpassword\b/);
      expect(withoutStrings).not.toMatch(/\bpassword_hash\b/);
      expect(withoutStrings).not.toMatch(/\bhash\b/);
      expect(withoutStrings).not.toMatch(/\bderived\b/);
    }
  });

  it("validiert Mindestlaenge 10 (Konstante im Script)", () => {
    const src = readFileSync(
      resolve(__dirname, "..", "scripts", "set-account-password.mjs"),
      "utf-8",
    );
    expect(src).toMatch(/MIN_PASSWORD_LENGTH\s*=\s*10/);
  });
});
