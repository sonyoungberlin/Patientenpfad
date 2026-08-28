/**
 * Phase-3A-Tests: Allergien, Infektionen, Familienanamnese, Impfstatus, Versorgungsstatus.
 *
 * Abdeckung:
 *  ALLERGIEN
 *    1. Gate Nein → Detailgruppe unsichtbar
 *    2. Gate Ja → Detailgruppe sichtbar
 *    3. Sanitizer – Reaktion gespeichert
 *    4. Behandlung aktuell → Arztfelder in Krankenblatt sichtbar (conditionalValues)
 *    5. Behandlung früher → Arztfelder in Krankenblatt sichtbar
 *    6. Behandlung nein → Arztfelder NICHT sichtbar
 *    7. Mehrere Einträge
 *  INFEKTIONEN
 *    8. Gate Nein → unsichtbar
 *    9. Gate Ja → sichtbar
 *   10. „andere" → Freitext gespeichert und im Krankenblatt sichtbar
 *   11. krankheit ≠ andere → Freitext NICHT im Krankenblatt
 *   12. Behandlung abgeschlossen (keine Arztfelder, kein Freitext)
 *   13. Arztfelder bei behandlung = Ja
 *   14. Medikamente bei medikamente = Ja
 *   15. Mehrere Einträge
 *  FAMILIENANAMNESE
 *   16. Gate Nein → unsichtbar
 *   17. Gate Ja → sichtbar
 *   18. Erkrankung + verwandtschaft (multi_select-String) gespeichert
 *   19. Mehrere Einträge
 *  IMPFSTATUS
 *   20. bekannt + Nachweis Ja → BERATUNG unsichtbar
 *   21. Impfstatus Nein → BERATUNG sichtbar (OR-Logik)
 *   22. Impfstatus Unsicher → BERATUNG sichtbar
 *   23. kein Nachweis (Nein) → BERATUNG sichtbar
 *   24. Ablehnung wird gespeichert
 *  VERSORGUNGSSTATUS
 *   25. Pflegegrad Ja → STUFE sichtbar
 *   26. Pflegegrad beantragt → STUFE unsichtbar
 *   27. GdB Ja → Wert sichtbar
 *   28. GdB beantragt → Wert unsichtbar
 *   29. Prothesen Ja → Freitext sichtbar
 *  REGRESSION
 *   30. Phase-1 Pilotregel grün
 *   31. Phase-2 VOLLST_ERKRANKUNGEN Gate grün
 *   32. Katalog-Struktur: alle neuen Blöcke im BLOCK_CATALOG
 */

import { sanitizeAnswers } from "@/lib/questionnaire/sanitizeAnswers";
import { buildMedicalRecordNote } from "@/lib/questionnaire/buildMedicalRecordNote";
import { QUESTION_CATALOG, BLOCK_CATALOG } from "@/lib/questionnaire/blockCatalog";
import { computeVisibleQuestionIds } from "@/lib/questionnaire/conditionalLogic";

// ---------------------------------------------------------------------------
// Helfer
// ---------------------------------------------------------------------------

function allergieEntry(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    allergie: "Penicillin",
    seit_wann: "vor 5–10 Jahren",
    reaktion: "Hautausschlag, Atemnot",
    behandlung: "aktuell in Behandlung / Kontrolle",
    arzt_fachrichtung: "Allergologie",
    arzt_name: "Dr. Haut",
    arzt_ort: "München",
    ...overrides,
  };
}

function infektionEntry(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    krankheit: "Hepatitis C",
    krankheit_andere: "",
    seit_wann: "vor 2–5 Jahren",
    status: "Behandlung abgeschlossen",
    behandlung: "Ja",
    arzt_fachrichtung: "Gastroenterologie",
    arzt_name: "Dr. Leber",
    arzt_ort: "Hamburg",
    medikamente: "Nein",
    medikamente_welche: "",
    ...overrides,
  };
}

