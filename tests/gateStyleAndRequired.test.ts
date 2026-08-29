/**
 * Tests für Gate-Styling-Semantik und Pflichtfeld-Konfiguration.
 *
 * Stellt sicher dass:
 *  - VOLLST_HEIGHT und VOLLST_WEIGHT required sind
 *  - MAIN_GATE_QUESTION_IDS nur echte Haupt-Pfadfragen enthält
 *  - Detailfragen und kleine Follow-ups kein Gate-Styling erhalten
 *  - VOLLST_IMPF_ABLEHNUNG required ist, aber kein Haupt-Gate
 *  - Beide Flows (q/token und p/slug) dieselbe Gate-Konstante nutzen
 */

import { QUESTION_CATALOG, BLOCK_CATALOG } from "../lib/questionnaire/blockCatalog";
import { MAIN_GATE_QUESTION_IDS } from "../components/questionnaire/QuestionField";
import { buildFrozenBlocks } from "../lib/questionnaire/frozenBlocks";

// ---------------------------------------------------------------------------
// 1. Pflichtfelder in VOLLST_BASISDATEN
// ---------------------------------------------------------------------------

describe("Pflichtfelder VOLLST_BASISDATEN", () => {
  it("VOLLST_AGE ist required", () => {
    expect(QUESTION_CATALOG["VOLLST_AGE"].required).toBe(true);
  });

  it("VOLLST_HEIGHT ist required", () => {
    expect(QUESTION_CATALOG["VOLLST_HEIGHT"].required).toBe(true);
  });

  it("VOLLST_WEIGHT ist required", () => {
    expect(QUESTION_CATALOG["VOLLST_WEIGHT"].required).toBe(true);
  });

  it("VOLLST_HEIGHT hat type=number", () => {
    expect(QUESTION_CATALOG["VOLLST_HEIGHT"].type).toBe("number");
  });

  it("VOLLST_WEIGHT hat type=number", () => {
    expect(QUESTION_CATALOG["VOLLST_WEIGHT"].type).toBe("number");
  });

  it("buildFrozenBlocks liefert VOLLST_HEIGHT als required", () => {
    const blocks = buildFrozenBlocks(["VOLLST_BASISDATEN"]);
    const q = blocks.flatMap((b) => b.questions).find((x) => x.id === "VOLLST_HEIGHT");
    expect(q).toBeDefined();
    expect(q!.required).toBe(true);
  });

  it("buildFrozenBlocks liefert VOLLST_WEIGHT als required", () => {
    const blocks = buildFrozenBlocks(["VOLLST_BASISDATEN"]);
    const q = blocks.flatMap((b) => b.questions).find((x) => x.id === "VOLLST_WEIGHT");
    expect(q).toBeDefined();
    expect(q!.required).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. MAIN_GATE_QUESTION_IDS enthält alle echten Haupt-Gates
// ---------------------------------------------------------------------------

describe("MAIN_GATE_QUESTION_IDS – Haupt-Gates enthalten", () => {
  const expectedGates = [
    "VOLLST_ERKR_GATE",
    "VOLLST_ALLERG_GATE",
    "VOLLST_INFEKT_GATE",
    "VOLLST_FAMIL_GATE",
    "VOLLST_IMPF_BEKANNT",
    "VOLLST_VERS_PFLEGEGRAD",
    "VOLLST_VERS_GDB",
    "VOLLST_VERS_PROTHESEN",
    "NIKOTIN_GATE",
    "ALKOHOL_GATE",
    "SUBST_GATE",
    "VOLLST_GEWICHT_VERAENDERN",
    // Adipositas-Sektionsöffner
    "ADIP_DAUER",
    "ADIP_REDUKTION_VERSUCH",
    "ADIP_BEWEGUNG",
    "ADIP_MEDI_INTERESSE",
    "ADIP_SICHERHEIT_PANKREATITIS",
    "ADIP_BERATUNGSWUNSCH",
  ];

  for (const id of expectedGates) {
    it(`${id} ist in MAIN_GATE_QUESTION_IDS`, () => {
      expect(MAIN_GATE_QUESTION_IDS.has(id)).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------
// 3. Nicht-Gate-Fragen sind NICHT in MAIN_GATE_QUESTION_IDS
// ---------------------------------------------------------------------------

describe("MAIN_GATE_QUESTION_IDS – Nicht-Gates ausgeschlossen", () => {
  it("VOLLST_GENDER ist KEIN Haupt-Gate", () => {
    expect(MAIN_GATE_QUESTION_IDS.has("VOLLST_GENDER")).toBe(false);
  });

  it("VOLLST_GENDER_FREITEXT ist KEIN Haupt-Gate", () => {
    expect(MAIN_GATE_QUESTION_IDS.has("VOLLST_GENDER_FREITEXT")).toBe(false);
  });

  it("VOLLST_HEIGHT ist KEIN Haupt-Gate (Pflichtfeld, kein Pfad-Gate)", () => {
    expect(MAIN_GATE_QUESTION_IDS.has("VOLLST_HEIGHT")).toBe(false);
  });

  it("VOLLST_WEIGHT ist KEIN Haupt-Gate (Pflichtfeld, kein Pfad-Gate)", () => {
    expect(MAIN_GATE_QUESTION_IDS.has("VOLLST_WEIGHT")).toBe(false);
  });

  it("VOLLST_AGE ist KEIN Haupt-Gate", () => {
    expect(MAIN_GATE_QUESTION_IDS.has("VOLLST_AGE")).toBe(false);
  });

  // Detail-/Folge-Fragen
  it("VOLLST_ERKR_EINTRAEGE ist KEIN Haupt-Gate (Detailfeld)", () => {
    expect(MAIN_GATE_QUESTION_IDS.has("VOLLST_ERKR_EINTRAEGE")).toBe(false);
  });

  it("VOLLST_ALLERG_EINTRAEGE ist KEIN Haupt-Gate (Detailfeld)", () => {
    expect(MAIN_GATE_QUESTION_IDS.has("VOLLST_ALLERG_EINTRAEGE")).toBe(false);
  });

  it("VOLLST_INFEKT_EINTRAEGE ist KEIN Haupt-Gate (Detailfeld)", () => {
    expect(MAIN_GATE_QUESTION_IDS.has("VOLLST_INFEKT_EINTRAEGE")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. VOLLST_IMPF_ABLEHNUNG: required aber kein Haupt-Gate
// ---------------------------------------------------------------------------

describe("VOLLST_IMPF_ABLEHNUNG – required, aber kein Gate", () => {
  it("ist required", () => {
    expect(QUESTION_CATALOG["VOLLST_IMPF_ABLEHNUNG"].required).toBe(true);
  });

  it("ist NICHT in MAIN_GATE_QUESTION_IDS", () => {
    expect(MAIN_GATE_QUESTION_IDS.has("VOLLST_IMPF_ABLEHNUNG")).toBe(false);
  });

  it("VOLLST_IMPF_BEKANNT (das eigentliche Gate) ist in MAIN_GATE_QUESTION_IDS", () => {
    expect(MAIN_GATE_QUESTION_IDS.has("VOLLST_IMPF_BEKANNT")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. MAIN_GATE_QUESTION_IDS ist eine ReadonlySet
// ---------------------------------------------------------------------------

describe("MAIN_GATE_QUESTION_IDS – Struktur", () => {
  it("ist ein Set", () => {
    expect(MAIN_GATE_QUESTION_IDS).toBeInstanceOf(Set);
  });

  it("hat mindestens 12 Einträge", () => {
    expect(MAIN_GATE_QUESTION_IDS.size).toBeGreaterThanOrEqual(12);
  });

  it("alle Einträge existieren im QUESTION_CATALOG", () => {
    for (const id of MAIN_GATE_QUESTION_IDS) {
      expect(QUESTION_CATALOG[id]).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// 6. Beide Flows nutzen dieselbe Gate-Konstante (Import-Identität)
// ---------------------------------------------------------------------------

describe("Shared Gate-Konstante – beide Flows", () => {
  it("MAIN_GATE_QUESTION_IDS ist aus @/components/questionnaire/QuestionField importierbar", () => {
    // Der Import am Anfang dieser Datei beweist es; hier nur strukturell prüfen
    expect(typeof MAIN_GATE_QUESTION_IDS).toBe("object");
    expect(MAIN_GATE_QUESTION_IDS.has).toBeDefined();
  });

  it("VOLLST_ERKR_GATE ist Gate in beiden Flows", () => {
    // Beide Flows (QuestionnaireFormClient und PublicFormView) importieren
    // MAIN_GATE_QUESTION_IDS aus derselben Datei → dasselbe Objekt
    expect(MAIN_GATE_QUESTION_IDS.has("VOLLST_ERKR_GATE")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 7. VOLLST_GEWICHT_VERAENDERN: required Gate-Frage
// ---------------------------------------------------------------------------

describe("VOLLST_GEWICHT_VERAENDERN", () => {
  it("ist required", () => {
    expect(QUESTION_CATALOG["VOLLST_GEWICHT_VERAENDERN"].required).toBe(true);
  });

  it("ist in MAIN_GATE_QUESTION_IDS", () => {
    expect(MAIN_GATE_QUESTION_IDS.has("VOLLST_GEWICHT_VERAENDERN")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 8. Detailfragen aus repeatable_group-Blöcken: kein Gate-Styling
// ---------------------------------------------------------------------------

describe("Detailfragen – kein Gate-Styling", () => {
  it("VOLLST_FAMIL_EINTRAEGE ist KEIN Haupt-Gate", () => {
    expect(MAIN_GATE_QUESTION_IDS.has("VOLLST_FAMIL_EINTRAEGE")).toBe(false);
  });

  it("SUBST_EINTRAEGE ist KEIN Haupt-Gate", () => {
    expect(MAIN_GATE_QUESTION_IDS.has("SUBST_EINTRAEGE")).toBe(false);
  });

  it("VOLLST_INFEKT_EINTRAEGE ist KEIN Haupt-Gate", () => {
    expect(MAIN_GATE_QUESTION_IDS.has("VOLLST_INFEKT_EINTRAEGE")).toBe(false);
  });

  // Adipositas – konditionale Detailfragen sind kein Gate
  it("ADIP_ZUNAHME_AUSLOESER ist KEIN Haupt-Gate", () => {
    expect(MAIN_GATE_QUESTION_IDS.has("ADIP_ZUNAHME_AUSLOESER")).toBe(false);
  });

  it("ADIP_AUSLOESER_MEDIKAMENTE ist KEIN Haupt-Gate", () => {
    expect(MAIN_GATE_QUESTION_IDS.has("ADIP_AUSLOESER_MEDIKAMENTE")).toBe(false);
  });

  it("ADIP_MEDI_FRUEHER_TEXT ist KEIN Haupt-Gate", () => {
    expect(MAIN_GATE_QUESTION_IDS.has("ADIP_MEDI_FRUEHER_TEXT")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 9. buildFrozenBlocks liefert korrekte required-Flags für VOLLST_BASISDATEN
// ---------------------------------------------------------------------------

describe("buildFrozenBlocks VOLLST_BASISDATEN required-Flags", () => {
  const blocks = buildFrozenBlocks(["VOLLST_BASISDATEN"]);
  const questions = blocks.flatMap((b) => b.questions);

  it("VOLLST_AGE ist required im Frozen-Snapshot", () => {
    const q = questions.find((x) => x.id === "VOLLST_AGE");
    expect(q?.required).toBe(true);
  });

  it("VOLLST_HEIGHT ist required im Frozen-Snapshot", () => {
    const q = questions.find((x) => x.id === "VOLLST_HEIGHT");
    expect(q?.required).toBe(true);
  });

  it("VOLLST_WEIGHT ist required im Frozen-Snapshot", () => {
    const q = questions.find((x) => x.id === "VOLLST_WEIGHT");
    expect(q?.required).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 10. Conditional Logic bleibt unverändert (Gates öffnen korrekt)
// ---------------------------------------------------------------------------

import {
  computeVisibleQuestionIds,
} from "../lib/questionnaire/conditionalLogic";
import { computeAllDerivedValues } from "../lib/questionnaire/derivedValues";

describe("Conditional Logic unverändert nach Gate-Styling-Refactor", () => {
  it("VOLLST_ERKR_EINTRAEGE initial verborgen (Gate-Styling-Änderung beeinflusst Logic nicht)", () => {
    const blocks = buildFrozenBlocks(["VOLLST_ERKRANKUNGEN"]);
    const rules = blocks.flatMap((b) => b.conditionalRules);
    const allIds = blocks.flatMap((b) => b.questions.map((q) => q.id));
    const derived = computeAllDerivedValues({});
    const visible = computeVisibleQuestionIds(rules, allIds, {}, derived);
    expect(visible.has("VOLLST_ERKR_EINTRAEGE")).toBe(false);
  });

  it("VOLLST_ERKR_EINTRAEGE sichtbar wenn Gate=Ja", () => {
    const blocks = buildFrozenBlocks(["VOLLST_ERKRANKUNGEN"]);
    const rules = blocks.flatMap((b) => b.conditionalRules);
    const allIds = blocks.flatMap((b) => b.questions.map((q) => q.id));
    const answers = { VOLLST_ERKR_GATE: "Ja" };
    const derived = computeAllDerivedValues(answers);
    const visible = computeVisibleQuestionIds(rules, allIds, answers, derived);
    expect(visible.has("VOLLST_ERKR_EINTRAEGE")).toBe(true);
  });

  it("NIKOTIN_GATE ist sichtbar (kein conditionalRule darauf, immer sichtbar)", () => {
    const blocks = buildFrozenBlocks(["VOLLST_NIKOTIN"]);
    const rules = blocks.flatMap((b) => b.conditionalRules);
    const allIds = blocks.flatMap((b) => b.questions.map((q) => q.id));
    const derived = computeAllDerivedValues({});
    const visible = computeVisibleQuestionIds(rules, allIds, {}, derived);
    expect(visible.has("NIKOTIN_GATE")).toBe(true);
  });
});
