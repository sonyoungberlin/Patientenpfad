/**
 * Tests fuer `lib/password.ts` (scrypt-basierte Passwort-Hashes).
 */

import {
  hashPassword,
  verifyPassword,
  MIN_PASSWORD_LENGTH,
} from "@/lib/password";

describe("lib/password", () => {
  it("erzeugt einen Hash im Format `scrypt$N$r$p$salt$hash`", async () => {
    const hash = await hashPassword("correct horse battery staple");
    const parts = hash.split("$");
    expect(parts).toHaveLength(6);
    expect(parts[0]).toBe("scrypt");
    expect(Number.parseInt(parts[1], 10)).toBeGreaterThanOrEqual(1024);
    expect(Number.parseInt(parts[2], 10)).toBeGreaterThanOrEqual(1);
    expect(Number.parseInt(parts[3], 10)).toBeGreaterThanOrEqual(1);
    // salt + hash sind base64 und nicht leer
    expect(Buffer.from(parts[4], "base64").length).toBeGreaterThan(0);
    expect(Buffer.from(parts[5], "base64").length).toBeGreaterThan(0);
  });

  it("erzeugt unterschiedliche Hashes fuer dasselbe Passwort (Salt)", async () => {
    const a = await hashPassword("same-password-1234");
    const b = await hashPassword("same-password-1234");
    expect(a).not.toBe(b);
  });

  it("verifiziert das korrekte Passwort", async () => {
    const hash = await hashPassword("Sup3rSecret!");
    await expect(verifyPassword("Sup3rSecret!", hash)).resolves.toBe(true);
  });

  it("verifiziert ein falsches Passwort als false", async () => {
    const hash = await hashPassword("Sup3rSecret!");
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });

  it("liefert false bei NULL/leerem Hash (kein Bypass fuer Bestandsaccounts)", async () => {
    await expect(verifyPassword("anything", null)).resolves.toBe(false);
    await expect(verifyPassword("anything", undefined)).resolves.toBe(false);
    await expect(verifyPassword("anything", "")).resolves.toBe(false);
  });

  it("liefert false bei leerem Klartext-Passwort", async () => {
    const hash = await hashPassword("Sup3rSecret!");
    await expect(verifyPassword("", hash)).resolves.toBe(false);
  });

  it("liefert false bei kaputtem Hash-Format", async () => {
    await expect(verifyPassword("x", "not-a-valid-hash")).resolves.toBe(false);
    await expect(verifyPassword("x", "scrypt$0$0$0$$")).resolves.toBe(false);
    await expect(verifyPassword("x", "bcrypt$1$1$1$aaa$bbb")).resolves.toBe(false);
  });

  it("MIN_PASSWORD_LENGTH ist konsistent (>= 8)", () => {
    expect(MIN_PASSWORD_LENGTH).toBeGreaterThanOrEqual(8);
  });
});
