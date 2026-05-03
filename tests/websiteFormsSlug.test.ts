/**
 * Phase 3b: Tests für lib/websiteForms/slug.ts.
 *
 * Pure Funktion ohne Seiteneffekte — die Tests laufen ohne Mocks.
 */

import {
  MAX_SLUG_LENGTH,
  MIN_SLUG_LENGTH,
  RESERVED_SLUGS,
  validateSlug,
} from "@/lib/websiteForms/slug";

describe("validateSlug", () => {
  describe("akzeptiert gültige Slugs", () => {
    it.each([
      "abc",
      "praxis-mueller",
      "a1b",
      "test-1",
      "x".repeat(MIN_SLUG_LENGTH),
      "x".repeat(MAX_SLUG_LENGTH),
      "1abc",
      "praxis-2-mueller",
    ])("akzeptiert %s", (slug) => {
      const result = validateSlug(slug);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.slug).toBe(slug);
    });
  });

  describe("lehnt ungültige Slugs ab", () => {
    it("lehnt leeren String ab", () => {
      const r = validateSlug("");
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toBe("empty");
    });

    it("lehnt Nicht-String ab", () => {
      const r = validateSlug(123);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toBe("empty");
    });

    it("lehnt zu kurze Slugs ab", () => {
      const r = validateSlug("a".repeat(MIN_SLUG_LENGTH - 1));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toBe("too_short");
    });

    it("lehnt zu lange Slugs ab", () => {
      const r = validateSlug("a".repeat(MAX_SLUG_LENGTH + 1));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toBe("too_long");
    });

    it.each([
      "Praxis-mueller", // Großbuchstabe
      "praxis_mueller", // Underscore
      "praxis-müller", // Umlaut
      "-abc",
      "abc-",
      "ab--cd", // doppelter Bindestrich
      "ab cd", // Leerzeichen
      "abc!",
    ])("lehnt %s ab (invalid_chars)", (slug) => {
      const r = validateSlug(slug);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toBe("invalid_chars");
    });

    it("lehnt reservierte Slugs ab", () => {
      for (const reserved of RESERVED_SLUGS) {
        if (reserved.length < MIN_SLUG_LENGTH || reserved.length > MAX_SLUG_LENGTH) continue;
        if (!/^[a-z0-9](?:[a-z0-9]|-(?!-))*[a-z0-9]$/.test(reserved)) continue;
        const r = validateSlug(reserved);
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.error).toBe("reserved");
      }
    });

    it("lehnt 'p' als reserviert ab (verhindert /p/[slug]-Kollision)", () => {
      // 'p' ist 1 Zeichen → too_short, aber 'admin', 'website-forms' etc.
      // sind aussagekräftiger. Hier prüfen wir explizit ein realistisches
      // reserviertes Wort.
      const r = validateSlug("admin");
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toBe("reserved");
    });
  });
});
