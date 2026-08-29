import {
  OFFICE_BLOCK_CATALOG,
  OFFICE_QUESTION_CATALOG,
  OFFICE_BLOCK_IDS_SORTED,
} from "../lib/questionnaire/officeBlockCatalog";
import { buildFrozenBlocks } from "../lib/questionnaire/frozenBlocks";

const BLOCK_ID = "BEWERBER_REZEPTION_BUERO";

const REZEPTION_FRAGEN = [
  "OFF_REZEPTION_TELEFON",
  "OFF_REZEPTION_TERMINE",
  "OFF_REZEPTION_PATIENTENAUFNAHME",
  "OFF_REZEPTION_EMAIL",
  "OFF_REZEPTION_DOKUMENTE",
  "OFF_REZEPTION_FORMULARE",
  "OFF_REZEPTION_PRIORISIEREN",
  "OFF_REZEPTION_SCHWIERIGE_SITUATIONEN",
  "OFF_REZEPTION_DATENSCHUTZ",
] as const;

const BUERO_SELECT_FRAGEN = [
  "OFF_BUERO_WORD",
  "OFF_BUERO_TABELLEN",
  "OFF_BUERO_OUTLOOK",
  "OFF_BUERO_BROWSER",
  "OFF_BUERO_PDF",
  "OFF_BUERO_SCANNER",
  "OFF_BUERO_VIDEOKONFERENZ",
] as const;

const SKALA_ORG = [
  "Noch nicht gemacht",
  "Mit Anleitung",
  "Weitgehend sicher",
  "Sicher und routiniert",
];

const SKALA_PC = [
  "Keine Erfahrung",
  "Grundkenntnisse",
  "Sicher",
  "Sehr sicher / tägliche Routine",
];

describe("BEWERBER_REZEPTION_BUERO – Katalog-Struktur", () => {
  it("Block ist im OFFICE_BLOCK_CATALOG vorhanden", () => {
    expect(OFFICE_BLOCK_CATALOG).toHaveProperty(BLOCK_ID);
  });

  it("Block-Label ist korrekt", () => {
    expect(OFFICE_BLOCK_CATALOG[BLOCK_ID]?.label).toBe("Rezeption / Büro");
  });

  it("displayOrder liegt nach PVS_DIGITAL (35) und vor Sprachkenntnisse (40)", () => {
    const order = OFFICE_BLOCK_CATALOG[BLOCK_ID]?.displayOrder ?? 0;
    expect(order).toBeGreaterThan(35);
    expect(order).toBeLessThan(40);
  });

  it("Block enthält alle 18 Fragen", () => {
    const ids = OFFICE_BLOCK_CATALOG[BLOCK_ID]?.questionIds ?? [];
    expect(ids).toHaveLength(18);
  });

  it("alle 18 Fragen sind im OFFICE_QUESTION_CATALOG definiert", () => {
    const allIds = OFFICE_BLOCK_CATALOG[BLOCK_ID]?.questionIds ?? [];
    for (const qid of allIds) {
      expect(OFFICE_QUESTION_CATALOG).toHaveProperty(qid);
    }
  });

  it("Block hat keine conditionalRules", () => {
    const rules = OFFICE_BLOCK_CATALOG[BLOCK_ID]?.conditionalRules ?? [];
    expect(rules).toHaveLength(0);
  });
});

describe("BEWERBER_REZEPTION_BUERO – Organisatorische Fragen (Skala A)", () => {
  it("alle 9 Rezeptionsfragen sind vom Typ select", () => {
    for (const qid of REZEPTION_FRAGEN) {
      expect(OFFICE_QUESTION_CATALOG[qid]?.type).toBe("select");
    }
  });

  it("alle 9 Rezeptionsfragen sind kein Pflichtfeld", () => {
    for (const qid of REZEPTION_FRAGEN) {
      expect(OFFICE_QUESTION_CATALOG[qid]?.required).toBe(false);
    }
  });

  it("alle 9 Rezeptionsfragen haben exakt die organisatorische 4er-Skala", () => {
    for (const qid of REZEPTION_FRAGEN) {
      expect(OFFICE_QUESTION_CATALOG[qid]?.options).toEqual(SKALA_ORG);
    }
  });
});

describe("BEWERBER_REZEPTION_BUERO – Office-/PC-Kompetenzen (Skala B)", () => {
  it("alle 7 Büro-select-Fragen sind vom Typ select", () => {
    for (const qid of BUERO_SELECT_FRAGEN) {
      expect(OFFICE_QUESTION_CATALOG[qid]?.type).toBe("select");
    }
  });

  it("alle 7 Büro-select-Fragen sind kein Pflichtfeld", () => {
    for (const qid of BUERO_SELECT_FRAGEN) {
      expect(OFFICE_QUESTION_CATALOG[qid]?.required).toBe(false);
    }
  });

  it("alle 7 Büro-select-Fragen haben exakt die PC-Kompetenz-Skala", () => {
    for (const qid of BUERO_SELECT_FRAGEN) {
      expect(OFFICE_QUESTION_CATALOG[qid]?.options).toEqual(SKALA_PC);
    }
  });

  it("OFF_BUERO_WEITERE_PROGRAMME ist textarea und kein Pflichtfeld", () => {
    const q = OFFICE_QUESTION_CATALOG["OFF_BUERO_WEITERE_PROGRAMME"];
    expect(q?.type).toBe("textarea");
    expect(q?.required).toBe(false);
  });
});

