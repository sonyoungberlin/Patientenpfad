/**
 * Phase 3d: Tests für lib/websiteForms/submitRateLimit.ts.
 *
 * Best-effort, in-memory Sliding-Window. Tests stellen sicher, dass:
 *   - bis `max` Anfragen erlaubt sind,
 *   - die `max+1`-te im Fenster blockiert wird,
 *   - ältere Treffer aus dem Fenster wieder „freischalten".
 */

import {
  createRateLimiter,
  EMAIL_HASH_RATE_LIMIT,
  getClientIp,
  IP_SLUG_RATE_LIMIT,
} from "@/lib/websiteForms/submitRateLimit";

describe("createRateLimiter", () => {
  it("erlaubt bis max Treffer und blockt darüber hinaus", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 3 });
    expect(limiter.check("k").allowed).toBe(true);
    expect(limiter.check("k").allowed).toBe(true);
    expect(limiter.check("k").allowed).toBe(true);
    expect(limiter.check("k").allowed).toBe(false);
    expect(limiter.check("k").allowed).toBe(false);
  });

  it("isoliert Buckets pro Key", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("b").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
    expect(limiter.check("b").allowed).toBe(false);
  });

  it("verfallene Treffer schalten Slot wieder frei", () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 1 });
    const t0 = 1_000_000;
    expect(limiter.check("k", t0).allowed).toBe(true);
    expect(limiter.check("k", t0 + 500).allowed).toBe(false);
    // außerhalb des Fensters
    expect(limiter.check("k", t0 + 2000).allowed).toBe(true);
  });

  it("reset() leert alle Buckets", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
    limiter.check("k");
    expect(limiter.check("k").allowed).toBe(false);
    limiter.reset();
    expect(limiter.check("k").allowed).toBe(true);
  });
});

describe("Default-Konfigurationen", () => {
  it("IP_SLUG_RATE_LIMIT ist defensiv konservativ", () => {
    expect(IP_SLUG_RATE_LIMIT.max).toBeGreaterThanOrEqual(1);
    expect(IP_SLUG_RATE_LIMIT.max).toBeLessThanOrEqual(20);
    expect(IP_SLUG_RATE_LIMIT.windowMs).toBeGreaterThanOrEqual(60_000);
  });
  it("EMAIL_HASH_RATE_LIMIT ist defensiv konservativ", () => {
    expect(EMAIL_HASH_RATE_LIMIT.max).toBeGreaterThanOrEqual(1);
    expect(EMAIL_HASH_RATE_LIMIT.max).toBeLessThanOrEqual(10);
    expect(EMAIL_HASH_RATE_LIMIT.windowMs).toBeGreaterThanOrEqual(60_000);
  });
});

describe("getClientIp", () => {
  it("nimmt den ersten Eintrag von x-forwarded-for", () => {
    const h = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(getClientIp(h)).toBe("1.2.3.4");
  });
  it("Fallback x-real-ip", () => {
    const h = new Headers({ "x-real-ip": "9.9.9.9" });
    expect(getClientIp(h)).toBe("9.9.9.9");
  });
  it("Fallback 'unknown'", () => {
    expect(getClientIp(new Headers())).toBe("unknown");
  });
});
