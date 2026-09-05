import { BLOCK_CATALOG, QUESTION_CATALOG, VOLLSTAENDIGE_ANAMNESE_PRESET } from "@/lib/questionnaire/blockCatalog";
import { computeVisibleBlockIds, computeVisibleQuestionIds } from "@/lib/questionnaire/conditionalLogic";
import { buildFrozenBlocks } from "@/lib/questionnaire/frozenBlocks";
import { computeAllDerivedValues } from "@/lib/questionnaire/derivedValues";
import { buildOptionsByQuestionId } from "@/lib/questionnaire/multiSelect";
import { buildQuestionnaireQuestions } from "@/lib/questionnaire/buildQuestionnaireQuestions";
import { parseMultiSelectValue } from "@/lib/questionnaire/multiSelect";
import { sanitizeAnswers } from "@/lib/questionnaire/sanitizeAnswers";

describe("IMPFBERATUNG – reduzierter Gate-Baum", () => {
  it("hat nur den Startblock als direkt auswählbaren Impfberatungsblock", () => {
    expect(BLOCK_CATALOG.IMPFBERATUNG.selectable).not.toBe(false);
    for (const id of [
      "IMPFBERATUNG_VORSORGE",
      "IMPFBERATUNG_RISIKO",
      "IMPFBERATUNG_REISE",
      "IMPFBERATUNG_SCHWANGERSCHAFT",
      "IMPFBERATUNG_BERUF",
      "IMPFBERATUNG_AKUT",
    ]) {
      expect(BLOCK_CATALOG[id].selectable).toBe(false);
    }
  });

  it("friert Folgeblöcke ein und löst den Altersfallback transitiv auf", () => {
    const frozen = buildFrozenBlocks(["IMPFBERATUNG"]);
    expect(frozen.map((block) => block.id)).toEqual([
      "IMPFBERATUNG",
      "IMPFBERATUNG_VORSORGE",
      "IMPFBERATUNG_RISIKO",
      "IMPFBERATUNG_REISE",
      "IMPFBERATUNG_SCHWANGERSCHAFT",
      "IMPFBERATUNG_BERUF",
      "IMPFBERATUNG_AKUT",
    ]);
    expect(frozen.find((block) => block.id === "IMPFBERATUNG_VORSORGE")?.questions.map((q) => q.id))
      .toEqual(["VOLLST_AGE"]);
  });

  it("zeigt bei Reise nur Reiseblock und bei Reise plus Vorsorge zusätzlich das gemeinsame Risikogate", () => {
    const frozen = buildFrozenBlocks(["IMPFBERATUNG"]);
    const rules = frozen.flatMap((block) => block.conditionalRules);
    const derived = computeAllDerivedValues({});
    const travel = computeVisibleBlockIds(
      rules,
      frozen,
      { IMPFBERATUNG_ANLASS: "Reise / geplanter Aufenthalt" },
      derived,
    );
    expect(travel).toEqual(new Set(["IMPFBERATUNG", "IMPFBERATUNG_REISE"]));

    const travelAndPreventive = computeVisibleBlockIds(
      rules,
      frozen,
      { IMPFBERATUNG_ANLASS: "Reise / geplanter Aufenthalt, Vorsorge / Impfschutz überprüfen" },
      derived,
    );
    expect(travelAndPreventive).toEqual(new Set([
      "IMPFBERATUNG",
      "IMPFBERATUNG_VORSORGE",
      "IMPFBERATUNG_RISIKO",
      "IMPFBERATUNG_REISE",
    ]));
  });

  it("zeigt Nachweisdetails erst nach dem Nachweis-Gate", () => {
    const block = buildFrozenBlocks(["IMPFBERATUNG"])[0];
    const answers = {
      IMPFBERATUNG_ANLASS: "Vorsorge / Impfschutz überprüfen",
      IMPFBERATUNG_NACHWEIS_BEDARF: "Ja",
      IMPFBERATUNG_NACHWEIS_ZWECK: "Beruf / Arbeitgeber",
    };
    const rules = block.conditionalRules;
    const ids = block.questions.map((question) => question.id);
    const visible = computeVisibleQuestionIds(
      rules,
      ids,
      answers,
      computeAllDerivedValues(answers),
      buildOptionsByQuestionId(block.questions),
    );
    expect(visible.has("IMPFBERATUNG_NACHWEIS_ZWECK")).toBe(true);
    expect(visible.has("IMPFBERATUNG_NACHWEIS_ART")).toBe(true);
    expect(visible.has("IMPFBERATUNG_NACHWEIS_FRIST")).toBe(true);
  });

  it("verändert Impfstatusblock und vollständiges Anamnese-Preset nicht", () => {
    expect(BLOCK_CATALOG.VOLLST_IMPFSTATUS.questionIds).toEqual([
      "VOLLST_IMPF_BEKANNT",
      "VOLLST_IMPF_NACHWEIS",
      "VOLLST_IMPF_ABLEHNUNG",
      "VOLLST_IMPF_BERATUNG",
    ]);
    expect(VOLLSTAENDIGE_ANAMNESE_PRESET).not.toContain("IMPFBERATUNG");
    expect(QUESTION_CATALOG.IMPFBERATUNG_REISELAND.type).toBe("select");
    expect(QUESTION_CATALOG).not.toHaveProperty("IMPFBERATUNG_REISEREGION");
  });

  it("bietet bei der Pflichtfrage zu Risikokonstellationen 'Nichts davon' an", () => {
    const question = QUESTION_CATALOG.IMPFBERATUNG_RISIKOGRUPPEN;

    expect(question.required).toBe(true);
    expect(question.options).toContain("Nichts davon");
  });

  it("verwendet die gemeinsame Impfstatusfrage und dedupliziert sie global", () => {
    expect(BLOCK_CATALOG.KURZANAMNESE.questionIds).toContain("VOLLST_IMPF_BEKANNT");
    expect(BLOCK_CATALOG.IMPFBERATUNG.questionIds).toContain("VOLLST_IMPF_BEKANNT");
    expect(QUESTION_CATALOG.ANAMNESE_VACCINATION).toBeDefined();
    expect(QUESTION_CATALOG.VOLLST_IMPF_BEKANNT.options).toEqual(["Ja", "Nein", "Unsicher"]);
  });

  it.each([
    ["KURZANAMNESE"],
    ["VOLLST_IMPFSTATUS"],
    ["IMPFBERATUNG"],
    ["KURZANAMNESE", "VOLLST_IMPFSTATUS"],
    ["KURZANAMNESE", "IMPFBERATUNG"],
    ["VOLLST_IMPFSTATUS", "IMPFBERATUNG"],
    ["KURZANAMNESE", "VOLLST_IMPFSTATUS", "IMPFBERATUNG"],
  ])("liefert für %s genau eine kanonische Impfstatusfrage", (...blockIds) => {
    const vaccinationQuestions = buildQuestionnaireQuestions(blockIds).filter(
      (question) => question.text === "Ist Ihr Impfstatus bekannt?",
    );

    expect(vaccinationQuestions).toHaveLength(1);
    expect(vaccinationQuestions[0].id).toBe("VOLLST_IMPF_BEKANNT");
  });

  it("verwendet dieselbe Antwort bei kombinierter Blockauswahl und akzeptiert Unsicher", () => {
    const questions = buildQuestionnaireQuestions(["KURZANAMNESE", "IMPFBERATUNG"]);
    const statusQuestions = questions.filter((question) => question.id === "VOLLST_IMPF_BEKANNT");

    expect(statusQuestions).toHaveLength(1);
    expect(statusQuestions[0].options).toContain("Unsicher");
    expect(sanitizeAnswers(
      { VOLLST_IMPF_BEKANNT: "Unsicher" },
      questions,
    )).toEqual({ VOLLST_IMPF_BEKANNT: "Unsicher" });
  });

  it("bietet konkrete Impfungen und Impulsquellen als optionale Multi-Selects an", () => {
    const vaccinations = QUESTION_CATALOG.IMPFBERATUNG_IMPFUNGEN;
    const sources = QUESTION_CATALOG.IMPFBERATUNG_IMPULSQUELLE;

    expect(vaccinations.type).toBe("multi_select");
    expect(vaccinations.required).toBe(false);
    expect(vaccinations.options).toContain("Ich weiß es nicht genau");
    expect(sources.type).toBe("multi_select");
    expect(sources.required).toBe(false);
    expect(sources.options).toContain("Ich weiß es nicht mehr / nicht genau");
    expect(parseMultiSelectValue("Pneumokokken, FSME, COVID-19", vaccinations.options ?? [])).toEqual([
      "Pneumokokken",
      "FSME",
      "COVID-19",
    ]);
    expect(parseMultiSelectValue("Facharzt / Fachärztin, Apotheke", sources.options ?? [])).toEqual([
      "Facharzt / Fachärztin",
      "Apotheke",
    ]);
  });

  it("zeigt beide neuen Fragen im Einstiegsblock unabhängig vom Anlass", () => {
    const questionIds = buildFrozenBlocks(["IMPFBERATUNG"])[0].questions.map((q) => q.id);
    expect(questionIds).toContain("IMPFBERATUNG_IMPFUNGEN");
    expect(questionIds).toContain("IMPFBERATUNG_IMPULSQUELLE");
  });
});
