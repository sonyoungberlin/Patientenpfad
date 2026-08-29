import {
  OFFICE_BLOCK_CATALOG,
  OFFICE_QUESTION_CATALOG,
} from "../lib/questionnaire/officeBlockCatalog";
import { buildFrozenBlocks } from "../lib/questionnaire/frozenBlocks";
import { evaluateCondition } from "../lib/questionnaire/conditionalLogic";

describe("BEWERBER_FUEHRERSCHEIN – Klassenbereinigung", () => {
  it("Optionen exakt: Klasse B, Klasse BE, Sonstige", () => {
    expect(OFFICE_QUESTION_CATALOG["OFF_FUEHRERSCHEIN_KLASSEN"]?.options).toEqual([
      "Klasse B",
      "Klasse BE",
      "Sonstige",
    ]);
  });

  it("Klasse C, CE, D sind nicht mehr enthalten", () => {
    const opts = OFFICE_QUESTION_CATALOG["OFF_FUEHRERSCHEIN_KLASSEN"]?.options ?? [];
    expect(opts).not.toContain("Klasse C");
    expect(opts).not.toContain("Klasse CE");
    expect(opts).not.toContain("Klasse D");
  });

  it("genau 3 Optionen", () => {
    expect(OFFICE_QUESTION_CATALOG["OFF_FUEHRERSCHEIN_KLASSEN"]?.options).toHaveLength(3);
  });

  it("Typ bleibt multi_select", () => {
    expect(OFFICE_QUESTION_CATALOG["OFF_FUEHRERSCHEIN_KLASSEN"]?.type).toBe("multi_select");
  });

  it("Conditional zeigt Klassen nur bei 'Ja'", () => {
    const rule = OFFICE_BLOCK_CATALOG["BEWERBER_FUEHRERSCHEIN"]?.conditionalRules?.[0];
    expect(rule?.targetId).toBe("OFF_FUEHRERSCHEIN_KLASSEN");
    expect(evaluateCondition(rule!.condition, { OFF_FUEHRERSCHEIN: "Ja" })).toBe(true);
    expect(evaluateCondition(rule!.condition, { OFF_FUEHRERSCHEIN: "Nein" })).toBe(false);
    expect(evaluateCondition(rule!.condition, {})).toBe(false);
  });

  it("buildFrozenBlocks BEWERBER_FUEHRERSCHEIN liefert 2 Fragen", () => {
    const frozen = buildFrozenBlocks(
      ["BEWERBER_FUEHRERSCHEIN"],
      OFFICE_BLOCK_CATALOG,
      OFFICE_QUESTION_CATALOG,
    );
    expect(frozen[0]!.questions).toHaveLength(2);
  });
});

describe("BEWERBER_AUSBILDUNG – OFF_ABSCHLUSS Optionen", () => {
  const opts = () => OFFICE_QUESTION_CATALOG["OFF_ABSCHLUSS"]?.options ?? [];

  it("required bleibt true", () => {
    expect(OFFICE_QUESTION_CATALOG["OFF_ABSCHLUSS"]?.required).toBe(true);
  });

  it("Typ bleibt select", () => {
    expect(OFFICE_QUESTION_CATALOG["OFF_ABSCHLUSS"]?.type).toBe("select");
  });

  it("13 Optionen insgesamt", () => {
    expect(opts()).toHaveLength(13);
  });

  it("enthält MFA (Kurzform)", () => {
    expect(opts()).toContain("MFA");
  });

  it("enthält ZFA (Kurzform)", () => {
    expect(opts()).toContain("ZFA");
  });

  it("enthält Kaufmann/-frau im Gesundheitswesen", () => {
    expect(opts()).toContain("Kaufmann/-frau im Gesundheitswesen");
  });

  it("enthält kaufmännische / verwaltungsbezogene Ausbildung", () => {
    expect(opts()).toContain("Kaufmännische / verwaltungsbezogene Ausbildung");
  });

  it("enthält 'Keine abgeschlossene Berufsausbildung'", () => {
    expect(opts()).toContain("Keine abgeschlossene Berufsausbildung");
  });

  it("enthält 'Andere abgeschlossene Berufsausbildung'", () => {
    expect(opts()).toContain("Andere abgeschlossene Berufsausbildung");
  });

  it("enthält 'Gesundheits- und Krankenpfleger/in' (nicht mehr nur 'Krankenpfleger/in')", () => {
    expect(opts()).toContain("Gesundheits- und Krankenpfleger/in");
    expect(opts()).not.toContain("Krankenpfleger/in");
  });

  it("enthält KEINE Arzt-/Approbationsoption (Arzthelfer/in erlaubt, Arzt/Ärztin nicht)", () => {
    const forbidden = [
      "Arzt/Ärztin",
      "Approbierter Arzt",
      "Approbierte Ärztin",
      "Facharzt",
      "Medizinstudium",
    ];
    for (const banned of forbidden) {
      expect(opts()).not.toContain(banned);
    }
    // Approbation darf nicht als eigenständige Option auftauchen
    expect(opts().some((o) => o.toLowerCase().startsWith("approbat"))).toBe(false);
  });

  it("Altenpfleger/in, Rettungssanitäter/in, Notfallsanitäter/in, Arzthelfer/in bleiben erhalten", () => {
    expect(opts()).toContain("Altenpfleger/in");
    expect(opts()).toContain("Rettungssanitäter/in");
    expect(opts()).toContain("Notfallsanitäter/in");
    expect(opts()).toContain("Arzthelfer/in");
  });

  it("'Sonstiges' bleibt erhalten", () => {
    expect(opts()).toContain("Sonstiges");
  });

  it("alte Volltextvarianten sind NICHT mehr enthalten", () => {
    expect(opts()).not.toContain("MFA (Medizinische Fachangestellte)");
    expect(opts()).not.toContain("ZFA (Zahnmedizinische Fachangestellte)");
  });

  it("buildFrozenBlocks BEWERBER_AUSBILDUNG liefert 4 Fragen", () => {
    const frozen = buildFrozenBlocks(
      ["BEWERBER_AUSBILDUNG"],
      OFFICE_BLOCK_CATALOG,
      OFFICE_QUESTION_CATALOG,
    );
    expect(frozen[0]!.questions).toHaveLength(4);
  });
});