describe("BEWERBER_REZEPTION_BUERO – Abrechnungsfrage", () => {
  it("OFF_REZEPTION_ABRECHNUNG ist select und kein Pflichtfeld", () => {
    const q = OFFICE_QUESTION_CATALOG["OFF_REZEPTION_ABRECHNUNG"];
    expect(q?.type).toBe("select");
    expect(q?.required).toBe(false);
  });

  it("OFF_REZEPTION_ABRECHNUNG hat die PC-Kompetenz-Skala", () => {
    const q = OFFICE_QUESTION_CATALOG["OFF_REZEPTION_ABRECHNUNG"];
    expect(q?.options).toEqual(SKALA_PC);
  });
});

describe("BEWERBER_REZEPTION_BUERO – buildFrozenBlocks", () => {
  it("friert Block korrekt ein mit allen 18 Fragen", () => {
    const frozen = buildFrozenBlocks(
      [BLOCK_ID],
      OFFICE_BLOCK_CATALOG,
      OFFICE_QUESTION_CATALOG,
    );
    expect(frozen).toHaveLength(1);
    const block = frozen[0]!;
    expect(block.id).toBe(BLOCK_ID);
    expect(block.initiallyVisible).toBe(true);
    expect(block.questions).toHaveLength(18);
  });

  it("alle Fragen-IDs sind im frozen Block enthalten", () => {
    const frozen = buildFrozenBlocks(
      [BLOCK_ID],
      OFFICE_BLOCK_CATALOG,
      OFFICE_QUESTION_CATALOG,
    );
    const frozenIds = frozen[0]!.questions.map((q) => q.id);
    for (const qid of OFFICE_BLOCK_CATALOG[BLOCK_ID]!.questionIds) {
      expect(frozenIds).toContain(qid);
    }
  });

  it("snapshot ist unabhängig vom Katalog (tiefer Clone)", () => {
    const frozen = buildFrozenBlocks(
      [BLOCK_ID],
      OFFICE_BLOCK_CATALOG,
      OFFICE_QUESTION_CATALOG,
    );
    const original = OFFICE_QUESTION_CATALOG["OFF_REZEPTION_TELEFON"]!;
    frozen[0]!.questions.find((q) => q.id === "OFF_REZEPTION_TELEFON")!.required = true;
    expect(original.required).toBe(false);
  });
});

describe("Bestehende Office-Blöcke – Regressionsprüfung", () => {
  const ALLE_ERWARTETEN_BLOCKS = [
    "BEWERBER_KONTAKT",
    "BEWERBER_AUSBILDUNG",
    "BEWERBER_BERUFSERFAHRUNG",
    "BEWERBER_MFA_KOMPETENZEN",
    "BEWERBER_PVS_DIGITAL",
    "BEWERBER_REZEPTION_BUERO",
    "BEWERBER_SPRACHKENNTNISSE",
    "BEWERBER_FUEHRERSCHEIN",
    "BEWERBER_ARBEITSZEITEN",
  ] as const;

  it("OFFICE_BLOCK_CATALOG enthält jetzt 13 Blöcke", () => {
    expect(Object.keys(OFFICE_BLOCK_CATALOG)).toHaveLength(13);
  });

  it("OFFICE_BLOCK_IDS_SORTED enthält alle 13 Blöcke in korrekter Reihenfolge", () => {
    expect(OFFICE_BLOCK_IDS_SORTED).toHaveLength(13);
    const rezIdx = OFFICE_BLOCK_IDS_SORTED.indexOf("BEWERBER_REZEPTION_BUERO");
    const pvsIdx = OFFICE_BLOCK_IDS_SORTED.indexOf("BEWERBER_PVS_DIGITAL");
    const sprachIdx = OFFICE_BLOCK_IDS_SORTED.indexOf("BEWERBER_SPRACHKENNTNISSE");
    expect(rezIdx).toBeGreaterThan(pvsIdx);
    expect(rezIdx).toBeLessThan(sprachIdx);
  });

  it("alle 9 erwarteten Blöcke sind vorhanden", () => {
    for (const id of ALLE_ERWARTETEN_BLOCKS) {
      expect(OFFICE_BLOCK_CATALOG).toHaveProperty(id);
    }
  });

  it("buildFrozenBlocks aller 9 Blöcke läuft fehlerfrei durch", () => {
    const allIds = Object.keys(OFFICE_BLOCK_CATALOG);
    expect(() =>
      buildFrozenBlocks(allIds, OFFICE_BLOCK_CATALOG, OFFICE_QUESTION_CATALOG),
    ).not.toThrow();
  });

  it("BEWERBER_MFA_KOMPETENZEN – ConditionalRule bleibt intakt", () => {
    const rule = OFFICE_BLOCK_CATALOG["BEWERBER_MFA_KOMPETENZEN"]?.conditionalRules?.[0];
    expect(rule?.action).toBe("showQuestion");
    expect(rule?.targetId).toBe("OFF_MFA_ZUSATZQUALIFIKATIONEN_SONSTIGE");
  });

  it("BEWERBER_FUEHRERSCHEIN – ConditionalRule bleibt intakt", () => {
    const rule = OFFICE_BLOCK_CATALOG["BEWERBER_FUEHRERSCHEIN"]?.conditionalRules?.[0];
    expect(rule?.action).toBe("showQuestion");
    expect(rule?.targetId).toBe("OFF_FUEHRERSCHEIN_KLASSEN");
  });
});
