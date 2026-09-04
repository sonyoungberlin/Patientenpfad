/**
 * Phase-3B-Tests: Nikotin, Alkohol, Substanzen.
 *
 * Abdeckung:
 *  VOLLST_NIKOTIN
 *   1.  Gate "Nein" → alle Detailfragen unsichtbar
 *   2.  Gate "Ja, aktuell" → Rauchdaten sichtbar (Produkt, Dauer, Aufhörversuch, Motivation, Unterstützung)
 *   3.  Gate "Früher, inzwischen aufgehört" → Produkt + Dauer + AUFGEHOERT_VOR sichtbar
 *   4.  Gate "Früher" → NIKOTIN_MOTIVATION und NIKOTIN_UNTERSTUETZUNG NICHT sichtbar
 *   5.  Gate "Früher" → NIKOTIN_AUFHOERVERSUCH NICHT sichtbar
 *   6.  Produkt = "Zigaretten" → NIKOTIN_ZIG_PRO_TAG sichtbar
 *   7.  Produkt = "Pfeife" → NIKOTIN_ZIG_PRO_TAG NICHT sichtbar
 *   8.  Produkt = "anderes" → NIKOTIN_PRODUKT_ANDERE sichtbar
 *   9.  Aufhörversuch "Ja, ohne Unterstützung" → NIKOTIN_RAUCHFREI_DAUER sichtbar
 *  10.  Aufhörversuch "Ja, mit Unterstützung" → NIKOTIN_RAUCHFREI_DAUER sichtbar
 *  11.  Aufhörversuch "Nein" → NIKOTIN_RAUCHFREI_DAUER NICHT sichtbar
 *  12.  Sanitizer + Krankenblatt: Rauchstatus erscheint
 *
 *  VOLLST_ALKOHOL
 *  13.  Gate "Nein" → alles außer Gate unsichtbar
 *  14.  Gate "Ja, gelegentlich" → nur FRUEHER_MEHR sichtbar
 *  15.  Gate "Ja, gelegentlich" → HAEUFIGKEIT, MENGE, VERSUCH, MOTIVATION, UNTERSTUETZUNG NICHT sichtbar
 *  16.  Gate "Ja, regelmäßig" → HAEUFIGKEIT, MENGE, VERSUCH sichtbar
 *  17.  Gate "Ja, regelmäßig" → FRUEHER_MEHR NICHT sichtbar
 *  18.  Gelegentlich + FRUEHER_MEHR = "Ja" → BEHANDLUNG sichtbar (multi-rule OR)
 *  19.  Gelegentlich + FRUEHER_MEHR = "Nein" → BEHANDLUNG NICHT sichtbar
 *  20.  Gate = "Ja, regelmäßig" → BEHANDLUNG sichtbar
 *  21.  BEHANDLUNG = "Ja, aktuell" → Behandlungsfelder sichtbar
 *  22.  BEHANDLUNG = "Ja, früher" → Behandlungsfelder sichtbar
 *  23.  BEHANDLUNG = "Nein" → Behandlungsfelder NICHT sichtbar
 *  24.  Gate "Ja, regelmäßig" → MOTIVATION + UNTERSTUETZUNG sichtbar
 *  25.  Gate "Ja, gelegentlich" → MOTIVATION + UNTERSTUETZUNG NICHT sichtbar
 *  26.  Sanitizer + Krankenblatt: Alkohol erscheint
 *
 *  VOLLST_SUBSTANZEN
 *  27.  Gate "Nein" → SUBST_EINTRAEGE unsichtbar
 *  28.  Gate "Ja, aktuell" → SUBST_EINTRAEGE sichtbar
 *  29.  Gate "Früher" → SUBST_EINTRAEGE sichtbar
 *  30.  Sanitizer: mehrere Einträge gespeichert
 *  31.  Sanitizer: unbekannte Keys verworfen
 *  32.  status = "früher" → beendet_wann im Krankenblatt
 *  33.  status = "aktuell" → beendet_wann NICHT im Krankenblatt
 *  34.  behandlung ∈ {aktuell, früher} → Behandlungsfelder im Krankenblatt
 *  35.  behandlung = "Nein" → Behandlungsfelder NICHT im Krankenblatt
 *  36.  status = "aktuell" → reduktion_wunsch im Krankenblatt
 *  37.  status = "früher" → reduktion_wunsch NICHT im Krankenblatt
 *  38.  substanz = "andere" → substanz_andere im Krankenblatt
 *  39.  substanz ≠ "andere" → substanz_andere NICHT im Krankenblatt
 *  40.  Zwei Einträge → nummeriert ausgegeben
 *
 *  REGRESSION
 *  41.  Phase-1 Pilotregel: KURZANAMNESE conditionalRules vorhanden
 *  42.  Phase-2 Gate: VOLLST_ERKRANKUNGEN vorhanden
 *  43.  Phase-3A: VOLLST_ALLERGIEN + VOLLST_IMPFSTATUS vorhanden
 *  44.  Neue Blöcke im BLOCK_CATALOG registriert
 */