function familieEntry(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    erkrankung: "Herzinfarkt",
    verwandtschaft: "Vater",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// VOLLST_ALLERGIEN
// ---------------------------------------------------------------------------

describe("VOLLST_ALLERGIEN – Conditional Logic (Gate)", () => {
  const rules = BLOCK_CATALOG.VOLLST_ALLERGIEN.conditionalRules ?? [];
  const allIds = ["VOLLST_ALLERG_GATE", "VOLLST_ALLERG_EINTRAEGE"];

  it('Gate = "Nein" → Detailgruppe unsichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, { VOLLST_ALLERG_GATE: "Nein" });
    expect(visible.has("VOLLST_ALLERG_EINTRAEGE")).toBe(false);
    expect(visible.has("VOLLST_ALLERG_GATE")).toBe(true);
  });

  it('Gate = "Ja" → Detailgruppe sichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, { VOLLST_ALLERG_GATE: "Ja" });
    expect(visible.has("VOLLST_ALLERG_EINTRAEGE")).toBe(true);
  });
});

describe("VOLLST_ALLERGIEN – Sanitizer + Krankenblatt", () => {
  const questions = [{ id: "VOLLST_ALLERG_EINTRAEGE" }];

  it("Sanitizer speichert Reaktion (Freitext)", () => {
    const raw = { VOLLST_ALLERG_EINTRAEGE: JSON.stringify([allergieEntry()]) };
    const sanitized = sanitizeAnswers(raw, questions);
    const result = JSON.parse(sanitized.VOLLST_ALLERG_EINTRAEGE!);
    expect(result[0].reaktion).toBe("Hautausschlag, Atemnot");
  });

  it('Behandlung "aktuell" → Arztfelder im Krankenblatt sichtbar (conditionalValues)', () => {
    const note = buildMedicalRecordNote({
      answers: {
        VOLLST_ALLERG_GATE: "Ja",
        VOLLST_ALLERG_EINTRAEGE: JSON.stringify([allergieEntry({ behandlung: "aktuell in Behandlung / Kontrolle" })]),
      },
      selected_block_ids: ["VOLLST_ALLERGIEN"],
    });
    expect(note).toContain("Allergologie");
    expect(note).toContain("Dr. Haut");
  });

  it('Behandlung "früher" → Arztfelder im Krankenblatt sichtbar', () => {
    const note = buildMedicalRecordNote({
      answers: {
        VOLLST_ALLERG_GATE: "Ja",
        VOLLST_ALLERG_EINTRAEGE: JSON.stringify([allergieEntry({ behandlung: "früher untersucht oder behandelt" })]),
      },
      selected_block_ids: ["VOLLST_ALLERGIEN"],
    });
    expect(note).toContain("Dr. Haut");
  });

  it('Behandlung "nein" → Arztfelder NICHT im Krankenblatt', () => {
    const note = buildMedicalRecordNote({
      answers: {
        VOLLST_ALLERG_GATE: "Ja",
        VOLLST_ALLERG_EINTRAEGE: JSON.stringify([allergieEntry({ behandlung: "nein" })]),
      },
      selected_block_ids: ["VOLLST_ALLERGIEN"],
    });
    expect(note).not.toContain("Dr. Haut");
    expect(note).not.toContain("Allergologie");
  });

  it("Mehrere Allergien werden nummeriert ausgegeben", () => {
    const raw = {
      VOLLST_ALLERG_EINTRAEGE: JSON.stringify([
        allergieEntry({ allergie: "Penicillin" }),
        allergieEntry({ allergie: "Hausstaub" }),
      ]),
    };
    const sanitized = sanitizeAnswers(raw, questions);
    const result = JSON.parse(sanitized.VOLLST_ALLERG_EINTRAEGE!);
    expect(result).toHaveLength(2);
    const note = buildMedicalRecordNote({
      answers: { VOLLST_ALLERG_GATE: "Ja", VOLLST_ALLERG_EINTRAEGE: sanitized.VOLLST_ALLERG_EINTRAEGE! },
      selected_block_ids: ["VOLLST_ALLERGIEN"],
    });
    expect(note).toContain("1. Eintrag:");
    expect(note).toContain("2. Eintrag:");
    expect(note).toContain("Hausstaub");
  });
});

// ---------------------------------------------------------------------------
// VOLLST_INFEKTIONEN
// ---------------------------------------------------------------------------

