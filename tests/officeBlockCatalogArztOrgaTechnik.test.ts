import {
  OFFICE_BLOCK_CATALOG,
  OFFICE_QUESTION_CATALOG,
  OFFICE_BLOCK_IDS_SORTED,
} from "../lib/questionnaire/officeBlockCatalog";
import { buildFrozenBlocks } from "../lib/questionnaire/frozenBlocks";
import { evaluateCondition } from "../lib/questionnaire/conditionalLogic";

const BLOCK_ID = "BEWERBER_ARZT_ORGA_TECHNIK";

const ALL_QUESTION_IDS = [
  "OFF_ARZT_EHBA_STATUS",
  "OFF_ARZT_LANR_STATUS",
  "OFF_ARZT_VERTRAGSARZT_ERFAHRUNG",
  "OFF_ARZT_AMBULANTE_STRUKTUR",
  "OFF_ARZT_AMBULANTE_STRUKTUR_SONSTIGE",
] as const;

describe("BEWERBER_ARZT_ORGA_TECHNIK – Katalog-Struktur", () => {
  it("Block ist im OFFICE_BLOCK_CATALOG vorhanden", () => {
    expect(OFFICE_BLOCK_CATALOG).toHaveProperty(BLOCK_ID);
  });

  it("Block-Label ist korrekt", () => {
    expect(OFFICE_BLOCK_CATALOG[BLOCK_ID]?.label).toBe(
      "Ärztliche organisatorisch-technische Voraussetzungen",
    );
  });

  it("displayOrder liegt nach ARZT_ZUSATZQUALIFIKATIONEN (32) und vor MFA_KOMPETENZEN (33)", () => {
    const order = OFFICE_BLOCK_CATALOG[BLOCK_ID]?.displayOrder ?? 0;
    expect(order).toBeGreaterThan(32);
    expect(order).toBeLessThan(33);
  });

  it("Block enthält alle 5 Fragen", () => {
    const ids = OFFICE_BLOCK_CATALOG[BLOCK_ID]?.questionIds ?? [];
    expect(ids).toHaveLength(5);
    for (const qid of ALL_QUESTION_IDS) {
      expect(ids).toContain(qid);
    }
  });

  it("alle 5 Fragen sind im OFFICE_QUESTION_CATALOG definiert", () => {
    for (const qid of ALL_QUESTION_IDS) {
      expect(OFFICE_QUESTION_CATALOG).toHaveProperty(qid);
    }
  });

  it("Block hat genau zwei conditionalRules", () => {
    expect(OFFICE_BLOCK_CATALOG[BLOCK_ID]?.conditionalRules).toHaveLength(2);
  });

  it("keine BSNR-Frage im Block enthalten", () => {
    const ids = OFFICE_BLOCK_CATALOG[BLOCK_ID]?.questionIds ?? [];
    for (const qid of ids) {
      expect(qid.toUpperCase()).not.toContain("BSNR");
    }
  });
});

