/**
 * Tests für buildMedicalRecordNote.
 *
 * Prüft:
 * - Titel-Logik (AU, Rezept, gemischt)
 * - Nur relevante, nicht-leere Felder erscheinen
 * - Freitexte werden auf max. 80 Zeichen gekürzt
 * - Leere / null-Antworten werden weggelassen
 */

import { buildMedicalRecordNote } from "@/lib/questionnaire/buildMedicalRecordNote";

describe("buildMedicalRecordNote – Titel", () => {
  it("liefert 'AU-Anfrage (digital)' wenn nur ARBEITSUNFAEHIGKEIT gewählt", () => {
    const result = buildMedicalRecordNote({
      answers: { AU_SYMPTOMS: "Husten", AU_START_DATE: "2024-01-10" },
      selected_block_ids: ["ARBEITSUNFAEHIGKEIT"],
    });
    expect(result.split("\n")[0]).toBe("AU-Anfrage (digital)");
  });

  it("liefert 'Rezeptanfrage (digital)' wenn nur REZEPT gewählt", () => {
    const result = buildMedicalRecordNote({
      answers: { PRESCRIPTION_TYPE: "Dauermedikation" },
      selected_block_ids: ["REZEPT"],
    });
    expect(result.split("\n")[0]).toBe("Rezeptanfrage (digital)");
  });

  it("liefert 'Digitale Anfrage' bei AU + REZEPT", () => {
    const result = buildMedicalRecordNote({
      answers: {},
      selected_block_ids: ["ARBEITSUNFAEHIGKEIT", "REZEPT"],
    });
    expect(result.split("\n")[0]).toBe("Digitale Anfrage");
  });

  it("liefert 'Digitale Anfrage' wenn nur UEBERWEISUNG gewählt", () => {
    const result = buildMedicalRecordNote({
      answers: { REF_SPECIALTY: "Kardiologie" },
      selected_block_ids: ["UEBERWEISUNG"],
    });
    expect(result.split("\n")[0]).toBe("Digitale Anfrage");
  });

  it("liefert 'Digitale Anfrage' wenn keine relevanten Blöcke gewählt", () => {
    const result = buildMedicalRecordNote({
      answers: {},
      selected_block_ids: ["KONTAKT"],
    });
    expect(result.split("\n")[0]).toBe("Digitale Anfrage");
  });
});

describe("buildMedicalRecordNote – AU-Block", () => {
  it("enthält Beschwerden und Beginn", () => {
    const result = buildMedicalRecordNote({
      answers: { AU_SYMPTOMS: "Husten, Fieber", AU_START_DATE: "2024-01-08" },
      selected_block_ids: ["ARBEITSUNFAEHIGKEIT"],
    });
    const lines = result.split("\n");
    expect(lines).toContain("Beschwerden: Husten, Fieber");
    expect(lines).toContain("Beginn: 2024-01-08");
  });

  it("lässt leere Felder weg", () => {
    const result = buildMedicalRecordNote({
      answers: { AU_SYMPTOMS: "", AU_START_DATE: "" },
      selected_block_ids: ["ARBEITSUNFAEHIGKEIT"],
    });
    const lines = result.split("\n");
    expect(lines.some((l) => l.startsWith("Beschwerden:"))).toBe(false);
    expect(lines.some((l) => l.startsWith("Beginn:"))).toBe(false);
  });

  it("lässt AU-Felder weg wenn ARBEITSUNFAEHIGKEIT nicht in Block-IDs", () => {
    const result = buildMedicalRecordNote({
      answers: { AU_SYMPTOMS: "Husten", AU_START_DATE: "2024-01-08" },
      selected_block_ids: ["REZEPT"],
    });
    const lines = result.split("\n");
    expect(lines.some((l) => l.startsWith("Beschwerden:"))).toBe(false);
  });
});

describe("buildMedicalRecordNote – Rezept-Block", () => {
  it("enthält Rezeptart und Medikament", () => {
    const result = buildMedicalRecordNote({
      answers: {
        PRESCRIPTION_TYPE: "Dauermedikation",
        PRESCRIPTION_MEDICATION: "Metformin 500 mg",
      },
      selected_block_ids: ["REZEPT"],
    });
    const lines = result.split("\n");
    expect(lines).toContain("Rezeptart: Dauermedikation");
    expect(lines).toContain("Medikament: Metformin 500 mg");
  });

  it("lässt optionales Medikament weg wenn leer", () => {
    const result = buildMedicalRecordNote({
      answers: { PRESCRIPTION_TYPE: "Dauermedikation", PRESCRIPTION_MEDICATION: "" },
      selected_block_ids: ["REZEPT"],
    });
    const lines = result.split("\n");
    expect(lines.some((l) => l.startsWith("Medikament:"))).toBe(false);
  });
});