describe("VOLLST_INFEKTIONEN – Conditional Logic (Gate)", () => {
  const rules = BLOCK_CATALOG.VOLLST_INFEKTIONEN.conditionalRules ?? [];
  const allIds = ["VOLLST_INFEKT_GATE", "VOLLST_INFEKT_EINTRAEGE"];

  it('Gate = "Nein" → Detailgruppe unsichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, { VOLLST_INFEKT_GATE: "Nein" });
    expect(visible.has("VOLLST_INFEKT_EINTRAEGE")).toBe(false);
  });

  it('Gate = "Ja" → Detailgruppe sichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, { VOLLST_INFEKT_GATE: "Ja" });
    expect(visible.has("VOLLST_INFEKT_EINTRAEGE")).toBe(true);
  });
});

describe("VOLLST_INFEKTIONEN – Sanitizer + Krankenblatt", () => {
  const questions = [{ id: "VOLLST_INFEKT_EINTRAEGE" }];

  it('"andere" → Freitextfeld im Krankenblatt sichtbar', () => {
    const entry = infektionEntry({ krankheit: "andere", krankheit_andere: "MRSA" });
    const raw = { VOLLST_INFEKT_EINTRAEGE: JSON.stringify([entry]) };
    const sanitized = sanitizeAnswers(raw, questions);
    const note = buildMedicalRecordNote({
      answers: { VOLLST_INFEKT_GATE: "Ja", VOLLST_INFEKT_EINTRAEGE: sanitized.VOLLST_INFEKT_EINTRAEGE! },
      selected_block_ids: ["VOLLST_INFEKTIONEN"],
    });
    expect(note).toContain("MRSA");
  });

  it('Krankheit ≠ "andere" → Freitext NICHT im Krankenblatt', () => {
    const entry = infektionEntry({ krankheit: "HIV", krankheit_andere: "sollte nicht erscheinen" });
    const raw = { VOLLST_INFEKT_EINTRAEGE: JSON.stringify([entry]) };
    const sanitized = sanitizeAnswers(raw, questions);
    const note = buildMedicalRecordNote({
      answers: { VOLLST_INFEKT_GATE: "Ja", VOLLST_INFEKT_EINTRAEGE: sanitized.VOLLST_INFEKT_EINTRAEGE! },
      selected_block_ids: ["VOLLST_INFEKTIONEN"],
    });
    expect(note).not.toContain("sollte nicht erscheinen");
  });

  it("Behandlung abgeschlossen – Status korrekt gespeichert", () => {
    const entry = infektionEntry({ status: "Behandlung abgeschlossen", behandlung: "Nein" });
    const raw = { VOLLST_INFEKT_EINTRAEGE: JSON.stringify([entry]) };
    const sanitized = sanitizeAnswers(raw, questions);
    const result = JSON.parse(sanitized.VOLLST_INFEKT_EINTRAEGE!);
    expect(result[0].status).toBe("Behandlung abgeschlossen");
  });

  it('Arztfelder bei behandlung = "Ja" im Krankenblatt sichtbar', () => {
    const entry = infektionEntry({ behandlung: "Ja", arzt_name: "Dr. Leber" });
    const raw = { VOLLST_INFEKT_EINTRAEGE: JSON.stringify([entry]) };
    const sanitized = sanitizeAnswers(raw, questions);
    const note = buildMedicalRecordNote({
      answers: { VOLLST_INFEKT_GATE: "Ja", VOLLST_INFEKT_EINTRAEGE: sanitized.VOLLST_INFEKT_EINTRAEGE! },
      selected_block_ids: ["VOLLST_INFEKTIONEN"],
    });
    expect(note).toContain("Dr. Leber");
  });

  it('Arztfelder bei behandlung = "Nein" NICHT im Krankenblatt', () => {
    const entry = infektionEntry({ behandlung: "Nein" });
    const raw = { VOLLST_INFEKT_EINTRAEGE: JSON.stringify([entry]) };
    const sanitized = sanitizeAnswers(raw, questions);
    const note = buildMedicalRecordNote({
      answers: { VOLLST_INFEKT_GATE: "Ja", VOLLST_INFEKT_EINTRAEGE: sanitized.VOLLST_INFEKT_EINTRAEGE! },
      selected_block_ids: ["VOLLST_INFEKTIONEN"],
    });
    expect(note).not.toContain("Dr. Leber");
  });

  it('Medikamente bei medikamente = "Ja" im Krankenblatt sichtbar', () => {
    const entry = infektionEntry({ medikamente: "Ja", medikamente_welche: "Tenofovir" });
    const raw = { VOLLST_INFEKT_EINTRAEGE: JSON.stringify([entry]) };
    const sanitized = sanitizeAnswers(raw, questions);
    const note = buildMedicalRecordNote({
      answers: { VOLLST_INFEKT_GATE: "Ja", VOLLST_INFEKT_EINTRAEGE: sanitized.VOLLST_INFEKT_EINTRAEGE! },
      selected_block_ids: ["VOLLST_INFEKTIONEN"],
    });
    expect(note).toContain("Tenofovir");
  });

  it("Mehrere Einträge werden nummeriert ausgegeben", () => {
    const raw = {
      VOLLST_INFEKT_EINTRAEGE: JSON.stringify([
        infektionEntry({ krankheit: "HIV" }),
        infektionEntry({ krankheit: "Hepatitis B" }),
      ]),
    };
    const sanitized = sanitizeAnswers(raw, questions);
    const result = JSON.parse(sanitized.VOLLST_INFEKT_EINTRAEGE!);
    expect(result).toHaveLength(2);
    const note = buildMedicalRecordNote({
      answers: { VOLLST_INFEKT_GATE: "Ja", VOLLST_INFEKT_EINTRAEGE: sanitized.VOLLST_INFEKT_EINTRAEGE! },
      selected_block_ids: ["VOLLST_INFEKTIONEN"],
    });
    expect(note).toContain("1. Eintrag:");
    expect(note).toContain("2. Eintrag:");
  });
});

