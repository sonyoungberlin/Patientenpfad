import {
  OFFICE_BLOCK_CATALOG,
  OFFICE_QUESTION_CATALOG,
  OFFICE_BLOCK_IDS_SORTED,
} from "../lib/questionnaire/officeBlockCatalog";
import { buildFrozenBlocks } from "../lib/questionnaire/frozenBlocks";
import { evaluateCondition } from "../lib/questionnaire/conditionalLogic";

const BLOCK_ID = "BEWERBER_ARBEITSZEITEN";

describe("BEWERBER_ARBEITSZEITEN – Katalog-Struktur", () => {
  it("Block ist im OFFICE_BLOCK_CATALOG vorhanden", () => {
    expect(OFFICE_BLOCK_CATALOG).toHaveProperty(BLOCK_ID);
  });

  it("Block-Label ist korrekt", () => {
    expect(OFFICE_BLOCK_CATALOG[BLOCK_ID]?.label).toBe("Arbeitszeiten");
  });

  it("displayOrder ist 60", () => {
    expect(OFFICE_BLOCK_CATALOG[BLOCK_ID]?.displayOrder).toBe(60);
  });

  it("Block enthält jetzt 5 Fragen", () => {
    expect(OFFICE_BLOCK_CATALOG[BLOCK_ID]?.questionIds).toHaveLength(5);
  });

  it("alle 5 Fragen sind im OFFICE_QUESTION_CATALOG definiert", () => {
    for (const qid of OFFICE_BLOCK_CATALOG[BLOCK_ID]?.questionIds ?? []) {
      expect(OFFICE_QUESTION_CATALOG).toHaveProperty(qid);
    }
  });

  it("Block hat genau 1 conditionalRule", () => {
    expect(OFFICE_BLOCK_CATALOG[BLOCK_ID]?.conditionalRules).toHaveLength(1);
  });
});

describe("BEWERBER_ARBEITSZEITEN – neue Frage: aktuelle berufliche Situation", () => {
  it("OFF_AKTUELLE_BERUFLICHE_SITUATION ist im Block enthalten", () => {
    expect(OFFICE_BLOCK_CATALOG[BLOCK_ID]?.questionIds).toContain(
      "OFF_AKTUELLE_BERUFLICHE_SITUATION",
    );
  });

  it("Fragetyp ist select", () => {
    expect(OFFICE_QUESTION_CATALOG["OFF_AKTUELLE_BERUFLICHE_SITUATION"]?.type).toBe("select");
  });

  it("Frage ist kein Pflichtfeld", () => {
    expect(OFFICE_QUESTION_CATALOG["OFF_AKTUELLE_BERUFLICHE_SITUATION"]?.required).toBe(false);
  });

  it("alle 6 Optionen exakt vorhanden", () => {
    expect(OFFICE_QUESTION_CATALOG["OFF_AKTUELLE_BERUFLICHE_SITUATION"]?.options).toEqual([
      "Derzeit beschäftigt",
      "In Ausbildung / Studium / Weiterbildung",
      "Derzeit nicht beschäftigt",
      "Selbstständig",
      "Sonstiges",
      "Möchte ich nicht angeben",
    ]);
  });

  it("exakt 6 Optionen – nicht mehr, nicht weniger", () => {
    expect(
      OFFICE_QUESTION_CATALOG["OFF_AKTUELLE_BERUFLICHE_SITUATION"]?.options,
    ).toHaveLength(6);
  });
});

