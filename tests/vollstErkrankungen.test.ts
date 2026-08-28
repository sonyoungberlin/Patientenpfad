/**
 * Phase-2-Tests: VOLLST_ERKRANKUNGEN – repeatable_group, Sanitizer, Krankenblatt.
 *
 * Abdeckung:
 *  1. Gate Nein → Detailgruppe unsichtbar (Conditional Logic)
 *  2. Gate Ja → Detailgruppe sichtbar
 *  3. Einen Erkrankungseintrag – Sanitizer akzeptiert
 *  4. Mehrere Erkrankungseinträge – alle erhalten
 *  5. Eintrag entfernen (leeres Array → kein Wert gespeichert)
 *  6. Diagnose unbekannt + Medikament vorhanden
 *  7. Facharzt-Felder erscheinen nur bei facharzt = "Ja"
 *  8. Sanitizer akzeptiert nur bekannte Keys
 *  9. Ungültiges JSON wird robust behandelt
 * 10. Zu lange Werte werden begrenzt
 * 11. Krankenblatt-Ausgabe ist strukturiert lesbar
 * 12. FACHAERZTE-Test bleibt grün (Regressions-Check)
 * 13. Phase-1-Conditional-Logic-Tests bleiben grün
 */

import { sanitizeAnswers } from "@/lib/questionnaire/sanitizeAnswers";
import { buildMedicalRecordNote } from "@/lib/questionnaire/buildMedicalRecordNote";
import { QUESTION_CATALOG, BLOCK_CATALOG } from "@/lib/questionnaire/blockCatalog";
import { computeVisibleQuestionIds } from "@/lib/questionnaire/conditionalLogic";

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

const GATE_ID = "VOLLST_ERKR_GATE";
const ENTRIES_ID = "VOLLST_ERKR_EINTRAEGE";

const allBlockIds = [GATE_ID, ENTRIES_ID];

const pilotRules = BLOCK_CATALOG.VOLLST_ERKRANKUNGEN.conditionalRules ?? [];