describe("BEWERBER_ARZT_ORGA_TECHNIK – Fragedefinitionen", () => {
  it("OFF_ARZT_EHBA_STATUS ist select mit exakt 5 Optionen", () => {
    const q = OFFICE_QUESTION_CATALOG["OFF_ARZT_EHBA_STATUS"];
    expect(q?.type).toBe("select");
    expect(q?.required).toBe(false);
    expect(q?.options).toEqual([
      "Vorhanden und einsatzbereit",
      "Vorhanden, aber noch nicht vollständig eingerichtet / aktiviert",
      "Beantragt / in Bearbeitung",
      "Noch nicht beantragt",
      "Keine Angabe",
    ]);
  });

  it("OFF_ARZT_EHBA_STATUS fragt keinen Zahlenwert / keine Kartennummer ab (kein type number)", () => {
    expect(OFFICE_QUESTION_CATALOG["OFF_ARZT_EHBA_STATUS"]?.type).not.toBe("number");
  });

  it("OFF_ARZT_LANR_STATUS ist select und fragt nur Status ab", () => {
    const q = OFFICE_QUESTION_CATALOG["OFF_ARZT_LANR_STATUS"];
    expect(q?.type).toBe("select");
    expect(q?.required).toBe(false);
    expect(q?.options).toEqual([
      "Ja, vorhanden",
      "Noch nicht vorhanden",
      "Unklar / muss geprüft werden",
      "Keine Angabe",
    ]);
  });

  it("OFF_ARZT_LANR_STATUS fragt keine konkrete LANR-Nummer ab (kein text-Freifeld)", () => {
    expect(OFFICE_QUESTION_CATALOG["OFF_ARZT_LANR_STATUS"]?.type).not.toBe("text");
    expect(OFFICE_QUESTION_CATALOG["OFF_ARZT_LANR_STATUS"]?.type).not.toBe("number");
  });

  it("OFF_ARZT_VERTRAGSARZT_ERFAHRUNG ist yes_no und kein Pflichtfeld", () => {
    const q = OFFICE_QUESTION_CATALOG["OFF_ARZT_VERTRAGSARZT_ERFAHRUNG"];
    expect(q?.type).toBe("yes_no");
    expect(q?.required).toBe(false);
  });

  it("OFF_ARZT_AMBULANTE_STRUKTUR ist multi_select mit 6 Optionen inkl. Sonstige", () => {
    const q = OFFICE_QUESTION_CATALOG["OFF_ARZT_AMBULANTE_STRUKTUR"];
    expect(q?.type).toBe("multi_select");
    expect(q?.required).toBe(false);
    expect(q?.options).toHaveLength(6);
    expect(q?.options).toContain("Sonstige");
    expect(q?.options).toEqual(
      expect.arrayContaining([
        "Hausarztpraxis",
        "Facharztpraxis",
        "MVZ",
        "Eigene Niederlassung / BAG",
        "Ambulante Tätigkeit im Krankenhaus",
        "Sonstige",
      ]),
    );
  });

  it("OFF_ARZT_AMBULANTE_STRUKTUR_SONSTIGE ist textarea und kein Pflichtfeld", () => {
    const q = OFFICE_QUESTION_CATALOG["OFF_ARZT_AMBULANTE_STRUKTUR_SONSTIGE"];
    expect(q?.type).toBe("textarea");
    expect(q?.required).toBe(false);
  });
});

describe("BEWERBER_ARZT_ORGA_TECHNIK – Conditional Logic", () => {
  const getRule = (targetId: string) =>
    OFFICE_BLOCK_CATALOG[BLOCK_ID]?.conditionalRules?.find((r) => r.targetId === targetId);

  describe("OFF_ARZT_AMBULANTE_STRUKTUR – equals 'Ja'", () => {
    it("Rule vorhanden und zeigt ambulante Struktur", () => {
      const rule = getRule("OFF_ARZT_AMBULANTE_STRUKTUR");
      expect(rule?.action).toBe("showQuestion");
      expect(rule?.condition).toMatchObject({
        target: { kind: "question", questionId: "OFF_ARZT_VERTRAGSARZT_ERFAHRUNG" },
        operator: "equals",
        value: "Ja",
      });
    });

    it("sichtbar wenn Vertragsarzt = 'Ja'", () => {
      const rule = getRule("OFF_ARZT_AMBULANTE_STRUKTUR")!;
      expect(
        evaluateCondition(rule.condition, { OFF_ARZT_VERTRAGSARZT_ERFAHRUNG: "Ja" }),
      ).toBe(true);
    });

    it("nicht sichtbar wenn Vertragsarzt = 'Nein'", () => {
      const rule = getRule("OFF_ARZT_AMBULANTE_STRUKTUR")!;
      expect(
        evaluateCondition(rule.condition, { OFF_ARZT_VERTRAGSARZT_ERFAHRUNG: "Nein" }),
      ).toBe(false);
    });

    it("nicht sichtbar ohne Antwort", () => {
      const rule = getRule("OFF_ARZT_AMBULANTE_STRUKTUR")!;
      expect(evaluateCondition(rule.condition, {})).toBe(false);
    });
  });

  describe("OFF_ARZT_AMBULANTE_STRUKTUR_SONSTIGE – contains 'Sonstige'", () => {
    it("Rule vorhanden", () => {
      expect(getRule("OFF_ARZT_AMBULANTE_STRUKTUR_SONSTIGE")?.action).toBe("showQuestion");
    });

    it("sichtbar wenn 'Sonstige' allein", () => {
      const rule = getRule("OFF_ARZT_AMBULANTE_STRUKTUR_SONSTIGE")!;
      expect(
        evaluateCondition(rule.condition, { OFF_ARZT_AMBULANTE_STRUKTUR: "Sonstige" }),
      ).toBe(true);
    });

    it("sichtbar wenn 'Sonstige' in Kombination", () => {
      const rule = getRule("OFF_ARZT_AMBULANTE_STRUKTUR_SONSTIGE")!;
      expect(
        evaluateCondition(rule.condition, {
          OFF_ARZT_AMBULANTE_STRUKTUR: "Hausarztpraxis, Sonstige",
        }),
      ).toBe(true);
    });

    it("nicht sichtbar ohne 'Sonstige'", () => {
      const rule = getRule("OFF_ARZT_AMBULANTE_STRUKTUR_SONSTIGE")!;
      expect(
        evaluateCondition(rule.condition, { OFF_ARZT_AMBULANTE_STRUKTUR: "MVZ, Hausarztpraxis" }),
      ).toBe(false);
    });
  });
});

