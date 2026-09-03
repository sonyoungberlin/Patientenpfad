import {
  OFFICE_BLOCK_CATALOG,
  OFFICE_BLOCK_IDS_SORTED,
  OFFICE_QUESTION_CATALOG,
} from "@/lib/questionnaire/officeBlockCatalog";
import { buildFrozenBlocks } from "@/lib/questionnaire/frozenBlocks";

const FAMULATUR_ID = "BEWERBER_FAMULATUR";
const SCHUELERPRAKTIKUM_ID = "BEWERBER_SCHUELERPRAKTIKUM";

const FAMULATUR_QUESTION_IDS = [
  "OFF_FAMULATUR_UNIVERSITAET_STUDIENORT",
  "OFF_FAMULATUR_FACHSEMESTER",
  "OFF_FAMULATUR_VON",
  "OFF_FAMULATUR_BIS",
  "OFF_FAMULATUR_FLEXIBILITAET",
  "OFF_FAMULATUR_PRAKTISCHE_ERFAHRUNG",
  "OFF_FAMULATUR_LERNZIELE",
  "OFF_FAMULATUR_WEITERE_HINWEISE",
];

const SCHUELERPRAKTIKUM_QUESTION_IDS = [
  "OFF_SCHUELERPRAKTIKUM_SCHULFORM",
  "OFF_SCHUELERPRAKTIKUM_KLASSENSTUFE",
  "OFF_SCHUELERPRAKTIKUM_VON",
  "OFF_SCHUELERPRAKTIKUM_BIS",
  "OFF_SCHUELERPRAKTIKUM_FLEXIBILITAET",
  "OFF_SCHUELERPRAKTIKUM_PFLICHTPRAKTIKUM",
  "OFF_SCHUELERPRAKTIKUM_MOTIVATION",
  "OFF_SCHUELERPRAKTIKUM_INTERESSE",
  "OFF_SCHUELERPRAKTIKUM_WEITERE_HINWEISE",
];

describe("Office-Bewerbungsblöcke", () => {
  it("enthält beide neuen eigenständigen Blöcke in der gemeinsamen Auswahl", () => {
    expect(OFFICE_BLOCK_CATALOG[FAMULATUR_ID].label).toBe("Famulatur / Medizinstudium");
    expect(OFFICE_BLOCK_CATALOG[SCHUELERPRAKTIKUM_ID].label).toBe("Schülerpraktikum");
    expect(OFFICE_BLOCK_IDS_SORTED).toEqual(
      expect.arrayContaining([FAMULATUR_ID, SCHUELERPRAKTIKUM_ID]),
    );
  });

  it("enthält die vollständigen vorgesehenen Fragen", () => {
    expect(OFFICE_BLOCK_CATALOG[FAMULATUR_ID].questionIds).toEqual(FAMULATUR_QUESTION_IDS);
    expect(OFFICE_BLOCK_CATALOG[SCHUELERPRAKTIKUM_ID].questionIds).toEqual(SCHUELERPRAKTIKUM_QUESTION_IDS);
  });

  it("verwendet Schulform und Klassenstufe, aber keinen Schulnamen", () => {
    const questions = SCHUELERPRAKTIKUM_QUESTION_IDS.map(
      (id) => OFFICE_QUESTION_CATALOG[id],
    );
    expect(questions.map((question) => question.text)).toEqual(
      expect.arrayContaining([
        "Welche Schulform besuchst du?",
        "In welcher Klassenstufe bist du?",
      ]),
    );
    expect(
      questions.some((question) => /schulname|name der schule/i.test(question.text)),
    ).toBe(false);
  });

  it("enthält in beiden Blöcken von/bis-Zeiträume und feste Du-Texte", () => {
    for (const blockId of [FAMULATUR_ID, SCHUELERPRAKTIKUM_ID]) {
      const questions = OFFICE_BLOCK_CATALOG[blockId].questionIds.map(
        (id) => OFFICE_QUESTION_CATALOG[id],
      );
      expect(questions.filter((question) => question.type === "date")).toHaveLength(2);
      expect(
        questions.every(
          (question) => !/\b(Sie|Ihre|Ihnen|Ihr)\b/.test(question.text),
        ),
      ).toBe(true);
    }
  });

  it("friert beide Blöcke wie bestehende Office-Sessions ein", () => {
    const frozen = buildFrozenBlocks(
      [FAMULATUR_ID, SCHUELERPRAKTIKUM_ID],
      OFFICE_BLOCK_CATALOG,
      OFFICE_QUESTION_CATALOG,
    );

    expect(frozen.map((block) => block.id)).toEqual([
      FAMULATUR_ID,
      SCHUELERPRAKTIKUM_ID,
    ]);
    expect(frozen.flatMap((block) => block.questions.map((question) => question.id))).toEqual(
      expect.arrayContaining([...FAMULATUR_QUESTION_IDS, ...SCHUELERPRAKTIKUM_QUESTION_IDS]),
    );
  });

  it("koppelt die neuen Blöcke nicht automatisch an Arzt oder MFA", () => {
    const frozen = buildFrozenBlocks(
      [FAMULATUR_ID, SCHUELERPRAKTIKUM_ID],
      OFFICE_BLOCK_CATALOG,
      OFFICE_QUESTION_CATALOG,
    );
    expect(frozen.map((block) => block.id)).not.toEqual(
      expect.arrayContaining([
        "BEWERBER_ARZT_BASIS",
        "BEWERBER_MFA_KOMPETENZEN",
      ]),
    );
  });
});
