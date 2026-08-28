/**
 * Phase-3C-Tests: Basisdaten + Preset „Vollständige Anamnese".
 *
 * Abdeckung:
 *  VOLLST_BASISDATEN – Struktur
 *   1.  Block existiert mit displayOrder 135
 *   2.  questionIds enthält genau die 4 neuen Fragen
 *   3.  VOLLST_SEX: select, nicht required
 *   4.  VOLLST_GENDER: select, nicht required
 *   5.  VOLLST_GENDER_FREITEXT: text, nicht required
 *   6.  VOLLST_PRONOMEN: text, nicht required
 *   7.  Keine englischen Felder (text_en / options_en / helperText_en)
 *  VOLLST_BASISDATEN – Conditional Logic
 *   8.  Freitext zunächst verborgen (keine Gender-Antwort)
 *   9.  VOLLST_GENDER = "andere Geschlechtsidentität" → Freitext sichtbar
 *  10.  VOLLST_GENDER = "weiblich" → Freitext NICHT sichtbar
 *  11.  VOLLST_GENDER = "divers / nicht-binär" → Freitext NICHT sichtbar
 *  VOLLST_BASISDATEN – Sanitizer + Krankenblatt
 *  12.  Sanitizer speichert alle 4 Antworten
 *  13.  Krankenblatt enthält "Geschlecht bei Geburt"
 *  14.  Krankenblatt enthält Freitext-Antwort
 *  VOLLSTAENDIGE_ANAMNESE_PRESET – Inhalt
 *  15.  Enthält genau 10 Block-IDs
 *  16.  Alle 10 VOLLST_*-Blöcke enthalten
 *  17.  KURZANAMNESE nicht enthalten
 *  18.  IDENTITAET nicht enthalten
 *  19.  KONTAKT, ADRESSE, VERSICHERUNG nicht enthalten
 *  20.  AU / Rezept / Überweisung nicht enthalten
 *  21.  Alle Preset-Blöcke existieren im BLOCK_CATALOG
 *  22.  Kein Preset-Block ist EN-ready (→ Button bei EN deaktivierbar)
 *  BLOCK_IDS_SORTED – Reihenfolge
 *  23.  VOLLST_BASISDATEN (135) erscheint vor VOLLST_ERKRANKUNGEN (140)
 *  24.  VOLLST_BASISDATEN erscheint nach FACHAERZTE (130)
 *  REGRESSION
 *  25.  Phase-1: KURZANAMNESE conditionalRules vorhanden
 *  26.  Phase-2: VOLLST_ERKRANKUNGEN im BLOCK_CATALOG
 *  27.  Phase-3A: VOLLST_ALLERGIEN + VOLLST_IMPFSTATUS
 *  28.  Phase-3B: VOLLST_NIKOTIN + VOLLST_ALKOHOL + VOLLST_SUBSTANZEN
 *  29.  isBlockEnReady('KURZANAMNESE') === true (nicht durch Phase 3C verändert)
 */

import { sanitizeAnswers } from "@/lib/questionnaire/sanitizeAnswers";
import { buildMedicalRecordNote } from "@/lib/questionnaire/buildMedicalRecordNote";
import {
  QUESTION_CATALOG,
  BLOCK_CATALOG,
  BLOCK_IDS_SORTED,
  VOLLSTAENDIGE_ANAMNESE_PRESET,
} from "@/lib/questionnaire/blockCatalog";
import { computeVisibleQuestionIds } from "@/lib/questionnaire/conditionalLogic";
import { isBlockEnReady } from "@/lib/questionnaire/i18n";

// ---------------------------------------------------------------------------
// VOLLST_BASISDATEN – Struktur
// ---------------------------------------------------------------------------