describe("BEWERBER_ARZT_ORGA_TECHNIK – buildFrozenBlocks", () => {
  it("friert Block korrekt ein mit allen 5 Fragen", () => {
    const frozen = buildFrozenBlocks(
      [BLOCK_ID],
      OFFICE_BLOCK_CATALOG,
      OFFICE_QUESTION_CATALOG,
    );
    expect(frozen).toHaveLength(1);
    expect(frozen[0]!.questions).toHaveLength(5);
    expect(frozen[0]!.initiallyVisible).toBe(true);
  });

  it("beide ConditionalRules sind im Snapshot vorhanden", () => {
    const frozen = buildFrozenBlocks(
      [BLOCK_ID],
      OFFICE_BLOCK_CATALOG,
      OFFICE_QUESTION_CATALOG,
    );
    expect(frozen[0]!.conditionalRules).toHaveLength(2);
  });
});

describe("Bestehende Office-Blöcke – Regressionsprüfung", () => {
  const ALLE_ERWARTETEN_BLOCKS = [
    "BEWERBER_KONTAKT",
    "BEWERBER_AUSBILDUNG",
    "BEWERBER_BERUFSERFAHRUNG",
    "BEWERBER_ARZT_BASIS",
    "BEWERBER_ARZT_ZUSATZQUALIFIKATIONEN",
    "BEWERBER_ARZT_ORGA_TECHNIK",
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
    const orgaIdx = OFFICE_BLOCK_IDS_SORTED.indexOf("BEWERBER_ARZT_ORGA_TECHNIK");
    const zusatzIdx = OFFICE_BLOCK_IDS_SORTED.indexOf("BEWERBER_ARZT_ZUSATZQUALIFIKATIONEN");
    const mfaIdx = OFFICE_BLOCK_IDS_SORTED.indexOf("BEWERBER_MFA_KOMPETENZEN");
    expect(orgaIdx).toBeGreaterThan(zusatzIdx);
    expect(orgaIdx).toBeLessThan(mfaIdx);
  });

  it("alle 12 Blöcke sind vorhanden", () => {
    for (const id of ALLE_ERWARTETEN_BLOCKS) {
      expect(OFFICE_BLOCK_CATALOG).toHaveProperty(id);
    }
  });

  it("buildFrozenBlocks aller 12 Blöcke läuft fehlerfrei durch", () => {
    expect(() =>
      buildFrozenBlocks(
        Object.keys(OFFICE_BLOCK_CATALOG),
        OFFICE_BLOCK_CATALOG,
        OFFICE_QUESTION_CATALOG,
      ),
    ).not.toThrow();
  });

  it("BEWERBER_ARZT_ZUSATZQUALIFIKATIONEN – OR-Conditional bleibt intakt", () => {
    const rule = OFFICE_BLOCK_CATALOG["BEWERBER_ARZT_ZUSATZQUALIFIKATIONEN"]
      ?.conditionalRules?.find((r) => r.targetId === "OFF_ARZT_SONOGRAPHIE_BEREICHE");
    expect(rule?.condition).toMatchObject({ mode: "OR" });
  });
});