// ---------------------------------------------------------------------------
// VOLLST_FAMILIENANAMNESE
// ---------------------------------------------------------------------------

describe("VOLLST_FAMILIENANAMNESE – Conditional Logic (Gate)", () => {
  const rules = BLOCK_CATALOG.VOLLST_FAMILIENANAMNESE.conditionalRules ?? [];
  const allIds = ["VOLLST_FAMIL_GATE", "VOLLST_FAMIL_EINTRAEGE"];

  it('Gate = "Nein" → Detailgruppe unsichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, { VOLLST_FAMIL_GATE: "Nein" });
    expect(visible.has("VOLLST_FAMIL_EINTRAEGE")).toBe(false);
  });

  it('Gate = "Ja" → Detailgruppe sichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, { VOLLST_FAMIL_GATE: "Ja" });
    expect(visible.has("VOLLST_FAMIL_EINTRAEGE")).toBe(true);
  });
});

describe("VOLLST_FAMILIENANAMNESE – Sanitizer + Krankenblatt", () => {
  const questions = [{ id: "VOLLST_FAMIL_EINTRAEGE" }];

  it("Erkrankung + Verwandtschaft (multi_select) wird gespeichert", () => {
    const entry = familieEntry({ verwandtschaft: "Mutter, Vater" });
    const raw = { VOLLST_FAMIL_EINTRAEGE: JSON.stringify([entry]) };
    const sanitized = sanitizeAnswers(raw, questions);
    const result = JSON.parse(sanitized.VOLLST_FAMIL_EINTRAEGE!);
    expect(result[0].erkrankung).toBe("Herzinfarkt");
    expect(result[0].verwandtschaft).toBe("Mutter, Vater");
  });

  it("Erkrankung erscheint im Krankenblatt", () => {
    const raw = { VOLLST_FAMIL_EINTRAEGE: JSON.stringify([familieEntry()]) };
    const sanitized = sanitizeAnswers(raw, questions);
    const note = buildMedicalRecordNote({
      answers: { VOLLST_FAMIL_GATE: "Ja", VOLLST_FAMIL_EINTRAEGE: sanitized.VOLLST_FAMIL_EINTRAEGE! },
      selected_block_ids: ["VOLLST_FAMILIENANAMNESE"],
    });
    expect(note).toContain("Herzinfarkt");
    expect(note).toContain("Vater");
  });

  it("Mehrere Familieneinträge werden nummeriert ausgegeben", () => {
    const raw = {
      VOLLST_FAMIL_EINTRAEGE: JSON.stringify([
        familieEntry({ erkrankung: "Diabetes Typ 2", verwandtschaft: "Mutter" }),
        familieEntry({ erkrankung: "Brustkrebs", verwandtschaft: "weitere Verwandte" }),
      ]),
    };
    const sanitized = sanitizeAnswers(raw, questions);
    const note = buildMedicalRecordNote({
      answers: { VOLLST_FAMIL_GATE: "Ja", VOLLST_FAMIL_EINTRAEGE: sanitized.VOLLST_FAMIL_EINTRAEGE! },
      selected_block_ids: ["VOLLST_FAMILIENANAMNESE"],
    });
    expect(note).toContain("1. Eintrag:");
    expect(note).toContain("2. Eintrag:");
    expect(note).toContain("Brustkrebs");
  });
});

