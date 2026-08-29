import {
  OFFICE_BLOCK_CATALOG,
  OFFICE_QUESTION_CATALOG,
  OFFICE_BLOCK_IDS_SORTED,
} from "../lib/questionnaire/officeBlockCatalog";
import { buildFrozenBlocks } from "../lib/questionnaire/frozenBlocks";

const BLOCK_ID = "BEWERBER_PVS_DIGITAL";
const QUESTION_IDS = [
  "OFF_PVS_ERFAHRUNG",
  "OFF_PVS_SYSTEME",
  "OFF_DIGITAL_SELBSTEINSCHAETZUNG",
  "OFF_DIGITAL_ANWENDUNGEN",
  "OFF_DIGITAL_WEITERE_SYSTEME",
] as const;

describe("BEWERBER_PVS_DIGITAL – Katalog-Struktur", () => {
  it("Block ist im OFFICE_BLOCK_CATALOG vorhanden", () => {
    expect(OFFICE_BLOCK_CATALOG).toHaveProperty(BLOCK_ID);
  });

  it("Block-Label ist korrekt", () => {
    expect(OFFICE_BLOCK_CATALOG[BLOCK_ID]?.label).toBe(
      "Praxissoftware & digitale Fähigkeiten",
    );
  });

  it("displayOrder liegt zwischen Berufserfahrung (30) und Sprachkenntnisse (40)", () => {
    const order = OFFICE_BLOCK_CATALOG[BLOCK_ID]?.displayOrder;
    expect(order).toBeGreaterThan(30);
    expect(order).toBeLessThan(40);
  });

  it("Block enthält alle fünf erwarteten Fragen", () => {
    const ids = OFFICE_BLOCK_CATALOG[BLOCK_ID]?.questionIds ?? [];
    for (const qid of QUESTION_IDS) {
      expect(ids).toContain(qid);
    }
  });

  it("alle fünf Fragen sind im OFFICE_QUESTION_CATALOG definiert", () => {
    for (const qid of QUESTION_IDS) {
      expect(OFFICE_QUESTION_CATALOG).toHaveProperty(qid);
    }
  });
});

describe("BEWERBER_PVS_DIGITAL – Fragedefinitionen", () => {
  it("OFF_PVS_ERFAHRUNG ist yes_no und Pflichtfeld", () => {
    const q = OFFICE_QUESTION_CATALOG["OFF_PVS_ERFAHRUNG"];
    expect(q?.type).toBe("yes_no");
    expect(q?.required).toBe(true);
  });

  it("OFF_PVS_SYSTEME ist repeatable_group mit groupSchema system + niveau", () => {
    const q = OFFICE_QUESTION_CATALOG["OFF_PVS_SYSTEME"];
    expect(q?.type).toBe("repeatable_group");
    const keys = (q?.groupSchema ?? []).map((f) => f.key);
    expect(keys).toContain("system");
    expect(keys).toContain("niveau");
  });

  it("OFF_PVS_SYSTEME – Feld 'system' ist Freitext (type text)", () => {
    const q = OFFICE_QUESTION_CATALOG["OFF_PVS_SYSTEME"];
    const systemField = q?.groupSchema?.find((f) => f.key === "system");
    expect(systemField?.type).toBe("text");
    // Keine feste Optionenliste erzwungen
    expect(systemField?.options).toBeUndefined();
  });

  it("OFF_PVS_SYSTEME – Feld 'niveau' hat vier Erfahrungsstufen", () => {
    const q = OFFICE_QUESTION_CATALOG["OFF_PVS_SYSTEME"];
    const niveauField = q?.groupSchema?.find((f) => f.key === "niveau");
    expect(niveauField?.options).toEqual([
      "Nur kurz genutzt",
      "Grundkenntnisse",
      "Sicher",
      "Sehr sicher / tägliche Routine",
    ]);
  });

  it("OFF_DIGITAL_SELBSTEINSCHAETZUNG ist select und Pflichtfeld mit vier Optionen", () => {
    const q = OFFICE_QUESTION_CATALOG["OFF_DIGITAL_SELBSTEINSCHAETZUNG"];
    expect(q?.type).toBe("select");
    expect(q?.required).toBe(true);
    expect(q?.options).toHaveLength(4);
    expect(q?.options).toContain("Ich arbeite sicher mit digitalen Systemen");
  });

  it("OFF_DIGITAL_ANWENDUNGEN ist multi_select und kein Pflichtfeld", () => {
    const q = OFFICE_QUESTION_CATALOG["OFF_DIGITAL_ANWENDUNGEN"];
    expect(q?.type).toBe("multi_select");
    expect(q?.required).toBe(false);
    expect(q?.options).toEqual(
      expect.arrayContaining(["eRezept", "eAU", "ePA", "KIM"]),
    );
  });

  it("OFF_DIGITAL_WEITERE_SYSTEME ist textarea und kein Pflichtfeld", () => {
    const q = OFFICE_QUESTION_CATALOG["OFF_DIGITAL_WEITERE_SYSTEME"];
    expect(q?.type).toBe("textarea");
    expect(q?.required).toBe(false);
  });
});

