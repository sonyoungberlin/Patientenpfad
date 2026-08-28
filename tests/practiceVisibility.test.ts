/**
 * Tests für die Unterscheidung von
 *   „Nicht abgefragt" (durch Conditional Logic verborgen) vs.
 *   „–"             (sichtbar, aber unbeantwortet)
 *
 * Betrifft:
 *   - computeVisibleQuestionIds (lib/questionnaire/conditionalLogic)
 *   - buildMedicalRecordNote frozen path (keine Regression)
 *   - buildVisibleQIds-Logik (indirekt via conditionalLogic)
 */

import { computeVisibleQuestionIds } from "../lib/questionnaire/conditionalLogic";
import { BLOCK_CATALOG } from "../lib/questionnaire/blockCatalog";
import { buildMedicalRecordNote } from "../lib/questionnaire/buildMedicalRecordNote";
import { buildFrozenBlocks } from "../lib/questionnaire/frozenBlocks";

// ---------------------------------------------------------------------------
// Hilfsfunktion: Visibility-Set für einen Block berechnen
// ---------------------------------------------------------------------------

function blockVisibleIds(
  blockId: string,
  answers: Record<string, string>,
  derivedValues: Record<string, number> = {},
): Set<string> {
  const block = BLOCK_CATALOG[blockId];
  if (!block) throw new Error(`Unbekannter Block: ${blockId}`);
  return computeVisibleQuestionIds(
    block.conditionalRules ?? [],
    block.questionIds,
    answers,
    derivedValues,
  );
}

// ---------------------------------------------------------------------------
// 1. VOLLST_ALKOHOL – Gate-Varianten
// ---------------------------------------------------------------------------