// ---------------------------------------------------------------------------
// VOLLST_IMPFSTATUS
// ---------------------------------------------------------------------------

describe("VOLLST_IMPFSTATUS – Conditional Logic (OR-Regel für Beratung)", () => {
  const rules = BLOCK_CATALOG.VOLLST_IMPFSTATUS.conditionalRules ?? [];
  const allIds = [
    "VOLLST_IMPF_BEKANNT",
    "VOLLST_IMPF_NACHWEIS",
    "VOLLST_IMPF_ABLEHNUNG",
    "VOLLST_IMPF_BERATUNG",
  ];

  it("Impfstatus bekannt + Nachweis Ja → BERATUNG unsichtbar", () => {
    const visible = computeVisibleQuestionIds(rules, allIds, {
      VOLLST_IMPF_BEKANNT: "Ja",
      VOLLST_IMPF_NACHWEIS: "Ja",
    });
    expect(visible.has("VOLLST_IMPF_BERATUNG")).toBe(false);
  });

  it('Impfstatus = "Nein" → BERATUNG sichtbar (OR-Logik)', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, {
      VOLLST_IMPF_BEKANNT: "Nein",
      VOLLST_IMPF_NACHWEIS: "Ja",
    });
    expect(visible.has("VOLLST_IMPF_BERATUNG")).toBe(true);
  });

  it('Impfstatus = "Unsicher" → BERATUNG sichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, {
      VOLLST_IMPF_BEKANNT: "Unsicher",
      VOLLST_IMPF_NACHWEIS: "Ja",
    });
    expect(visible.has("VOLLST_IMPF_BERATUNG")).toBe(true);
  });

  it('Nachweis = "Nein" → BERATUNG sichtbar (unabhängig von Impfstatus)', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, {
      VOLLST_IMPF_BEKANNT: "Ja",
      VOLLST_IMPF_NACHWEIS: "Nein",
    });
    expect(visible.has("VOLLST_IMPF_BERATUNG")).toBe(true);
  });
});

describe("VOLLST_IMPFSTATUS – Sanitizer + Krankenblatt", () => {
  const questions = [
    { id: "VOLLST_IMPF_BEKANNT" },
    { id: "VOLLST_IMPF_NACHWEIS" },
    { id: "VOLLST_IMPF_ABLEHNUNG" },
    { id: "VOLLST_IMPF_BERATUNG" },
  ];

  it("Ablehnung (ja) wird gespeichert und im Krankenblatt ausgegeben", () => {
    const raw = {
      VOLLST_IMPF_BEKANNT: "Nein",
      VOLLST_IMPF_ABLEHNUNG: "ja",
      VOLLST_IMPF_BERATUNG: "Nein",
    };
    const sanitized = sanitizeAnswers(raw, questions);
    expect(sanitized.VOLLST_IMPF_ABLEHNUNG).toBe("ja");
    const note = buildMedicalRecordNote({
      answers: sanitized,
      selected_block_ids: ["VOLLST_IMPFSTATUS"],
    });
    expect(note).toContain("Impfungen grundsätzlich abgelehnt");
  });
});

// ---------------------------------------------------------------------------
// VOLLST_VERSORGUNGSSTATUS
// ---------------------------------------------------------------------------

