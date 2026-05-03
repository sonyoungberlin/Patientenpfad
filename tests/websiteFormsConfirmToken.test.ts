/**
 * Phase 3d: Tests für lib/websiteForms/confirmToken.ts.
 */

import {
  CONFIRM_TOKEN_HASH_LENGTH,
  CONFIRM_TOKEN_RAW_LENGTH,
  CONFIRM_TOKEN_TTL_MS,
  generateConfirmToken,
  hashConfirmToken,
  isValidConfirmTokenHashFormat,
  isValidRawConfirmTokenFormat,
} from "@/lib/websiteForms/confirmToken";

describe("confirmToken", () => {
  it("generateConfirmToken liefert base64url-Klartext, hex-Hash und TTL", () => {
    const before = Date.now();
    const t = generateConfirmToken();
    const after = Date.now();

    expect(t.raw).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(t.raw.length).toBe(CONFIRM_TOKEN_RAW_LENGTH);
    expect(t.hash).toMatch(/^[a-f0-9]+$/);
    expect(t.hash.length).toBe(CONFIRM_TOKEN_HASH_LENGTH);
    expect(t.expiresAt.getTime()).toBeGreaterThanOrEqual(before + CONFIRM_TOKEN_TTL_MS - 5);
    expect(t.expiresAt.getTime()).toBeLessThanOrEqual(after + CONFIRM_TOKEN_TTL_MS + 5);
  });

  it("hashConfirmToken ist deterministisch und SHA-256-Hex", () => {
    const a = hashConfirmToken("hello");
    const b = hashConfirmToken("hello");
    expect(a).toBe(b);
    // Bekannter SHA-256-Hash von "hello"
    expect(a).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  it("zwei generierte Tokens sind unterschiedlich (mit hoher Wahrscheinlichkeit)", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      seen.add(generateConfirmToken().raw);
    }
    expect(seen.size).toBe(50);
  });

  it("isValidRawConfirmTokenFormat akzeptiert nur exakt-43-Zeichen base64url", () => {
    const t = generateConfirmToken();
    expect(isValidRawConfirmTokenFormat(t.raw)).toBe(true);
    expect(isValidRawConfirmTokenFormat("")).toBe(false);
    expect(isValidRawConfirmTokenFormat("kurz")).toBe(false);
    expect(isValidRawConfirmTokenFormat("x".repeat(44))).toBe(false);
    expect(isValidRawConfirmTokenFormat("/".repeat(43))).toBe(false); // ungültiges Zeichen
    expect(isValidRawConfirmTokenFormat(null)).toBe(false);
    expect(isValidRawConfirmTokenFormat(123)).toBe(false);
  });

  it("isValidConfirmTokenHashFormat akzeptiert nur exakt-64-Zeichen Hex", () => {
    expect(isValidConfirmTokenHashFormat(hashConfirmToken("a"))).toBe(true);
    expect(isValidConfirmTokenHashFormat("ABCD")).toBe(false);
    expect(isValidConfirmTokenHashFormat("g".repeat(64))).toBe(false);
  });
});
