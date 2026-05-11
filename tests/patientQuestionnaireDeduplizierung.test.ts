/**
 * Tests für die Deduplizierungslogik modularer Fragebogen-Blöcke.
 *
 * Prüft, dass:
 * - gemeinsame Fragen (CONTACT_PHONE etc.) nur einmal erscheinen
 * - die Reihenfolge nach displayOrder korrekt ist
 * - unbekannte Block-IDs ignoriert werden
 * - leere Eingabe ein leeres Ergebnis liefert
 * - alle Blöcke die erwarteten Fragen enthalten
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
    expect(ids).toContain("ANAMNESE_OCCUPATION");
  });

  it("KURZANAMNESE: ANAMNESE_OCCUPATION steht nach Größe/Gewicht und nicht am Ende", () => {
    const result = buildQuestionnaireQuestions(["KURZANAMNESE"]);
    const ids = result.map((q) => q.id);
    const occupationIdx = ids.indexOf("ANAMNESE_OCCUPATION");
    const heightIdx = ids.indexOf("ANAMNESE_HEIGHT");
    const weightIdx = ids.indexOf("ANAMNESE_WEIGHT");

    expect(occupationIdx).toBeGreaterThan(heightIdx);
    expect(occupationIdx).toBeGreaterThan(weightIdx);
    expect(occupationIdx).toBeLessThan(ids.length - 1);
  });

  it("ADRESSE: enthält ADDRESS_POSTAL mit helperText", () => {
    const result = buildQuestionnaireQuestions(["ADRESSE"]);
    const postal = result.find((q) => q.id === "ADDRESS_POSTAL");
    expect(postal).toBeDefined();
    expect(postal?.helperText).toBe("Wird für Abrechnung und Dokumente benötigt.");
  });

  it("VERSICHERUNG: enthält bestehende Versicherungs-ID und neue Versicherungsfelder", () => {
    const result = buildQuestionnaireQuestions(["VERSICHERUNG"]);
    const ids = result.map((q) => q.id);
    expect(ids).toContain("IDENTITY_INSURANCE_TYPE");
    expect(ids).toContain("INSURANCE_PROVIDER_NAME");
    expect(ids).toContain("INSURANCE_MEMBER_NUMBER");
    expect(ids).toContain("INSURANCE_CARD_IDENTIFIER");
    expect(ids).toContain("INSURANCE_CARD_VALID_UNTIL");
  });

  it("IDENTITAET: enthält keine Versicherungsfrage mehr", () => {
    const result = buildQuestionnaireQuestions(["IDENTITAET"]);
    const ids = result.map((q) => q.id);
    expect(ids).toContain("IDENTITY_FIRST_NAME");
    expect(ids).toContain("IDENTITY_LAST_NAME");
    expect(ids).toContain("IDENTITY_BIRTHDATE");
    expect(ids).not.toContain("IDENTITY_INSURANCE_TYPE");
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

  it("Reihenfolge: IDENTITAET (order=5) kommt vor VERSICHERUNG (order=7) kommt vor KONTAKT (order=10)", () => {
    const result = buildQuestionnaireQuestions(["KONTAKT", "VERSICHERUNG", "IDENTITAET"]);
    const firstNameIdx = result.findIndex((q) => q.id === "IDENTITY_FIRST_NAME");
    const insuranceTypeIdx = result.findIndex((q) => q.id === "IDENTITY_INSURANCE_TYPE");
    const phoneIdx = result.findIndex((q) => q.id === "CONTACT_PHONE");
    expect(firstNameIdx).toBeLessThan(insuranceTypeIdx);
    expect(insuranceTypeIdx).toBeLessThan(phoneIdx);
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

  it("HEILMITTELVERORDNUNG: enthält alle HMV-Fragen", () => {
    const result = buildQuestionnaireQuestions(["HEILMITTELVERORDNUNG"]);
    const ids = result.map((q) => q.id);
    expect(ids).toContain("HMV_CATEGORY");
    expect(ids).toContain("HMV_REQUEST_TYPE");
    expect(ids).toContain("HMV_CURRENT_COMPLAINT");
    expect(ids).toContain("HMV_PREVIOUS_ORDER_EXISTS");
    expect(ids).toContain("HMV_PREVIOUS_ORDER_END_DATE");
    expect(ids).toContain("HMV_LAST_PRACTICE_CONTACT_AT");
    expect(ids).toContain("HMV_THERAPY_PROVIDER_NAME");
    expect(ids).toContain("HMV_LAST_THERAPY_DATE");
    expect(ids).toContain("HMV_ADDITIONAL_NOTES");
    expect(ids.length).toBe(9);
  });

  it("HEILMITTELVERORDNUNG: HMV_CATEGORY ist select mit allen 6 Optionen", () => {
    const result = buildQuestionnaireQuestions(["HEILMITTELVERORDNUNG"]);
    const cat = result.find((q) => q.id === "HMV_CATEGORY");
    expect(cat?.type).toBe("select");
    expect(cat?.required).toBe(true);
    expect(cat?.options).toContain("Physiotherapie");
    expect(cat?.options).toContain("Ergotherapie");
    expect(cat?.options).toContain("Logopädie");
    expect(cat?.options).toContain("Podologie");
    expect(cat?.options).toContain("Lymphdrainage");
    expect(cat?.options).toContain("Sonstiges Heilmittel");
    expect(cat?.options?.length).toBe(6);
  });

  it("HEILMITTELVERORDNUNG: HMV_REQUEST_TYPE ist select mit Optionen Folgeverordnung und Neue Beschwerden", () => {
    const result = buildQuestionnaireQuestions(["HEILMITTELVERORDNUNG"]);
    const rt = result.find((q) => q.id === "HMV_REQUEST_TYPE");
    expect(rt?.type).toBe("select");
    expect(rt?.required).toBe(true);
    expect(rt?.options).toContain("Folgeverordnung");
    expect(rt?.options).toContain("Neue Beschwerden");
  });

  it("HEILMITTELVERORDNUNG: HMV_CURRENT_COMPLAINT ist textarea und required", () => {
    const result = buildQuestionnaireQuestions(["HEILMITTELVERORDNUNG"]);
    const cc = result.find((q) => q.id === "HMV_CURRENT_COMPLAINT");
    expect(cc?.type).toBe("textarea");
    expect(cc?.required).toBe(true);
  });

  it("HEILMITTELVERORDNUNG: HMV_PREVIOUS_ORDER_EXISTS ist yes_no und required", () => {
    const result = buildQuestionnaireQuestions(["HEILMITTELVERORDNUNG"]);
    const poe = result.find((q) => q.id === "HMV_PREVIOUS_ORDER_EXISTS");
    expect(poe?.type).toBe("yes_no");
    expect(poe?.required).toBe(true);
  });

  it("HEILMITTELVERORDNUNG: Datumsfelder sind date und optional", () => {
    const result = buildQuestionnaireQuestions(["HEILMITTELVERORDNUNG"]);
    for (const id of ["HMV_PREVIOUS_ORDER_END_DATE", "HMV_LAST_PRACTICE_CONTACT_AT", "HMV_LAST_THERAPY_DATE"]) {
      const q = result.find((q) => q.id === id);
      expect(q?.type).toBe("date");
      expect(q?.required).toBe(false);
    }
  });

  it("HEILMITTELVERORDNUNG (order=9): kommt nach VERSICHERUNG (order=7) und vor KONTAKT (order=10)", () => {
    const result = buildQuestionnaireQuestions(["KONTAKT", "VERSICHERUNG", "HEILMITTELVERORDNUNG"]);
    const insuranceIdx = result.findIndex((q) => q.id === "IDENTITY_INSURANCE_TYPE");
    const hmvIdx = result.findIndex((q) => q.id === "HMV_CATEGORY");
    const phoneIdx = result.findIndex((q) => q.id === "CONTACT_PHONE");
    expect(insuranceIdx).toBeLessThan(hmvIdx);
    expect(hmvIdx).toBeLessThan(phoneIdx);
  });

  it("HEILMITTELVERORDNUNG kombiniert mit anderen Blöcken: keine Duplikate", () => {
    const result = buildQuestionnaireQuestions([
      "IDENTITAET", "VERSICHERUNG", "HEILMITTELVERORDNUNG", "KONTAKT",
    ]);
    const ids = result.map((q) => q.id);
    expect(ids.length).toBe(new Set(ids).size);
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
