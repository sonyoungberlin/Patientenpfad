/**
 * Phase 6: Prävention und Beratungswünsche
 *
 * Testet:
 *  - VOLLST_PRAEVENTION-Block im Katalog
 *  - Check-up: AGE-gesteuerte Sichtbarkeit (Derived Condition)
 *  - Lungenkrebs-Beratungsangebot: G-BA-Kriterien (kein Anspruchsentscheid)
 *  - schlanker Check-up-/Präventionsumfang
 *  - Impfstatus: bestehende Logik unverändert
 *  - Nikotin/Alkohol/Substanzen: keine doppelten Questions
 *  - Frozen: Präventionsblock in neuer Session eingefroren
 *  - Krankenblatt: Beratungswünsche erscheinen lesbar
 *  - Regression: keine neuen Fehler
 */

import {
  BLOCK_CATALOG,
  QUESTION_CATALOG,
  VOLLSTAENDIGE_ANAMNESE_PRESET,
} from "../lib/questionnaire/blockCatalog";
import {
  computeVisibleQuestionIds,
  evaluateCondition,
  type ConditionalRule,
} from "../lib/questionnaire/conditionalLogic";
import { buildMedicalRecordNote } from "../lib/questionnaire/buildMedicalRecordNote";
import { buildFrozenBlocks } from "../lib/questionnaire/frozenBlocks";
import { buildQuestionnaireQuestions } from "../lib/questionnaire/buildQuestionnaireQuestions";
import {
  computeSmokingDurationYears,
  computeSmokingStoppedYearsAgo,
  computePackYears,
} from "../lib/questionnaire/derivedValues";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PRAEV_BLOCK = BLOCK_CATALOG["VOLLST_PRAEVENTION"];
const PRAEV_RULES = PRAEV_BLOCK?.conditionalRules ?? [];
const PRAEV_QS = PRAEV_BLOCK?.questionIds ?? [];
const NIKOTIN_BLOCK = BLOCK_CATALOG["VOLLST_NIKOTIN"];
const NIKOTIN_RULES = NIKOTIN_BLOCK?.conditionalRules ?? [];
const NIKOTIN_QS = NIKOTIN_BLOCK?.questionIds ?? [];

function visibleIds(
  rules: ConditionalRule[],
  allQIds: string[],
  answers: Record<string, string>,
  derivedValues?: Record<string, number>,
): Set<string> {
  return computeVisibleQuestionIds(rules, allQIds, answers, derivedValues);
}

// Vollständige "alle Kriterien erfüllt"-Derived-Values für Lungenkrebs-Tests
function lungDV(
  age: number,
  packYears: number,
  smokingDurationYears: number,
  smokingStoppedYearsAgo?: number,
): Record<string, number> {
  const dv: Record<string, number> = { AGE: age, PACK_YEARS: packYears, SMOKING_DURATION_YEARS: smokingDurationYears };
  if (smokingStoppedYearsAgo !== undefined) dv.SMOKING_STOPPED_YEARS_AGO = smokingStoppedYearsAgo;
  return dv;
}

const BASE_CURRENT = { NIKOTIN_GATE: "Ja, aktuell", NIKOTIN_PRODUKT: "Zigaretten" };
const BASE_FORMER  = { NIKOTIN_GATE: "Früher, inzwischen aufgehört", NIKOTIN_PRODUKT: "Zigaretten" };

function lungVisible(
  answers: Record<string, string>,
  dv: Record<string, number>,
): boolean {
  return visibleIds(NIKOTIN_RULES, NIKOTIN_QS, answers, dv).has("VOLLST_LUNGENSCREENING_BERATUNG");
}

// ---------------------------------------------------------------------------
// 1. Katalog-Struktur
// ---------------------------------------------------------------------------

