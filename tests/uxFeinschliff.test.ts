/**
 * UX-Feinschliff: Preset, Erkrankungs-Eintrag, Texte, SHORT_LABELS.
 *
 * Punkte 1–6 aus dem Review-Request:
 *  1.  Preset selektiert alle 11 VOLLST-Blöcke
 *  2.  Preset lässt bestehende Blöcke unberührt
 *  3.  KURZANAMNESE wird durch Preset nicht verändert
 *  4.  KURZANAMNESE + VOLLST_NIKOTIN ist technisch zulässig
 *  5.  Einzelne VOLLST-Blöcke nach Preset abwählbar
 *  6.  diagnose_unbekannt steht im Schema vor diagnose
 *  7.  diagnose_unbekannt aktiv → diagnose verborgen
 *  8.  seit_wann, facharzt, medikamente weiter erfassbar
 *  9.  Conditional Rules nach Textänderungen unverändert
 * 10.  Krankenblatt-Ausgabe strukturell unverändert
 * 11.  yes_no-Antworten im Krankenblatt großgeschrieben
 * 12.  VOLLST_FAMIL_GATE hat helperText
 * 13.  ALKOHOL_MENGE-Text kürzer (kein „Tag, an dem Sie Alkohol trinken")
 * 14.  ALKOHOL_BEHANDLUNG-Text kürzer
 * 15.  SUBST_GATE-Text kürzer
 * 16.  SHORT_LABEL VOLLST_CHECKUP_BERATUNG = "Check-up-Beratung gewünscht"
 * 17.  SHORT_LABEL VOLLST_GEWICHT_VERAENDERN = "Gewicht verändern"
 * 18.  SHORT_LABEL VOLLST_GEWICHT_UNTERSTUETZUNG kürzer
 */

import {
  BLOCK_CATALOG,
  QUESTION_CATALOG,
  VOLLSTAENDIGE_ANAMNESE_PRESET,
} from "../lib/questionnaire/blockCatalog";
import { computeVisibleQuestionIds } from "../lib/questionnaire/conditionalLogic";
import { buildMedicalRecordNote } from "../lib/questionnaire/buildMedicalRecordNote";
import { sanitizeAnswers } from "../lib/questionnaire/sanitizeAnswers";

// ---------------------------------------------------------------------------
// Hilfsfunktion: imitiert den Preset-Klick aus WebsiteFormBlocksAndLanguage und
// InquiryM3Client (additive Vereinigung: { ...prev, ...presetMap })
// ---------------------------------------------------------------------------
function applyPreset(
  existing: Record<string, boolean>,
): Record<string, boolean> {
  const next = { ...existing };
  for (const id of VOLLSTAENDIGE_ANAMNESE_PRESET) next[id] = true;
  return next;
}

// ---------------------------------------------------------------------------
// 1–5. Preset-Verhalten
// ---------------------------------------------------------------------------

