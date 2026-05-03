/**
 * Passwort-Hashing für interne Accounts.
 *
 * Verwendet ausschließlich Node-Builtins (`crypto.scrypt`, `crypto.randomBytes`,
 * `crypto.timingSafeEqual`) — keine zusätzliche Dependency.
 *
 * Speicherformat (kompakt, in *einem* Textfeld `Account.password_hash`):
 *
 *   scrypt$<N>$<r>$<p>$<saltBase64>$<hashBase64>
 *
 * - `N`, `r`, `p` sind die scrypt-Kostenparameter und werden mitgespeichert,
 *   damit Hashes bei künftigen Parameter-Erhöhungen weiter verifizierbar
 *   bleiben.
 * - `salt` (16 Byte) und `hash` (64 Byte) sind base64-kodiert.
 * - Der Verifikationsvergleich nutzt `timingSafeEqual`, um Timing-Side-Channels
 *   beim Vergleich zu vermeiden.
 *
 * Klartext-Passwörter werden niemals geloggt oder zurückgegeben.
 */

import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem?: number },
) => Promise<Buffer>;

// Aktuelle Default-Parameter (entlang OWASP-Empfehlung fuer scrypt).
// `N` als Power-of-Two; bei kuenftigen Erhoehungen Hash bei naechstem Login neu schreiben.
const DEFAULT_N = 1 << 15; // 32768
const DEFAULT_R = 8;
const DEFAULT_P = 1;
const KEY_LEN = 64;
const SALT_LEN = 16;
// `scrypt` schätzt den Speicherbedarf konservativ; wir setzen `maxmem` großzügig,
// damit `N=2^15, r=8, p=1` (~64 MB) in Standard-Node-Prozessen passt.
const MAX_MEM = 128 * 1024 * 1024;

const ALGO = "scrypt";

/**
 * Mindestlänge für Passwörter. Wird in der API-Schicht erzwungen; hier nur als
 * Konstante exportiert, damit Aufrufer einen einheitlichen Wert haben.
 */
export const MIN_PASSWORD_LENGTH = 10;

/**
 * Erzeugt einen Hash für das gegebene Klartext-Passwort.
 *
 * @throws Error wenn das Passwort leer/`null` ist.
 */
export async function hashPassword(password: string): Promise<string> {
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

/**
 * Verifiziert ein Klartext-Passwort gegen einen gespeicherten Hash.
 *
 * Gibt `false` (statt zu werfen) zurück bei
 *  - leerem/ungültigem `password`
 *  - leerem/ungültigem `storedHash` (z. B. NULL für Bestandsaccounts ohne
 *    gesetztes Passwort)
 *  - nicht erkannter Hash-Version
 *
 * Damit bleibt der Aufrufer (Login-Route) immer auf dem neutralen
 * „E-Mail oder Passwort ungültig"-Pfad und leakt keine Informationen über die
 * Account-Existenz oder den Migrationszustand.
 */
export async function verifyPassword(
  password: string,
  storedHash: string | null | undefined,
): Promise<boolean> {
  if (typeof password !== "string" || password.length === 0) return false;
  if (typeof storedHash !== "string" || storedHash.length === 0) return false;

  const parts = storedHash.split("$");
  if (parts.length !== 6) return false;
  const [algo, nStr, rStr, pStr, saltB64, hashB64] = parts;
  if (algo !== ALGO) return false;

  const N = Number.parseInt(nStr, 10);
  const r = Number.parseInt(rStr, 10);
  const p = Number.parseInt(pStr, 10);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) {
    return false;
  }
  if (N < 1024 || r < 1 || p < 1) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltB64, "base64");
    expected = Buffer.from(hashB64, "base64");
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;

  let derived: Buffer;
  try {
    derived = await scrypt(password, salt, expected.length, {
      N,
      r,
      p,
      maxmem: MAX_MEM,
    });
  } catch {
    return false;
  }

  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}