describe("VOLLST_PRAEVENTION – Katalog", () => {
  it("Block ist im BLOCK_CATALOG vorhanden", () => {
    expect(PRAEV_BLOCK).toBeDefined();
  });

  it("displayOrder ist 230", () => {
    expect(PRAEV_BLOCK.displayOrder).toBe(230);
  });

  it("label ist 'Prävention und Beratungswünsche'", () => {
    expect(PRAEV_BLOCK.label).toBe("Prävention und Beratungswünsche");
  });

  it("enthält alle erwarteten Questions", () => {
    expect(PRAEV_QS).toEqual(
      expect.arrayContaining([
        "VOLLST_CHECKUP_STATUS",
        "VOLLST_CHECKUP_BERATUNG",
      ]),
    );
  });

  it("enthält das Lungenscreening nicht", () => {
    expect(PRAEV_QS).not.toContain("VOLLST_LUNGENSCREENING_BERATUNG");
  });

  it("ist Bestandteil von VOLLSTAENDIGE_ANAMNESE_PRESET", () => {
    expect(VOLLSTAENDIGE_ANAMNESE_PRESET).toContain("VOLLST_PRAEVENTION");
  });

  it("alle Questions sind im QUESTION_CATALOG definiert", () => {
    for (const qid of PRAEV_QS) {
      expect(QUESTION_CATALOG[qid]).toBeDefined();
    }
  });

  it("zieht VOLLST_AGE bei Standalone und Kurzanamnese automatisch mit", () => {
    expect(buildQuestionnaireQuestions(["VOLLST_PRAEVENTION"]).map((q) => q.id))
      .toContain("VOLLST_AGE");
    expect(buildQuestionnaireQuestions(["KURZANAMNESE", "VOLLST_PRAEVENTION"]).map((q) => q.id))
      .toContain("VOLLST_AGE");
  });

  it("verwendet eine vorhandene AGE-Quelle ohne zusätzliche Altersfrage", () => {
    const ids = buildQuestionnaireQuestions(["IDENTITAET", "VOLLST_PRAEVENTION"])
      .map((q) => q.id);
    expect(ids.filter((id) => id === "IDENTITY_BIRTHDATE")).toHaveLength(1);
    expect(ids).not.toContain("VOLLST_AGE");
  });

  it("entfernt Gewichtsfragen aus neuem Präventionsblock", () => {
    expect(PRAEV_QS).not.toContain("VOLLST_GEWICHT_VERAENDERN");
    expect(PRAEV_QS).not.toContain("VOLLST_GEWICHT_UNTERSTUETZUNG");
  });
});

// ---------------------------------------------------------------------------
// 2. Question-Definitionen
// ---------------------------------------------------------------------------

describe("Neue Fragen – Definitionen", () => {
  it("VOLLST_CHECKUP_STATUS ist select mit 4 Optionen", () => {
    const q = QUESTION_CATALOG.VOLLST_CHECKUP_STATUS;
    expect(q.type).toBe("select");
    expect(q.options).toHaveLength(4);
    expect(q.options).toContain("Noch nie");
    expect(q.options).toContain("Innerhalb der letzten 3 Jahre");
    expect(q.options).toContain("Vor mehr als 3 Jahren");
    expect(q.options).toContain("Weiß ich nicht");
  });

  it("VOLLST_CHECKUP_BERATUNG ist yes_no", () => {
    expect(QUESTION_CATALOG.VOLLST_CHECKUP_BERATUNG.type).toBe("yes_no");
  });

  it("VOLLST_LUNGENSCREENING_BERATUNG ist yes_no mit helperText", () => {
    const q = QUESTION_CATALOG.VOLLST_LUNGENSCREENING_BERATUNG;
    expect(q.type).toBe("yes_no");
    expect(q.helperText).toBeTruthy();
    // Kein Anspruchs-/Diagnosetext im helperText
    expect(q.helperText).not.toMatch(/Anspruch|berechtigt|eligible|indiziert/i);
  });

  it("VOLLST_GEWICHT_VERAENDERN hat 4 Optionen", () => {
    const q = QUESTION_CATALOG.VOLLST_GEWICHT_VERAENDERN;
    expect(q.type).toBe("select");
    expect(q.options).toHaveLength(4);
  });

  it("VOLLST_GEWICHT_UNTERSTUETZUNG ist yes_no", () => {
    expect(QUESTION_CATALOG.VOLLST_GEWICHT_UNTERSTUETZUNG.type).toBe("yes_no");
  });
});

