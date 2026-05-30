/**
 * Unit-Tests für buildCarePlanText
 *
 * Testet die Renderer-Logik isoliert vom Panel.
 * Kein Mocking erforderlich – reine Funktion.
 */

import { buildCarePlanText, type CarePlanAnswers } from "@/lib/carePlan/buildCarePlanText";

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

/** Gibt leere Antworten für alle Felder zurück (Ausgangszustand). */
function emptyAnswers(): CarePlanAnswers {
  const { getAllCarePlanFields } = require("@/lib/carePlan/carePlanCatalog");
  const answers: CarePlanAnswers = {};
  for (const field of getAllCarePlanFields()) {
    answers[field.id] = field.kind === "checkbox" ? false : "";
  }
  return answers;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("buildCarePlanText", () => {
  // ── 1. Nur Header bei leerem State ──────────────────────────────────────
  it("gibt nur den Header zurück wenn alle Felder leer/false sind", () => {
    const result = buildCarePlanText(emptyAnswers());
    expect(result).toBe("Persönlicher Versorgungsplan");
  });

  // ── 2. Checkbox false → kein Output ─────────────────────────────────────
  it("ignoriert Checkboxen mit Wert false", () => {
    const answers = emptyAnswers();
    answers["v_medikamentenplan"] = false;
    const result = buildCarePlanText(answers);
    expect(result).not.toContain("Medikamentenplan");
  });

  // ── 3. Checkbox true → „✓ …" ────────────────────────────────────────────
  it("gibt aktivierte Checkbox als '✓ {label}' aus", () => {
    const answers = emptyAnswers();
    answers["v_medikamentenplan"] = true;
    const result = buildCarePlanText(answers);
    expect(result).toContain("✓ Medikamentenplan ausgehändigt");
  });

  // ── 4. Checkbox undefined → kein Output (robustness) ────────────────────
  it("ignoriert Checkboxen mit undefined-Wert", () => {
    const answers: CarePlanAnswers = {};
    // Kein Eintrag für v_pflegedienst → behandelt wie false
    const result = buildCarePlanText(answers);
    expect(result).not.toContain("Pflegedienst");
  });

  // ── 5. Text-Feld mit Wert ────────────────────────────────────────────────
  it("gibt Text-Feld als '{label}: {value}' aus", () => {
    const answers = emptyAnswers();
    answers["fa_zeile_1"] = "Kardiologie – Dr. Müller";
    const result = buildCarePlanText(answers);
    expect(result).toContain("Facharzt 1: Kardiologie – Dr. Müller");
  });

  // ── 6. Text-Feld leer → kein Output ─────────────────────────────────────
  it("ignoriert Text-Felder mit leerem String", () => {
    const answers = emptyAnswers();
    answers["fa_zeile_1"] = "";
    const result = buildCarePlanText(answers);
    expect(result).not.toContain("Facharzt 1");
  });

  // ── 7. Text-Feld nur Whitespace → kein Output ───────────────────────────
  it("ignoriert Text-Felder die nur aus Leerzeichen bestehen", () => {
    const answers = emptyAnswers();
    answers["fa_zeile_2"] = "   ";
    const result = buildCarePlanText(answers);
    expect(result).not.toContain("Facharzt 2");
  });

  // ── 8. Datum-Feld ────────────────────────────────────────────────────────
  it("gibt Datum-Feld als '{label}: {value}' aus", () => {
    const answers = emptyAnswers();
    answers["ha_datum"] = "2026-07-10";
    const result = buildCarePlanText(answers);
    expect(result).toContain("Datum des Gesprächs: 2026-07-10");
  });

  // ── 9. Textarea einzeilig ────────────────────────────────────────────────
  it("gibt einzeilige Textarea als '{label}: {value}' aus", () => {
    const answers = emptyAnswers();
    answers["ha_anlass"] = "Hypertonie Grad 2";
    const result = buildCarePlanText(answers);
    expect(result).toContain("Anlass / Diagnose: Hypertonie Grad 2");
  });

  // ── 10. Textarea mehrzeilig ──────────────────────────────────────────────
  it("gibt mehrzeilige Textarea mit Label als Kopfzeile und eingerücktem Inhalt aus", () => {
    const answers = emptyAnswers();
    answers["ha_notizen"] = "Zeile eins\nZeile zwei\nZeile drei";
    const lines = buildCarePlanText(answers).split("\n");
    const labelIdx = lines.findIndex((l) => l === "Notizen / Vereinbarungen:");
    expect(labelIdx).toBeGreaterThan(-1);
    expect(lines[labelIdx + 1]).toBe("  Zeile eins");
    expect(lines[labelIdx + 2]).toBe("  Zeile zwei");
    expect(lines[labelIdx + 3]).toBe("  Zeile drei");
  });

  // ── 11. Leere Sektion wird übersprungen ──────────────────────────────────
  it("gibt eine Sektion nicht aus wenn alle ihre Felder leer/false sind", () => {
    const answers = emptyAnswers();
    // Nur Hausarzt-Sektion füllen, Fachärzte leer lassen
    answers["ha_datum"] = "2026-01-01";
    const result = buildCarePlanText(answers);
    expect(result).not.toContain("Fachärztliche Betreuung");
  });

  // ── 12. Gefüllte Sektion wird ausgegeben ─────────────────────────────────
  it("gibt eine Sektion aus wenn mindestens ein Feld einen Wert hat", () => {
    const answers = emptyAnswers();
    answers["u_angehoerige"] = true;
    const result = buildCarePlanText(answers);
    expect(result).toContain("Unterstützende Personen");
    expect(result).toContain("✓ Angehörige / Bezugsperson informiert");
  });

  // ── 13. Alle Felder ausgefüllt – Struktur ────────────────────────────────
  it("enthält alle 5 Sektions-Titel wenn jede Sektion mindestens einen Wert hat", () => {
    const answers = emptyAnswers();
    answers["ha_datum"] = "2026-07-10";
    answers["fa_zeile_1"] = "Kardiologie";
    answers["v_medikamentenplan"] = true;
    answers["u_angehoerige"] = true;
    answers["gv_warnsymptome"] = true;
    const result = buildCarePlanText(answers);
    expect(result).toContain("Hausärztliche Betreuung");
    expect(result).toContain("Fachärztliche Betreuung");
    expect(result).toContain("Versorgung & Organisation");
    expect(result).toContain("Unterstützende Personen");
    expect(result).toContain("Gemeinsame Vereinbarung");
  });

  // ── 14. Nur eine von drei Facharzt-Zeilen gefüllt ────────────────────────
  it("gibt nur ausgefüllte Facharzt-Zeilen aus, übersprungene bleiben weg", () => {
    const answers = emptyAnswers();
    answers["fa_zeile_1"] = "Kardiologie";
    // fa_zeile_2 und fa_zeile_3 leer
    const result = buildCarePlanText(answers);
    expect(result).toContain("Facharzt 1: Kardiologie");
    expect(result).not.toContain("Facharzt 2");
    expect(result).not.toContain("Facharzt 3");
  });

  // ── 15. Header steht immer in der ersten Zeile ───────────────────────────
  it("beginnt immer mit 'Persönlicher Versorgungsplan'", () => {
    const answers = emptyAnswers();
    answers["gv_datum"] = "2026-12-31";
    const lines = buildCarePlanText(answers).split("\n");
    expect(lines[0]).toBe("Persönlicher Versorgungsplan");
  });
});