describe("buildMedicalRecordNote – Überweisung-Block", () => {
  it("enthält Fachrichtung und Termin-Status", () => {
    const result = buildMedicalRecordNote({
      answers: { REF_SPECIALTY: "Orthopädie", REF_APPOINTMENT_EXISTS: "Ja" },
      selected_block_ids: ["UEBERWEISUNG"],
    });
    const lines = result.split("\n");
    expect(lines).toContain("Fachrichtung: Orthopädie");
    expect(lines).toContain("Termin vereinbart: Ja");
  });

  it("lässt Termin weg wenn leer", () => {
    const result = buildMedicalRecordNote({
      answers: { REF_SPECIALTY: "Dermatologie", REF_APPOINTMENT_EXISTS: "" },
      selected_block_ids: ["UEBERWEISUNG"],
    });
    const lines = result.split("\n");
    expect(lines.some((l) => l.startsWith("Termin vereinbart:"))).toBe(false);
  });
});

describe("buildMedicalRecordNote – Kontakt-Block", () => {
  it("enthält Telefonnummer wenn KONTAKT in Block-IDs", () => {
    const result = buildMedicalRecordNote({
      answers: { CONTACT_PHONE: "0170 1234567" },
      selected_block_ids: ["KONTAKT", "ARBEITSUNFAEHIGKEIT"],
    });
    const lines = result.split("\n");
    expect(lines).toContain("Tel.: 0170 1234567");
  });

  it("lässt Telefon weg wenn KONTAKT nicht in Block-IDs", () => {
    const result = buildMedicalRecordNote({
      answers: { CONTACT_PHONE: "0170 1234567" },
      selected_block_ids: ["ARBEITSUNFAEHIGKEIT"],
    });
    const lines = result.split("\n");
    expect(lines.some((l) => l.startsWith("Tel.:"))).toBe(false);
  });

  it("lässt Telefon weg wenn Wert leer", () => {
    const result = buildMedicalRecordNote({
      answers: { CONTACT_PHONE: "" },
      selected_block_ids: ["KONTAKT"],
    });
    const lines = result.split("\n");
    expect(lines.some((l) => l.startsWith("Tel.:"))).toBe(false);
  });
});

describe("buildMedicalRecordNote – Textkürzung", () => {
  it("kürzt Freitexte auf max. 80 Zeichen inkl. Auslassungszeichen", () => {
    const longText = "a".repeat(100);
    const result = buildMedicalRecordNote({
      answers: { PRESCRIPTION_MEDICATION: longText },
      selected_block_ids: ["REZEPT"],
    });
    const medLine = result.split("\n").find((l) => l.startsWith("Medikament:")) ?? "";
    // Label "Medikament: " is 12 chars; content should be 80 chars (79 + …)
    const content = medLine.replace("Medikament: ", "");
    expect(content.length).toBeLessThanOrEqual(80);
    expect(content.endsWith("…")).toBe(true);
  });

  it("normalisiert mehrzeiligen Text auf eine Zeile", () => {
    const result = buildMedicalRecordNote({
      answers: { PRESCRIPTION_MEDICATION: "Zeile 1\nZeile 2" },
      selected_block_ids: ["REZEPT"],
    });
    const medLine = result.split("\n").find((l) => l.startsWith("Medikament:")) ?? "";
    expect(medLine).toBe("Medikament: Zeile 1 Zeile 2");
  });
});

describe("buildMedicalRecordNote – null / fehlende answers", () => {
  it("funktioniert mit null als answers", () => {
    const result = buildMedicalRecordNote({
      answers: null,
      selected_block_ids: ["ARBEITSUNFAEHIGKEIT"],
    });
    expect(result).toBe("AU-Anfrage (digital)");
  });

  it("funktioniert mit undefined als answers", () => {
    const result = buildMedicalRecordNote({
      answers: undefined,
      selected_block_ids: ["REZEPT"],
    });
    expect(result).toBe("Rezeptanfrage (digital)");
  });

  it("liefert bei leeren Block-IDs nur den Titel", () => {
    const result = buildMedicalRecordNote({
      answers: {},
      selected_block_ids: [],
    });
    expect(result).toBe("Digitale Anfrage");
  });
});

describe("buildMedicalRecordNote – Zeilenanzahl", () => {
  it("liefert maximal 10 Zeilen", () => {
    const result = buildMedicalRecordNote({
      answers: {
        AU_SYMPTOMS: "Husten, Fieber, Schnupfen",
        AU_START_DATE: "2024-01-08",
        PRESCRIPTION_TYPE: "Dauermedikation",
        PRESCRIPTION_MEDICATION: "Metformin",
        REF_SPECIALTY: "Kardiologie",
        REF_APPOINTMENT_EXISTS: "Nein",
        CONTACT_PHONE: "0170 123456",
      },
      selected_block_ids: [
        "ARBEITSUNFAEHIGKEIT",
        "REZEPT",
        "UEBERWEISUNG",
        "KONTAKT",
      ],
    });
    const lines = result.split("\n");
    expect(lines.length).toBeLessThanOrEqual(10);
  });
});