import { sanitizeAnswers } from "@/lib/questionnaire/sanitizeAnswers";
import { buildMedicalRecordNote } from "@/lib/questionnaire/buildMedicalRecordNote";
import { QUESTION_CATALOG, BLOCK_CATALOG } from "@/lib/questionnaire/blockCatalog";
import { computeVisibleQuestionIds } from "@/lib/questionnaire/conditionalLogic";

// ---------------------------------------------------------------------------
// Helfer – Substanz-Eintrag
// ---------------------------------------------------------------------------

function substanzEntry(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    substanz: "Cannabis",
    substanz_andere: "",
    status: "fr\u00fcher",
    haeufigkeit: "w\u00f6chentlich",
    dauer: "ca. 5 Jahre",
    beendet_wann: "vor 3 Jahren",
    probleme: "Nein",
    abstinenzversuch: "Nein",
    behandlung: "Nein",
    behandlung_art: "",
    behandlung_name: "",
    behandlung_ort: "",
    reduktion_wunsch: "",
    unterstuetzung_wunsch: "",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// VOLLST_NIKOTIN – Conditional Logic
// ---------------------------------------------------------------------------

describe("VOLLST_NIKOTIN \u2013 Conditional Logic", () => {
  const rules = BLOCK_CATALOG.VOLLST_NIKOTIN.conditionalRules ?? [];
  const allIds = BLOCK_CATALOG.VOLLST_NIKOTIN.questionIds;

  it('Gate "Nein, nie regelm\u00e4\u00dfig" \u2192 alle Detailfragen unsichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, {
      NIKOTIN_GATE: "Nein, nie regelm\u00e4\u00dfig",
    });
    expect(visible.has("NIKOTIN_GATE")).toBe(true);
    expect(visible.has("NIKOTIN_PRODUKT")).toBe(false);
    expect(visible.has("NIKOTIN_BEGINN_JAHR")).toBe(false);
    expect(visible.has("NIKOTIN_BEGINN_VOR")).toBe(false);
    expect(visible.has("NIKOTIN_AUFHOERVERSUCH")).toBe(false);
    expect(visible.has("NIKOTIN_MOTIVATION")).toBe(false);
    expect(visible.has("NIKOTIN_UNTERSTUETZUNG")).toBe(false);
    expect(visible.has("NIKOTIN_AUFGEHOERT_VOR")).toBe(false);
  });

  it('Gate "Ja, aktuell" \u2192 Rauchdaten sichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, { NIKOTIN_GATE: "Ja, aktuell" });
    expect(visible.has("NIKOTIN_PRODUKT")).toBe(true);
    expect(visible.has("NIKOTIN_BEGINN_JAHR")).toBe(true);
    expect(visible.has("NIKOTIN_BEGINN_VOR")).toBe(true);
    expect(visible.has("NIKOTIN_AUFHOERVERSUCH")).toBe(true);
    expect(visible.has("NIKOTIN_MOTIVATION")).toBe(true);
    expect(visible.has("NIKOTIN_UNTERSTUETZUNG")).toBe(true);
  });

  it('Gate "Ja, aktuell" \u2192 NIKOTIN_AUFGEHOERT_VOR NICHT sichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, { NIKOTIN_GATE: "Ja, aktuell" });
    expect(visible.has("NIKOTIN_AUFGEHOERT_VOR")).toBe(false);
  });

  it('Gate "Fr\u00fcher, inzwischen aufgeh\u00f6rt" \u2192 Produkt + Dauer + AUFGEHOERT_VOR sichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, {
      NIKOTIN_GATE: "Fr\u00fcher, inzwischen aufgeh\u00f6rt",
    });
    expect(visible.has("NIKOTIN_PRODUKT")).toBe(true);
    expect(visible.has("NIKOTIN_BEGINN_JAHR")).toBe(true);
    expect(visible.has("NIKOTIN_BEGINN_VOR")).toBe(true);
    expect(visible.has("NIKOTIN_AUFGEHOERT_VOR")).toBe(true);
    expect(visible.has("NIKOTIN_AUFGEHOERT_JAHR")).toBe(true);
  });

  it('Gate "Fr\u00fcher" \u2192 MOTIVATION und UNTERSTUETZUNG NICHT sichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, {
      NIKOTIN_GATE: "Fr\u00fcher, inzwischen aufgeh\u00f6rt",
    });
    expect(visible.has("NIKOTIN_MOTIVATION")).toBe(false);
    expect(visible.has("NIKOTIN_UNTERSTUETZUNG")).toBe(false);
  });

  it('Gate "Fr\u00fcher" \u2192 AUFHOERVERSUCH NICHT sichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, {
      NIKOTIN_GATE: "Fr\u00fcher, inzwischen aufgeh\u00f6rt",
    });
    expect(visible.has("NIKOTIN_AUFHOERVERSUCH")).toBe(false);
  });

  it('Produkt = "Zigaretten" \u2192 NIKOTIN_ZIG_PRO_TAG sichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, {
      NIKOTIN_GATE: "Ja, aktuell",
      NIKOTIN_PRODUKT: "Zigaretten",
    });
    expect(visible.has("NIKOTIN_ZIG_PRO_TAG")).toBe(true);
  });

  it('Produkt = "Pfeife" \u2192 NIKOTIN_ZIG_PRO_TAG NICHT sichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, {
      NIKOTIN_GATE: "Ja, aktuell",
      NIKOTIN_PRODUKT: "Pfeife",
    });
    expect(visible.has("NIKOTIN_ZIG_PRO_TAG")).toBe(false);
  });

  it('Produkt = "anderes" \u2192 NIKOTIN_PRODUKT_ANDERE sichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, {
      NIKOTIN_GATE: "Ja, aktuell",
      NIKOTIN_PRODUKT: "anderes",
    });
    expect(visible.has("NIKOTIN_PRODUKT_ANDERE")).toBe(true);
  });

  it('Aufh\u00f6rversuch "Ja, ohne Unterst\u00fctzung" \u2192 NIKOTIN_RAUCHFREI_DAUER sichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, {
      NIKOTIN_GATE: "Ja, aktuell",
      NIKOTIN_AUFHOERVERSUCH: "Ja, ohne professionelle Unterst\u00fctzung",
    });
    expect(visible.has("NIKOTIN_RAUCHFREI_DAUER")).toBe(true);
  });

  it('Aufh\u00f6rversuch "Ja, mit Unterst\u00fctzung" \u2192 NIKOTIN_RAUCHFREI_DAUER sichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, {
      NIKOTIN_GATE: "Ja, aktuell",
      NIKOTIN_AUFHOERVERSUCH: "Ja, mit professioneller Unterst\u00fctzung",
    });
    expect(visible.has("NIKOTIN_RAUCHFREI_DAUER")).toBe(true);
  });

  it('Aufh\u00f6rversuch "Nein" \u2192 NIKOTIN_RAUCHFREI_DAUER NICHT sichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, {
      NIKOTIN_GATE: "Ja, aktuell",
      NIKOTIN_AUFHOERVERSUCH: "Nein",
    });
    expect(visible.has("NIKOTIN_RAUCHFREI_DAUER")).toBe(false);
  });
});