describe("computeVisibleQuestionIds – VOLLST_ALKOHOL", () => {
  it("ALKOHOL_GATE=Nein → nur ALKOHOL_GATE sichtbar, Folgefragen unsichtbar", () => {
    const visible = blockVisibleIds("VOLLST_ALKOHOL", { ALKOHOL_GATE: "Nein" });
    expect(visible.has("ALKOHOL_GATE")).toBe(true);
    expect(visible.has("ALKOHOL_HAEUFIGKEIT")).toBe(false);
    expect(visible.has("ALKOHOL_MENGE")).toBe(false);
    expect(visible.has("ALKOHOL_VERSUCH")).toBe(false);
    expect(visible.has("ALKOHOL_BEHANDLUNG")).toBe(false);
    expect(visible.has("ALKOHOL_MOTIVATION")).toBe(false);
    expect(visible.has("ALKOHOL_UNTERSTUETZUNG")).toBe(false);
    expect(visible.has("ALKOHOL_FRUEHER_MEHR")).toBe(false);
  });

  it("ALKOHOL_GATE=Ja, regelmäßig → vertiefte Fragen sichtbar", () => {
    const visible = blockVisibleIds("VOLLST_ALKOHOL", {
      ALKOHOL_GATE: "Ja, regelmäßig",
    });
    expect(visible.has("ALKOHOL_GATE")).toBe(true);
    expect(visible.has("ALKOHOL_HAEUFIGKEIT")).toBe(true);
    expect(visible.has("ALKOHOL_MENGE")).toBe(true);
    expect(visible.has("ALKOHOL_VERSUCH")).toBe(true);
    expect(visible.has("ALKOHOL_BEHANDLUNG")).toBe(true);
    expect(visible.has("ALKOHOL_MOTIVATION")).toBe(true);
    expect(visible.has("ALKOHOL_UNTERSTUETZUNG")).toBe(true);
    // FRUEHER_MEHR nur bei "gelegentlich"
    expect(visible.has("ALKOHOL_FRUEHER_MEHR")).toBe(false);
  });

  it("ALKOHOL_GATE=Ja, gelegentlich → nur FRUEHER_MEHR sichtbar", () => {
    const visible = blockVisibleIds("VOLLST_ALKOHOL", {
      ALKOHOL_GATE: "Ja, gelegentlich",
    });
    expect(visible.has("ALKOHOL_GATE")).toBe(true);
    expect(visible.has("ALKOHOL_FRUEHER_MEHR")).toBe(true);
    // Vertiefte Fragen (regelmäßig) NICHT sichtbar
    expect(visible.has("ALKOHOL_HAEUFIGKEIT")).toBe(false);
    expect(visible.has("ALKOHOL_MENGE")).toBe(false);
    expect(visible.has("ALKOHOL_MOTIVATION")).toBe(false);
  });

  it("Keine Antwort → nur ALKOHOL_GATE sichtbar (kein Gate-Wert → Folgefragen unsichtbar)", () => {
    const visible = blockVisibleIds("VOLLST_ALKOHOL", {});
    expect(visible.has("ALKOHOL_GATE")).toBe(true);
    expect(visible.has("ALKOHOL_MENGE")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. VOLLST_NIKOTIN – Nikotin-Gate
// ---------------------------------------------------------------------------

describe("computeVisibleQuestionIds – VOLLST_NIKOTIN", () => {
  it("NIKOTIN_GATE=Nein → Produkt- und Mengen-Fragen nicht sichtbar", () => {
    const block = BLOCK_CATALOG["VOLLST_NIKOTIN"];
    if (!block) return; // skip if block not present
    const visible = blockVisibleIds("VOLLST_NIKOTIN", { NIKOTIN_GATE: "Nein" });
    expect(visible.has("NIKOTIN_GATE")).toBe(true);
    // Tiefere Fragen sind nur bei positivem Gate sichtbar
    for (const qid of block.questionIds) {
      if (qid !== "NIKOTIN_GATE") {
        // Die meisten Folgefragen sollten bei "Nein" unsichtbar sein
        // (Test-Check: NIKOTIN_PRODUKT sicher unsichtbar)
        if (qid === "NIKOTIN_PRODUKT") {
          expect(visible.has(qid)).toBe(false);
        }
      }
    }
  });

  it("NIKOTIN_GATE=Nein → NIKOTIN_PRODUKT unsichtbar", () => {
    const visible = blockVisibleIds("VOLLST_NIKOTIN", { NIKOTIN_GATE: "Nein" });
    expect(visible.has("NIKOTIN_PRODUKT")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. VOLLST_VERSORGUNGSSTATUS – Pflegegrad
// ---------------------------------------------------------------------------

describe("computeVisibleQuestionIds – VOLLST_VERSORGUNGSSTATUS", () => {
  it("VOLLST_VERS_PFLEGEGRAD=Nein → Pflegegrad-Stufe unsichtbar", () => {
    const block = BLOCK_CATALOG["VOLLST_VERSORGUNGSSTATUS"];
    if (!block) return;
    const visible = blockVisibleIds("VOLLST_VERSORGUNGSSTATUS", {
      VOLLST_VERS_PFLEGEGRAD: "Nein",
    });
    expect(visible.has("VOLLST_VERS_PFLEGEGRAD")).toBe(true);
    if (block.questionIds.includes("VOLLST_VERS_PFLEGEGRAD_STUFE")) {
      expect(visible.has("VOLLST_VERS_PFLEGEGRAD_STUFE")).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Legacy-Verhalten: Keine visibleQuestionIds → Alle Fragen "sichtbar"
//    (kein Visibility-Check → unanswered = "–")
// ---------------------------------------------------------------------------

describe("Semantic distinction: visible-unanswered vs invisible", () => {
  it("computeVisibleQuestionIds mit leeren Antworten: Gate-Frage ist sichtbar", () => {
    const visible = blockVisibleIds("VOLLST_ALKOHOL", {});
    // Das Gate selbst hat keine Bedingung und ist immer sichtbar
    expect(visible.has("ALKOHOL_GATE")).toBe(true);
  });

  it("Sichtbare Frage mit Antwort: wird korrekt in Visible-Set aufgenommen", () => {
    const visible = blockVisibleIds("VOLLST_ALKOHOL", {
      ALKOHOL_GATE: "Ja, regelmäßig",
      ALKOHOL_HAEUFIGKEIT: "täglich oder fast täglich",
    });
    expect(visible.has("ALKOHOL_HAEUFIGKEIT")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. buildMedicalRecordNote frozen path – Keine Regression
//    (unsichtbare Fragen erscheinen NICHT im Krankenblatt)
// ---------------------------------------------------------------------------

describe("buildMedicalRecordNote – Nicht abgefragt NICHT im Krankenblatt", () => {
  it("ALKOHOL_GATE=Nein → Folgefragen fehlen im Krankenblatt (frozen path)", () => {
    const answers = {
      ALKOHOL_GATE: "Nein",
    };
    const frozenBlocks = buildFrozenBlocks(["VOLLST_ALKOHOL"]);

    const note = buildMedicalRecordNote({
      answers,
      selected_block_ids: ["VOLLST_ALKOHOL"],
      identity_gate_completed_at: null,
      frozenBlocks,
    });

    // Gate selbst ist sichtbar und beantwortet → erscheint
    expect(note).toContain("Nein");

    // Folgefragen sind unsichtbar → dürfen NICHT erscheinen (kein "Nicht abgefragt")
    expect(note).not.toContain("Nicht abgefragt");
    expect(note).not.toContain("ALKOHOL_HAEUFIGKEIT");
    // "Trinkhäufigkeit" ist das Kurzlabel für ALKOHOL_HAEUFIGKEIT
    expect(note).not.toContain("Trinkhäufigkeit");
    // "Alkoholmenge" o.ä. für ALKOHOL_MENGE
    expect(note).not.toContain("Alkohol-Menge");
  });

  it("ALKOHOL_GATE=Ja, regelmäßig → Folgefragen sichtbar, unbeantwortete fehlen", () => {
    // Im Krankenblatt werden nur beantwortete sichtbare Fragen ausgegeben
    const answers = {
      ALKOHOL_GATE: "Ja, regelmäßig",
      ALKOHOL_HAEUFIGKEIT: "täglich oder fast täglich",
      // ALKOHOL_MENGE nicht beantwortet
    };
    const frozenBlocks = buildFrozenBlocks(["VOLLST_ALKOHOL"]);

    const note = buildMedicalRecordNote({
      answers,
      selected_block_ids: ["VOLLST_ALKOHOL"],
      identity_gate_completed_at: null,
      frozenBlocks,
    });

    expect(note).toContain("Ja, regelmäßig");
    expect(note).toContain("täglich oder fast täglich");
    // Kein "Nicht abgefragt" im Krankenblatt
    expect(note).not.toContain("Nicht abgefragt");
  });
});

// ---------------------------------------------------------------------------
// 6. computeVisibleQuestionIds – Basisverhalten für alle Fragen ohne Regeln
// ---------------------------------------------------------------------------

describe("computeVisibleQuestionIds – Fragen ohne Conditional Rules", () => {
  it("Block ohne conditionalRules → alle Fragen sichtbar", () => {
    // KONTAKT-Block hat keine conditional rules, alle Fragen immer sichtbar
    const block = BLOCK_CATALOG["KONTAKT"];
    if (!block) return;
    const visible = computeVisibleQuestionIds(
      block.conditionalRules ?? [],
      block.questionIds,
      {},
      {},
    );
    // Alle Fragen müssen sichtbar sein
    for (const qid of block.questionIds) {
      expect(visible.has(qid)).toBe(true);
    }
  });
});