function makeEntry(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    diagnose: "Arterielle Hypertonie",
    diagnose_unbekannt: "",
    seit_wann: "vor 5–10 Jahren",
    status: "aktuell in Behandlung / regelmäßiger Kontrolle",
    facharzt: "Ja",
    facharzt_fachrichtung: "Kardiologie",
    facharzt_name: "Dr. Herz",
    facharzt_ort: "Berlin",
    medikamente: "Ja",
    medikamente_welche: "Ramipril 5 mg",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1 + 2: Conditional Logic – Gate steuert Sichtbarkeit
// ---------------------------------------------------------------------------

describe("VOLLST_ERKRANKUNGEN – Conditional Logic (Gate)", () => {
  it('Gate = "Nein" → VOLLST_ERKR_EINTRAEGE unsichtbar', () => {
    const visible = computeVisibleQuestionIds(pilotRules, allBlockIds, {
      [GATE_ID]: "Nein",
    });
    expect(visible.has(ENTRIES_ID)).toBe(false);
    expect(visible.has(GATE_ID)).toBe(true);
  });

  it('Gate = "Ja" → VOLLST_ERKR_EINTRAEGE sichtbar', () => {
    const visible = computeVisibleQuestionIds(pilotRules, allBlockIds, {
      [GATE_ID]: "Ja",
    });
    expect(visible.has(ENTRIES_ID)).toBe(true);
    expect(visible.has(GATE_ID)).toBe(true);
  });

  it("Gate leer → VOLLST_ERKR_EINTRAEGE unsichtbar (Standardzustand)", () => {
    const visible = computeVisibleQuestionIds(pilotRules, allBlockIds, {});
    expect(visible.has(ENTRIES_ID)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3 + 4: Sanitizer – ein und mehrere Einträge
// ---------------------------------------------------------------------------

describe("VOLLST_ERKRANKUNGEN – Sanitizer", () => {
  const questions = [{ id: ENTRIES_ID }];

  it("Sanitizer akzeptiert einen validen Eintrag", () => {
    const raw = { [ENTRIES_ID]: JSON.stringify([makeEntry()]) };
    const sanitized = sanitizeAnswers(raw, questions);
    const result = JSON.parse(sanitized[ENTRIES_ID]!);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].diagnose).toBe("Arterielle Hypertonie");
    expect(result[0].facharzt_fachrichtung).toBe("Kardiologie");
  });

  it("Sanitizer akzeptiert mehrere Einträge", () => {
    const raw = {
      [ENTRIES_ID]: JSON.stringify([
        makeEntry({ diagnose: "Diabetes Typ 2" }),
        makeEntry({ diagnose: "Depression", facharzt: "Nein" }),
      ]),
    };
    const sanitized = sanitizeAnswers(raw, questions);
    const result = JSON.parse(sanitized[ENTRIES_ID]!);
    expect(result).toHaveLength(2);
    expect(result[0].diagnose).toBe("Diabetes Typ 2");
    expect(result[1].diagnose).toBe("Depression");
  });

  // 5: Leeres Array
  it("Leeres Array → kein Wert im sanitisierten Output", () => {
    const raw = { [ENTRIES_ID]: JSON.stringify([]) };
    const sanitized = sanitizeAnswers(raw, questions);
    expect(sanitized[ENTRIES_ID]).toBeUndefined();
  });

  // 6: Diagnose unbekannt + Medikament vorhanden
  it("Diagnose unbekannt + Medikament bekannt – wird korrekt gespeichert", () => {
    const entry = makeEntry({
      diagnose: "",
      diagnose_unbekannt: "ja",
      medikamente: "Ja",
      medikamente_welche: "Metformin",
    });
    const raw = { [ENTRIES_ID]: JSON.stringify([entry]) };
    const sanitized = sanitizeAnswers(raw, questions);
    const result = JSON.parse(sanitized[ENTRIES_ID]!);
    expect(result[0].diagnose).toBe("");
    expect(result[0].diagnose_unbekannt).toBe("ja");
    expect(result[0].medikamente_welche).toBe("Metformin");
  });

  // 7: Facharzt-Felder
  it("Facharzt = Nein – facharzt_* Felder werden gespeichert aber sind im Schema definiert", () => {
    const entry = makeEntry({ facharzt: "Nein", facharzt_fachrichtung: "Kardiologie" });
    const raw = { [ENTRIES_ID]: JSON.stringify([entry]) };
    const sanitized = sanitizeAnswers(raw, questions);
    const result = JSON.parse(sanitized[ENTRIES_ID]!);
    // Sanitizer speichert alle Keys – die Conditional-Logik liegt im Client
    expect(result[0].facharzt).toBe("Nein");
    expect(result[0].facharzt_fachrichtung).toBe("Kardiologie");
  });

  // 8: Unbekannte Keys werden verworfen
  it("Sanitizer verwirft unbekannte Keys", () => {
    const entry = {
      ...makeEntry(),
      unbekannter_key: "Angriff",
      __proto__: "payload",
    };
    const raw = { [ENTRIES_ID]: JSON.stringify([entry]) };
    const sanitized = sanitizeAnswers(raw, questions);
    const result = JSON.parse(sanitized[ENTRIES_ID]!);
    expect(Object.hasOwn(result[0], "unbekannter_key")).toBe(false);
    // __proto__ via Prototypkette – testen ob als eigene Property injiziert
    expect(Object.hasOwn(result[0], "__proto__")).toBe(false);
  });

  // 9: Ungültiges JSON
  it("Ungültiges JSON → kein Output (robust)", () => {
    const raw = { [ENTRIES_ID]: "das ist kein json{{{" };
    const sanitized = sanitizeAnswers(raw, questions);
    expect(sanitized[ENTRIES_ID]).toBeUndefined();
  });

  it("JSON-Array statt Objekt im Eintrag → wird übersprungen", () => {
    const raw = { [ENTRIES_ID]: JSON.stringify([["a", "b"]]) };
    const sanitized = sanitizeAnswers(raw, questions);
    expect(sanitized[ENTRIES_ID]).toBeUndefined();
  });

  // 10: Zu lange Werte
  it("Zu lange Werte werden auf MAX_ANSWER_LENGTH begrenzt", () => {
    const longValue = "A".repeat(3000);
    const entry = makeEntry({ diagnose: longValue });
    const raw = { [ENTRIES_ID]: JSON.stringify([entry]) };
    const sanitized = sanitizeAnswers(raw, questions);
    const result = JSON.parse(sanitized[ENTRIES_ID]!);
    expect(result[0].diagnose.length).toBeLessThanOrEqual(2000);
  });

  it("Mehr als maxEntries (20) Einträge werden auf 20 begrenzt", () => {
    const entries = Array.from({ length: 25 }, (_, i) =>
      makeEntry({ diagnose: `Erkrankung ${i + 1}` }),
    );
    const raw = { [ENTRIES_ID]: JSON.stringify(entries) };
    const sanitized = sanitizeAnswers(raw, questions);
    const result = JSON.parse(sanitized[ENTRIES_ID]!);
    expect(result.length).toBeLessThanOrEqual(20);
  });
});

// ---------------------------------------------------------------------------
// 11: Krankenblatt-Ausgabe
// ---------------------------------------------------------------------------

describe("VOLLST_ERKRANKUNGEN – Krankenblatt-Ausgabe", () => {
  it("Ein Eintrag mit Facharzt und Medikament ist strukturiert lesbar", () => {
    const answers = {
      [GATE_ID]: "ja",
      [ENTRIES_ID]: JSON.stringify([makeEntry()]),
    };
    const note = buildMedicalRecordNote({
      answers,
      selected_block_ids: ["VOLLST_ERKRANKUNGEN"],
    });

    expect(note).toContain("Erkrankungen und Medikamente (vollständig)");
    expect(note).toContain("1. Eintrag:");
    expect(note).toContain("Erkrankung / Diagnose: Arterielle Hypertonie");
    expect(note).toContain("Fachrichtung: Kardiologie");
    expect(note).toContain("Name des Facharztes / der Praxis: Dr. Herz");
    expect(note).toContain("Welche Medikamente?");
    expect(note).toContain("Ramipril 5 mg");
  });

  it("Zwei Einträge erscheinen nacheinander", () => {
    const answers = {
      [GATE_ID]: "ja",
      [ENTRIES_ID]: JSON.stringify([
        makeEntry({ diagnose: "Diabetes Typ 2" }),
        makeEntry({ diagnose: "Bluthochdruck", facharzt: "Nein" }),
      ]),
    };
    const note = buildMedicalRecordNote({
      answers,
      selected_block_ids: ["VOLLST_ERKRANKUNGEN"],
    });

    expect(note).toContain("1. Eintrag:");
    expect(note).toContain("Diabetes Typ 2");
    expect(note).toContain("2. Eintrag:");
    expect(note).toContain("Bluthochdruck");
  });

  it("Bedingte Facharzt-Felder fehlen bei facharzt = Nein in der Ausgabe", () => {
    const answers = {
      [GATE_ID]: "ja",
      [ENTRIES_ID]: JSON.stringify([
        makeEntry({ facharzt: "Nein", facharzt_fachrichtung: "Kardiologie" }),
      ]),
    };
    const note = buildMedicalRecordNote({
      answers,
      selected_block_ids: ["VOLLST_ERKRANKUNGEN"],
    });

    expect(note).not.toContain("Fachrichtung: Kardiologie");
  });

  it("Gate-Frage ohne Einträge → kein Blockinhalt", () => {
    const answers = { [GATE_ID]: "nein" };
    const note = buildMedicalRecordNote({
      answers,
      selected_block_ids: ["VOLLST_ERKRANKUNGEN"],
    });
    // Nur Gate-Frage ausgegeben, keine Eintrags-Zeilen
    expect(note).not.toContain("1. Eintrag:");
  });
});

// ---------------------------------------------------------------------------
// diagnose_unbekannt – Checkbox-Verhalten (Phase 2 Korrektur)
// ---------------------------------------------------------------------------

describe("diagnose_unbekannt – Checkbox-Verhalten", () => {
  const schema = QUESTION_CATALOG.VOLLST_ERKR_EINTRAEGE.groupSchema!;

  // 1: Schema-Kontrakt: diagnose ist conditional auf diagnose_unbekannt
  it("diagnose.conditionalOn zeigt auf diagnose_unbekannt mit conditionalValue ''", () => {
    const diagnoseFeld = schema.find((f) => f.key === "diagnose")!;
    expect(diagnoseFeld.conditionalOn).toBe("diagnose_unbekannt");
    expect(diagnoseFeld.conditionalValue).toBe("");
  });

  // 2: diagnose_unbekannt ist Checkbox-Typ
  it("diagnose_unbekannt hat type checkbox", () => {
    const unbekanntFeld = schema.find((f) => f.key === "diagnose_unbekannt")!;
    expect(unbekanntFeld.type).toBe("checkbox");
    expect(unbekanntFeld.label).toContain("nicht bekannt");
  });

  // 3: Krankenblatt – Checkbox gesetzt → diagnose verborgen, auch wenn Wert vorhanden
  it("Diagnose-Feld fehlt in Krankenblatt wenn diagnose_unbekannt = ja (auch bei bestehendem Wert)", () => {
    const answers = {
      [GATE_ID]: "ja",
      [ENTRIES_ID]: JSON.stringify([
        makeEntry({ diagnose: "Arterielle Hypertonie", diagnose_unbekannt: "ja" }),
      ]),
    };
    const note = buildMedicalRecordNote({
      answers,
      selected_block_ids: ["VOLLST_ERKRANKUNGEN"],
    });
    // diagnose ist conditional auf diagnose_unbekannt = "" → bei "ja" ausgeblendet
    expect(note).not.toContain("Erkrankung / Diagnose: Arterielle Hypertonie");
    // Die Checkbox selbst erscheint
    expect(note).toContain("nicht bekannt");
  });

  // 4: Checkbox nicht gesetzt → diagnose sichtbar in Krankenblatt
  it("Diagnose-Feld erscheint in Krankenblatt wenn diagnose_unbekannt = ''", () => {
    const answers = {
      [GATE_ID]: "ja",
      [ENTRIES_ID]: JSON.stringify([
        makeEntry({ diagnose: "Diabetes Typ 2", diagnose_unbekannt: "" }),
      ]),
    };
    const note = buildMedicalRecordNote({
      answers,
      selected_block_ids: ["VOLLST_ERKRANKUNGEN"],
    });
    expect(note).toContain("Erkrankung / Diagnose: Diabetes Typ 2");
  });

  // 5: Diagnose unbekannt + Medikament → gültiger Eintrag im Sanitizer
  it("Diagnose unbekannt + Medikament bekannt → gültiger Eintrag", () => {
    const entry = {
      diagnose: "",
      diagnose_unbekannt: "ja",
      seit_wann: "",
      status: "",
      facharzt: "",
      facharzt_fachrichtung: "",
      facharzt_name: "",
      facharzt_ort: "",
      medikamente: "Ja",
      medikamente_welche: "Metformin 500 mg",
    };
    const raw = { [ENTRIES_ID]: JSON.stringify([entry]) };
    const sanitized = sanitizeAnswers(raw, [{ id: ENTRIES_ID }]);
    const result = JSON.parse(sanitized[ENTRIES_ID]!);
    expect(result).toHaveLength(1);
    expect(result[0].diagnose_unbekannt).toBe("ja");
    expect(result[0].medikamente_welche).toBe("Metformin 500 mg");
  });

  // 6: Diagnose unbekannt + Facharzt → gültiger Eintrag
  it("Diagnose unbekannt + Facharzt bekannt → gültiger Eintrag", () => {
    const entry = {
      diagnose: "",
      diagnose_unbekannt: "ja",
      seit_wann: "",
      status: "",
      facharzt: "Ja",
      facharzt_fachrichtung: "Kardiologie",
      facharzt_name: "Dr. Herz",
      facharzt_ort: "Berlin",
      medikamente: "",
      medikamente_welche: "",
    };
    const raw = { [ENTRIES_ID]: JSON.stringify([entry]) };
    const sanitized = sanitizeAnswers(raw, [{ id: ENTRIES_ID }]);
    const result = JSON.parse(sanitized[ENTRIES_ID]!);
    expect(result).toHaveLength(1);
    expect(result[0].diagnose_unbekannt).toBe("ja");
    expect(result[0].facharzt_name).toBe("Dr. Herz");
    // Krankenblatt zeigt Facharzt, aber nicht diagnose
    const note = buildMedicalRecordNote({
      answers: { [GATE_ID]: "ja", [ENTRIES_ID]: sanitized[ENTRIES_ID]! },
      selected_block_ids: ["VOLLST_ERKRANKUNGEN"],
    });
    expect(note).toContain("Dr. Herz");
    expect(note).not.toContain("Erkrankung / Diagnose:");
  });
});

// ---------------------------------------------------------------------------
// 12: FACHAERZTE-Regressions-Check
// ---------------------------------------------------------------------------

describe("FACHAERZTE – Regressions-Check (Phase 2 darf nichts brechen)", () => {
  it("FACHAERZTE sanitizeAnswers + Krankenblatt funktioniert weiterhin", () => {
    const raw = {
      FACHAERZTE: JSON.stringify([
        { erkrankung: "Diabetes", bereich: "Innere Medizin", name: "Dr. Schmidt", adresse: "" },
      ]),
    };
    const sanitized = sanitizeAnswers(raw, [{ id: "FACHAERZTE" }]);
    expect(sanitized.FACHAERZTE).toBeDefined();

    const note = buildMedicalRecordNote({
      answers: sanitized,
      selected_block_ids: ["FACHAERZTE"],
    });
    expect(note).toContain("Diabetes");
    expect(note).toContain("Dr. Schmidt");
  });
});

// ---------------------------------------------------------------------------
// 13: Phase-1-Conditional-Logic – Regressions-Check
// ---------------------------------------------------------------------------

describe("Phase-1-Pilotregel – Regressions-Check", () => {
  const phase1Rules = BLOCK_CATALOG.KURZANAMNESE.conditionalRules ?? [];
  const phase1Ids = ["ANAMNESE_GP", "ANAMNESE_GP_NAME"];

  it('ANAMNESE_GP = "ja" → ANAMNESE_GP_NAME sichtbar', () => {
    const visible = computeVisibleQuestionIds(phase1Rules, phase1Ids, {
      ANAMNESE_GP: "ja",
    });
    expect(visible.has("ANAMNESE_GP_NAME")).toBe(true);
  });

  it('ANAMNESE_GP = "nein" → ANAMNESE_GP_NAME unsichtbar', () => {
    const visible = computeVisibleQuestionIds(phase1Rules, phase1Ids, {
      ANAMNESE_GP: "nein",
    });
    expect(visible.has("ANAMNESE_GP_NAME")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Katalog-Struktur
// ---------------------------------------------------------------------------

describe("VOLLST_ERKRANKUNGEN – Katalog-Struktur", () => {
  it("VOLLST_ERKR_GATE ist korrekt im QUESTION_CATALOG", () => {
    const def = QUESTION_CATALOG.VOLLST_ERKR_GATE;
    expect(def).toBeDefined();
    expect(def.type).toBe("select");
    expect(def.required).toBe(true);
    expect(def.options).toContain("Ja");
    expect(def.options).toContain("Nein");
    expect(def.options).toContain("Wei\u00df ich nicht / unsicher");
  });

  it("VOLLST_ERKR_EINTRAEGE ist repeatable_group mit groupSchema", () => {
    const def = QUESTION_CATALOG.VOLLST_ERKR_EINTRAEGE;
    expect(def).toBeDefined();
    expect(def.type).toBe("repeatable_group");
    expect(Array.isArray(def.groupSchema)).toBe(true);
    expect(def.groupSchema!.length).toBeGreaterThan(0);
    expect(def.maxEntries).toBe(20);
  });

  it("groupSchema enthält alle erwarteten Felder", () => {
    const schema = QUESTION_CATALOG.VOLLST_ERKR_EINTRAEGE.groupSchema!;
    const keys = schema.map((f) => f.key);
    expect(keys).toContain("diagnose");
    expect(keys).toContain("diagnose_unbekannt");
    expect(keys).toContain("seit_wann");
    expect(keys).toContain("status");
    expect(keys).toContain("facharzt");
    expect(keys).toContain("facharzt_fachrichtung");
    expect(keys).toContain("facharzt_name");
    expect(keys).toContain("facharzt_ort");
    expect(keys).toContain("medikamente");
    expect(keys).toContain("medikamente_welche");
  });

  it("facharzt_* und medikamente_welche haben conditionalOn konfiguriert", () => {
    const schema = QUESTION_CATALOG.VOLLST_ERKR_EINTRAEGE.groupSchema!;
    const facharztFields = schema.filter((f) => f.conditionalOn === "facharzt");
    expect(facharztFields.length).toBe(3);
    const medFields = schema.filter((f) => f.conditionalOn === "medikamente");
    expect(medFields.length).toBe(1);
  });

  it("VOLLST_ERKRANKUNGEN-Block ist im BLOCK_CATALOG mit displayOrder 140", () => {
    const block = BLOCK_CATALOG.VOLLST_ERKRANKUNGEN;
    expect(block).toBeDefined();
    expect(block.displayOrder).toBe(140);
    expect(block.questionIds).toContain("VOLLST_ERKR_GATE");
    expect(block.questionIds).toContain("VOLLST_ERKR_EINTRAEGE");
    expect(block.conditionalRules?.length).toBe(1);
  });
});
