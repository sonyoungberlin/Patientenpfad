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
    expect(lines).toContain("Termin vorhanden: Ja");
  });

  it("lässt Termin weg wenn leer", () => {
    const result = buildMedicalRecordNote({
      answers: { REF_SPECIALTY: "Dermatologie", REF_APPOINTMENT_EXISTS: "" },
      selected_block_ids: ["UEBERWEISUNG"],
    });
    const lines = result.split("\n");
    expect(lines.some((l) => l.startsWith("Termin vorhanden:"))).toBe(false);
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

describe("buildMedicalRecordNote – AU_IS_FOLLOWUP (Folge-AU)", () => {
  it("enthält 'Folge-AU: Ja' wenn AU_IS_FOLLOWUP = 'ja'", () => {
    const result = buildMedicalRecordNote({
      answers: { AU_START_DATE: "2024-01-08", AU_IS_FOLLOWUP: "ja" },
      selected_block_ids: ["ARBEITSUNFAEHIGKEIT"],
    });
    expect(result.split("\n")).toContain("Folge-AU: Ja");
  });

  it("enthält 'Folge-AU: Nein' wenn AU_IS_FOLLOWUP = 'nein'", () => {
    const result = buildMedicalRecordNote({
      answers: { AU_START_DATE: "2024-01-08", AU_IS_FOLLOWUP: "nein" },
      selected_block_ids: ["ARBEITSUNFAEHIGKEIT"],
    });
    expect(result.split("\n")).toContain("Folge-AU: Nein");
  });

  it("lässt Folge-AU weg wenn nicht ausgefüllt", () => {
    const result = buildMedicalRecordNote({
      answers: { AU_START_DATE: "2024-01-08" },
      selected_block_ids: ["ARBEITSUNFAEHIGKEIT"],
    });
    expect(result.split("\n").some((l) => l.startsWith("Folge-AU:"))).toBe(false);
  });

  it("zeigt keinen Folge-AU-Eintrag wenn ARBEITSUNFAEHIGKEIT nicht in Block-IDs", () => {
    const result = buildMedicalRecordNote({
      answers: { AU_IS_FOLLOWUP: "ja" },
      selected_block_ids: ["REZEPT"],
    });
    expect(result).not.toContain("Folge-AU");
  });
});

describe("buildMedicalRecordNote – AU_END_DATE (AU bis)", () => {
  it("enthält AU-bis-Datum wenn vorhanden", () => {
    const result = buildMedicalRecordNote({
      answers: {
        AU_SYMPTOMS: "Husten",
        AU_START_DATE: "2024-01-08",
        AU_END_DATE: "2024-01-15",
      },
      selected_block_ids: ["ARBEITSUNFAEHIGKEIT"],
    });
    const lines = result.split("\n");
    expect(lines).toContain("AU bis: 2024-01-15");
  });

  it("lässt AU-bis-Datum weg wenn nicht ausgefüllt", () => {
    const result = buildMedicalRecordNote({
      answers: { AU_START_DATE: "2024-01-08" },
      selected_block_ids: ["ARBEITSUNFAEHIGKEIT"],
    });
    const lines = result.split("\n");
    expect(lines.some((l) => l.startsWith("AU bis:"))).toBe(false);
  });
});

describe("buildMedicalRecordNote – Überweisung erweiterte Felder", () => {
  it("enthält Facharzt-Name, Adresse, Termin-Datum und Grund wenn vorhanden", () => {
    const result = buildMedicalRecordNote({
      answers: {
        REF_SPECIALTY: "Kardiologie",
        REF_DOCTOR_NAME: "Dr. Müller",
        REF_ADDRESS: "Musterstr. 1, 10115 Berlin",
        REF_APPOINTMENT_EXISTS: "Ja",
        REF_APPOINTMENT_DATE: "2024-03-20",
        REF_REASON: "Herzcheck",
      },
      selected_block_ids: ["UEBERWEISUNG"],
    });
    const lines = result.split("\n");
    expect(lines).toContain("Facharzt: Dr. Müller");
    expect(lines).toContain("Adresse Facharzt: Musterstr. 1, 10115 Berlin");
    expect(lines).toContain("Termin: 2024-03-20");
    expect(lines).toContain("Grund: Herzcheck");
  });

  it("lässt optionale Überweisung-Felder weg wenn leer", () => {
    const result = buildMedicalRecordNote({
      answers: { REF_SPECIALTY: "Kardiologie" },
      selected_block_ids: ["UEBERWEISUNG"],
    });
    const lines = result.split("\n");
    expect(lines.some((l) => l.startsWith("Facharzt:"))).toBe(false);
    expect(lines.some((l) => l.startsWith("Termin:"))).toBe(false);
    expect(lines.some((l) => l.startsWith("Grund:"))).toBe(false);
  });
});

describe("buildMedicalRecordNote – Kurzanamnese-Block", () => {
  it("enthält Kurzanamnese-Header und relevante Felder", () => {
    const result = buildMedicalRecordNote({
      answers: {
        ANAMNESE_GP: "Ja",
        ANAMNESE_HEIGHT: "175 cm",
        ANAMNESE_WEIGHT: "70 kg",
        ANAMNESE_CHRONIC: "Diabetes",
        ANAMNESE_ALLERGIES: "Pollen",
        ANAMNESE_MEDICATIONS: "Metformin",
      },
      selected_block_ids: ["KURZANAMNESE"],
    });
    const lines = result.split("\n");
    expect(lines).toContain("Kurzanamnese");
    expect(lines).toContain("Hausarzt: Ja");
    expect(lines).toContain("Größe/Gewicht: 175 cm / 70 kg");
    expect(lines).toContain("Chronische Erkrankungen: Diabetes");
    expect(lines).toContain("Allergien: Pollen");
    expect(lines).toContain("Medikamente: Metformin");
  });

  it("zeigt Größe allein wenn Gewicht fehlt", () => {
    const result = buildMedicalRecordNote({
      answers: { ANAMNESE_HEIGHT: "175 cm" },
      selected_block_ids: ["KURZANAMNESE"],
    });
    const lines = result.split("\n");
    expect(lines).toContain("Größe: 175 cm");
    expect(lines.some((l) => l.startsWith("Gewicht:"))).toBe(false);
  });

  it("zeigt kein Kurzanamnese-Header wenn keine Felder ausgefüllt", () => {
    const result = buildMedicalRecordNote({
      answers: {},
      selected_block_ids: ["KURZANAMNESE"],
    });
    expect(result).not.toContain("Kurzanamnese");
  });

  it("zeigt keinen Kurzanamnese-Abschnitt wenn Block nicht gewählt", () => {
    const result = buildMedicalRecordNote({
      answers: { ANAMNESE_GP: "Ja" },
      selected_block_ids: ["ARBEITSUNFAEHIGKEIT"],
    });
    expect(result).not.toContain("Kurzanamnese");
    expect(result).not.toContain("Hausarzt");
  });
});

describe("buildMedicalRecordNote – Kontakt/Adresse erweiterter Block", () => {
  it("enthält Kontakt/Adresse-Header und E-Mail sowie Doctolib wenn vorhanden", () => {
    const result = buildMedicalRecordNote({
      answers: {
        CONTACT_PHONE: "0170 1234567",
        CONTACT_EMAIL: "patient@example.com",
        CONTACT_DOCTOLIB: "Ja",
      },
      selected_block_ids: ["KONTAKT"],
    });
    const lines = result.split("\n");
    expect(lines).toContain("Kontakt/Adresse");
    expect(lines).toContain("Tel.: 0170 1234567");
    expect(lines).toContain("E-Mail: patient@example.com");
    expect(lines).toContain("Doctolib: Ja");
  });

  it("enthält Adresse wenn ADRESSE-Block gewählt", () => {
    const result = buildMedicalRecordNote({
      answers: { ADDRESS_POSTAL: "Musterstraße 1, 10115 Berlin" },
      selected_block_ids: ["ADRESSE"],
    });
    const lines = result.split("\n");
    expect(lines).toContain("Kontakt/Adresse");
    expect(lines).toContain("Adresse: Musterstraße 1, 10115 Berlin");
  });

  it("zeigt keinen Kontakt/Adresse-Header wenn alle Kontaktfelder leer", () => {
    const result = buildMedicalRecordNote({
      answers: {},
      selected_block_ids: ["KONTAKT"],
    });
    expect(result).not.toContain("Kontakt/Adresse");
  });
});

describe("buildMedicalRecordNote – Kontakt-Deduplizierung bei AU + REZEPT", () => {
  it("zeigt Tel. nur einmal wenn AU + REZEPT + KONTAKT kombiniert", () => {
    const result = buildMedicalRecordNote({
      answers: {
        AU_SYMPTOMS: "Husten",
        AU_START_DATE: "2024-01-08",
        PRESCRIPTION_TYPE: "Dauermedikation",
        CONTACT_PHONE: "0170 9999999",
      },
      selected_block_ids: ["ARBEITSUNFAEHIGKEIT", "REZEPT", "KONTAKT"],
    });
    const lines = result.split("\n");
    const telLines = lines.filter((l) => l.startsWith("Tel.:"));
    expect(telLines).toHaveLength(1);
  });

  it("zeigt Kontakt/Adresse-Header nur einmal", () => {
    const result = buildMedicalRecordNote({
      answers: {
        CONTACT_PHONE: "0170 9999999",
        ADDRESS_POSTAL: "Musterstr. 1",
      },
      selected_block_ids: ["KONTAKT", "ADRESSE", "ARBEITSUNFAEHIGKEIT"],
    });
    const lines = result.split("\n");
    const headerCount = lines.filter((l) => l === "Kontakt/Adresse").length;
    expect(headerCount).toBe(1);
  });
});

describe("buildMedicalRecordNote – keine Frageformulierungen", () => {
  it("enthält keine vollständigen Frageformulierungen im Kurztext", () => {
    const result = buildMedicalRecordNote({
      answers: {
        AU_SYMPTOMS: "Husten",
        AU_START_DATE: "2024-01-08",
        CONTACT_PHONE: "0170 123456",
      },
      selected_block_ids: ["ARBEITSUNFAEHIGKEIT", "KONTAKT"],
    });
    expect(result).not.toContain("Welche Beschwerden haben Sie?");
    expect(result).not.toContain("Seit wann bestehen die Beschwerden?");
    expect(result).not.toContain("Wie lautet Ihre Telefonnummer");
  });
});
