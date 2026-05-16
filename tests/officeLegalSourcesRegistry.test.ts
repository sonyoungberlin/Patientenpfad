import {
  LEGAL_SOURCES,
  getLegalSource,
  isLegalSourceId,
  listLegalSources,
  type LegalSourceId,
} from "@/lib/office/legalSources";

describe("legalSources registry", () => {
  it("alle IDs sind eindeutig", () => {
    const ids = LEGAL_SOURCES.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("IDs enthalten keine Sonderzeichen", () => {
    for (const entry of LEGAL_SOURCES) {
      expect(entry.id).toMatch(/^[A-Z0-9_]+$/);
    }
  });

  it("listLegalSources liefert nichtleere Liste", () => {
    expect(listLegalSources().length).toBeGreaterThan(0);
  });

  it("isLegalSourceId und getLegalSource sind konsistent", () => {
    for (const entry of LEGAL_SOURCES) {
      expect(isLegalSourceId(entry.id)).toBe(true);
      expect(getLegalSource(entry.id as LegalSourceId).id).toBe(entry.id);
    }
    expect(isLegalSourceId("DOES_NOT_EXIST")).toBe(false);
  });

  it("sourceUrl verweist nur auf zugelassene offizielle Domains", () => {
    const allowedHosts = [
      "gesetze-im-internet.de",
      "eur-lex.europa.eu",
      "gesetze.berlin.de",
      "landesrecht.berlin.de",
      "datenschutz-berlin.de",
      "aekb.de",
      "kvberlin.de",
      "kbv.de",
    ];
    for (const entry of LEGAL_SOURCES) {
      if (!entry.sourceUrl) continue;
      const url = new URL(entry.sourceUrl);
      const matches = allowedHosts.some((host) => url.hostname.endsWith(host));
      if (!matches) {
        throw new Error(
          `LegalSource ${entry.id} hat unerlaubte sourceUrl ${entry.sourceUrl}`,
        );
      }
    }
  });
});