describe("VOLLST_NIKOTIN \u2013 Sanitizer + Krankenblatt", () => {
  it("Sanitizer speichert Rauchstatus als Flat-Antwort", () => {
    const raw = { NIKOTIN_GATE: "Ja, aktuell", NIKOTIN_DAUER_JAHRE: "15" };
    const questions = [{ id: "NIKOTIN_GATE" }, { id: "NIKOTIN_DAUER_JAHRE" }];
    const result = sanitizeAnswers(raw, questions);
    expect(result.NIKOTIN_GATE).toBe("Ja, aktuell");
    expect(result.NIKOTIN_DAUER_JAHRE).toBe("15");
  });

  it("Krankenblatt enth\u00e4lt Rauchstatus", () => {
    const note = buildMedicalRecordNote({
      answers: {
        NIKOTIN_GATE: "Ja, aktuell",
        NIKOTIN_DAUER_JAHRE: "15",
        NIKOTIN_ZIG_PRO_TAG: "10",
      },
      selected_block_ids: ["VOLLST_NIKOTIN"],
    });
    expect(note).toContain("Rauchstatus");
    expect(note).toContain("Ja, aktuell");
  });
});

// ---------------------------------------------------------------------------
// VOLLST_ALKOHOL – Conditional Logic
// ---------------------------------------------------------------------------