describe("BEWERBER_ARBEITSZEITEN – Sonstige-Freitext (Conditional)", () => {
  it("OFF_AKTUELLE_BERUFLICHE_SITUATION_SONSTIGE ist im Block enthalten", () => {
    expect(OFFICE_BLOCK_CATALOG[BLOCK_ID]?.questionIds).toContain(
      "OFF_AKTUELLE_BERUFLICHE_SITUATION_SONSTIGE",
    );
  });

  it("Sonstiges-Freitext ist Typ textarea", () => {
    expect(OFFICE_QUESTION_CATALOG["OFF_AKTUELLE_BERUFLICHE_SITUATION_SONSTIGE"]?.type).toBe(
      "textarea",
    );
  });

  it("Sonstiges-Freitext ist kein Pflichtfeld", () => {
    expect(
      OFFICE_QUESTION_CATALOG["OFF_AKTUELLE_BERUFLICHE_SITUATION_SONSTIGE"]?.required,
    ).toBe(false);
  });

  it("conditionalRule zeigt Sonstiges-Freitext genau bei Wert 'Sonstiges'", () => {
    const rule = OFFICE_BLOCK_CATALOG[BLOCK_ID]?.conditionalRules?.[0];
    expect(rule?.targetId).toBe("OFF_AKTUELLE_BERUFLICHE_SITUATION_SONSTIGE");
    expect(rule?.action).toBe("showQuestion");

    const answers: Record<string, string> = {
      OFF_AKTUELLE_BERUFLICHE_SITUATION: "Sonstiges",
    };
    expect(evaluateCondition(rule!.condition, answers)).toBe(true);
  });

  it("conditionalRule versteckt Freitext bei 'Derzeit beschäftigt'", () => {
    const rule = OFFICE_BLOCK_CATALOG[BLOCK_ID]?.conditionalRules?.[0];
    const answers: Record<string, string> = {
      OFF_AKTUELLE_BERUFLICHE_SITUATION: "Derzeit beschäftigt",
    };
    expect(evaluateCondition(rule!.condition, answers)).toBe(false);
  });

  it("conditionalRule versteckt Freitext bei 'Möchte ich nicht angeben'", () => {
    const rule = OFFICE_BLOCK_CATALOG[BLOCK_ID]?.conditionalRules?.[0];
    const answers: Record<string, string> = {
      OFF_AKTUELLE_BERUFLICHE_SITUATION: "Möchte ich nicht angeben",
    };
    expect(evaluateCondition(rule!.condition, answers)).toBe(false);
  });

  it("conditionalRule versteckt Freitext wenn Frage leer ist", () => {
    const rule = OFFICE_BLOCK_CATALOG[BLOCK_ID]?.conditionalRules?.[0];
    expect(evaluateCondition(rule!.condition, {})).toBe(false);
  });
});

describe("BEWERBER_ARBEITSZEITEN – bestehende Fragen unverändert", () => {
  it("OFF_ARBEITSZEITMODELL ist im Block enthalten", () => {
    expect(OFFICE_BLOCK_CATALOG[BLOCK_ID]?.questionIds).toContain("OFF_ARBEITSZEITMODELL");
  });

  it("Arbeitszeitmodell-Optionen unverändert (keine neuen Arzt-spezifischen Optionen)", () => {
    expect(OFFICE_QUESTION_CATALOG["OFF_ARBEITSZEITMODELL"]?.options).toEqual([
      "Vollzeit",
      "Teilzeit",
      "Geringfügige Beschäftigung",
      "Vertretung / Aushilfe",
    ]);
  });

  it("OFF_ZEITEINSCHRAENKUNGEN ist im Block enthalten, Typ textarea", () => {
    expect(OFFICE_BLOCK_CATALOG[BLOCK_ID]?.questionIds).toContain("OFF_ZEITEINSCHRAENKUNGEN");
    expect(OFFICE_QUESTION_CATALOG["OFF_ZEITEINSCHRAENKUNGEN"]?.type).toBe("textarea");
  });

  it("OFF_FRUEHESTBEGINN ist im Block enthalten, Typ date", () => {
    expect(OFFICE_BLOCK_CATALOG[BLOCK_ID]?.questionIds).toContain("OFF_FRUEHESTBEGINN");
    expect(OFFICE_QUESTION_CATALOG["OFF_FRUEHESTBEGINN"]?.type).toBe("date");
  });
});

describe("BEWERBER_ARBEITSZEITEN – buildFrozenBlocks", () => {
  it("friert Block korrekt ein mit allen 5 Fragen", () => {
    const frozen = buildFrozenBlocks([BLOCK_ID], OFFICE_BLOCK_CATALOG, OFFICE_QUESTION_CATALOG);
    expect(frozen).toHaveLength(1);
    expect(frozen[0]!.questions).toHaveLength(5);
    expect(frozen[0]!.initiallyVisible).toBe(true);
  });

  it("Gesamtkatalog hat weiterhin 13 Blöcke", () => {
    expect(Object.keys(OFFICE_BLOCK_CATALOG)).toHaveLength(13);
  });

  it("OFFICE_BLOCK_IDS_SORTED hat weiterhin 13 Einträge", () => {
    expect(OFFICE_BLOCK_IDS_SORTED).toHaveLength(13);
  });

  it("BEWERBER_ARBEITSZEITEN ist letzter Block in OFFICE_BLOCK_IDS_SORTED", () => {
    const last = OFFICE_BLOCK_IDS_SORTED[OFFICE_BLOCK_IDS_SORTED.length - 1];
    expect(last).toBe("BEWERBER_ARBEITSZEITEN");
  });
});
