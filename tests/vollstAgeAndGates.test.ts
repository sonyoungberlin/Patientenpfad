/**
 * Tests für VOLLST_AGE, AGE-Fallback, Gate-required, VOLLST_ERKR_GATE-Erweiterung
 * und generische Gate-Erkennung via Conditional Rules.
 *
 * Abgedeckte Punkte (Ziel-Nummern aus Anforderung):
 *  1.  VOLLST_AGE allein → AGE korrekt
 *  2.  IDENTITY_BIRTHDATE hat Vorrang vor VOLLST_AGE
 *  3.  ungültiges VOLLST_AGE → kein AGE
 *  4.  leeres VOLLST_AGE → kein AGE
 *  5.  alle definierten Haupt-Gates sind required
 *  6.  VOLLST_AGE ist required
 *  7.  VOLLST_ERKR_GATE Typ = select, 3 Optionen
 *  8.  Ja → Detailgruppe sichtbar
 *  9.  Nein → verborgen
 * 10.  Weiß ich nicht / unsicher → sichtbar
 * 11.  Gate-Erkennung: VOLLST_ERKR_GATE ist Gate-Frage (in conditionalRules-Zielen)
 * 12.  Gate-Erkennung: VOLLST_ERKR_EINTRAEGE (repeatable_group) ist keine Gate-Frage
 * 13.  Präventionslogik unverändert (AGE aus Birthdate)
 * 14.  AGE aus VOLLST_AGE treibt Check-up-Schwelle
 * 15.  Regression: Phase-1-bis-6-Blöcke unverändert sichtbar
 */

import {
  BLOCK_CATALOG,
  QUESTION_CATALOG,
} from "../lib/questionnaire/blockCatalog";
import {
  computeAge,
  computeAllDerivedValues,
} from "../lib/questionnaire/derivedValues";
import {
  computeVisibleQuestionIds,
  type ConditionalRule,
  type ConditionGroup,
} from "../lib/questionnaire/conditionalLogic";

// ---------------------------------------------------------------------------
// Helper: alle questionIds aus Conditional Rules extrahieren
// ---------------------------------------------------------------------------

function collectConditionQuestionIds(cond: ConditionGroup): Set<string> {
  const ids = new Set<string>();
  if ("mode" in cond) {
    for (const c of cond.conditions) {
      for (const id of collectConditionQuestionIds(c)) ids.add(id);
    }
  } else if (cond.target.kind === "question") {
    ids.add(cond.target.questionId);
  }
  return ids;
}

function gateIdsFromRules(rules: ConditionalRule[]): Set<string> {
  const ids = new Set<string>();
  for (const rule of rules) {
    for (const id of collectConditionQuestionIds(rule.condition)) ids.add(id);
  }
  return ids;
}

// ---------------------------------------------------------------------------
// 1–4. AGE Derived Value Fallback
// ---------------------------------------------------------------------------

describe("computeAge – VOLLST_AGE Fallback", () => {
  it("1. VOLLST_AGE allein liefert AGE", () => {
    expect(computeAge({ VOLLST_AGE: "40" })).toBe(40);
  });

  it("2. IDENTITY_BIRTHDATE hat Vorrang vor VOLLST_AGE", () => {
    const answers = {
      IDENTITY_BIRTHDATE: "1980-01-01",
      VOLLST_AGE: "99",
    };
    const age = computeAge(answers, { today: new Date("2026-08-28") });
    expect(age).not.toBe(99);
    expect(age).toBe(46);
  });

  it("3. ungültiges VOLLST_AGE (Text) → kein AGE", () => {
    expect(computeAge({ VOLLST_AGE: "vierzig" })).toBeNull();
  });

  it("4. leeres VOLLST_AGE → kein AGE", () => {
    expect(computeAge({ VOLLST_AGE: "" })).toBeNull();
  });

  it("negativer VOLLST_AGE-Wert → kein AGE", () => {
    expect(computeAge({ VOLLST_AGE: "-5" })).toBeNull();
  });

  it("VOLLST_AGE = 0 → AGE = 0 (kein medizinischer Filter)", () => {
    expect(computeAge({ VOLLST_AGE: "0" })).toBe(0);
  });

  it("VOLLST_AGE treibt computeAllDerivedValues.AGE", () => {
    const dv = computeAllDerivedValues({ VOLLST_AGE: "35" });
    expect(dv.AGE).toBe(35);
  });
});