describe("VOLLST_ALKOHOL \u2013 Conditional Logic", () => {
  const rules = BLOCK_CATALOG.VOLLST_ALKOHOL.conditionalRules ?? [];
  const allIds = BLOCK_CATALOG.VOLLST_ALKOHOL.questionIds;

  it('Gate "Nein" \u2192 alles au\u00dfer Gate unsichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, { ALKOHOL_GATE: "Nein" });
    expect(visible.has("ALKOHOL_GATE")).toBe(true);
    expect(visible.has("ALKOHOL_FRUEHER_MEHR")).toBe(false);
    expect(visible.has("ALKOHOL_HAEUFIGKEIT")).toBe(false);
    expect(visible.has("ALKOHOL_MENGE")).toBe(false);
    expect(visible.has("ALKOHOL_VERSUCH")).toBe(false);
    expect(visible.has("ALKOHOL_BEHANDLUNG")).toBe(false);
    expect(visible.has("ALKOHOL_MOTIVATION")).toBe(false);
    expect(visible.has("ALKOHOL_UNTERSTUETZUNG")).toBe(false);
  });

  it('Gate "Ja, gelegentlich" \u2192 FRUEHER_MEHR sichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, { ALKOHOL_GATE: "Ja, gelegentlich" });
    expect(visible.has("ALKOHOL_FRUEHER_MEHR")).toBe(true);
  });

  it('Gate "Ja, gelegentlich" \u2192 H\u00e4ufigkeit, Menge, Versuch, Motivation, Unterst\u00fctzung NICHT sichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, { ALKOHOL_GATE: "Ja, gelegentlich" });
    expect(visible.has("ALKOHOL_HAEUFIGKEIT")).toBe(false);
    expect(visible.has("ALKOHOL_MENGE")).toBe(false);
    expect(visible.has("ALKOHOL_VERSUCH")).toBe(false);
    expect(visible.has("ALKOHOL_MOTIVATION")).toBe(false);
    expect(visible.has("ALKOHOL_UNTERSTUETZUNG")).toBe(false);
  });

  it('Gate "Ja, regelm\u00e4\u00dfig" \u2192 H\u00e4ufigkeit, Menge, Versuch sichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, { ALKOHOL_GATE: "Ja, regelm\u00e4\u00dfig" });
    expect(visible.has("ALKOHOL_HAEUFIGKEIT")).toBe(true);
    expect(visible.has("ALKOHOL_MENGE")).toBe(true);
    expect(visible.has("ALKOHOL_VERSUCH")).toBe(true);
  });

  it('Gate "Ja, regelm\u00e4\u00dfig" \u2192 FRUEHER_MEHR NICHT sichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, { ALKOHOL_GATE: "Ja, regelm\u00e4\u00dfig" });
    expect(visible.has("ALKOHOL_FRUEHER_MEHR")).toBe(false);
  });

  it('Gelegentlich + FRUEHER_MEHR = "Ja" \u2192 BEHANDLUNG sichtbar (multi-rule OR)', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, {
      ALKOHOL_GATE: "Ja, gelegentlich",
      ALKOHOL_FRUEHER_MEHR: "Ja",
    });
    expect(visible.has("ALKOHOL_BEHANDLUNG")).toBe(true);
  });

  it('Gelegentlich + FRUEHER_MEHR = "Nein" \u2192 BEHANDLUNG NICHT sichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, {
      ALKOHOL_GATE: "Ja, gelegentlich",
      ALKOHOL_FRUEHER_MEHR: "Nein",
    });
    expect(visible.has("ALKOHOL_BEHANDLUNG")).toBe(false);
  });

  it('Gate "Ja, regelm\u00e4\u00dfig" \u2192 BEHANDLUNG sichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, { ALKOHOL_GATE: "Ja, regelm\u00e4\u00dfig" });
    expect(visible.has("ALKOHOL_BEHANDLUNG")).toBe(true);
  });

  it('BEHANDLUNG = "Ja, aktuell" \u2192 Behandlungsfelder sichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, {
      ALKOHOL_GATE: "Ja, regelm\u00e4\u00dfig",
      ALKOHOL_BEHANDLUNG: "Ja, aktuell",
    });
    expect(visible.has("ALKOHOL_BEHANDLUNG_ART")).toBe(true);
    expect(visible.has("ALKOHOL_BEHANDLUNG_NAME")).toBe(true);
    expect(visible.has("ALKOHOL_BEHANDLUNG_ORT")).toBe(true);
  });

  it('BEHANDLUNG = "Ja, fr\u00fcher" \u2192 Behandlungsfelder sichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, {
      ALKOHOL_GATE: "Ja, regelm\u00e4\u00dfig",
      ALKOHOL_BEHANDLUNG: "Ja, fr\u00fcher",
    });
    expect(visible.has("ALKOHOL_BEHANDLUNG_ART")).toBe(true);
    expect(visible.has("ALKOHOL_BEHANDLUNG_NAME")).toBe(true);
    expect(visible.has("ALKOHOL_BEHANDLUNG_ORT")).toBe(true);
  });

  it('BEHANDLUNG = "Nein" \u2192 Behandlungsfelder NICHT sichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, {
      ALKOHOL_GATE: "Ja, regelm\u00e4\u00dfig",
      ALKOHOL_BEHANDLUNG: "Nein",
    });
    expect(visible.has("ALKOHOL_BEHANDLUNG_ART")).toBe(false);
    expect(visible.has("ALKOHOL_BEHANDLUNG_NAME")).toBe(false);
    expect(visible.has("ALKOHOL_BEHANDLUNG_ORT")).toBe(false);
  });

  it('Gate "Ja, regelm\u00e4\u00dfig" \u2192 MOTIVATION + UNTERSTUETZUNG sichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, { ALKOHOL_GATE: "Ja, regelm\u00e4\u00dfig" });
    expect(visible.has("ALKOHOL_MOTIVATION")).toBe(true);
    expect(visible.has("ALKOHOL_UNTERSTUETZUNG")).toBe(true);
  });

  it('Gate "Ja, gelegentlich" \u2192 MOTIVATION + UNTERSTUETZUNG NICHT sichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, { ALKOHOL_GATE: "Ja, gelegentlich" });
    expect(visible.has("ALKOHOL_MOTIVATION")).toBe(false);
    expect(visible.has("ALKOHOL_UNTERSTUETZUNG")).toBe(false);
  });
});

