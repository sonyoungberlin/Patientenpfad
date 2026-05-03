/**
 * Phase 3b: Tests für lib/websiteForms/validateForm.ts.
 *
 * Pure Funktion ohne Seiteneffekte.
 */

import { validateWebsiteFormInput } from "@/lib/websiteForms/validateForm";

const VALID_BLOCK = "ARBEITSUNFAEHIGKEIT";

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    title: "Mein Formular",
    slug: "praxis-mueller",
    intro_text: "Bitte ausfüllen.",
    selected_block_ids: [VALID_BLOCK],
    ...overrides,
  };
}

describe("validateWebsiteFormInput", () => {
  it("akzeptiert vollständige, gültige Eingabe", () => {
    const r = validateWebsiteFormInput(baseInput());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({
        title: "Mein Formular",
        slug: "praxis-mueller",
        intro_text: "Bitte ausfüllen.",
        selected_block_ids: [VALID_BLOCK],
        is_active: true,
      });
    }
  });

  it("trimmt Titel und meldet leeren Titel als Fehler", () => {
    const r = validateWebsiteFormInput(baseInput({ title: "   " }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.title).toBeTruthy();
  });

  it("lehnt zu langen Titel ab", () => {
    const r = validateWebsiteFormInput(baseInput({ title: "x".repeat(121) }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.title).toBeTruthy();
  });

  it("setzt intro_text auf null wenn leer/whitespace", () => {
    const r = validateWebsiteFormInput(baseInput({ intro_text: "   " }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.intro_text).toBeNull();
  });

  it("akzeptiert fehlendes intro_text als null", () => {
    const r = validateWebsiteFormInput({
      title: "T",
      slug: "abc-def",
      selected_block_ids: [VALID_BLOCK],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.intro_text).toBeNull();
  });

  it("lehnt zu langen intro_text ab", () => {
    const r = validateWebsiteFormInput(
      baseInput({ intro_text: "x".repeat(2001) }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.intro_text).toBeTruthy();
  });

  it("meldet Fehler wenn selected_block_ids kein Array", () => {
    const r = validateWebsiteFormInput(
      baseInput({ selected_block_ids: VALID_BLOCK }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.selected_block_ids).toBeTruthy();
  });

  it("meldet Fehler bei leerem Block-Array", () => {
    const r = validateWebsiteFormInput(baseInput({ selected_block_ids: [] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.selected_block_ids).toBeTruthy();
  });

  it("filtert unbekannte Block-IDs heraus, akzeptiert wenn min. 1 gültig", () => {
    const r = validateWebsiteFormInput(
      baseInput({ selected_block_ids: [VALID_BLOCK, "UNBEKANNT"] }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.selected_block_ids).toEqual([VALID_BLOCK]);
  });

  it("dedupliziert Block-IDs und behält die erste Reihenfolge bei", () => {
    const r = validateWebsiteFormInput(
      baseInput({
        selected_block_ids: [VALID_BLOCK, "REZEPT", VALID_BLOCK],
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.selected_block_ids).toEqual([VALID_BLOCK, "REZEPT"]);
  });

  it("meldet Fehler wenn alle Block-IDs unbekannt", () => {
    const r = validateWebsiteFormInput(
      baseInput({ selected_block_ids: ["UNBEKANNT_X", "UNBEKANNT_Y"] }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.selected_block_ids).toBeTruthy();
  });

  it("is_active default = true", () => {
    const r = validateWebsiteFormInput(baseInput());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.is_active).toBe(true);
  });

  it("is_active aus String 'on' wird true", () => {
    const r = validateWebsiteFormInput(baseInput({ is_active: "on" }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.is_active).toBe(true);
  });

  it("is_active explizit false bleibt false", () => {
    const r = validateWebsiteFormInput(baseInput({ is_active: false }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.is_active).toBe(false);
  });

  it("meldet Slug-Fehler bei ungültigem Slug", () => {
    const r = validateWebsiteFormInput(baseInput({ slug: "Bad_Slug" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.slug).toBeTruthy();
  });

  it("meldet Slug-Fehler bei reserviertem Slug", () => {
    const r = validateWebsiteFormInput(baseInput({ slug: "admin" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.slug).toMatch(/reserviert/i);
  });
});
