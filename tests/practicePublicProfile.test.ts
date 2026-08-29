import {
  generateAvailablePublicSlug,
  normalizePublicPracticeSlug,
  resolvePracticeByPublicOrLegacySlug,
  validatePublicPracticeName,
} from "@/lib/practice/publicProfile";

describe("normalizePublicPracticeSlug", () => {
  it.each([
    ["Hausarztpraxis Müller & Schmidt", "hausarztpraxis-mueller-schmidt"],
    ["Ärzte für Öl & Übergewicht", "aerzte-fuer-oel-uebergewicht"],
    ["Clinique de Santé", "clinique-de-sante"],
    ["  Praxis   am   Markt  ", "praxis-am-markt"],
    ["---Praxis!!!Nord---", "praxis-nord"],
  ])("normalisiert %s", (input, expected) => {
    expect(normalizePublicPracticeSlug(input)).toBe(expected);
  });

  it("liefert für reine Sonderzeichen ein leeres Ergebnis", () => {
    expect(normalizePublicPracticeSlug(" & -- ")).toBe("");
    expect(validatePublicPracticeName(" & -- ").ok).toBe(false);
  });

  it("lehnt Namen ab, deren Ergebnis reserviert oder zu kurz ist", () => {
    expect(validatePublicPracticeName("Admin").ok).toBe(false);
    expect(validatePublicPracticeName("Dr.").ok).toBe(false);
  });
});

describe("generateAvailablePublicSlug", () => {
  it("vergibt deterministisch -2 und -3", async () => {
    const taken = new Set(["praxis-mueller", "praxis-mueller-2"]);
    await expect(
      generateAvailablePublicSlug("Praxis Müller", async (slug) => taken.has(slug)),
    ).resolves.toBe("praxis-mueller-3");
  });

  it("behandelt technische Practice-Slugs über denselben Kollisionscheck", async () => {
    const technicalSlugs = new Set(["praxis-am-markt"]);
    await expect(
      generateAvailablePublicSlug(
        "Praxis am Markt",
        async (slug) => technicalSlugs.has(slug),
      ),
    ).resolves.toBe("praxis-am-markt-2");
  });
});

describe("resolvePracticeByPublicOrLegacySlug", () => {
  it("bevorzugt den öffentlichen Slug", async () => {
    const findUnique = jest.fn().mockResolvedValueOnce({ id: "public" });
    await expect(
      resolvePracticeByPublicOrLegacySlug("praxis-am-markt", findUnique),
    ).resolves.toEqual({ id: "public" });
    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(findUnique).toHaveBeenCalledWith({ public_slug: "praxis-am-markt" });
  });

  it("fällt auf den technischen Slug zurück", async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "legacy" });
    await expect(
      resolvePracticeByPublicOrLegacySlug("legacy-praxis", findUnique),
    ).resolves.toEqual({ id: "legacy" });
    expect(findUnique).toHaveBeenNthCalledWith(2, { slug: "legacy-praxis" });
  });
});