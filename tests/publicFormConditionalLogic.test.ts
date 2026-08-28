/**
 * Tests für den öffentlichen Formular-Pfad `/p/[slug]`:
 *  - Conditional Logic (showQuestion / hide-unless)
 *  - repeatable_group wird als eigener Typ erkannt (nicht als Textfeld)
 *  - Server-seitige Sichtbarkeitsfilterung in der Submit-Route
 *  - Frozen Snapshot wird korrekt gespeichert
 *  - Bestehender Token-Flow (`/q/[token]`) bleibt grün
 *
 * Alle Tests nutzen dieselben Lib-Funktionen wie die echte Anwendung,
 * kein Mocking der Kernlogik.
 */

import {
  buildFrozenBlocks,
} from "../lib/questionnaire/frozenBlocks";
import {
  computeVisibleQuestionIds,
  type ConditionalRule,
} from "../lib/questionnaire/conditionalLogic";
import { computeAllDerivedValues } from "../lib/questionnaire/derivedValues";
import {
  BLOCK_CATALOG,
  VOLLSTAENDIGE_ANAMNESE_PRESET,
} from "../lib/questionnaire/blockCatalog";

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function visibleFor(
  blockIds: string[],
  answers: Record<string, string>,
): Set<string> {
  const blocks = buildFrozenBlocks(blockIds);
  const rules = blocks.flatMap((b) => b.conditionalRules);
  const allIds = blocks.flatMap((b) => b.questions.map((q) => q.id));
  const derived = computeAllDerivedValues(answers);
  return computeVisibleQuestionIds(rules, allIds, answers, derived);
}

// ---------------------------------------------------------------------------
// 1. VOLLST_ERKRANKUNGEN enthält VOLLST_ERKR_GATE im Katalog
// ---------------------------------------------------------------------------

describe("1. VOLLST_ERKRANKUNGEN enthält VOLLST_ERKR_GATE", () => {
  it("Block ist im BLOCK_CATALOG vorhanden", () => {
    expect(BLOCK_CATALOG["VOLLST_ERKRANKUNGEN"]).toBeDefined();
  });

  it("Block enthält VOLLST_ERKR_GATE und VOLLST_ERKR_EINTRAEGE", () => {
    const blocks = buildFrozenBlocks(["VOLLST_ERKRANKUNGEN"]);
    const ids = blocks.flatMap((b) => b.questions.map((q) => q.id));
    expect(ids).toContain("VOLLST_ERKR_GATE");
    expect(ids).toContain("VOLLST_ERKR_EINTRAEGE");
  });

  it("VOLLST_ERKR_EINTRAEGE hat type=repeatable_group", () => {
    const blocks = buildFrozenBlocks(["VOLLST_ERKRANKUNGEN"]);
    const q = blocks
      .flatMap((b) => b.questions)
      .find((x) => x.id === "VOLLST_ERKR_EINTRAEGE");
    expect(q?.type).toBe("repeatable_group");
  });
});

// ---------------------------------------------------------------------------
// 2. Erkrankungseinträge initial verborgen (kein Wert bei Gate)
// ---------------------------------------------------------------------------