describe("BEWERBER_PVS_DIGITAL – Conditional Logic", () => {
  it("Block hat genau eine conditionalRule", () => {
    const rules = OFFICE_BLOCK_CATALOG[BLOCK_ID]?.conditionalRules ?? [];
    expect(rules).toHaveLength(1);
  });

  it("conditionalRule zeigt OFF_PVS_SYSTEME wenn OFF_PVS_ERFAHRUNG == 'Ja'", () => {
    const rule = OFFICE_BLOCK_CATALOG[BLOCK_ID]?.conditionalRules?.[0];
    expect(rule?.action).toBe("showQuestion");
    expect(rule?.targetId).toBe("OFF_PVS_SYSTEME");
    expect(rule?.condition).toMatchObject({
      target: { kind: "question", questionId: "OFF_PVS_ERFAHRUNG" },
      operator: "equals",
      value: "Ja",
    });
  });
});

describe("BEWERBER_PVS_DIGITAL – buildFrozenBlocks mit Office-Katalog", () => {
  it("friert Block korrekt ein", () => {
    const frozen = buildFrozenBlocks(
      [BLOCK_ID],
      OFFICE_BLOCK_CATALOG,
      OFFICE_QUESTION_CATALOG,
    );
    expect(frozen).toHaveLength(1);
    const block = frozen[0]!;
    expect(block.id).toBe(BLOCK_ID);
    expect(block.initiallyVisible).toBe(true);
    const frozenIds = block.questions.map((q) => q.id);
    for (const qid of QUESTION_IDS) {
      expect(frozenIds).toContain(qid);
    }
  });

  it("eingefrorene ConditionalRule ist identisch zur Katalog-Definition", () => {
    const frozen = buildFrozenBlocks(
      [BLOCK_ID],
      OFFICE_BLOCK_CATALOG,
      OFFICE_QUESTION_CATALOG,
    );
    const rule = frozen[0]?.conditionalRules[0];
    expect(rule?.action).toBe("showQuestion");
    expect(rule?.targetId).toBe("OFF_PVS_SYSTEME");
  });

  it("snapshot ist unabhängig vom Katalog-Objekt (tiefer Clone)", () => {
    const frozen = buildFrozenBlocks(
      [BLOCK_ID],
      OFFICE_BLOCK_CATALOG,
      OFFICE_QUESTION_CATALOG,
    );
    const original = OFFICE_QUESTION_CATALOG["OFF_DIGITAL_SELBSTEINSCHAETZUNG"]!;
    frozen[0]!.questions.find((q) => q.id === "OFF_DIGITAL_SELBSTEINSCHAETZUNG")!.required = false;
    expect(original.required).toBe(true);
  });
});

describe("Bestehende Office-Blöcke – Regressionsprüfung", () => {
  const EXISTING_BLOCKS = [
    "BEWERBER_KONTAKT",
    "BEWERBER_AUSBILDUNG",
    "BEWERBER_BERUFSERFAHRUNG",
    "BEWERBER_SPRACHKENNTNISSE",
    "BEWERBER_FUEHRERSCHEIN",
    "BEWERBER_ARBEITSZEITEN",
  ] as const;

  it("alle sechs bestehenden Blöcke sind weiterhin im Katalog vorhanden", () => {
    for (const id of EXISTING_BLOCKS) {
      expect(OFFICE_BLOCK_CATALOG).toHaveProperty(id);
    }
  });

  it("OFFICE_BLOCK_IDS_SORTED enthält jetzt 7 Blöcke in displayOrder-Reihenfolge", () => {
    expect(OFFICE_BLOCK_IDS_SORTED).toHaveLength(7);
    const pvsIndex = OFFICE_BLOCK_IDS_SORTED.indexOf("BEWERBER_PVS_DIGITAL");
    const berufsIndex = OFFICE_BLOCK_IDS_SORTED.indexOf("BEWERBER_BERUFSERFAHRUNG");
    const sprachIndex = OFFICE_BLOCK_IDS_SORTED.indexOf("BEWERBER_SPRACHKENNTNISSE");
    expect(pvsIndex).toBeGreaterThan(berufsIndex);
    expect(pvsIndex).toBeLessThan(sprachIndex);
  });

  it("BEWERBER_FUEHRERSCHEIN – ConditionalRule für Klassen bleibt intakt", () => {
    const rule = OFFICE_BLOCK_CATALOG["BEWERBER_FUEHRERSCHEIN"]?.conditionalRules?.[0];
    expect(rule?.action).toBe("showQuestion");
    expect(rule?.targetId).toBe("OFF_FUEHRERSCHEIN_KLASSEN");
    expect(rule?.condition).toMatchObject({ value: "Ja" });
  });

  it("buildFrozenBlocks aller 7 Blöcke läuft fehlerfrei durch", () => {
    const allIds = Object.keys(OFFICE_BLOCK_CATALOG);
    expect(() =>
      buildFrozenBlocks(allIds, OFFICE_BLOCK_CATALOG, OFFICE_QUESTION_CATALOG),
    ).not.toThrow();
  });
});