describe("VOLLST_BASISDATEN \u2013 Blockstruktur", () => {
  const block = BLOCK_CATALOG.VOLLST_BASISDATEN;

  it("Block existiert im BLOCK_CATALOG", () => {
    expect(block).toBeDefined();
  });

  it("displayOrder ist 135", () => {
    expect(block.displayOrder).toBe(135);
  });

  it("questionIds enthält genau die 7 Basisdaten-Fragen (inkl. VOLLST_AGE)", () => {
    expect(block.questionIds).toEqual([
      "VOLLST_AGE",
      "VOLLST_SEX",
      "VOLLST_GENDER",
      "VOLLST_GENDER_FREITEXT",
      "VOLLST_PRONOMEN",
      "VOLLST_HEIGHT",
      "VOLLST_WEIGHT",
    ]);
  });

  it("VOLLST_SEX: select, nicht required", () => {
    const q = QUESTION_CATALOG.VOLLST_SEX;
    expect(q).toBeDefined();
    expect(q.type).toBe("select");
    expect(q.required).toBe(false);
    expect(Array.isArray(q.options)).toBe(true);
    expect(q.options!.length).toBeGreaterThanOrEqual(4);
  });

  it("VOLLST_GENDER: select, nicht required", () => {
    const q = QUESTION_CATALOG.VOLLST_GENDER;
    expect(q).toBeDefined();
    expect(q.type).toBe("select");
    expect(q.required).toBe(false);
    expect(q.options).toContain("andere Geschlechtsidentit\u00e4t");
  });

  it("VOLLST_GENDER_FREITEXT: text, nicht required", () => {
    const q = QUESTION_CATALOG.VOLLST_GENDER_FREITEXT;
    expect(q).toBeDefined();
    expect(q.type).toBe("text");
    expect(q.required).toBe(false);
  });

  it("VOLLST_PRONOMEN: text, nicht required, mit helperText", () => {
    const q = QUESTION_CATALOG.VOLLST_PRONOMEN;
    expect(q).toBeDefined();
    expect(q.type).toBe("text");
    expect(q.required).toBe(false);
    expect(q.helperText).toBeTruthy();
  });

  it("Keine englischen Felder auf neuen Questions", () => {
    for (const id of ["VOLLST_SEX", "VOLLST_GENDER", "VOLLST_GENDER_FREITEXT", "VOLLST_PRONOMEN"]) {
      const q = QUESTION_CATALOG[id];
      expect(q.text_en).toBeUndefined();
      expect(q.options_en).toBeUndefined();
      expect(q.helperText_en).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// VOLLST_BASISDATEN – Conditional Logic
// ---------------------------------------------------------------------------

describe("VOLLST_BASISDATEN \u2013 Conditional Logic (Freitext-Gender)", () => {
  const rules = BLOCK_CATALOG.VOLLST_BASISDATEN.conditionalRules ?? [];
  const allIds = BLOCK_CATALOG.VOLLST_BASISDATEN.questionIds;

  it("Freitext zun\u00e4chst verborgen (keine Antwort)", () => {
    const visible = computeVisibleQuestionIds(rules, allIds, {});
    expect(visible.has("VOLLST_GENDER_FREITEXT")).toBe(false);
  });

  it('"andere Geschlechtsidentit\u00e4t" \u2192 Freitext sichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, {
      VOLLST_GENDER: "andere Geschlechtsidentit\u00e4t",
    });
    expect(visible.has("VOLLST_GENDER_FREITEXT")).toBe(true);
  });

  it('"weiblich" \u2192 Freitext NICHT sichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, { VOLLST_GENDER: "weiblich" });
    expect(visible.has("VOLLST_GENDER_FREITEXT")).toBe(false);
  });

  it('"divers / nicht-bin\u00e4r" \u2192 Freitext NICHT sichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, {
      VOLLST_GENDER: "divers / nicht-bin\u00e4r",
    });
    expect(visible.has("VOLLST_GENDER_FREITEXT")).toBe(false);
  });

  it("VOLLST_SEX + VOLLST_GENDER + VOLLST_PRONOMEN immer sichtbar (keine conditionalRule)", () => {
    const visible = computeVisibleQuestionIds(rules, allIds, {});
    expect(visible.has("VOLLST_SEX")).toBe(true);
    expect(visible.has("VOLLST_GENDER")).toBe(true);
    expect(visible.has("VOLLST_PRONOMEN")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// VOLLST_BASISDATEN – Sanitizer + Krankenblatt
// ---------------------------------------------------------------------------

describe("VOLLST_BASISDATEN \u2013 Sanitizer + Krankenblatt", () => {
  const questions = [
    { id: "VOLLST_SEX" },
    { id: "VOLLST_GENDER" },
    { id: "VOLLST_GENDER_FREITEXT" },
    { id: "VOLLST_PRONOMEN" },
  ];

  it("Sanitizer speichert alle 4 Antworten", () => {
    const raw = {
      VOLLST_SEX: "weiblich",
      VOLLST_GENDER: "andere Geschlechtsidentit\u00e4t",
      VOLLST_GENDER_FREITEXT: "non-binary femme",
      VOLLST_PRONOMEN: "they/them",
    };
    const result = sanitizeAnswers(raw, questions);
    expect(result.VOLLST_SEX).toBe("weiblich");
    expect(result.VOLLST_GENDER).toBe("andere Geschlechtsidentit\u00e4t");
    expect(result.VOLLST_GENDER_FREITEXT).toBe("non-binary femme");
    expect(result.VOLLST_PRONOMEN).toBe("they/them");
  });

  it('Krankenblatt enth\u00e4lt "Geschlecht bei Geburt"', () => {
    const note = buildMedicalRecordNote({
      answers: { VOLLST_SEX: "m\u00e4nnlich" },
      selected_block_ids: ["VOLLST_BASISDATEN"],
    });
    expect(note).toContain("Geschlecht bei Geburt");
    expect(note).toContain("m\u00e4nnlich");
  });

  it("Krankenblatt enth\u00e4lt Freitext-Antwort bei anderer Geschlechtsidentit\u00e4t", () => {
    const note = buildMedicalRecordNote({
      answers: {
        VOLLST_GENDER: "andere Geschlechtsidentit\u00e4t",
        VOLLST_GENDER_FREITEXT: "agender",
      },
      selected_block_ids: ["VOLLST_BASISDATEN"],
    });
    expect(note).toContain("agender");
  });
});

// ---------------------------------------------------------------------------
// VOLLSTAENDIGE_ANAMNESE_PRESET – Inhalt
// ---------------------------------------------------------------------------

describe("VOLLSTAENDIGE_ANAMNESE_PRESET \u2013 Inhalt", () => {
  it("Enthält genau 11 Block-IDs (inkl. Phase 6 VOLLST_PRAEVENTION)", () => {
    expect(VOLLSTAENDIGE_ANAMNESE_PRESET).toHaveLength(11);
  });

  it.each([
    "VOLLST_BASISDATEN",
    "VOLLST_ERKRANKUNGEN",
    "VOLLST_ALLERGIEN",
    "VOLLST_INFEKTIONEN",
    "VOLLST_FAMILIENANAMNESE",
    "VOLLST_IMPFSTATUS",
    "VOLLST_VERSORGUNGSSTATUS",
    "VOLLST_NIKOTIN",
    "VOLLST_ALKOHOL",
    "VOLLST_SUBSTANZEN",
  ])("%s ist im Preset enthalten", (id) => {
    expect(VOLLSTAENDIGE_ANAMNESE_PRESET).toContain(id);
  });

  it("KURZANAMNESE nicht im Preset", () => {
    expect(VOLLSTAENDIGE_ANAMNESE_PRESET).not.toContain("KURZANAMNESE");
  });

  it("IDENTITAET nicht im Preset", () => {
    expect(VOLLSTAENDIGE_ANAMNESE_PRESET).not.toContain("IDENTITAET");
  });

  it.each(["KONTAKT", "ADRESSE", "VERSICHERUNG"])(
    "%s nicht im Preset",
    (id) => {
      expect(VOLLSTAENDIGE_ANAMNESE_PRESET).not.toContain(id);
    },
  );

  it.each(["ARBEITSUNFAEHIGKEIT", "REZEPT", "UEBERWEISUNG", "HEILMITTELVERORDNUNG", "TRANSPORT"])(
    "%s nicht im Preset",
    (id) => {
      expect(VOLLSTAENDIGE_ANAMNESE_PRESET).not.toContain(id);
    },
  );

  it("Alle Preset-Bl\u00f6cke existieren im BLOCK_CATALOG", () => {
    for (const id of VOLLSTAENDIGE_ANAMNESE_PRESET) {
      expect(BLOCK_CATALOG[id]).toBeDefined();
    }
  });

  it("Kein Preset-Block ist EN-ready (Button bei EN deaktivierbar)", () => {
    for (const id of VOLLSTAENDIGE_ANAMNESE_PRESET) {
      expect(isBlockEnReady(id)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// BLOCK_IDS_SORTED – Reihenfolge
// ---------------------------------------------------------------------------

describe("BLOCK_IDS_SORTED \u2013 Reihenfolge VOLLST_BASISDATEN", () => {
  it("VOLLST_BASISDATEN (135) erscheint vor VOLLST_ERKRANKUNGEN (140)", () => {
    const basidatenIdx = BLOCK_IDS_SORTED.indexOf("VOLLST_BASISDATEN");
    const erkrankungenIdx = BLOCK_IDS_SORTED.indexOf("VOLLST_ERKRANKUNGEN");
    expect(basidatenIdx).toBeGreaterThanOrEqual(0);
    expect(erkrankungenIdx).toBeGreaterThanOrEqual(0);
    expect(basidatenIdx).toBeLessThan(erkrankungenIdx);
  });

  it("VOLLST_BASISDATEN (135) erscheint nach FACHAERZTE (130)", () => {
    const fachaerzteIdx = BLOCK_IDS_SORTED.indexOf("FACHAERZTE");
    const basidatenIdx = BLOCK_IDS_SORTED.indexOf("VOLLST_BASISDATEN");
    expect(fachaerzteIdx).toBeGreaterThanOrEqual(0);
    expect(basidatenIdx).toBeGreaterThan(fachaerzteIdx);
  });
});

// ---------------------------------------------------------------------------
// REGRESSION
// ---------------------------------------------------------------------------

describe("Regression \u2013 Phase 1/2/3A/3B", () => {
  it("Phase-1: KURZANAMNESE hat conditionalRules", () => {
    expect((BLOCK_CATALOG.KURZANAMNESE.conditionalRules ?? []).length).toBeGreaterThan(0);
  });

  it("Phase-2: VOLLST_ERKRANKUNGEN im BLOCK_CATALOG", () => {
    expect(BLOCK_CATALOG.VOLLST_ERKRANKUNGEN).toBeDefined();
  });

  it("Phase-3A: VOLLST_ALLERGIEN und VOLLST_IMPFSTATUS", () => {
    expect(BLOCK_CATALOG.VOLLST_ALLERGIEN).toBeDefined();
    expect(BLOCK_CATALOG.VOLLST_IMPFSTATUS).toBeDefined();
  });

  it("Phase-3B: VOLLST_NIKOTIN, VOLLST_ALKOHOL, VOLLST_SUBSTANZEN", () => {
    expect(BLOCK_CATALOG.VOLLST_NIKOTIN).toBeDefined();
    expect(BLOCK_CATALOG.VOLLST_ALKOHOL).toBeDefined();
    expect(BLOCK_CATALOG.VOLLST_SUBSTANZEN).toBeDefined();
  });

  it("isBlockEnReady('KURZANAMNESE') === true (unver\u00e4ndert)", () => {
    expect(isBlockEnReady("KURZANAMNESE")).toBe(true);
  });

  it("isBlockEnReady('IDENTITAET') === true (unver\u00e4ndert)", () => {
    expect(isBlockEnReady("IDENTITAET")).toBe(true);
  });

  it("VOLLST_BASISDATEN ist nicht EN-ready (keine text_en vorhanden)", () => {
    expect(isBlockEnReady("VOLLST_BASISDATEN")).toBe(false);
  });
});