describe("VOLLST_ALKOHOL \u2013 Sanitizer + Krankenblatt", () => {
  it("Sanitizer speichert Alkohol-Antworten", () => {
    const raw = { ALKOHOL_GATE: "Ja, regelm\u00e4\u00dfig", ALKOHOL_HAEUFIGKEIT: "t\u00e4glich oder fast t\u00e4glich" };
    const questions = [{ id: "ALKOHOL_GATE" }, { id: "ALKOHOL_HAEUFIGKEIT" }];
    const result = sanitizeAnswers(raw, questions);
    expect(result.ALKOHOL_GATE).toBe("Ja, regelm\u00e4\u00dfig");
    expect(result.ALKOHOL_HAEUFIGKEIT).toBe("t\u00e4glich oder fast t\u00e4glich");
  });

  it("Krankenblatt enth\u00e4lt Alkohol-Label", () => {
    const note = buildMedicalRecordNote({
      answers: { ALKOHOL_GATE: "Ja, regelm\u00e4\u00dfig" },
      selected_block_ids: ["VOLLST_ALKOHOL"],
    });
    expect(note).toContain("Alkohol");
    expect(note).toContain("regelm\u00e4\u00dfig");
  });
});

// ---------------------------------------------------------------------------
// VOLLST_SUBSTANZEN – Conditional Logic
// ---------------------------------------------------------------------------

