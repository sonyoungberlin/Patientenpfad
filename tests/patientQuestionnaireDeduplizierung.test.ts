/**
 * Tests für die Deduplizierungslogik modularer Fragebogen-Blöcke.
 *
 * Prüft, dass:
 * - gemeinsame Fragen (CONTACT_PHONE etc.) nur einmal erscheinen
 * - die Reihenfolge nach displayOrder korrekt ist
 * - unbekannte Block-IDs ignoriert werden
 * - leere Eingabe ein leeres Ergebnis liefert
 * - alle neuen Blöcke (ADRESSE, KURZANAMNESE, ARBEITSUNFAEHIGKEIT, REZEPT, UEBERWEISUNG) die erwarteten Fragen enthalten
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

  it("ARBEITSUNFAEHIGKEIT + REZEPT: CONTACT_PHONE erscheint nur einmal wenn KONTAKT dabei", () => {
    const result = buildQuestionnaireQuestions(["KONTAKT", "ARBEITSUNFAEHIGKEIT", "REZEPT"]);
    const phoneCount = result.filter((q) => q.id === "CONTACT_PHONE").length;
    expect(phoneCount).toBe(1);
  });

  it("ARBEITSUNFAEHIGKEIT + REZEPT: keine doppelten questionIds insgesamt", () => {
    const result = buildQuestionnaireQuestions(["ARBEITSUNFAEHIGKEIT", "REZEPT"]);
    const ids = result.map((q) => q.id);
    const unique = new Set(ids);
    expect(ids.length).toBe(unique.size);
  });

  it("ARBEITSUNFAEHIGKEIT: enthält AU-spezifische Fragen", () => {
    const result = buildQuestionnaireQuestions(["ARBEITSUNFAEHIGKEIT"]);
    const ids = result.map((q) => q.id);
    expect(ids).toContain("AU_SYMPTOMS");
    expect(ids).toContain("AU_START_DATE");
    expect(ids).toContain("AU_END_DATE");
  });

  it("REZEPT: enthält Rezept-spezifische Fragen", () => {
    const result = buildQuestionnaireQuestions(["REZEPT"]);
    const ids = result.map((q) => q.id);
    expect(ids).toContain("PRESCRIPTION_TYPE");
    expect(ids).toContain("PRESCRIPTION_MEDICATION");
    expect(ids).toContain("PRESCRIPTION_REPEAT_KNOWN");
  });

  it("UEBERWEISUNG: enthält alle Überweisungs-Fragen", () => {
    const result = buildQuestionnaireQuestions(["UEBERWEISUNG"]);
    const ids = result.map((q) => q.id);
    expect(ids).toContain("REF_SPECIALTY");
    expect(ids).toContain("REF_DOCTOR_NAME");
    expect(ids).toContain("REF_ADDRESS");
    expect(ids).toContain("REF_APPOINTMENT_EXISTS");
    expect(ids).toContain("REF_APPOINTMENT_DATE");
    expect(ids).toContain("REF_REASON");
  });

  it("KURZANAMNESE: enthält alle Anamnesefragen", () => {
    const result = buildQuestionnaireQuestions(["KURZANAMNESE"]);
    const ids = result.map((q) => q.id);
    expect(ids).toContain("ANAMNESE_GP");
    expect(ids).toContain("ANAMNESE_HEIGHT");
    expect(ids).toContain("ANAMNESE_WEIGHT");
    expect(ids).toContain("ANAMNESE_CHRONIC");
    expect(ids).toContain("ANAMNESE_HEREDITARY");
    expect(ids).toContain("ANAMNESE_ALLERGIES");
    expect(ids).toContain("ANAMNESE_MEDICATIONS");
    expect(ids).toContain("ANAMNESE_SMOKING");
    expect(ids).toContain("ANAMNESE_ALCOHOL");
    expect(ids).toContain("ANAMNESE_SUBSTANCES");
    expect(ids).toContain("ANAMNESE_VACCINATION");
  });

  it("ADRESSE: enthält ADDRESS_POSTAL mit helperText", () => {
    const result = buildQuestionnaireQuestions(["ADRESSE"]);
    const postal = result.find((q) => q.id === "ADDRESS_POSTAL");
    expect(postal).toBeDefined();
    expect(postal?.helperText).toBe("Wird für Abrechnung und Dokumente benötigt.");
  });

  it("ADDRESS_POSTAL erscheint nur einmal wenn ADRESSE + andere Blöcke kombiniert", () => {
    const result = buildQuestionnaireQuestions(["ADRESSE", "KURZANAMNESE", "REZEPT"]);
    const count = result.filter((q) => q.id === "ADDRESS_POSTAL").length;
    expect(count).toBe(1);
  });

  it("KONTAKT (order=10): kommt vor ADRESSE (order=20) kommt vor KURZANAMNESE (order=30)", () => {
    const result = buildQuestionnaireQuestions(["KURZANAMNESE", "ADRESSE", "KONTAKT"]);
    const phoneIdx = result.findIndex((q) => q.id === "CONTACT_PHONE");
    const postalIdx = result.findIndex((q) => q.id === "ADDRESS_POSTAL");
    const gpIdx = result.findIndex((q) => q.id === "ANAMNESE_GP");
    expect(phoneIdx).toBeLessThan(postalIdx);
    expect(postalIdx).toBeLessThan(gpIdx);
  });

  it("Reihenfolge: ARBEITSUNFAEHIGKEIT (order=40) kommt vor REZEPT (order=50)", () => {
    const result = buildQuestionnaireQuestions(["REZEPT", "ARBEITSUNFAEHIGKEIT"]);
    const auIdx = result.findIndex((q) => q.id === "AU_SYMPTOMS");
    const rxIdx = result.findIndex((q) => q.id === "PRESCRIPTION_TYPE");
    expect(auIdx).toBeGreaterThanOrEqual(0);
    expect(rxIdx).toBeGreaterThanOrEqual(0);
    expect(auIdx).toBeLessThan(rxIdx);
  });

  it("alle 6 Blöcke kombiniert: CONTACT_PHONE erscheint genau einmal", () => {
    const result = buildQuestionnaireQuestions([
      "KONTAKT", "ADRESSE", "KURZANAMNESE", "ARBEITSUNFAEHIGKEIT", "REZEPT", "UEBERWEISUNG",
    ]);
    const phoneCount = result.filter((q) => q.id === "CONTACT_PHONE").length;
    expect(phoneCount).toBe(1);
  });

  it("alle 6 Blöcke kombiniert: keine doppelten questionIds", () => {
    const result = buildQuestionnaireQuestions([
      "KONTAKT", "ADRESSE", "KURZANAMNESE", "ARBEITSUNFAEHIGKEIT", "REZEPT", "UEBERWEISUNG",
    ]);
    const ids = result.map((q) => q.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it("FEHLENDE_INFO ist kein gültiger Block mehr – wird ignoriert", () => {
    const result = buildQuestionnaireQuestions(["FEHLENDE_INFO"]);
    expect(result).toEqual([]);
  });

  it("AU_SYMPTOMS ist vom Typ multi_select und hat Optionen", () => {
    const result = buildQuestionnaireQuestions(["ARBEITSUNFAEHIGKEIT"]);
    const symptoms = result.find((q) => q.id === "AU_SYMPTOMS");
    expect(symptoms?.type).toBe("multi_select");
    expect(Array.isArray(symptoms?.options)).toBe(true);
    expect((symptoms?.options ?? []).length).toBeGreaterThan(0);
    expect(symptoms?.options).toContain("Sonstiges");
  });

  it("PRESCRIPTION_TYPE ist vom Typ select mit Optionen Dauermedikation und Einzelmedikament", () => {
    const result = buildQuestionnaireQuestions(["REZEPT"]);
    const pt = result.find((q) => q.id === "PRESCRIPTION_TYPE");
    expect(pt?.type).toBe("select");
    expect(pt?.options).toContain("Dauermedikation");
    expect(pt?.options).toContain("Einzelmedikament");
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
