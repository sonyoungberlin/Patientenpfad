/**
 * Tests für die praxisseitige Ausgabe von Fragebogen-Antworten:
 *   - formatAnswer.ts: parseRepeatableGroupEntries, parseFacharztEntries, buildDerivedValueLines
 *   - buildMedicalRecordNote: repeatable_group, yes_no, Visibility, Berechnete Werte
 */

import {
  parseRepeatableGroupEntries,
  parseFacharztEntries,
  buildDerivedValueLines,
  formatYesNoValue,
} from "../lib/questionnaire/formatAnswer";
import { buildMedicalRecordNote } from "../lib/questionnaire/buildMedicalRecordNote";
import { buildFrozenBlocks } from "../lib/questionnaire/frozenBlocks";
import type { QuestionDefinition } from "../lib/questionnaire/blockCatalog";
import type { DerivedValues } from "../lib/questionnaire/derivedValues";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRepGroupQuestion(overrides?: Partial<QuestionDefinition>): QuestionDefinition {
  return {
    id: "TEST_REPGROUP",
    text: "Test-Gruppe",
    type: "repeatable_group",
    required: false,
    groupSchema: [
      { key: "erkrankung", label: "Erkrankung / Diagnose", type: "text", required: true },
      { key: "seit_wann", label: "Seit wann bekannt", type: "select", required: false },
      { key: "dauermedikation", label: "Dauermedikation", type: "yes_no", required: false },
      {
        key: "medikament",
        label: "Medikament",
        type: "text",
        required: false,
        conditionalOn: "dauermedikation",
        conditionalValue: "ja",
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// formatYesNoValue
// ---------------------------------------------------------------------------

describe("formatYesNoValue", () => {
  it("normalisiert 'ja' → 'Ja'", () => {
    expect(formatYesNoValue("ja")).toBe("Ja");
  });
  it("normalisiert 'nein' → 'Nein'", () => {
    expect(formatYesNoValue("nein")).toBe("Nein");
  });
  it("gibt andere Werte unverändert zurück", () => {
    expect(formatYesNoValue("Ja, aktuell")).toBe("Ja, aktuell");
    expect(formatYesNoValue("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// parseRepeatableGroupEntries
// ---------------------------------------------------------------------------

describe("parseRepeatableGroupEntries", () => {
  it("gibt [] für ungültiges JSON zurück", () => {
    const q = makeRepGroupQuestion();
    expect(parseRepeatableGroupEntries("{invalid}", q.id, q)).toEqual([]);
  });

  it("gibt [] für leeres Array zurück", () => {
    const q = makeRepGroupQuestion();
    expect(parseRepeatableGroupEntries("[]", q.id, q)).toEqual([]);
  });

  it("gibt [] zurück wenn kein groupSchema", () => {
    expect(
      parseRepeatableGroupEntries('[{"a":"b"}]', "UNBEKANNT"),
    ).toEqual([]);
  });

  it("parst einfachen Eintrag korrekt", () => {
    const q = makeRepGroupQuestion();
    const json = JSON.stringify([{ erkrankung: "Diabetes", seit_wann: "vor 2–5 Jahren" }]);
    const result = parseRepeatableGroupEntries(json, q.id, q);
    expect(result).toHaveLength(1);
    expect(result[0].index).toBe(1);
    expect(result[0].fields).toContainEqual({
      label: "Erkrankung / Diagnose",
      value: "Diabetes",
      fieldType: "text",
    });
    expect(result[0].fields).toContainEqual({
      label: "Seit wann bekannt",
      value: "vor 2–5 Jahren",
      fieldType: "select",
    });
  });

  it("nummeriert mehrere Einträge", () => {
    const q = makeRepGroupQuestion();
    const json = JSON.stringify([
      { erkrankung: "Diabetes" },
      { erkrankung: "Hypertonie" },
    ]);
    const result = parseRepeatableGroupEntries(json, q.id, q);
    expect(result).toHaveLength(2);
    expect(result[0].index).toBe(1);
    expect(result[1].index).toBe(2);
  });

  it("überspringt leere Felder", () => {
    const q = makeRepGroupQuestion();
    const json = JSON.stringify([{ erkrankung: "Diabetes", seit_wann: "" }]);
    const result = parseRepeatableGroupEntries(json, q.id, q);
    expect(result[0].fields.map((f) => f.label)).not.toContain("Seit wann bekannt");
  });

  it("respektiert conditionalOn: verbirgt bedingte Felder wenn Gate nicht erfüllt", () => {
    const q = makeRepGroupQuestion();
    // dauermedikation = "nein" → medikament-Feld soll NICHT erscheinen
    const json = JSON.stringify([
      { erkrankung: "Diabetes", dauermedikation: "nein", medikament: "Metformin" },
    ]);
    const result = parseRepeatableGroupEntries(json, q.id, q);
    const labels = result[0].fields.map((f) => f.label);
    expect(labels).not.toContain("Medikament");
  });

  it("zeigt bedingte Felder wenn Gate erfüllt ist", () => {
    const q = makeRepGroupQuestion();
    // dauermedikation = "ja" → medikament-Feld soll erscheinen
    const json = JSON.stringify([
      { erkrankung: "Diabetes", dauermedikation: "ja", medikament: "Metformin" },
    ]);
    const result = parseRepeatableGroupEntries(json, q.id, q);
    const labels = result[0].fields.map((f) => f.label);
    expect(labels).toContain("Medikament");
  });

  it("normalisiert yes_no-Felder innerhalb der Einträge", () => {
    const q = makeRepGroupQuestion();
    const json = JSON.stringify([
      { erkrankung: "Diabetes", dauermedikation: "ja" },
    ]);
    const result = parseRepeatableGroupEntries(json, q.id, q);
    const dvField = result[0].fields.find((f) => f.label === "Dauermedikation");
    expect(dvField?.value).toBe("Ja");
  });

  it("überspringt Einträge ohne sichtbare Felder", () => {
    const q = makeRepGroupQuestion();
    const json = JSON.stringify([{ seit_wann: "" }]);
    const result = parseRepeatableGroupEntries(json, q.id, q);
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// parseFacharztEntries
// ---------------------------------------------------------------------------

describe("parseFacharztEntries", () => {
  it("gibt [] für ungültiges JSON zurück", () => {
    expect(parseFacharztEntries("nein")).toEqual([]);
  });

  it("gibt [] für leeres Array zurück", () => {
    expect(parseFacharztEntries("[]")).toEqual([]);
  });

  it("parst einen Eintrag korrekt", () => {
    const json = JSON.stringify([
      { erkrankung: "Herzrhythmusstörungen", bereich: "Kardiologie", name: "Dr. Müller", adresse: "" },
    ]);
    const result = parseFacharztEntries(json);
    expect(result).toHaveLength(1);
    expect(result[0].index).toBe(1);
    const labels = result[0].fields.map((f) => f.label);
    expect(labels).toContain("Erkrankung / Grund");
    expect(labels).toContain("Facharztbereich");
    expect(labels).toContain("Name Facharzt/Praxis");
    // Leere Adresse → nicht im Output
    expect(labels).not.toContain("Adresse");
  });

  it("nummeriert mehrere Einträge korrekt", () => {
    const json = JSON.stringify([
      { erkrankung: "Erkrankung1" },
      { bereich: "Orthopädie", name: "Praxis" },
    ]);
    const result = parseFacharztEntries(json);
    expect(result[0].index).toBe(1);
    expect(result[1].index).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// buildDerivedValueLines
// ---------------------------------------------------------------------------

describe("buildDerivedValueLines", () => {
  it("gibt leere Liste zurück wenn keine Werte vorhanden", () => {
    expect(buildDerivedValueLines({})).toEqual([]);
  });

  it("formatiert AGE korrekt als ganzzahlige Jahre", () => {
    expect(buildDerivedValueLines({ AGE: 44 })).toContain("Alter: 44 Jahre");
  });

  it("rundet AGE auf ganze Zahl", () => {
    expect(buildDerivedValueLines({ AGE: 44.9 })).toContain("Alter: 45 Jahre");
  });

  it("formatiert BMI mit einer Nachkommastelle und deutschem Komma", () => {
    expect(buildDerivedValueLines({ BMI: 25.74 })).toContain("BMI: 25,7 kg/m²");
  });

  it("formatiert Pack-Years als ganze Zahl wenn ohne Nachkommastelle", () => {
    expect(buildDerivedValueLines({ PACK_YEARS: 15 })).toContain("Pack-Years: 15");
  });

  it("formatiert Pack-Years mit einer Nachkommastelle bei Dezimalwert", () => {
    expect(buildDerivedValueLines({ PACK_YEARS: 15.5 })).toContain("Pack-Years: 15,5");
  });

  it("zeigt SMOKING_DURATION_YEARS NICHT an", () => {
    const lines = buildDerivedValueLines({ SMOKING_DURATION_YEARS: 10 });
    expect(lines.some((l) => l.includes("Rauchdauer"))).toBe(false);
    expect(lines).toHaveLength(0);
  });

  it("zeigt alle drei Werte wenn vorhanden", () => {
    const lines = buildDerivedValueLines({ AGE: 44, BMI: 29.4, PACK_YEARS: 15 });
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe("Alter: 44 Jahre");
    expect(lines[1]).toBe("BMI: 29,4 kg/m²");
    expect(lines[2]).toBe("Pack-Years: 15");
  });
});

// ---------------------------------------------------------------------------
// buildMedicalRecordNote – repeatable_group (VOLLST_ERKR_EINTRAEGE)
// ---------------------------------------------------------------------------

describe("buildMedicalRecordNote – repeatable_group-Antworten", () => {
  it("gibt VOLLST_ERKR_EINTRAEGE strukturiert aus (kein rohes JSON)", () => {
    const json = JSON.stringify([
      { diagnose: "Diabetes", seit_wann: "vor 2\u20135 Jahren" },
    ]);
    const result = buildMedicalRecordNote({
      answers: {
        VOLLST_ERKR_GATE: "Ja",
        VOLLST_ERKR_EINTRAEGE: json,
      },
      selected_block_ids: ["VOLLST_ERKRANKUNGEN"],
    });
    // Kein rohes JSON
    expect(result).not.toContain('{"diagnose"');
    // Strukturierte Ausgabe
    expect(result).toContain("Diabetes");
    expect(result).toContain("1. Eintrag");
  });

  it("gibt VOLLST_ALLERG_EINTRAEGE strukturiert aus", () => {
    const json = JSON.stringify([{ allergie: "Pollen", reaktion: "Schnupfen" }]);
    const result = buildMedicalRecordNote({
      answers: {
        VOLLST_ALLERG_GATE: "Ja",
        VOLLST_ALLERG_EINTRAEGE: json,
      },
      selected_block_ids: ["VOLLST_ALLERGIEN"],
    });
    expect(result).not.toContain('{"allergie"');
    expect(result).toContain("Pollen");
    expect(result).toContain("1. Eintrag");
  });

  it("nummeriert mehrere VOLLST_ERKR_EINTRAEGE-Einträge korrekt", () => {
    const json = JSON.stringify([
      { diagnose: "Diabetes" },
      { diagnose: "Hypertonie" },
    ]);
    const result = buildMedicalRecordNote({
      answers: {
        VOLLST_ERKR_GATE: "Ja",
        VOLLST_ERKR_EINTRAEGE: json,
      },
      selected_block_ids: ["VOLLST_ERKRANKUNGEN"],
    });
    const lines = result.split("\n");
    expect(lines.some((l) => l.includes("1. Eintrag"))).toBe(true);
    expect(lines.some((l) => l.includes("2. Eintrag"))).toBe(true);
    expect(lines.some((l) => l.includes("Diabetes"))).toBe(true);
    expect(lines.some((l) => l.includes("Hypertonie"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildMedicalRecordNote – Visibility-Filter (Frozen Path)
// ---------------------------------------------------------------------------

describe("buildMedicalRecordNote – Visibility-Filterung (Frozen Path)", () => {
  it("VOLLST_ERKR_GATE='Nein' → VOLLST_ERKR_EINTRAEGE nicht ausgegeben", () => {
    const json = JSON.stringify([{ diagnose: "Diabetes" }]);
    const frozenBlocks = buildFrozenBlocks(["VOLLST_ERKRANKUNGEN"]);
    const result = buildMedicalRecordNote({
      answers: {
        VOLLST_ERKR_GATE: "Nein",
        VOLLST_ERKR_EINTRAEGE: json,
      },
      selected_block_ids: ["VOLLST_ERKRANKUNGEN"],
      frozenBlocks,
    });
    expect(result).not.toContain("Diabetes");
    expect(result).not.toContain("Erkrankungen und Medikamente:");
  });

  it("ALKOHOL_GATE='Nein' → Folgefragen nicht im Krankenblatt", () => {
    const frozenBlocks = buildFrozenBlocks(["VOLLST_ALKOHOL"]);
    const result = buildMedicalRecordNote({
      answers: {
        ALKOHOL_GATE: "Nein",
        ALKOHOL_HAEUFIGKEIT: "täglich",
        ALKOHOL_MENGE: "3 Gläser",
      },
      selected_block_ids: ["VOLLST_ALKOHOL"],
      frozenBlocks,
    });
    expect(result).not.toContain("täglich");
    expect(result).not.toContain("3 Gläser");
  });

  it("VOLLST_VERS_PFLEGEGRAD='Nein' → Stufe nicht ausgegeben", () => {
    const frozenBlocks = buildFrozenBlocks(["VOLLST_VERSORGUNGSSTATUS"]);
    const result = buildMedicalRecordNote({
      answers: {
        VOLLST_VERS_PFLEGEGRAD: "Nein",
        VOLLST_VERS_PFLEGEGRAD_STUFE: "Pflegegrad 2",
      },
      selected_block_ids: ["VOLLST_VERSORGUNGSSTATUS"],
      frozenBlocks,
    });
    expect(result).not.toContain("Pflegegrad 2");
  });

  it("VOLLST_VERS_PFLEGEGRAD='Ja' → Stufe wird ausgegeben", () => {
    const frozenBlocks = buildFrozenBlocks(["VOLLST_VERSORGUNGSSTATUS"]);
    const result = buildMedicalRecordNote({
      answers: {
        VOLLST_VERS_PFLEGEGRAD: "Ja",
        VOLLST_VERS_PFLEGEGRAD_STUFE: "Pflegegrad 2",
      },
      selected_block_ids: ["VOLLST_VERSORGUNGSSTATUS"],
      frozenBlocks,
    });
    expect(result).toContain("Pflegegrad 2");
  });

  it("VOLLST_VERS_PROTHESEN='Nein' → Prothesen-Text nicht ausgegeben", () => {
    const frozenBlocks = buildFrozenBlocks(["VOLLST_VERSORGUNGSSTATUS"]);
    const result = buildMedicalRecordNote({
      answers: {
        VOLLST_VERS_PROTHESEN: "Nein",
        VOLLST_VERS_PROTHESEN_TEXT: "Hüftprothese links",
      },
      selected_block_ids: ["VOLLST_VERSORGUNGSSTATUS"],
      frozenBlocks,
    });
    expect(result).not.toContain("Hüftprothese links");
  });

  it("NIKOTIN_GATE='nie geraucht' → Zigarettendetails nicht ausgegeben", () => {
    // NIKOTIN_ZIG_PRO_TAG wird nur gezeigt wenn NIKOTIN_PRODUKT = "Zigaretten".
    // Wenn NIKOTIN_PRODUKT leer → ZIG_PRO_TAG ist controlled und versteckt.
    const frozenBlocks = buildFrozenBlocks(["VOLLST_NIKOTIN"]);
    const result = buildMedicalRecordNote({
      answers: {
        NIKOTIN_GATE: "nie geraucht",
        // NIKOTIN_PRODUKT absichtlich NICHT gesetzt → NIKOTIN_ZIG_PRO_TAG versteckt
        NIKOTIN_ZIG_PRO_TAG: "20",
        NIKOTIN_DAUER_JAHRE: "10",
      },
      selected_block_ids: ["VOLLST_NIKOTIN"],
      frozenBlocks,
    });
    expect(result).not.toContain("20");
    expect(result).not.toContain("10");
  });
});

// ---------------------------------------------------------------------------
// buildMedicalRecordNote – Berechnete Werte
// ---------------------------------------------------------------------------

describe("buildMedicalRecordNote – Berechnete Werte", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-06-15T12:00:00Z"));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("enthält AGE-Zeile wenn IDENTITY_BIRTHDATE angegeben", () => {
    // Geburtsdatum 1980-01-01 → Alter 44 (vor Geburtstag noch nicht erreicht, aber 15. Juni > 1. Jan → 44)
    const result = buildMedicalRecordNote({
      answers: { IDENTITY_BIRTHDATE: "1980-01-01" },
      selected_block_ids: ["IDENTITAET"],
    });
    const lines = result.split("\n");
    expect(lines).toContain("Berechnete Werte");
    expect(lines).toContain("Alter: 44 Jahre");
  });

  it("enthält BMI-Zeile wenn Größe und Gewicht angegeben", () => {
    const result = buildMedicalRecordNote({
      answers: {
        VOLLST_HEIGHT: "180",
        VOLLST_WEIGHT: "80",
      },
      selected_block_ids: ["VOLLST_BASISDATEN"],
    });
    const lines = result.split("\n");
    expect(lines).toContain("Berechnete Werte");
    // BMI = 80 / 1.8^2 = 24.69 → 24,7
    expect(lines).toContain("BMI: 24,7 kg/m²");
  });

  it("zeigt KEINEN Berechnete-Werte-Abschnitt wenn nichts berechnet werden kann", () => {
    const result = buildMedicalRecordNote({
      answers: { AU_SYMPTOMS: "Husten" },
      selected_block_ids: ["ARBEITSUNFAEHIGKEIT"],
    });
    expect(result).not.toContain("Berechnete Werte");
  });

  it("enthält Pack-Years wenn NIKOTIN-Daten vollständig", () => {
    const result = buildMedicalRecordNote({
      answers: {
        NIKOTIN_GATE: "Ja, aktuell",
        NIKOTIN_PRODUKT: "Zigaretten",
        NIKOTIN_ZIG_PRO_TAG: "20",
        NIKOTIN_DAUER_JAHRE: "15",
      },
      selected_block_ids: ["VOLLST_NIKOTIN"],
    });
    const lines = result.split("\n");
    expect(lines).toContain("Berechnete Werte");
    expect(lines).toContain("Pack-Years: 15");
  });
});

// ---------------------------------------------------------------------------
// buildMedicalRecordNote – yes_no-Normalisierung
// ---------------------------------------------------------------------------

describe("buildMedicalRecordNote – yes_no-Normalisierung", () => {
  it("normalisiert 'ja' → 'Ja' für yes_no-Felder", () => {
    const result = buildMedicalRecordNote({
      answers: { CONTACT_DOCTOLIB: "ja" },
      selected_block_ids: ["KONTAKT"],
    });
    const lines = result.split("\n");
    expect(lines.some((l) => l === "Doctolib: Ja")).toBe(true);
    expect(lines.some((l) => l.includes("Doctolib: ja"))).toBe(false);
  });

  it("normalisiert 'nein' → 'Nein' für yes_no-Felder", () => {
    const result = buildMedicalRecordNote({
      answers: { CONTACT_DOCTOLIB: "nein" },
      selected_block_ids: ["KONTAKT"],
    });
    const lines = result.split("\n");
    expect(lines.some((l) => l === "Doctolib: Nein")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildMedicalRecordNote – FACHAERZTE weiterhin korrekt
// ---------------------------------------------------------------------------

describe("buildMedicalRecordNote – FACHAERZTE bleibt korrekt", () => {
  it("gibt FACHAERZTE strukturiert aus", () => {
    const result = buildMedicalRecordNote({
      answers: {
        FACHAERZTE: JSON.stringify([
          { erkrankung: "Herzrhythmusstörungen", bereich: "Kardiologie", name: "Dr. Müller", adresse: "" },
        ]),
      },
      selected_block_ids: ["FACHAERZTE"],
    });
    const lines = result.split("\n");
    expect(lines).toContain("Fachärzte");
    expect(lines.some((l) => l.includes("1. Eintrag"))).toBe(true);
    expect(lines.some((l) => l.includes("Herzrhythmusstörungen"))).toBe(true);
    expect(lines.some((l) => l.includes("Kardiologie"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildMedicalRecordNote – keine medizinische Bewertung
// ---------------------------------------------------------------------------

describe("buildMedicalRecordNote – keine medizinische Bewertung", () => {
  it("enthält keine medizinische Empfehlung oder Diagnose", () => {
    const result = buildMedicalRecordNote({
      answers: { VOLLST_HEIGHT: "187", VOLLST_WEIGHT: "110" },
      selected_block_ids: ["VOLLST_BASISDATEN"],
    });
    expect(result).not.toContain("übergewichtig");
    expect(result).not.toContain("Normalgewicht");
    expect(result).not.toContain("Adipositas");
    expect(result).not.toContain("empfehlen");
    expect(result).not.toContain("Risiko");
  });
});
