/**
 * Tests für die Deduplizierungslogik modularer Fragebogen-Blöcke.
 *
 * Prüft, dass:
 * - gemeinsame Fragen (CONTACT_PHONE etc.) nur einmal erscheinen
 * - die Reihenfolge nach displayOrder korrekt ist
 * - unbekannte Block-IDs ignoriert werden
 * - leere Eingabe ein leeres Ergebnis liefert
 */

import { buildQuestionnaireQuestions } from "@/lib/questionnaire/buildQuestionnaireQuestions";

describe("buildQuestionnaireQuestions – Deduplizierung", () => {
  it("gibt eine leere Liste zurück, wenn keine Block-IDs angegeben", () => {
    expect(buildQuestionnaireQuestions([])).toEqual([]);
  });

  it("ignoriert unbekannte Block-IDs", () => {
    const result = buildQuestionnaireQuestions(["UNKNOWN_BLOCK"]);
    expect(result).toEqual([]);
  });

  it("AU + REZEPT: CONTACT_PHONE erscheint nur einmal", () => {
    const result = buildQuestionnaireQuestions(["AU", "REZEPT"]);
    const phoneCount = result.filter((q) => q.id === "CONTACT_PHONE").length;
    expect(phoneCount).toBe(1);
  });

  it("AU + REZEPT: CONTACT_EMAIL erscheint nur einmal", () => {
    const result = buildQuestionnaireQuestions(["AU", "REZEPT"]);
    const emailCount = result.filter((q) => q.id === "CONTACT_EMAIL").length;
    expect(emailCount).toBe(1);
  });

  it("AU + REZEPT: DOB erscheint nur einmal", () => {
    const result = buildQuestionnaireQuestions(["AU", "REZEPT"]);
    const dobCount = result.filter((q) => q.id === "DOB").length;
    expect(dobCount).toBe(1);
  });

  it("AU + REZEPT: enthält AU-spezifische Fragen", () => {
    const result = buildQuestionnaireQuestions(["AU", "REZEPT"]);
    const ids = result.map((q) => q.id);
    expect(ids).toContain("AU_SYMPTOMS");
    expect(ids).toContain("AU_START_DATE");
    expect(ids).toContain("AU_END_DATE");
  });

  it("AU + REZEPT: enthält REZEPT-spezifische Fragen", () => {
    const result = buildQuestionnaireQuestions(["AU", "REZEPT"]);
    const ids = result.map((q) => q.id);
    expect(ids).toContain("PRESCRIPTION_MEDICATION");
    expect(ids).toContain("PRESCRIPTION_IS_REPEAT");
  });

  it("AU + REZEPT: keine doppelten questionIds insgesamt", () => {
    const result = buildQuestionnaireQuestions(["AU", "REZEPT"]);
    const ids = result.map((q) => q.id);
    const unique = new Set(ids);
    expect(ids.length).toBe(unique.size);
  });

  it("Reihenfolge: AU (order=30) kommt vor REZEPT (order=40)", () => {
    const result = buildQuestionnaireQuestions(["REZEPT", "AU"]);
    // Auch wenn REZEPT zuerst übergeben, soll AU (displayOrder 30) zuerst kommen.
    const auSymptomIdx = result.findIndex((q) => q.id === "AU_SYMPTOMS");
    const prescriptionIdx = result.findIndex((q) => q.id === "PRESCRIPTION_MEDICATION");
    expect(auSymptomIdx).toBeGreaterThanOrEqual(0);
    expect(prescriptionIdx).toBeGreaterThanOrEqual(0);
    expect(auSymptomIdx).toBeLessThan(prescriptionIdx);
  });

  it("KONTAKT (order=10): CONTACT_PHONE kommt zuerst bei KONTAKT + AU", () => {
    const result = buildQuestionnaireQuestions(["AU", "KONTAKT"]);
    // KONTAKT hat displayOrder 10, also kommt CONTACT_PHONE von KONTAKT
    expect(result[0].id).toBe("CONTACT_PHONE");
  });

  it("FEHLENDE_INFO: enthält MISSING_INFO_FREETEXT", () => {
    const result = buildQuestionnaireQuestions(["FEHLENDE_INFO"]);
    const ids = result.map((q) => q.id);
    expect(ids).toContain("MISSING_INFO_FREETEXT");
    expect(ids).toContain("CONTACT_PHONE");
  });

  it("UEBERWEISUNG: enthält alle Überweisungs-Fragen", () => {
    const result = buildQuestionnaireQuestions(["UEBERWEISUNG"]);
    const ids = result.map((q) => q.id);
    expect(ids).toContain("REF_SPECIALTY");
    expect(ids).toContain("REF_APPOINTMENT_EXISTS");
    expect(ids).toContain("REF_APPOINTMENT_DATE");
  });

  it("alle 6 Blöcke kombiniert: CONTACT_PHONE erscheint genau einmal", () => {
    const result = buildQuestionnaireQuestions([
      "KONTAKT", "KURZANAMNESE", "AU", "REZEPT", "UEBERWEISUNG", "FEHLENDE_INFO",
    ]);
    const phoneCount = result.filter((q) => q.id === "CONTACT_PHONE").length;
    expect(phoneCount).toBe(1);
  });

  it("gibt QuestionDefinition-Objekte mit id, text, type, required zurück", () => {
    const result = buildQuestionnaireQuestions(["KONTAKT"]);
    expect(result.length).toBeGreaterThan(0);
    for (const q of result) {
      expect(typeof q.id).toBe("string");
      expect(typeof q.text).toBe("string");
      expect(typeof q.type).toBe("string");
      expect(typeof q.required).toBe("boolean");
    }
  });
});
