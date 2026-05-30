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

// En-Dash wie im Renderer (U+2013)
const DASH = "\u2013";

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

  // ── 3. Checkbox true → „✓ …" (neue Label-Formulierung) ──────────────────
  it("gibt aktivierte Checkbox als '✓ {label}' aus", () => {
    const answers = emptyAnswers();
    answers["v_medikamentenplan"] = true;
    const result = buildCarePlanText(answers);
    expect(result).toContain("✓ Der Medikamentenplan wird regelmäßig aktualisiert.");
  });

  // ── 4. Checkbox undefined → kein Output (robustness) ────────────────────
  it("ignoriert Checkboxen mit undefined-Wert", () => {
    const answers: CarePlanAnswers = {};
    // Kein Eintrag für v_rezepte_digital → behandelt wie false
    const result = buildCarePlanText(answers);
    expect(result).not.toContain("Rezepte");
  });

  // ── 5. Facharzt-Gruppe als kombinierte Zeile ─────────────────────────────
  it("gibt Facharzt-Gruppe als kombinierte Zeile aus", () => {
    const answers = emptyAnswers();
    answers["fa_1_fachrichtung"] = "Kardiologie";
    answers["fa_1_praxis"] = "Dr. Müller";
    answers["fa_1_intervall"] = "jährlich";
    const result = buildCarePlanText(answers);
    expect(result).toContain(`Kardiologie ${DASH} Dr. Müller ${DASH} jährlich`);
  });

  // ── 6. Leere Facharzt-Gruppe → keine Zeile, aber andere Gruppe erscheint ─
  it("überspringt Facharzt-Gruppe wenn alle Felder leer sind", () => {
    const answers = emptyAnswers();
    answers["fa_2_fachrichtung"] = "Diabetologie";
    // fa_1 und fa_3 leer
    const result = buildCarePlanText(answers);
    expect(result).toContain("Diabetologie");
    // Keine Artefaktzeilen wie " – " durch leere Gruppen
    expect(result).not.toMatch(new RegExp(`^ ${DASH} `, "m"));
    expect(result).not.toMatch(new RegExp(` ${DASH} $`, "m"));
  });

  // ── 7. Whitespace in rowGroup-Feld → Sektion erscheint nicht ─────────────
  it("ignoriert Text-Felder die nur aus Leerzeichen bestehen", () => {
    const answers = emptyAnswers();
    answers["fa_2_fachrichtung"] = "   ";
    // Alle fa_2-Felder nach Trim leer → Sektion wird übersprungen
    const result = buildCarePlanText(answers);
    expect(result).not.toContain("Fachärztliche Betreuung");
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

  // ── 13. Alle 5 Sektionen – Struktur ──────────────────────────────────────
  it("enthält alle 5 Sektions-Titel wenn jede Sektion mindestens einen Wert hat", () => {
    const answers = emptyAnswers();
    answers["ha_datum"] = "2026-07-10";
    answers["fa_1_fachrichtung"] = "Kardiologie";
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

  // ── 14. Facharzt 2 ohne Facharzt 1 (keine Artefaktzeilen) ────────────────
  it("gibt Facharzt 2 aus wenn Facharzt 1 leer ist – keine leeren Zeilen", () => {
    const answers = emptyAnswers();
    // fa_1 und fa_3 leer
    answers["fa_2_fachrichtung"] = "Diabetologie";
    answers["fa_2_intervall"] = "halbjährlich";
    const result = buildCarePlanText(answers);
    expect(result).toContain("Fachärztliche Betreuung");
    expect(result).toContain(`Diabetologie ${DASH} halbjährlich`);
    // Exakt eine Inhaltszeile in der Sektion
    const lines = result.split("\n");
    const sectionIdx = lines.indexOf("Fachärztliche Betreuung");
    expect(sectionIdx).toBeGreaterThan(-1);
    const nextBlank = lines.findIndex((l, i) => i > sectionIdx && l === "");
    const sectionContent =
      nextBlank === -1
        ? lines.slice(sectionIdx + 1)
        : lines.slice(sectionIdx + 1, nextBlank);
    expect(sectionContent).toHaveLength(1);
    expect(sectionContent[0]).toBe(`Diabetologie ${DASH} halbjährlich`);
  });

  // ── 15. Header steht immer in der ersten Zeile ───────────────────────────
  it("beginnt immer mit 'Persönlicher Versorgungsplan'", () => {
    const answers = emptyAnswers();
    answers["gv_datum"] = "2026-12-31";
    const lines = buildCarePlanText(answers).split("\n");
    expect(lines[0]).toBe("Persönlicher Versorgungsplan");
  });

  // ── 16. Select-Feld: Ärztliche Kontrolle ────────────────────────────────
  it("gibt Select-Feld 'Ärztliche Kontrolle' als '{label}: {value}' aus", () => {
    const answers = emptyAnswers();
    answers["ha_kontrolle_aerztlich"] = "jährlich";
    const result = buildCarePlanText(answers);
    expect(result).toContain("Ärztliche Kontrolle: jährlich");
  });

  // ── 17. Select-Feld: Laborkontrolle ─────────────────────────────────────
  it("gibt Select-Feld 'Laborkontrolle' als '{label}: {value}' aus", () => {
    const answers = emptyAnswers();
    answers["ha_kontrolle_labor"] = "1x im Quartal";
    const result = buildCarePlanText(answers);
    expect(result).toContain("Laborkontrolle: 1x im Quartal");
  });

  // ── 18. Leeres Select → kein Output ─────────────────────────────────────
  it("ignoriert Select-Felder mit leerem Wert", () => {
    const answers = emptyAnswers();
    answers["ha_kontrolle_aerztlich"] = "";
    const result = buildCarePlanText(answers);
    expect(result).not.toContain("Ärztliche Kontrolle");
  });

  // ── 19. Facharzt-Gruppe mit nur Intervall – kein Dash ────────────────────
  it("gibt Facharzt-Gruppe mit nur einem ausgefüllten Feld ohne Trennstrich aus", () => {
    const answers = emptyAnswers();
    answers["fa_1_intervall"] = "halbjährlich";
    const result = buildCarePlanText(answers);
    // Nur der Intervall-Wert, kein Dash
    const lines = result.split("\n");
    const line = lines.find((l) => l.includes("halbjährlich"));
    expect(line).toBe("halbjährlich");
  });

  // ── 20. Versorgung & Organisation: neue Checkbox-Formulierungen ──────────
  it("gibt neue Versorgung-Checkboxen mit den korrekten Texten aus", () => {
    const answers = emptyAnswers();
    answers["v_rezepte_digital"] = true;
    answers["v_ueberweisungen_digital"] = true;
    answers["v_facharztberichte"] = true;
    answers["v_digitale_wege"] = true;
    const result = buildCarePlanText(answers);
    expect(result).toContain("Rezepte digital möglich");
    expect(result).toContain("Überweisungen digital möglich");
    expect(result).toContain("Facharztberichte werden regelmäßig nachgereicht");
    expect(result).toContain("Digitale Praxiswege werden bevorzugt genutzt");
  });
});