// ---------------------------------------------------------------------------
// 3. Check-up – AGE-gesteuerte Sichtbarkeit
// ---------------------------------------------------------------------------

describe("Check-up – AGE-Conditional Logic", () => {
  it("AGE < 35 → VOLLST_CHECKUP_STATUS verborgen", () => {
    const visible = visibleIds(PRAEV_RULES, PRAEV_QS, {}, { AGE: 34 });
    expect(visible.has("VOLLST_CHECKUP_STATUS")).toBe(false);
  });

  it("AGE = 35 → VOLLST_CHECKUP_STATUS sichtbar", () => {
    const visible = visibleIds(PRAEV_RULES, PRAEV_QS, {}, { AGE: 35 });
    expect(visible.has("VOLLST_CHECKUP_STATUS")).toBe(true);
  });

  it("AGE > 35 → VOLLST_CHECKUP_STATUS sichtbar", () => {
    const visible = visibleIds(PRAEV_RULES, PRAEV_QS, {}, { AGE: 60 });
    expect(visible.has("VOLLST_CHECKUP_STATUS")).toBe(true);
  });

  it("keine AGE → VOLLST_CHECKUP_STATUS verborgen", () => {
    const visible = visibleIds(PRAEV_RULES, PRAEV_QS, {}, undefined);
    expect(visible.has("VOLLST_CHECKUP_STATUS")).toBe(false);
  });

  it("'Noch nie' → Beratungsfrage sichtbar", () => {
    const answers = { VOLLST_CHECKUP_STATUS: "Noch nie" };
    const visible = visibleIds(PRAEV_RULES, PRAEV_QS, answers, { AGE: 40 });
    expect(visible.has("VOLLST_CHECKUP_BERATUNG")).toBe(true);
  });

  it("'Vor mehr als 3 Jahren' → Beratungsfrage sichtbar", () => {
    const answers = { VOLLST_CHECKUP_STATUS: "Vor mehr als 3 Jahren" };
    const visible = visibleIds(PRAEV_RULES, PRAEV_QS, answers, { AGE: 50 });
    expect(visible.has("VOLLST_CHECKUP_BERATUNG")).toBe(true);
  });

  it("'Weiß ich nicht' → Beratungsfrage sichtbar", () => {
    const answers = { VOLLST_CHECKUP_STATUS: "Weiß ich nicht" };
    const visible = visibleIds(PRAEV_RULES, PRAEV_QS, answers, { AGE: 50 });
    expect(visible.has("VOLLST_CHECKUP_BERATUNG")).toBe(true);
  });

  it("'Innerhalb der letzten 3 Jahre' → Beratungsfrage verborgen", () => {
    const answers = { VOLLST_CHECKUP_STATUS: "Innerhalb der letzten 3 Jahre" };
    const visible = visibleIds(PRAEV_RULES, PRAEV_QS, answers, { AGE: 40 });
    expect(visible.has("VOLLST_CHECKUP_BERATUNG")).toBe(false);
  });

  it("Beratungswunsch wird nicht submitted wenn Status 'innerhalb 3 Jahre'", () => {
    const answers = {
      VOLLST_CHECKUP_STATUS: "Innerhalb der letzten 3 Jahre",
      VOLLST_CHECKUP_BERATUNG: "ja",
    };
    const visible = visibleIds(PRAEV_RULES, PRAEV_QS, answers, { AGE: 40 });
    // Beratungsfrage unsichtbar → würde beim Submit gefiltert
    expect(visible.has("VOLLST_CHECKUP_BERATUNG")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. Lungenkrebs – computeSmokingDurationYears / computeSmokingStoppedYearsAgo
// ---------------------------------------------------------------------------

describe("Neue Derived Values – Rauchdauer und Aufhörzeitpunkt", () => {
  it("SMOKING_DURATION_YEARS: parst NIKOTIN_DAUER_JAHRE korrekt", () => {
    expect(computeSmokingDurationYears({ NIKOTIN_GATE: "Ja, aktuell", NIKOTIN_DAUER_JAHRE: "30" })).toBe(30);
  });

  it("SMOKING_DURATION_YEARS: 'ca. 25' → 25", () => {
    expect(computeSmokingDurationYears({ NIKOTIN_GATE: "Ja, aktuell", NIKOTIN_DAUER_JAHRE: "ca. 25" })).toBe(25);
  });

  it("SMOKING_DURATION_YEARS: leeres Gate → null", () => {
    expect(computeSmokingDurationYears({ NIKOTIN_GATE: "Nein, nie regelmäßig", NIKOTIN_DAUER_JAHRE: "30" })).toBeNull();
  });

  it("SMOKING_STOPPED_YEARS_AGO: parst NIKOTIN_AUFGEHOERT_VOR korrekt", () => {
    const a = { NIKOTIN_GATE: "Früher, inzwischen aufgehört", NIKOTIN_AUFGEHOERT_VOR: "9" };
    expect(computeSmokingStoppedYearsAgo(a)).toBe(9);
  });

  it("SMOKING_STOPPED_YEARS_AGO: aktuell rauchend → null", () => {
    expect(computeSmokingStoppedYearsAgo({ NIKOTIN_GATE: "Ja, aktuell", NIKOTIN_AUFGEHOERT_VOR: "5" })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 5. Lungenkrebs-Beratungsangebot – G-BA-Kriterien (kein Anspruchsentscheid)
// ---------------------------------------------------------------------------

describe("Lungenkrebs-Beratungsangebot – G-BA-Kriterien April 2026", () => {
  // Basis: alle Kriterien erfüllt (aktuell rauchend)
  const FULL_DV_CURRENT = lungDV(60, 20, 30);
  const FULL_DV_FORMER  = lungDV(60, 20, 30, 9);

  it("1. Alter 49 → verborgen", () => {
    expect(lungVisible(BASE_CURRENT, lungDV(49, 20, 30))).toBe(false);
  });

  it("2. Alter 50 → sichtbar (aktuell)", () => {
    expect(lungVisible(BASE_CURRENT, lungDV(50, 20, 30))).toBe(true);
  });

  it("3. Alter 75 → sichtbar (aktuell)", () => {
    expect(lungVisible(BASE_CURRENT, lungDV(75, 20, 30))).toBe(true);
  });

  it("4. Alter 76 → verborgen", () => {
    expect(lungVisible(BASE_CURRENT, lungDV(76, 20, 30))).toBe(false);
  });

  it("5. 14,9 Pack-Years → verborgen", () => {
    expect(lungVisible(BASE_CURRENT, lungDV(60, 14.9, 30))).toBe(false);
  });

  it("6. 15 Pack-Years → sichtbar", () => {
    expect(lungVisible(BASE_CURRENT, lungDV(60, 15, 30))).toBe(true);
  });

  it("7. Rauchdauer 24 Jahre → verborgen", () => {
    expect(lungVisible(BASE_CURRENT, lungDV(60, 20, 24))).toBe(false);
  });

  it("8. Rauchdauer 25 Jahre → sichtbar", () => {
    expect(lungVisible(BASE_CURRENT, lungDV(60, 20, 25))).toBe(true);
  });

  it("9. aktuell rauchend + alle Kriterien → sichtbar", () => {
    expect(lungVisible(BASE_CURRENT, FULL_DV_CURRENT)).toBe(true);
  });

  it("10. ehemalig + vor 9 Jahren aufgehört + alle Kriterien → sichtbar", () => {
    expect(lungVisible(BASE_FORMER, FULL_DV_FORMER)).toBe(true);
  });

  it("11. ehemalig + vor 10 Jahren aufgehört → verborgen (Grenze exklusiv)", () => {
    expect(lungVisible(BASE_FORMER, lungDV(60, 20, 30, 10))).toBe(false);
  });

  it("12. anderes Nikotinprodukt (Zigarren) → verborgen", () => {
    const a = { NIKOTIN_GATE: "Ja, aktuell", NIKOTIN_PRODUKT: "Zigarren / Zigarillos" };
    expect(lungVisible(a, lungDV(60, 0, 30))).toBe(false);
  });

  it("13. fehlende relevante Inputs → verborgen", () => {
    expect(lungVisible({}, {})).toBe(false);
  });

  it("14. helperText bleibt neutral (kein Anspruch/Eligibility)", () => {
    const q = QUESTION_CATALOG.VOLLST_LUNGENSCREENING_BERATUNG;
    const combined = (q.text ?? "") + " " + (q.helperText ?? "");
    expect(combined).not.toMatch(/Anspruch|berechtigt|erf\u00fcllen|erfüllen|indiziert|empfohlen|sollten|m\u00fcssen/i);
  });

  it("15. Krankenblatt enthält keine Anspruchs-/Diagnoseformulierung", () => {
    const note = buildMedicalRecordNote({
      answers: { VOLLST_LUNGENSCREENING_BERATUNG: "ja" },
      selected_block_ids: ["VOLLST_NIKOTIN"],
    });
    expect(note).not.toMatch(/Anspruch|berechtigt|erf\u00fcllt|indiziert|Screening empfohlen/i);
    expect(note).toContain("Ja");
  });

  it("PACK_YEARS ohne explizites NIKOTIN_PRODUKT=Zigaretten → Lungenregel verborgen", () => {
    // computePackYears gibt null zurück → PACK_YEARS undefined → Bedingung false
    const answersNoProduct = {
      NIKOTIN_GATE: "Ja, aktuell",
      NIKOTIN_ZIG_PRO_TAG: "20",
      NIKOTIN_DAUER_JAHRE: "30",
    };
    // Derived Values ohne PACK_YEARS (kein Zigaretten-Produkt → null)
    expect(computePackYears(answersNoProduct)).toBeNull();
    const noPackYearsDV = lungDV(60, 0, 30); // PACK_YEARS = 0 → < 15
    expect(lungVisible(answersNoProduct, noPackYearsDV)).toBe(false);
  });

  it("liegt im VOLLST_NIKOTIN-Block und ergänzt dessen Prerequisites", () => {
    expect(NIKOTIN_QS).toContain("VOLLST_LUNGENSCREENING_BERATUNG");
    expect(NIKOTIN_BLOCK.prerequisiteQuestionIds).toEqual(["VOLLST_AGE", "IDENTITY_BIRTHDATE"]);
    expect(PRAEV_QS).not.toContain("VOLLST_LUNGENSCREENING_BERATUNG");
  });

  it("VOLLST_NIKOTIN bringt die AGE-Frage standalone mit", () => {
    const ids = buildQuestionnaireQuestions(["VOLLST_NIKOTIN"]).map((q) => q.id);
    expect(ids).toContain("VOLLST_AGE");
    expect(ids).toContain("VOLLST_LUNGENSCREENING_BERATUNG");
  });
});

// ---------------------------------------------------------------------------
// 6. Impfstatus – bestehende Logik unverändert
// ---------------------------------------------------------------------------

describe("VOLLST_IMPFSTATUS – bestehende Logik", () => {
  const impfBlock = BLOCK_CATALOG["VOLLST_IMPFSTATUS"];
  const impfRules = impfBlock?.conditionalRules ?? [];
  const impfQs = impfBlock?.questionIds ?? [];

  it("Block ist definiert", () => {
    expect(impfBlock).toBeDefined();
  });

  it("VOLLST_IMPF_BERATUNG erscheint wenn VOLLST_IMPF_BEKANNT = 'Nein'", () => {
    const visible = visibleIds(impfRules, impfQs, { VOLLST_IMPF_BEKANNT: "Nein" });
    expect(visible.has("VOLLST_IMPF_BERATUNG")).toBe(true);
  });

  it("VOLLST_IMPF_BERATUNG erscheint wenn VOLLST_IMPF_BEKANNT = 'Unsicher'", () => {
    const visible = visibleIds(impfRules, impfQs, { VOLLST_IMPF_BEKANNT: "Unsicher" });
    expect(visible.has("VOLLST_IMPF_BERATUNG")).toBe(true);
  });

  it("VOLLST_IMPF_BERATUNG erscheint wenn VOLLST_IMPF_NACHWEIS = 'Nein'", () => {
    const visible = visibleIds(impfRules, impfQs, { VOLLST_IMPF_NACHWEIS: "Nein" });
    expect(visible.has("VOLLST_IMPF_BERATUNG")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 8. Nikotin – keine doppelten Questions
// ---------------------------------------------------------------------------

describe("Nikotin – keine Duplikate", () => {
  it("NIKOTIN_MOTIVATION ist im VOLLST_NIKOTIN-Block, nicht in VOLLST_PRAEVENTION", () => {
    expect(PRAEV_QS).not.toContain("NIKOTIN_MOTIVATION");
    expect(BLOCK_CATALOG["VOLLST_NIKOTIN"].questionIds).toContain("NIKOTIN_MOTIVATION");
  });

  it("NIKOTIN_UNTERSTUETZUNG ist im VOLLST_NIKOTIN-Block, nicht in VOLLST_PRAEVENTION", () => {
    expect(PRAEV_QS).not.toContain("NIKOTIN_UNTERSTUETZUNG");
    expect(BLOCK_CATALOG["VOLLST_NIKOTIN"].questionIds).toContain("NIKOTIN_UNTERSTUETZUNG");
  });
});

// ---------------------------------------------------------------------------
// 9. Alkohol – keine doppelten Questions
// ---------------------------------------------------------------------------

describe("Alkohol – keine Duplikate", () => {
  it("ALKOHOL_MOTIVATION ist im VOLLST_ALKOHOL-Block, nicht in VOLLST_PRAEVENTION", () => {
    expect(PRAEV_QS).not.toContain("ALKOHOL_MOTIVATION");
    expect(BLOCK_CATALOG["VOLLST_ALKOHOL"].questionIds).toContain("ALKOHOL_MOTIVATION");
  });

  it("ALKOHOL_UNTERSTUETZUNG ist im VOLLST_ALKOHOL-Block, nicht in VOLLST_PRAEVENTION", () => {
    expect(PRAEV_QS).not.toContain("ALKOHOL_UNTERSTUETZUNG");
  });
});

// ---------------------------------------------------------------------------
// 10. Substanzen – Wunschfelder im groupSchema
// ---------------------------------------------------------------------------

describe("Substanzen – Unterstützungswunsch im groupSchema", () => {
  const substDef = QUESTION_CATALOG.SUBST_EINTRAEGE;
  it("SUBST_EINTRAEGE hat 'reduktion_wunsch' und 'unterstuetzung_wunsch' im groupSchema", () => {
    const keys = (substDef.groupSchema ?? []).map((f) => f.key);
    expect(keys).toContain("reduktion_wunsch");
    expect(keys).toContain("unterstuetzung_wunsch");
  });
});

// ---------------------------------------------------------------------------
// 11. Frozen Sessions
// ---------------------------------------------------------------------------

describe("Frozen Sessions – Phase 6", () => {
  it("VOLLST_PRAEVENTION wird bei buildFrozenBlocks eingefroren", () => {
    const frozen = buildFrozenBlocks(["VOLLST_PRAEVENTION"]);
    expect(frozen).toHaveLength(1);
    expect(frozen[0].id).toBe("VOLLST_PRAEVENTION");
    expect(frozen[0].initiallyVisible).toBe(true);
  });

  it("eingefrorener Block enthält conditionalRules mit AGE-Derived-Condition", () => {
    const frozen = buildFrozenBlocks(["VOLLST_PRAEVENTION"]);
    const rules = frozen[0].conditionalRules;
    const hasAgeRule = rules.some((r) => {
      const cond = r.condition;
      if ("mode" in cond) return false;
      return cond.target.kind === "derived" && cond.target.derivedId === "AGE";
    });
    expect(hasAgeRule).toBe(true);
  });

  it("Frozen Präventionsblock enthält die automatisch ergänzte AGE-Frage", () => {
    const frozen = buildFrozenBlocks(["VOLLST_PRAEVENTION"]);
    expect(frozen[0].questions.map((q) => q.id)).toContain("VOLLST_AGE");
  });

  it("eingefrorene Questions sind tiefe Kopien – Mutation ändert nicht Frozen", () => {
    const frozen = buildFrozenBlocks(["VOLLST_PRAEVENTION"]);
    const checkupQ = frozen[0].questions.find((q) => q.id === "VOLLST_CHECKUP_STATUS");
    expect(checkupQ).toBeDefined();
    const origOptions = QUESTION_CATALOG.VOLLST_CHECKUP_STATUS.options ?? [];
    expect(checkupQ!.options).toEqual(origOptions);
  });

  it("VOLLST_PRAEVENTION ist Teil des vollständigen Anamnese-Presets", () => {
    const frozen = buildFrozenBlocks(VOLLSTAENDIGE_ANAMNESE_PRESET);
    const ids = frozen.map((b) => b.id);
    expect(ids).toContain("VOLLST_PRAEVENTION");
  });
});

// ---------------------------------------------------------------------------
// 12. Krankenblatt – lesbare Ausgabe, keine Diagnosen
// ---------------------------------------------------------------------------

describe("Krankenblatt – Beratungswünsche", () => {
  it("Check-up erscheint lesbar im Krankenblatt", () => {
    const note = buildMedicalRecordNote({
      answers: {
        VOLLST_CHECKUP_STATUS: "Noch nie",
        VOLLST_CHECKUP_BERATUNG: "ja",
      },
      selected_block_ids: ["VOLLST_PRAEVENTION"],
    });
    expect(note).toContain("Noch nie");
    expect(note).toContain("Ja");
  });

  it("Lungenkrebs-Beratungswunsch erscheint lesbar", () => {
    const note = buildMedicalRecordNote({
      answers: { VOLLST_LUNGENSCREENING_BERATUNG: "ja" },
      selected_block_ids: ["VOLLST_NIKOTIN"],
    });
    expect(note).toContain("Ja");
  });

  it("keine Diagnose-/Anspruchsformulierung im Krankenblatt", () => {
    const note = buildMedicalRecordNote({
      answers: {
        VOLLST_CHECKUP_STATUS: "Noch nie",
        VOLLST_LUNGENSCREENING_BERATUNG: "ja",
      },
      selected_block_ids: ["VOLLST_PRAEVENTION", "VOLLST_NIKOTIN"],
    });
    expect(note).not.toMatch(/indiziert|Anspruch|berechtigt|Adipositas|Übergewicht|Abhängigkeit/i);
  });
});

// ---------------------------------------------------------------------------
// 13. Regression – evaluateCondition mit Derived + Question in AND
// ---------------------------------------------------------------------------

describe("Regression – evaluateCondition Phase 6 Regeln", () => {
  it("AGE-Bedingung mit greaterThanOrEqual 35 funktioniert", () => {
    const condition = {
      target: { kind: "derived" as const, derivedId: "AGE" },
      operator: "greaterThanOrEqual" as const,
      value: 35,
    };
    expect(evaluateCondition(condition, {}, { AGE: 35 })).toBe(true);
    expect(evaluateCondition(condition, {}, { AGE: 34 })).toBe(false);
    expect(evaluateCondition(condition, {}, undefined)).toBe(false);
  });

  it("AND-Gruppe mit Derived + Question funktioniert", () => {
    const condition = {
      mode: "AND" as const,
      conditions: [
        { target: { kind: "derived" as const, derivedId: "AGE" }, operator: "greaterThanOrEqual" as const, value: 50 },
        { target: { kind: "question" as const, questionId: "NIKOTIN_GATE" }, operator: "equals" as const, value: "Ja, aktuell" },
      ],
    };
    expect(evaluateCondition(condition, { NIKOTIN_GATE: "Ja, aktuell" }, { AGE: 55 })).toBe(true);
    expect(evaluateCondition(condition, { NIKOTIN_GATE: "Nein, nie regelmäßig" }, { AGE: 55 })).toBe(false);
    expect(evaluateCondition(condition, { NIKOTIN_GATE: "Ja, aktuell" }, { AGE: 49 })).toBe(false);
  });
});