describe("VOLLST_SUBSTANZEN \u2013 Conditional Logic (Gate)", () => {
  const rules = BLOCK_CATALOG.VOLLST_SUBSTANZEN.conditionalRules ?? [];
  const allIds = BLOCK_CATALOG.VOLLST_SUBSTANZEN.questionIds;

  it('Gate "Nein" \u2192 SUBST_EINTRAEGE unsichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, { SUBST_GATE: "Nein" });
    expect(visible.has("SUBST_GATE")).toBe(true);
    expect(visible.has("SUBST_EINTRAEGE")).toBe(false);
  });

  it('Gate "Ja, aktuell" \u2192 SUBST_EINTRAEGE sichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, { SUBST_GATE: "Ja, aktuell" });
    expect(visible.has("SUBST_EINTRAEGE")).toBe(true);
  });

  it('Gate "Fr\u00fcher" \u2192 SUBST_EINTRAEGE sichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, { SUBST_GATE: "Fr\u00fcher" });
    expect(visible.has("SUBST_EINTRAEGE")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// VOLLST_SUBSTANZEN – Sanitizer
// ---------------------------------------------------------------------------

describe("VOLLST_SUBSTANZEN \u2013 Sanitizer", () => {
  const questions = [{ id: "SUBST_GATE" }, { id: "SUBST_EINTRAEGE" }];

  it("Sanitizer speichert mehrere Eintr\u00e4ge", () => {
    const raw = {
      SUBST_GATE: "Ja, aktuell",
      SUBST_EINTRAEGE: JSON.stringify([
        substanzEntry({ substanz: "Cannabis", status: "aktuell" }),
        substanzEntry({ substanz: "Kokain", status: "fr\u00fcher" }),
      ]),
    };
    const sanitized = sanitizeAnswers(raw, questions);
    const entries = JSON.parse(sanitized.SUBST_EINTRAEGE!);
    expect(entries).toHaveLength(2);
    expect(entries[0].substanz).toBe("Cannabis");
    expect(entries[1].substanz).toBe("Kokain");
  });

  it("Sanitizer verwirft unbekannte Keys", () => {
    const raw = {
      SUBST_GATE: "Ja, aktuell",
      SUBST_EINTRAEGE: JSON.stringify([
        { ...substanzEntry(), unbekanntesfeld: "Rauschen", nocheins: "x" },
      ]),
    };
    const sanitized = sanitizeAnswers(raw, questions);
    const entry = JSON.parse(sanitized.SUBST_EINTRAEGE!)[0];
    expect(entry.unbekanntesfeld).toBeUndefined();
    expect(entry.nocheins).toBeUndefined();
    expect(entry.substanz).toBe("Cannabis");
  });
});

// ---------------------------------------------------------------------------
// VOLLST_SUBSTANZEN – Krankenblatt (conditionalOn-Logik in groupSchema)
// ---------------------------------------------------------------------------

describe("VOLLST_SUBSTANZEN \u2013 Krankenblatt", () => {
  it('status = "fr\u00fcher" \u2192 beendet_wann erscheint', () => {
    const note = buildMedicalRecordNote({
      answers: {
        SUBST_GATE: "Fr\u00fcher",
        SUBST_EINTRAEGE: JSON.stringify([
          substanzEntry({ status: "fr\u00fcher", beendet_wann: "vor 2 Jahren" }),
        ]),
      },
      selected_block_ids: ["VOLLST_SUBSTANZEN"],
    });
    expect(note).toContain("vor 2 Jahren");
  });

  it('status = "aktuell" \u2192 beendet_wann NICHT im Krankenblatt', () => {
    const note = buildMedicalRecordNote({
      answers: {
        SUBST_GATE: "Ja, aktuell",
        SUBST_EINTRAEGE: JSON.stringify([
          substanzEntry({ status: "aktuell", beendet_wann: "sollte-nicht-erscheinen" }),
        ]),
      },
      selected_block_ids: ["VOLLST_SUBSTANZEN"],
    });
    expect(note).not.toContain("sollte-nicht-erscheinen");
  });

  it('behandlung = "Ja, aktuell" \u2192 Behandlungsfelder im Krankenblatt', () => {
    const note = buildMedicalRecordNote({
      answers: {
        SUBST_GATE: "Ja, aktuell",
        SUBST_EINTRAEGE: JSON.stringify([
          substanzEntry({
            status: "aktuell",
            behandlung: "Ja, aktuell",
            behandlung_art: "Substitutionsbehandlung",
            behandlung_name: "Suchtambulanz Mitte",
            behandlung_ort: "Berlin",
          }),
        ]),
      },
      selected_block_ids: ["VOLLST_SUBSTANZEN"],
    });
    expect(note).toContain("Substitutionsbehandlung");
    expect(note).toContain("Suchtambulanz Mitte");
    expect(note).toContain("Berlin");
  });

  it('behandlung = "Ja, fr\u00fcher" \u2192 Behandlungsfelder im Krankenblatt', () => {
    const note = buildMedicalRecordNote({
      answers: {
        SUBST_GATE: "Fr\u00fcher",
        SUBST_EINTRAEGE: JSON.stringify([
          substanzEntry({
            status: "fr\u00fcher",
            behandlung: "Ja, fr\u00fcher",
            behandlung_art: "station\u00e4re Entzugsbehandlung",
            behandlung_name: "Klinik Nordsee",
            behandlung_ort: "Kiel",
          }),
        ]),
      },
      selected_block_ids: ["VOLLST_SUBSTANZEN"],
    });
    expect(note).toContain("station\u00e4re Entzugsbehandlung");
    expect(note).toContain("Klinik Nordsee");
  });

  it('behandlung = "Nein" \u2192 Behandlungsfelder NICHT im Krankenblatt', () => {
    const note = buildMedicalRecordNote({
      answers: {
        SUBST_GATE: "Fr\u00fcher",
        SUBST_EINTRAEGE: JSON.stringify([
          substanzEntry({ behandlung: "Nein", behandlung_art: "darf-nicht-erscheinen" }),
        ]),
      },
      selected_block_ids: ["VOLLST_SUBSTANZEN"],
    });
    expect(note).not.toContain("darf-nicht-erscheinen");
  });

  it('status = "aktuell" \u2192 reduktion_wunsch im Krankenblatt', () => {
    const note = buildMedicalRecordNote({
      answers: {
        SUBST_GATE: "Ja, aktuell",
        SUBST_EINTRAEGE: JSON.stringify([
          substanzEntry({ status: "aktuell", reduktion_wunsch: "Ja", beendet_wann: "" }),
        ]),
      },
      selected_block_ids: ["VOLLST_SUBSTANZEN"],
    });
    expect(note).toContain("reduzieren oder beenden");
  });

  it('status = "fr\u00fcher" \u2192 reduktion_wunsch NICHT im Krankenblatt', () => {
    const note = buildMedicalRecordNote({
      answers: {
        SUBST_GATE: "Fr\u00fcher",
        SUBST_EINTRAEGE: JSON.stringify([
          substanzEntry({ status: "fr\u00fcher", reduktion_wunsch: "Ja" }),
        ]),
      },
      selected_block_ids: ["VOLLST_SUBSTANZEN"],
    });
    expect(note).not.toContain("reduzieren oder beenden");
  });

  it('substanz = "andere" \u2192 substanz_andere im Krankenblatt', () => {
    const note = buildMedicalRecordNote({
      answers: {
        SUBST_GATE: "Ja, aktuell",
        SUBST_EINTRAEGE: JSON.stringify([
          substanzEntry({
            substanz: "andere",
            substanz_andere: "Lachgas",
            status: "aktuell",
            beendet_wann: "",
          }),
        ]),
      },
      selected_block_ids: ["VOLLST_SUBSTANZEN"],
    });
    expect(note).toContain("Lachgas");
  });

  it('substanz \u2260 "andere" \u2192 substanz_andere NICHT im Krankenblatt', () => {
    const note = buildMedicalRecordNote({
      answers: {
        SUBST_GATE: "Ja, aktuell",
        SUBST_EINTRAEGE: JSON.stringify([
          substanzEntry({
            substanz: "Cannabis",
            substanz_andere: "sollte-nicht-erscheinen",
            status: "aktuell",
            beendet_wann: "",
          }),
        ]),
      },
      selected_block_ids: ["VOLLST_SUBSTANZEN"],
    });
    expect(note).not.toContain("sollte-nicht-erscheinen");
  });

  it("Zwei Substanzen werden nummeriert ausgegeben", () => {
    const note = buildMedicalRecordNote({
      answers: {
        SUBST_GATE: "Ja, aktuell",
        SUBST_EINTRAEGE: JSON.stringify([
          substanzEntry({ substanz: "Cannabis", status: "aktuell", beendet_wann: "" }),
          substanzEntry({ substanz: "Alkopops", status: "fr\u00fcher", beendet_wann: "vor 1 Jahr" }),
        ]),
      },
      selected_block_ids: ["VOLLST_SUBSTANZEN"],
    });
    expect(note).toContain("1. Eintrag:");
    expect(note).toContain("2. Eintrag:");
    expect(note).toContain("Cannabis");
    expect(note).toContain("Alkopops");
  });
});

// ---------------------------------------------------------------------------
// REGRESSION
// ---------------------------------------------------------------------------

describe("Regression \u2013 Phase 1/2/3A", () => {
  it("Phase-1: KURZANAMNESE hat conditionalRules", () => {
    expect(Array.isArray(BLOCK_CATALOG.KURZANAMNESE.conditionalRules)).toBe(true);
    expect((BLOCK_CATALOG.KURZANAMNESE.conditionalRules ?? []).length).toBeGreaterThan(0);
  });

  it("Phase-2: VOLLST_ERKRANKUNGEN im BLOCK_CATALOG", () => {
    expect(BLOCK_CATALOG.VOLLST_ERKRANKUNGEN).toBeDefined();
  });

  it("Phase-3A: VOLLST_ALLERGIEN und VOLLST_IMPFSTATUS im BLOCK_CATALOG", () => {
    expect(BLOCK_CATALOG.VOLLST_ALLERGIEN).toBeDefined();
    expect(BLOCK_CATALOG.VOLLST_IMPFSTATUS).toBeDefined();
  });

  it("Phase-3B: neue Bl\u00f6cke im BLOCK_CATALOG registriert", () => {
    expect(BLOCK_CATALOG.VOLLST_NIKOTIN).toBeDefined();
    expect(BLOCK_CATALOG.VOLLST_ALKOHOL).toBeDefined();
    expect(BLOCK_CATALOG.VOLLST_SUBSTANZEN).toBeDefined();
  });

  it("Phase-3B: displayOrder korrekt gesetzt", () => {
    expect(BLOCK_CATALOG.VOLLST_NIKOTIN.displayOrder).toBe(200);
    expect(BLOCK_CATALOG.VOLLST_ALKOHOL.displayOrder).toBe(210);
    expect(BLOCK_CATALOG.VOLLST_SUBSTANZEN.displayOrder).toBe(220);
  });
});
