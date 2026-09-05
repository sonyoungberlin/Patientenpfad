import { BLOCK_CATALOG, QUESTION_CATALOG, VOLLSTAENDIGE_ANAMNESE_PRESET } from "@/lib/questionnaire/blockCatalog";
import { computeVisibleBlockIds, computeVisibleQuestionIds } from "@/lib/questionnaire/conditionalLogic";
import { buildFrozenBlocks } from "@/lib/questionnaire/frozenBlocks";
import { computeAllDerivedValues } from "@/lib/questionnaire/derivedValues";
import { buildOptionsByQuestionId } from "@/lib/questionnaire/multiSelect";

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
});