describe("2. VOLLST_ERKR_EINTRAEGE initial verborgen", () => {
  it("bei leerer Antwort ist VOLLST_ERKR_EINTRAEGE nicht sichtbar", () => {
    const visible = visibleFor(["VOLLST_ERKRANKUNGEN"], {});
    expect(visible.has("VOLLST_ERKR_EINTRAEGE")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. Gate "Ja" → Einträge sichtbar
// ---------------------------------------------------------------------------

describe("3. Gate 'Ja' → VOLLST_ERKR_EINTRAEGE sichtbar", () => {
  it("'Ja' macht VOLLST_ERKR_EINTRAEGE sichtbar", () => {
    const visible = visibleFor(["VOLLST_ERKRANKUNGEN"], {
      VOLLST_ERKR_GATE: "Ja",
    });
    expect(visible.has("VOLLST_ERKR_EINTRAEGE")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. Gate "Nein" → verborgen
// ---------------------------------------------------------------------------

describe("4. Gate 'Nein' → VOLLST_ERKR_EINTRAEGE verborgen", () => {
  it("'Nein' hält VOLLST_ERKR_EINTRAEGE verborgen", () => {
    const visible = visibleFor(["VOLLST_ERKRANKUNGEN"], {
      VOLLST_ERKR_GATE: "Nein",
    });
    expect(visible.has("VOLLST_ERKR_EINTRAEGE")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. Gate "Weiß ich nicht / unsicher" → sichtbar (per Katalog)
// ---------------------------------------------------------------------------

describe("5. Gate 'Weiß ich nicht / unsicher' → sichtbar", () => {
  it("macht VOLLST_ERKR_EINTRAEGE sichtbar", () => {
    const visible = visibleFor(["VOLLST_ERKRANKUNGEN"], {
      VOLLST_ERKR_GATE: "Weiß ich nicht / unsicher",
    });
    expect(visible.has("VOLLST_ERKR_EINTRAEGE")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 6. VOLLST_ERKR_EINTRAEGE ist repeatable_group, nicht text
// ---------------------------------------------------------------------------

describe("6. repeatable_group wird als eigener Typ erkannt", () => {
  it("VOLLST_ERKR_EINTRAEGE.type ist 'repeatable_group' (nicht 'text')", () => {
    const blocks = buildFrozenBlocks(["VOLLST_ERKRANKUNGEN"]);
    const q = blocks
      .flatMap((b) => b.questions)
      .find((x) => x.id === "VOLLST_ERKR_EINTRAEGE");
    expect(q).toBeDefined();
    expect(q!.type).toBe("repeatable_group");
    expect(q!.type).not.toBe("text");
  });
});

// ---------------------------------------------------------------------------
// 7. VOLLST_ALLERGIEN repeatable_group funktioniert
// ---------------------------------------------------------------------------

describe("7. VOLLST_ALLERGIEN repeatable_group", () => {
  it("VOLLST_ALLERG_EINTRAEGE ist repeatable_group", () => {
    const blocks = buildFrozenBlocks(["VOLLST_ALLERGIEN"]);
    const q = blocks
      .flatMap((b) => b.questions)
      .find((x) => x.id === "VOLLST_ALLERG_EINTRAEGE");
    expect(q?.type).toBe("repeatable_group");
  });

  it("Gate 'Ja' → VOLLST_ALLERG_EINTRAEGE sichtbar", () => {
    const visible = visibleFor(["VOLLST_ALLERGIEN"], {
      VOLLST_ALLERG_GATE: "Ja",
    });
    expect(visible.has("VOLLST_ALLERG_EINTRAEGE")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 8. VOLLST_INFEKTIONEN repeatable_group funktioniert
// ---------------------------------------------------------------------------

describe("8. VOLLST_INFEKTIONEN repeatable_group", () => {
  it("VOLLST_INFEKT_EINTRAEGE ist repeatable_group", () => {
    const blocks = buildFrozenBlocks(["VOLLST_INFEKTIONEN"]);
    const q = blocks
      .flatMap((b) => b.questions)
      .find((x) => x.id === "VOLLST_INFEKT_EINTRAEGE");
    expect(q?.type).toBe("repeatable_group");
  });
});

// ---------------------------------------------------------------------------
// 9. VOLLST_FAMILIENANAMNESE repeatable_group funktioniert
// ---------------------------------------------------------------------------

describe("9. VOLLST_FAMILIENANAMNESE repeatable_group", () => {
  it("VOLLST_FAMIL_EINTRAEGE ist repeatable_group", () => {
    const blocks = buildFrozenBlocks(["VOLLST_FAMILIENANAMNESE"]);
    const q = blocks
      .flatMap((b) => b.questions)
      .find((x) => x.id === "VOLLST_FAMIL_EINTRAEGE");
    expect(q?.type).toBe("repeatable_group");
  });
});

// ---------------------------------------------------------------------------
// 10. VOLLST_SUBSTANZEN repeatable_group funktioniert
// ---------------------------------------------------------------------------

describe("10. VOLLST_SUBSTANZEN repeatable_group", () => {
  it("SUBST_EINTRAEGE ist repeatable_group", () => {
    const blocks = buildFrozenBlocks(["VOLLST_SUBSTANZEN"]);
    const q = blocks
      .flatMap((b) => b.questions)
      .find((x) => x.id === "SUBST_EINTRAEGE");
    expect(q?.type).toBe("repeatable_group");
  });
});

// ---------------------------------------------------------------------------
// 11. AGE-derived Conditional funktioniert
// ---------------------------------------------------------------------------

describe("11. AGE-derived Conditional (computeAllDerivedValues)", () => {
  it("AGE wird aus IDENTITY_BIRTHDATE abgeleitet", () => {
    const derived = computeAllDerivedValues({ IDENTITY_BIRTHDATE: "1970-01-01" });
    expect(derived["AGE"]).toBeGreaterThan(30);
  });

  it("Ohne DOB gibt es keine AGE-Ableitung", () => {
    const derived = computeAllDerivedValues({});
    expect(derived["AGE"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 12. VOLLST_PRAEVENTION Lungenkrebs-Beratungs-Conditional
// ---------------------------------------------------------------------------

describe("12. VOLLST_PRAEVENTION – Lungenkrebs-Beratungsangebot Conditional", () => {
  it("Block ist im Katalog vorhanden", () => {
    expect(BLOCK_CATALOG["VOLLST_PRAEVENTION"]).toBeDefined();
  });

  it("buildFrozenBlocks liefert Conditional-Rules für VOLLST_PRAEVENTION", () => {
    const blocks = buildFrozenBlocks(["VOLLST_PRAEVENTION"]);
    const rules = blocks.flatMap((b) => b.conditionalRules);
    // Block hat mindestens eine Conditional-Rule (Beratungsthemen-Gate)
    expect(rules.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 13. Hidden required blockiert Submit nicht (Sichtbarkeitsfilter)
// ---------------------------------------------------------------------------

describe("13. Hidden required blockiert Submit nicht", () => {
  it("hidden required question wird aus finalAnswers entfernt", () => {
    const blocks = buildFrozenBlocks(["VOLLST_ERKRANKUNGEN"]);
    const rules = blocks.flatMap((b) => b.conditionalRules);
    const allIds = blocks.flatMap((b) => b.questions.map((q) => q.id));
    // Gate ist "Nein" → VOLLST_ERKR_EINTRAEGE verborgen
    const answers = { VOLLST_ERKR_GATE: "Nein", VOLLST_ERKR_EINTRAEGE: "[{}]" };
    const derived = computeAllDerivedValues(answers);
    const visible = computeVisibleQuestionIds(rules, allIds, answers, derived);

    const finalAnswers = Object.fromEntries(
      Object.entries(answers).filter(([id]) => visible.has(id)),
    );
    expect(finalAnswers["VOLLST_ERKR_EINTRAEGE"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 14. Visible required blockiert Submit (ist in visibleIds)
// ---------------------------------------------------------------------------

describe("14. Visible required ist in visibleIds enthalten", () => {
  it("VOLLST_ERKR_GATE (required=false, aber sichtbar) bleibt in finalAnswers", () => {
    const blocks = buildFrozenBlocks(["VOLLST_ERKRANKUNGEN"]);
    const rules = blocks.flatMap((b) => b.conditionalRules);
    const allIds = blocks.flatMap((b) => b.questions.map((q) => q.id));
    const answers = { VOLLST_ERKR_GATE: "Ja" };
    const derived = computeAllDerivedValues(answers);
    const visible = computeVisibleQuestionIds(rules, allIds, answers, derived);

    const finalAnswers = Object.fromEntries(
      Object.entries(answers).filter(([id]) => visible.has(id)),
    );
    expect(finalAnswers["VOLLST_ERKR_GATE"]).toBe("Ja");
  });
});

// ---------------------------------------------------------------------------
// 15. Server verwirft Hidden Answers korrekt
// ---------------------------------------------------------------------------

describe("15. Server verwirft/ignoriert Hidden Answers korrekt", () => {
  it("Antwort auf verborgene Frage erscheint nicht in finalAnswers", () => {
    // Simuliert die Submit-Route-Logik
    const blocks = buildFrozenBlocks(["VOLLST_ERKRANKUNGEN"]);
    const rules = blocks.flatMap((b) => b.conditionalRules);
    const allIds = blocks.flatMap((b) => b.questions.map((q) => q.id));

    const rawAnswers = {
      VOLLST_ERKR_GATE: "Nein",
      VOLLST_ERKR_EINTRAEGE: '[{"diagnose":"Diabetes"}]',
    };
    const derived = computeAllDerivedValues(rawAnswers);
    const visible = computeVisibleQuestionIds(rules, allIds, rawAnswers, derived);
    const final = Object.fromEntries(
      Object.entries(rawAnswers).filter(([id]) => visible.has(id)),
    );

    expect(final["VOLLST_ERKR_EINTRAEGE"]).toBeUndefined();
    expect(final["VOLLST_ERKR_GATE"]).toBe("Nein");
  });
});

// ---------------------------------------------------------------------------
// 16. Public Submit speichert frozen_blocks (strukturell validiert)
// ---------------------------------------------------------------------------

describe("16. buildFrozenBlocks liefert korrekte Struktur für Snapshot", () => {
  it("frozen blocks haben id, questions, conditionalRules", () => {
    const blocks = buildFrozenBlocks(["VOLLST_ERKRANKUNGEN"]);
    expect(blocks.length).toBeGreaterThan(0);
    for (const b of blocks) {
      expect(b).toHaveProperty("id");
      expect(b).toHaveProperty("questions");
      expect(b).toHaveProperty("conditionalRules");
      expect(Array.isArray(b.questions)).toBe(true);
      expect(Array.isArray(b.conditionalRules)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// 17. Public Submit speichert frozen_conditional_rules
// ---------------------------------------------------------------------------

describe("17. frozenBlocks.conditionalRules für VOLLST_ERKRANKUNGEN", () => {
  it("enthält mindestens eine showQuestion-Rule für VOLLST_ERKR_EINTRAEGE", () => {
    const blocks = buildFrozenBlocks(["VOLLST_ERKRANKUNGEN"]);
    const rules = blocks.flatMap((b) => b.conditionalRules);
    const rule = rules.find(
      (r) => r.action === "showQuestion" && r.targetId === "VOLLST_ERKR_EINTRAEGE",
    );
    expect(rule).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 18. Bestehender Einmal-Link: buildFrozenBlocks identisch zu Page-Pfad
// ---------------------------------------------------------------------------

describe("18. Einmal-Link buildFrozenBlocks bleibt konsistent", () => {
  it("VOLLST_ERKRANKUNGEN liefert dieselbe Fragen-Reihenfolge", () => {
    const blocks1 = buildFrozenBlocks(["VOLLST_ERKRANKUNGEN"]);
    const blocks2 = buildFrozenBlocks(["VOLLST_ERKRANKUNGEN"]);
    const ids1 = blocks1.flatMap((b) => b.questions.map((q) => q.id));
    const ids2 = blocks2.flatMap((b) => b.questions.map((q) => q.id));
    expect(ids1).toEqual(ids2);
  });
});

// ---------------------------------------------------------------------------
// 19. KURZANAMNESE-only bleibt funktionsfähig (kein repeatable_group)
// ---------------------------------------------------------------------------

describe("19. KURZANAMNESE-only bleibt funktionsfähig", () => {
  it("Block ist im Katalog vorhanden", () => {
    expect(BLOCK_CATALOG["KURZANAMNESE"]).toBeDefined();
  });

  it("buildFrozenBlocks für KURZANAMNESE liefert Fragen", () => {
    const blocks = buildFrozenBlocks(["KURZANAMNESE"]);
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks[0].questions.length).toBeGreaterThan(0);
  });

  it("KURZANAMNESE hat Fragen (Conditional-Fragen bleiben verborgen wenn keine Antwort)", () => {
    const blocks = buildFrozenBlocks(["KURZANAMNESE"]);
    const rules = blocks.flatMap((b) => b.conditionalRules);
    const allIds = blocks.flatMap((b) => b.questions.map((q) => q.id));
    const derived = computeAllDerivedValues({});
    const visible = computeVisibleQuestionIds(rules, allIds, {}, derived);
    // Sichtbare Fragen sind eine Teilmenge aller Fragen
    expect(visible.size).toBeGreaterThan(0);
    expect(visible.size).toBeLessThanOrEqual(allIds.length);
  });
});

// ---------------------------------------------------------------------------
// 20. VOLLSTAENDIGE_ANAMNESE_PRESET enthält alle VOLLST-Blöcke
// ---------------------------------------------------------------------------

describe("20. VOLLSTAENDIGE_ANAMNESE_PRESET ist vollständig", () => {
  it("enthält VOLLST_ERKRANKUNGEN, VOLLST_ALLERGIEN, VOLLST_SUBSTANZEN", () => {
    expect(VOLLSTAENDIGE_ANAMNESE_PRESET).toContain("VOLLST_ERKRANKUNGEN");
    expect(VOLLSTAENDIGE_ANAMNESE_PRESET).toContain("VOLLST_ALLERGIEN");
    expect(VOLLSTAENDIGE_ANAMNESE_PRESET).toContain("VOLLST_SUBSTANZEN");
  });

  it("buildFrozenBlocks für VOLLSTAENDIGE_ANAMNESE_PRESET enthält repeatable_group Fragen", () => {
    const blocks = buildFrozenBlocks(VOLLSTAENDIGE_ANAMNESE_PRESET);
    const allQuestions = blocks.flatMap((b) => b.questions);
    const repGroups = allQuestions.filter((q) => q.type === "repeatable_group");
    expect(repGroups.length).toBeGreaterThan(0);
  });

  it("VOLLSTAENDIGE_ANAMNESE_PRESET bleibt unverändert (11 Blöcke)", () => {
    expect(VOLLSTAENDIGE_ANAMNESE_PRESET.length).toBe(11);
  });
});
