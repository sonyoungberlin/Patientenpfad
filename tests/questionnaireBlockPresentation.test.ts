import {
  BLOCK_CATALOG,
  BLOCK_IDS_SORTED,
} from "../lib/questionnaire/blockCatalog";
import {
  QUESTIONNAIRE_BLOCK_GROUPS,
  QUESTIONNAIRE_BLOCK_IDS_PRESENTATION,
  groupQuestionnaireBlocks,
} from "../lib/questionnaire/blockPresentation";

describe("Questionnaire-Block-Präsentation", () => {
  it("enthält exakt alle aktuell auswählbaren Blöcke genau einmal", () => {
    const selectableIds = BLOCK_IDS_SORTED;
    expect(QUESTIONNAIRE_BLOCK_IDS_PRESENTATION).toHaveLength(26);
    expect(new Set(QUESTIONNAIRE_BLOCK_IDS_PRESENTATION).size).toBe(26);
    expect([...QUESTIONNAIRE_BLOCK_IDS_PRESENTATION].sort()).toEqual([...selectableIds].sort());
  });

  it("enthält keine unbekannten oder nicht auswählbaren Blöcke", () => {
    for (const id of QUESTIONNAIRE_BLOCK_IDS_PRESENTATION) {
      expect(BLOCK_CATALOG[id]).toBeDefined();
      expect(BLOCK_CATALOG[id].selectable).not.toBe(false);
    }

    expect(QUESTIONNAIRE_BLOCK_IDS_PRESENTATION).not.toEqual(
      expect.arrayContaining([
        "IMPFBERATUNG_VORSORGE",
        "IMPFBERATUNG_RISIKO",
        "IMPFBERATUNG_REISE",
        "IMPFBERATUNG_SCHWANGERSCHAFT",
        "IMPFBERATUNG_BERUF",
        "IMPFBERATUNG_AKUT",
      ]),
    );
  });

  it("ordnet Gruppen und fachlich benachbarte Blöcke korrekt", () => {
    expect(QUESTIONNAIRE_BLOCK_GROUPS.map((group) => group.label)).toEqual([
      "Basis & Kontakt",
      "Kurzanamnese",
      "Praxisanliegen & Verordnungen",
      "Gesundheit & Anamnese",
      "Vorsorge & Impfen",
      "Gewicht",
    ]);

    expect(QUESTIONNAIRE_BLOCK_IDS_PRESENTATION).toEqual(
      expect.arrayContaining([
        "ARBEITSUNFAEHIGKEIT",
        "REZEPT",
        "HEILMITTELVERORDNUNG",
        "VOLLST_IMPFSTATUS",
        "IMPFBERATUNG",
      ]),
    );

    const auIndex = QUESTIONNAIRE_BLOCK_IDS_PRESENTATION.indexOf("ARBEITSUNFAEHIGKEIT");
    const rezeptIndex = QUESTIONNAIRE_BLOCK_IDS_PRESENTATION.indexOf("REZEPT");
    const heilmittelIndex = QUESTIONNAIRE_BLOCK_IDS_PRESENTATION.indexOf("HEILMITTELVERORDNUNG");
    const impfstatusIndex = QUESTIONNAIRE_BLOCK_IDS_PRESENTATION.indexOf("VOLLST_IMPFSTATUS");
    const impfberatungIndex = QUESTIONNAIRE_BLOCK_IDS_PRESENTATION.indexOf("IMPFBERATUNG");

    expect([rezeptIndex - auIndex, heilmittelIndex - rezeptIndex]).toEqual([1, 1]);
    expect(impfberatungIndex - impfstatusIndex).toBe(1);
  });

  it("gruppiert übergebene Choices ohne Auswahlzustand zu verändern", () => {
    const choices = BLOCK_IDS_SORTED.map((id) => ({
      id,
      label: BLOCK_CATALOG[id].label,
      enReady: true,
    }));
    const groups = groupQuestionnaireBlocks(choices);

    expect(groups.flatMap((group) => group.blocks.map((block) => block.id))).toEqual(
      QUESTIONNAIRE_BLOCK_IDS_PRESENTATION,
    );
    expect(groups[0].blocks[0]).toEqual({
      id: "IDENTITAET",
      label: "Identität",
      enReady: true,
    });
  });
});