// ---------------------------------------------------------------------------
// 5–6. Gate-Fragen required
// ---------------------------------------------------------------------------

const EXPECTED_REQUIRED_GATES = [
  "VOLLST_AGE",
  "VOLLST_ERKR_GATE",
  "VOLLST_ALLERG_GATE",
  "VOLLST_INFEKT_GATE",
  "VOLLST_FAMIL_GATE",
  "VOLLST_IMPF_BEKANNT",
  "VOLLST_IMPF_NACHWEIS",
  "VOLLST_IMPF_ABLEHNUNG",
  "VOLLST_VERS_PFLEGEGRAD",
  "VOLLST_VERS_GDB",
  "VOLLST_VERS_PROTHESEN",
  "NIKOTIN_GATE",
  "ALKOHOL_GATE",
  "SUBST_GATE",
  "VOLLST_GEWICHT_VERAENDERN",
] as const;

describe("Gate-Fragen sind required", () => {
  for (const id of EXPECTED_REQUIRED_GATES) {
    it(`${id} required = true`, () => {
      expect(QUESTION_CATALOG[id]).toBeDefined();
      expect(QUESTION_CATALOG[id].required).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------
// 7. VOLLST_ERKR_GATE: Typ, Optionen
// ---------------------------------------------------------------------------

describe("VOLLST_ERKR_GATE Erweiterung", () => {
  const gate = QUESTION_CATALOG["VOLLST_ERKR_GATE"];

  it("7. Typ ist select", () => {
    expect(gate.type).toBe("select");
  });

  it("hat genau 3 Optionen", () => {
    expect(gate.options).toHaveLength(3);
  });

  it("enthält Option 'Weiß ich nicht / unsicher'", () => {
    expect(gate.options).toContain("Weiß ich nicht / unsicher");
  });
});

// ---------------------------------------------------------------------------
// 8–10. VOLLST_ERKR_EINTRAEGE Sichtbarkeit nach Gate-Wert
// ---------------------------------------------------------------------------

describe("VOLLST_ERKR_EINTRAEGE Sichtbarkeit", () => {
  const rules = BLOCK_CATALOG["VOLLST_ERKRANKUNGEN"].conditionalRules ?? [];
  const allIds = ["VOLLST_ERKR_GATE", "VOLLST_ERKR_EINTRAEGE"];

  it("8. Ja → VOLLST_ERKR_EINTRAEGE sichtbar", () => {
    const visible = computeVisibleQuestionIds(
      rules,
      allIds,
      { VOLLST_ERKR_GATE: "Ja" },
      {},
    );
    expect(visible.has("VOLLST_ERKR_EINTRAEGE")).toBe(true);
  });

  it("9. Nein → VOLLST_ERKR_EINTRAEGE verborgen", () => {
    const visible = computeVisibleQuestionIds(
      rules,
      allIds,
      { VOLLST_ERKR_GATE: "Nein" },
      {},
    );
    expect(visible.has("VOLLST_ERKR_EINTRAEGE")).toBe(false);
  });

  it("10. 'Weiß ich nicht / unsicher' → VOLLST_ERKR_EINTRAEGE sichtbar", () => {
    const visible = computeVisibleQuestionIds(
      rules,
      allIds,
      { VOLLST_ERKR_GATE: "Weiß ich nicht / unsicher" },
      {},
    );
    expect(visible.has("VOLLST_ERKR_EINTRAEGE")).toBe(true);
  });

  it("leer → VOLLST_ERKR_EINTRAEGE verborgen", () => {
    const visible = computeVisibleQuestionIds(
      rules,
      allIds,
      { VOLLST_ERKR_GATE: "" },
      {},
    );
    expect(visible.has("VOLLST_ERKR_EINTRAEGE")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 11–12. Generische Gate-Erkennung aus Conditional Rules
// ---------------------------------------------------------------------------

describe("Gate-Erkennung via collectConditionQuestionIds", () => {
  it("11. VOLLST_ERKR_GATE ist in den Gate-IDs des VOLLST_ERKRANKUNGEN-Blocks", () => {
    const rules = BLOCK_CATALOG["VOLLST_ERKRANKUNGEN"].conditionalRules ?? [];
    const gates = gateIdsFromRules(rules);
    expect(gates.has("VOLLST_ERKR_GATE")).toBe(true);
  });

  it("12. VOLLST_ERKR_EINTRAEGE (repeatable_group) ist NICHT in den Gate-IDs", () => {
    const rules = BLOCK_CATALOG["VOLLST_ERKRANKUNGEN"].conditionalRules ?? [];
    const gates = gateIdsFromRules(rules);
    expect(gates.has("VOLLST_ERKR_EINTRAEGE")).toBe(false);
  });

  it("VOLLST_ALLERG_GATE ist Gate-Frage in VOLLST_ALLERGIEN", () => {
    const rules = BLOCK_CATALOG["VOLLST_ALLERGIEN"].conditionalRules ?? [];
    const gates = gateIdsFromRules(rules);
    expect(gates.has("VOLLST_ALLERG_GATE")).toBe(true);
  });

  it("NIKOTIN_GATE ist Gate-Frage in VOLLST_NIKOTIN", () => {
    const rules = BLOCK_CATALOG["VOLLST_NIKOTIN"].conditionalRules ?? [];
    const gates = gateIdsFromRules(rules);
    expect(gates.has("NIKOTIN_GATE")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 13–14. Prävention: AGE aus VOLLST_AGE treibt Schwellen
// ---------------------------------------------------------------------------

describe("Prävention mit VOLLST_AGE als AGE-Quelle", () => {
  const praevRules = BLOCK_CATALOG["VOLLST_PRAEVENTION"].conditionalRules ?? [];
  const praevIds = BLOCK_CATALOG["VOLLST_PRAEVENTION"].questionIds ?? [];

  it("13. AGE < 35 aus VOLLST_AGE → Check-up-Status nicht sichtbar", () => {
    const dv = computeAllDerivedValues({ VOLLST_AGE: "34" });
    const visible = computeVisibleQuestionIds(praevRules, praevIds, {}, dv);
    expect(visible.has("VOLLST_CHECKUP_STATUS")).toBe(false);
  });

  it("14. AGE >= 35 aus VOLLST_AGE → Check-up-Status sichtbar", () => {
    const dv = computeAllDerivedValues({ VOLLST_AGE: "40" });
    const visible = computeVisibleQuestionIds(praevRules, praevIds, {}, dv);
    expect(visible.has("VOLLST_CHECKUP_STATUS")).toBe(true);
  });

  it("IDENTITY_BIRTHDATE mit Alter 40 → Check-up-Status sichtbar (Regression)", () => {
    const dv = computeAllDerivedValues(
      { IDENTITY_BIRTHDATE: "1986-01-01" },
      { today: new Date("2026-08-28") },
    );
    const visible = computeVisibleQuestionIds(praevRules, praevIds, {}, dv);
    expect(visible.has("VOLLST_CHECKUP_STATUS")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 15. Regression: VOLLST_AGE in VOLLST_BASISDATEN-Block
// ---------------------------------------------------------------------------

describe("VOLLST_AGE in VOLLST_BASISDATEN", () => {
  it("15. VOLLST_AGE ist in VOLLST_BASISDATEN.questionIds", () => {
    expect(BLOCK_CATALOG["VOLLST_BASISDATEN"].questionIds).toContain("VOLLST_AGE");
  });

  it("VOLLST_HEIGHT und VOLLST_WEIGHT weiterhin im Block", () => {
    const ids = BLOCK_CATALOG["VOLLST_BASISDATEN"].questionIds;
    expect(ids).toContain("VOLLST_HEIGHT");
    expect(ids).toContain("VOLLST_WEIGHT");
  });
});