describe("VOLLST_VERSORGUNGSSTATUS – Conditional Logic", () => {
  const rules = BLOCK_CATALOG.VOLLST_VERSORGUNGSSTATUS.conditionalRules ?? [];
  const allIds = [
    "VOLLST_VERS_PFLEGEGRAD",
    "VOLLST_VERS_PFLEGEGRAD_STUFE",
    "VOLLST_VERS_GDB",
    "VOLLST_VERS_GDB_WERT",
    "VOLLST_VERS_PROTHESEN",
    "VOLLST_VERS_PROTHESEN_TEXT",
  ];

  it('Pflegegrad = "Ja" → Stufe sichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, { VOLLST_VERS_PFLEGEGRAD: "Ja" });
    expect(visible.has("VOLLST_VERS_PFLEGEGRAD_STUFE")).toBe(true);
  });

  it('Pflegegrad = "beantragt" → Stufe NICHT sichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, { VOLLST_VERS_PFLEGEGRAD: "beantragt" });
    expect(visible.has("VOLLST_VERS_PFLEGEGRAD_STUFE")).toBe(false);
  });

  it('GdB = "Ja" → Wert sichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, { VOLLST_VERS_GDB: "Ja" });
    expect(visible.has("VOLLST_VERS_GDB_WERT")).toBe(true);
  });

  it('GdB = "beantragt" → Wert NICHT sichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, { VOLLST_VERS_GDB: "beantragt" });
    expect(visible.has("VOLLST_VERS_GDB_WERT")).toBe(false);
  });

  it('Prothesen = "Ja" → Freitext sichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, { VOLLST_VERS_PROTHESEN: "Ja" });
    expect(visible.has("VOLLST_VERS_PROTHESEN_TEXT")).toBe(true);
  });

  it('Prothesen = "Nein" → Freitext NICHT sichtbar', () => {
    const visible = computeVisibleQuestionIds(rules, allIds, { VOLLST_VERS_PROTHESEN: "Nein" });
    expect(visible.has("VOLLST_VERS_PROTHESEN_TEXT")).toBe(false);
  });
});

describe("VOLLST_VERSORGUNGSSTATUS – Sanitizer + Krankenblatt", () => {
  const questions = [
    { id: "VOLLST_VERS_PFLEGEGRAD" },
    { id: "VOLLST_VERS_PFLEGEGRAD_STUFE" },
    { id: "VOLLST_VERS_GDB" },
    { id: "VOLLST_VERS_GDB_WERT" },
    { id: "VOLLST_VERS_PROTHESEN" },
    { id: "VOLLST_VERS_PROTHESEN_TEXT" },
  ];

  it("Pflegegrad Ja + Stufe 3 im Krankenblatt ausgegeben", () => {
    const raw = {
      VOLLST_VERS_PFLEGEGRAD: "Ja",
      VOLLST_VERS_PFLEGEGRAD_STUFE: "3",
    };
    const sanitized = sanitizeAnswers(raw, questions);
    const note = buildMedicalRecordNote({
      answers: sanitized,
      selected_block_ids: ["VOLLST_VERSORGUNGSSTATUS"],
    });
    expect(note).toContain("Pflegegrad: Ja");
    expect(note).toContain("3");
  });

  it("GdB + Wert im Krankenblatt ausgegeben", () => {
    const raw = {
      VOLLST_VERS_GDB: "Ja",
      VOLLST_VERS_GDB_WERT: "50",
    };
    const sanitized = sanitizeAnswers(raw, questions);
    const note = buildMedicalRecordNote({
      answers: sanitized,
      selected_block_ids: ["VOLLST_VERSORGUNGSSTATUS"],
    });
    expect(note).toContain("GdB");
    expect(note).toContain("50");
  });

  it("Prothesen + Freitext im Krankenblatt ausgegeben", () => {
    const raw = {
      VOLLST_VERS_PROTHESEN: "Ja",
      VOLLST_VERS_PROTHESEN_TEXT: "Hüftprothese links",
    };
    const sanitized = sanitizeAnswers(raw, questions);
    const note = buildMedicalRecordNote({
      answers: sanitized,
      selected_block_ids: ["VOLLST_VERSORGUNGSSTATUS"],
    });
    expect(note).toContain("Hüftprothese links");
  });
});

// ---------------------------------------------------------------------------
// Regressions-Checks
// ---------------------------------------------------------------------------