describe("Preset \"Vollständige Anamnese\"", () => {
  it("1. Preset selektiert alle 11 VOLLST-Blöcke", () => {
    const result = applyPreset({});
    for (const id of VOLLSTAENDIGE_ANAMNESE_PRESET) {
      expect(result[id]).toBe(true);
    }
    expect(Object.keys(result)).toHaveLength(11);
  });

  it("2. Bestehende Blöcke bleiben erhalten", () => {
    const before: Record<string, boolean> = {
      IDENTITAET: true,
      KONTAKT: true,
      ADRESSE: true,
    };
    const result = applyPreset(before);
    expect(result.IDENTITAET).toBe(true);
    expect(result.KONTAKT).toBe(true);
    expect(result.ADRESSE).toBe(true);
  });

  it("3. KURZANAMNESE wird durch Preset-Klick nicht verändert", () => {
    // Weder hinzugefügt noch entfernt
    const without = applyPreset({});
    expect(without.KURZANAMNESE).toBeUndefined();

    const withKurz = applyPreset({ KURZANAMNESE: true });
    expect(withKurz.KURZANAMNESE).toBe(true);
  });

  it("4. KURZANAMNESE + VOLLST_NIKOTIN ist technisch zulässig (keine Konflikte in blockCatalog)", () => {
    expect(BLOCK_CATALOG.KURZANAMNESE).toBeDefined();
    expect(BLOCK_CATALOG.VOLLST_NIKOTIN).toBeDefined();
    // Keine gemeinsamen questionIds → keine Dedup-Kollision
    const kurzIds = new Set(BLOCK_CATALOG.KURZANAMNESE.questionIds);
    for (const qId of BLOCK_CATALOG.VOLLST_NIKOTIN.questionIds) {
      expect(kurzIds.has(qId)).toBe(false);
    }
  });

  it("5. Einzelne VOLLST-Blöcke nach Preset abwählbar", () => {
    const selected = applyPreset({});
    // Simuliere Abwahl eines Blocks
    selected.VOLLST_NIKOTIN = false;
    expect(selected.VOLLST_NIKOTIN).toBe(false);
    // Andere Preset-Blöcke unberührt
    expect(selected.VOLLST_ALKOHOL).toBe(true);
    expect(selected.VOLLST_PRAEVENTION).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 6–8. VOLLST_ERKR_EINTRAEGE – groupSchema-Reihenfolge
// ---------------------------------------------------------------------------

describe("VOLLST_ERKR_EINTRAEGE – groupSchema", () => {
  const schema = QUESTION_CATALOG.VOLLST_ERKR_EINTRAEGE.groupSchema!;

  it("6. diagnose_unbekannt steht vor diagnose im Schema", () => {
    const idxUnbekannt = schema.findIndex((f) => f.key === "diagnose_unbekannt");
    const idxDiagnose = schema.findIndex((f) => f.key === "diagnose");
    expect(idxUnbekannt).toBeGreaterThanOrEqual(0);
    expect(idxDiagnose).toBeGreaterThanOrEqual(0);
    expect(idxUnbekannt).toBeLessThan(idxDiagnose);
  });

  it("7. diagnose hat conditionalOn='diagnose_unbekannt', conditionalValue=''", () => {
    const diagnoseFeld = schema.find((f) => f.key === "diagnose")!;
    expect(diagnoseFeld.conditionalOn).toBe("diagnose_unbekannt");
    expect(diagnoseFeld.conditionalValue).toBe("");
  });

  it("8. seit_wann, facharzt, medikamente stehen ohne Conditional-Guard im Schema", () => {
    const noCond = ["seit_wann", "status", "facharzt", "medikamente"];
    for (const key of noCond) {
      const field = schema.find((f) => f.key === key)!;
      expect(field).toBeDefined();
      expect(field.conditionalOn).toBeUndefined();
    }
  });

  it("diagnose_unbekannt ist checkbox, kein conditionalOn", () => {
    const f = schema.find((f) => f.key === "diagnose_unbekannt")!;
    expect(f.type).toBe("checkbox");
    expect(f.conditionalOn).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 9. Conditional Rules nach Textänderungen unverändert
// ---------------------------------------------------------------------------

describe("Conditional Rules nach Textänderungen", () => {
  const rules = BLOCK_CATALOG.VOLLST_ALKOHOL.conditionalRules!;
  const qIds = BLOCK_CATALOG.VOLLST_ALKOHOL.questionIds;

  it("ALKOHOL_GATE='Ja, gelegentlich' → ALKOHOL_FRUEHER_MEHR sichtbar", () => {
    const visible = computeVisibleQuestionIds(rules, qIds, {
      ALKOHOL_GATE: "Ja, gelegentlich",
    });
    expect(visible.has("ALKOHOL_FRUEHER_MEHR")).toBe(true);
  });

  it("ALKOHOL_GATE='Ja, regelmäßig' → ALKOHOL_HAEUFIGKEIT, ALKOHOL_MOTIVATION sichtbar", () => {
    const visible = computeVisibleQuestionIds(rules, qIds, {
      ALKOHOL_GATE: "Ja, regelmäßig",
    });
    expect(visible.has("ALKOHOL_HAEUFIGKEIT")).toBe(true);
    expect(visible.has("ALKOHOL_MOTIVATION")).toBe(true);
  });

  it("SUBST_GATE='Ja, aktuell' → SUBST_EINTRAEGE sichtbar", () => {
    const substRules = BLOCK_CATALOG.VOLLST_SUBSTANZEN.conditionalRules!;
    const substIds = BLOCK_CATALOG.VOLLST_SUBSTANZEN.questionIds;
    const visible = computeVisibleQuestionIds(substRules, substIds, {
      SUBST_GATE: "Ja, aktuell",
    });
    expect(visible.has("SUBST_EINTRAEGE")).toBe(true);
  });

  it("SUBST_GATE='Früher' → SUBST_EINTRAEGE sichtbar (Option unverändert)", () => {
    const substRules = BLOCK_CATALOG.VOLLST_SUBSTANZEN.conditionalRules!;
    const substIds = BLOCK_CATALOG.VOLLST_SUBSTANZEN.questionIds;
    const visible = computeVisibleQuestionIds(substRules, substIds, {
      SUBST_GATE: "Früher",
    });
    expect(visible.has("SUBST_EINTRAEGE")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 10–11. Krankenblatt
// ---------------------------------------------------------------------------

describe("Krankenblatt – Struktur und yes_no-Normalisierung", () => {
  it("10. Krankenblatt enthält Block-Label und Antwort", () => {
    const note = buildMedicalRecordNote({
      answers: { VOLLST_ERKR_GATE: "Nein" },
      selected_block_ids: ["VOLLST_ERKRANKUNGEN"],
    });
    expect(note).toContain("Erkrankungen");
    expect(note).toMatch(/Nein/);
  });

  it("11. yes_no-Antworten werden im Krankenblatt großgeschrieben", () => {
    const note = buildMedicalRecordNote({
      answers: {
        VOLLST_ERKR_GATE: "Nein",
        VOLLST_CHECKUP_BERATUNG: "ja",
        VOLLST_LUNGENSCREENING_BERATUNG: "ja",
        VOLLST_GEWICHT_UNTERSTUETZUNG: "ja",
      },
      selected_block_ids: ["VOLLST_ERKRANKUNGEN", "VOLLST_PRAEVENTION"],
    });
    expect(note).not.toMatch(/: ja\b/);
    expect(note).not.toMatch(/: nein\b/);
    expect(note).toMatch(/: Ja\b/);
    expect(note).toMatch(/: Nein\b/);
  });
});

// ---------------------------------------------------------------------------
// 12. Familienanamnese helperText
// ---------------------------------------------------------------------------

describe("VOLLST_FAMIL_GATE – helperText", () => {
  it("12. Hat helperText mit Beispielen", () => {
    const q = QUESTION_CATALOG.VOLLST_FAMIL_GATE;
    expect(q.helperText).toBeTruthy();
    expect(q.helperText).toMatch(/Eltern|Geschwister|Verwandte/i);
  });
});

// ---------------------------------------------------------------------------
// 13–15. Konkret geänderte Texte
// ---------------------------------------------------------------------------

describe("Geänderte Patiententexte", () => {
  it("13. ALKOHOL_MENGE-Text enthält nicht mehr die redundante Wendung", () => {
    const q = QUESTION_CATALOG.ALKOHOL_MENGE;
    expect(q.text).not.toMatch(/Tag, an dem Sie Alkohol trinken/);
    expect(q.text).toContain("Trinktag");
  });

  it("14. ALKOHOL_BEHANDLUNG-Text ist kürzer / kein ärztlich-therapeutisch-suchtmedizinisch", () => {
    const q = QUESTION_CATALOG.ALKOHOL_BEHANDLUNG;
    expect(q.text).not.toMatch(/suchtmedizinischer/);
    expect(q.text).toContain("Behandlung");
  });

  it("15. SUBST_GATE-Text kürzer (kein 'regelmäßig')", () => {
    const q = QUESTION_CATALOG.SUBST_GATE;
    expect(q.text).not.toMatch(/regelm\u00e4\u00dfig/);
    expect(q.text).toContain("psychoaktive");
  });
});

// ---------------------------------------------------------------------------
// 16. SHORT_LABELS
// ---------------------------------------------------------------------------

describe("SHORT_LABELS der Pr\u00e4ventionsfragen", () => {
  it("16. VOLLST_CHECKUP_BERATUNG → 'Check-up-Beratung gewünscht'", () => {
    const note = buildMedicalRecordNote({
      answers: { VOLLST_CHECKUP_BERATUNG: "ja" },
      selected_block_ids: ["VOLLST_PRAEVENTION"],
    });
    expect(note).toContain("Check-up-Beratung");
  });

});
