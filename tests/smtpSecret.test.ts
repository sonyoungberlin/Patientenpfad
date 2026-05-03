/**
 * Tests für lib/mail/smtpSecret.ts.
 *
 * Sicherungen:
 *   - Roundtrip encrypt → decrypt liefert Original.
 *   - Gleicher Klartext erzeugt unterschiedliche Cipher (IV-Zufall).
 *   - Manipuliertes Cipher schlägt am Auth-Tag fehl.
 *   - Falsche Version wird abgelehnt.
 *   - Fehlender / ungültiger MAIL_SECRET_KEY liefert klare Fehler.
 *   - Klartext-Passwort taucht nirgends im Cipher-String auf.
 */

import {
  encryptSmtpPassword,
  decryptSmtpPassword,
  isMailSecretConfigured,
  MailSecretKeyError,
  SmtpPasswordCipherError,
} from "@/lib/mail/smtpSecret";
import { randomBytes } from "crypto";

const VALID_KEY = randomBytes(32).toString("base64");
const OTHER_KEY = randomBytes(32).toString("base64");

describe("smtpSecret", () => {
  const ORIG = process.env.MAIL_SECRET_KEY;
  beforeEach(() => {
    process.env.MAIL_SECRET_KEY = VALID_KEY;
  });
  afterEach(() => {
    if (ORIG === undefined) delete process.env.MAIL_SECRET_KEY;
    else process.env.MAIL_SECRET_KEY = ORIG;
  });

  it("isMailSecretConfigured: true bei gültigem Key, false sonst", () => {
    expect(isMailSecretConfigured()).toBe(true);
    delete process.env.MAIL_SECRET_KEY;
    expect(isMailSecretConfigured()).toBe(false);
    process.env.MAIL_SECRET_KEY = "too-short";
    expect(isMailSecretConfigured()).toBe(false);
  });

  it("Roundtrip liefert das Original-Passwort", () => {
    const blob = encryptSmtpPassword("hunter2-äöü-✓");
    expect(decryptSmtpPassword(blob)).toBe("hunter2-äöü-✓");
  });

  it("erzeugt unterschiedliche Cipher für gleichen Klartext (IV)", () => {
    const a = encryptSmtpPassword("samepassword");
    const b = encryptSmtpPassword("samepassword");
    expect(a).not.toBe(b);
  });

  it("Cipher enthält das Klartext-Passwort NICHT", () => {
    const plain = "PROBE_PLAINTEXT_xyz";
    const blob = encryptSmtpPassword(plain);
    expect(blob).not.toContain(plain);
    // Zur Sicherheit auch Base64 des Klartexts ausschließen.
    expect(blob).not.toContain(Buffer.from(plain).toString("base64"));
  });

  it("Manipuliertes Cipher schlägt am Auth-Tag fehl", () => {
    const blob = encryptSmtpPassword("secret");
    const parts = blob.split(":");
    // Cipher-Teil flippen.
    const ct = Buffer.from(parts[2], "base64");
    ct[0] = ct[0] ^ 0x01;
    parts[2] = ct.toString("base64");
    const tampered = parts.join(":");
    expect(() => decryptSmtpPassword(tampered)).toThrow(SmtpPasswordCipherError);
  });

  it("Falsche Version wird abgelehnt", () => {
    const blob = encryptSmtpPassword("secret");
    const tampered = blob.replace(/^v1:/, "v9:");
    expect(() => decryptSmtpPassword(tampered)).toThrow(SmtpPasswordCipherError);
  });

  it("Falscher Key kann nicht entschlüsseln", () => {
    const blob = encryptSmtpPassword("secret");
    process.env.MAIL_SECRET_KEY = OTHER_KEY;
    expect(() => decryptSmtpPassword(blob)).toThrow(SmtpPasswordCipherError);
  });

  it("Fehlender MAIL_SECRET_KEY → MailSecretKeyError beim Encrypt", () => {
    delete process.env.MAIL_SECRET_KEY;
    expect(() => encryptSmtpPassword("x")).toThrow(MailSecretKeyError);
  });

  it("Zu kurzer MAIL_SECRET_KEY → MailSecretKeyError", () => {
    process.env.MAIL_SECRET_KEY = Buffer.from("too short").toString("base64");
    expect(() => encryptSmtpPassword("x")).toThrow(MailSecretKeyError);
  });

  it("Leeres Passwort wird abgelehnt", () => {
    expect(() => encryptSmtpPassword("")).toThrow(SmtpPasswordCipherError);
  });

  it("Ungültiges Cipher-Format → SmtpPasswordCipherError", () => {
    expect(() => decryptSmtpPassword("nonsense")).toThrow(SmtpPasswordCipherError);
    expect(() => decryptSmtpPassword("v1:onlyone")).toThrow(SmtpPasswordCipherError);
  });
});