describe("Regression – Phase 1 + 2 unverändert", () => {
  it("Phase-1-Pilotregel: ANAMNESE_GP_NAME nur bei ja sichtbar", () => {
    const rules = BLOCK_CATALOG.KURZANAMNESE.conditionalRules ?? [];
    const visible = computeVisibleQuestionIds(rules, ["ANAMNESE_GP", "ANAMNESE_GP_NAME"], {
      ANAMNESE_GP: "ja",
    });
    expect(visible.has("ANAMNESE_GP_NAME")).toBe(true);
  });

  it("Phase-2-Gate: VOLLST_ERKR_EINTRAEGE bei Gate = nein unsichtbar", () => {
    const rules = BLOCK_CATALOG.VOLLST_ERKRANKUNGEN.conditionalRules ?? [];
    const visible = computeVisibleQuestionIds(
      rules,
      ["VOLLST_ERKR_GATE", "VOLLST_ERKR_EINTRAEGE"],
      { VOLLST_ERKR_GATE: "nein" },
    );
    expect(visible.has("VOLLST_ERKR_EINTRAEGE")).toBe(false);
  });
});

describe("Katalog-Struktur – alle neuen Blöcke vorhanden", () => {
  it("5 neue Blöcke im BLOCK_CATALOG", () => {
    expect(BLOCK_CATALOG.VOLLST_ALLERGIEN).toBeDefined();
    expect(BLOCK_CATALOG.VOLLST_INFEKTIONEN).toBeDefined();
    expect(BLOCK_CATALOG.VOLLST_FAMILIENANAMNESE).toBeDefined();
    expect(BLOCK_CATALOG.VOLLST_IMPFSTATUS).toBeDefined();
    expect(BLOCK_CATALOG.VOLLST_VERSORGUNGSSTATUS).toBeDefined();
  });

  it("displayOrder-Reihenfolge korrekt (140 < 150 < 160 < 170 < 180 < 190)", () => {
    expect(BLOCK_CATALOG.VOLLST_ERKRANKUNGEN.displayOrder).toBe(140);
    expect(BLOCK_CATALOG.VOLLST_ALLERGIEN.displayOrder).toBe(150);
    expect(BLOCK_CATALOG.VOLLST_INFEKTIONEN.displayOrder).toBe(160);
    expect(BLOCK_CATALOG.VOLLST_FAMILIENANAMNESE.displayOrder).toBe(170);
    expect(BLOCK_CATALOG.VOLLST_IMPFSTATUS.displayOrder).toBe(180);
    expect(BLOCK_CATALOG.VOLLST_VERSORGUNGSSTATUS.displayOrder).toBe(190);
  });

  it("VOLLST_ALLERG_EINTRAEGE hat conditionalValues an Arztfeldern", () => {
    const schema = QUESTION_CATALOG.VOLLST_ALLERG_EINTRAEGE.groupSchema!;
    const arztName = schema.find((f) => f.key === "arzt_name")!;
    expect(arztName.conditionalValues).toContain("aktuell in Behandlung / Kontrolle");
    expect(arztName.conditionalValues).toContain("früher untersucht oder behandelt");
    expect(arztName.conditionalOn).toBe("behandlung");
  });

  it("VOLLST_FAMIL_EINTRAEGE hat multi_select für verwandtschaft", () => {
    const schema = QUESTION_CATALOG.VOLLST_FAMIL_EINTRAEGE.groupSchema!;
    const verwandtschaft = schema.find((f) => f.key === "verwandtschaft")!;
    expect(verwandtschaft.type).toBe("multi_select");
    expect(verwandtschaft.options).toContain("Mutter");
    expect(verwandtschaft.options).toContain("weitere Verwandte");
  });

  it("VOLLST_IMPFSTATUS hat OR-Bedingung für BERATUNG", () => {
    const rules = BLOCK_CATALOG.VOLLST_IMPFSTATUS.conditionalRules ?? [];
    const rule = rules.find((r) => r.targetId === "VOLLST_IMPF_BERATUNG")!;
    expect(rule).toBeDefined();
    expect("mode" in rule.condition && rule.condition.mode).toBe("OR");
  });
});
