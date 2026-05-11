/**
 * Tests für buildMedicalRecordNote.
 *
 * Prüft den blockbasierten Aufbau:
 * - Titel-Logik (AU, Rezept, gemischt) bleibt unverändert
 * - Block-Header werden aus BLOCK_CATALOG[id].label übernommen
 * - Pro Block werden die Fragen in Katalog-Reihenfolge ausgegeben
 * - Doppelte questionIds erscheinen blockübergreifend nur einmal
 * - Leere Werte werden weggelassen
 * - Mehrzeilige Textarea-Werte (z.B. ADDRESS_POSTAL) erhalten ihre
 *   Newlines als Folgezeilen unterhalb des Labels
 * - Pro Zeile wird auf 80 Zeichen gekürzt (mit „…")
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
  it("gibt 'Kontaktdaten'-Header und Telefonnummer aus", () => {
    const result = buildMedicalRecordNote({
      answers: { CONTACT_PHONE: "0170 1234567" },
      selected_block_ids: ["KONTAKT", "ARBEITSUNFAEHIGKEIT"],
    });
    const lines = result.split("\n");
    expect(lines).toContain("Kontaktdaten");
    expect(lines).toContain("Tel.: 0170 1234567");
  });

  it("lässt Telefon weg wenn KONTAKT nicht in Block-IDs", () => {
    const result = buildMedicalRecordNote({
      answers: { CONTACT_PHONE: "0170 1234567" },
      selected_block_ids: ["ARBEITSUNFAEHIGKEIT"],
    });
    const lines = result.split("\n");
    expect(lines.some((l) => l.startsWith("Tel.:"))).toBe(false);
    expect(lines).not.toContain("Kontaktdaten");
  });

  it("lässt Telefon und Header weg wenn alle Werte leer", () => {
    const result = buildMedicalRecordNote({
      answers: { CONTACT_PHONE: "" },
      selected_block_ids: ["KONTAKT"],
    });
    const lines = result.split("\n");
    expect(lines.some((l) => l.startsWith("Tel.:"))).toBe(false);
    expect(lines).not.toContain("Kontaktdaten");
  });

  it("enthält E-Mail und Doctolib zusätzlich zur Telefonnummer", () => {
    const result = buildMedicalRecordNote({
      answers: {
        CONTACT_PHONE: "0170 1234567",
        CONTACT_EMAIL: "patient@example.com",
        CONTACT_DOCTOLIB: "ja",
      },
      selected_block_ids: ["KONTAKT"],
    });
    const lines = result.split("\n");
    expect(lines).toContain("Kontaktdaten");
    expect(lines).toContain("Tel.: 0170 1234567");
    expect(lines).toContain("E-Mail: patient@example.com");
    expect(lines).toContain("Doctolib: ja");
  });
});

describe("buildMedicalRecordNote – Adresse-Block", () => {
  it("gibt eigenen 'Adresse'-Header aus (nicht kombiniert mit Kontakt)", () => {
    const result = buildMedicalRecordNote({
      answers: { ADDRESS_POSTAL: "Musterstraße 1, 10115 Berlin" },
      selected_block_ids: ["ADRESSE"],
    });
    const lines = result.split("\n");
    expect(lines).toContain("Adresse");
    expect(lines).toContain("Adresse: Musterstraße 1, 10115 Berlin");
    expect(lines).not.toContain("Kontakt/Adresse");
  });

  it("erhält Newlines in ADDRESS_POSTAL als Folgezeilen", () => {
    const result = buildMedicalRecordNote({
      answers: { ADDRESS_POSTAL: "Straße\nOrt" },
      selected_block_ids: ["ADRESSE"],
    });
    const lines = result.split("\n");
    const idx = lines.indexOf("Adresse: Straße");
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(lines[idx + 1]).toBe("Ort");
  });

  it("zeigt Adresse- und Kontaktdaten-Header bei kombinierten Blöcken getrennt", () => {
    const result = buildMedicalRecordNote({
      answers: {
        CONTACT_PHONE: "0170 1234567",
        ADDRESS_POSTAL: "Musterstr. 1",
      },
      selected_block_ids: ["KONTAKT", "ADRESSE"],
    });
    const lines = result.split("\n");
    expect(lines).toContain("Kontaktdaten");
    expect(lines).toContain("Adresse");
    // Reihenfolge nach displayOrder: KONTAKT (10) vor ADRESSE (20)
    expect(lines.indexOf("Kontaktdaten")).toBeLessThan(lines.indexOf("Adresse"));
  });
});

describe("buildMedicalRecordNote – Identität-Block", () => {
  it("gibt nur Identitätsfelder (ohne Versicherungsart) mit eigenem Header aus", () => {
    const result = buildMedicalRecordNote({
      answers: {
        IDENTITY_FIRST_NAME: "Son-Young",
        IDENTITY_LAST_NAME: "Test",
        IDENTITY_BIRTHDATE: "1999-01-05",
      },
      selected_block_ids: ["IDENTITAET"],
    });
    const lines = result.split("\n");
    expect(lines).toContain("Identität");
    expect(lines).toContain("Vorname: Son-Young");
    expect(lines).toContain("Nachname: Test");
    expect(lines).toContain("Geburtsdatum: 1999-01-05");
    expect(lines).not.toContain("Versicherungsart: gesetzlich versichert");
  });

  it("gibt Versicherungsart im separaten Block VERSICHERUNG aus", () => {
    const result = buildMedicalRecordNote({
      answers: {
        IDENTITY_INSURANCE_TYPE: "gesetzlich versichert",
      },
      selected_block_ids: ["VERSICHERUNG"],
    });
    const lines = result.split("\n");
    expect(lines).toContain("Versicherungsdaten");
    expect(lines).toContain("Versicherungsart: gesetzlich versichert");
  });

  it("gibt die IK-Nummer mit dem neuen Kurzlabel aus", () => {
    const result = buildMedicalRecordNote({
      answers: {
        INSURANCE_CARD_IDENTIFIER: "109876543",
      },
      selected_block_ids: ["VERSICHERUNG"],
    });
    const lines = result.split("\n");
    expect(lines).toContain("IK-Nummer Krankenkasse: 109876543");
  });

  it("erscheint als erster Block (displayOrder 5) vor Kontakt", () => {
    const result = buildMedicalRecordNote({
      answers: {
        IDENTITY_FIRST_NAME: "Son-Young",
        CONTACT_PHONE: "0170 1234567",
      },
      selected_block_ids: ["KONTAKT", "IDENTITAET"],
    });
    const lines = result.split("\n");
    expect(lines.indexOf("Identität")).toBeLessThan(lines.indexOf("Kontaktdaten"));
  });

  it("'Identitätsabfrage erfolgt' erscheint nicht wenn IDENTITAET-Block vorhanden", () => {
    const result = buildMedicalRecordNote({
      answers: { IDENTITY_FIRST_NAME: "Son-Young" },
      selected_block_ids: ["IDENTITAET"],
      identity_gate_completed_at: new Date(),
    });
    expect(result).not.toContain("Identitätsabfrage erfolgt");
  });

  it("'Identitätsabfrage erfolgt' wird als Fallback ausgegeben wenn IDENTITAET fehlt", () => {
    const result = buildMedicalRecordNote({
      answers: { AU_SYMPTOMS: "Husten" },
      selected_block_ids: ["ARBEITSUNFAEHIGKEIT"],
      identity_gate_completed_at: new Date(),
    });
    expect(result).toContain("Identitätsabfrage erfolgt");
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

  it("erhält mehrzeiligen Text als Folgezeilen unterhalb des Labels", () => {
    const result = buildMedicalRecordNote({
      answers: { PRESCRIPTION_MEDICATION: "Zeile 1\nZeile 2" },
      selected_block_ids: ["REZEPT"],
    });
    const lines = result.split("\n");
    const idx = lines.findIndex((l) => l === "Medikament: Zeile 1");
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(lines[idx + 1]).toBe("Zeile 2");
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

describe("buildMedicalRecordNote – Kurzanamnese-Block (vollständig)", () => {
  it("enthält Header und alle Kurzanamnese-Felder als separate Zeilen", () => {
    const result = buildMedicalRecordNote({
      answers: {
        ANAMNESE_GP: "nein",
        ANAMNESE_HEIGHT: "187",
        ANAMNESE_WEIGHT: "90",
        ANAMNESE_CHRONIC: "keine",
        ANAMNESE_HEREDITARY: "keine",
        ANAMNESE_ALLERGIES: "pollen",
        ANAMNESE_MEDICATIONS: "nix",
        ANAMNESE_SMOKING: "ja",
        ANAMNESE_ALCOHOL: "nein",
        ANAMNESE_SUBSTANCES: "kaffee",
        ANAMNESE_VACCINATION: "ja",
      },
      selected_block_ids: ["KURZANAMNESE"],
    });
    const lines = result.split("\n");
    expect(lines).toContain("Kurzanamnese");
    expect(lines).toContain("Hausarzt: nein");
    expect(lines).toContain("Größe: 187");
    expect(lines).toContain("Gewicht: 90");
    expect(lines).toContain("Chronische Erkrankungen: keine");
    expect(lines).toContain("Erbkrankheiten: keine");
    expect(lines).toContain("Allergien: pollen");
    expect(lines).toContain("Medikamente: nix");
    expect(lines).toContain("Rauchen: ja");
    expect(lines).toContain("Alkohol: nein");
    expect(lines).toContain("Sonstige Substanzen: kaffee");
    expect(lines).toContain("Impfstatus bekannt: ja");
  });

  it("zeigt Größe und Gewicht jeweils als eigene Zeile", () => {
    const result = buildMedicalRecordNote({
      answers: { ANAMNESE_HEIGHT: "175 cm", ANAMNESE_WEIGHT: "70 kg" },
      selected_block_ids: ["KURZANAMNESE"],
    });
    const lines = result.split("\n");
    expect(lines).toContain("Größe: 175 cm");
    expect(lines).toContain("Gewicht: 70 kg");
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

describe("buildMedicalRecordNote – Deduplizierung", () => {
  it("zeigt Tel. nur einmal wenn KONTAKT mehrfach impliziert wird", () => {
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

  it("zeigt jeden Block-Header maximal einmal", () => {
    const result = buildMedicalRecordNote({
      answers: {
        CONTACT_PHONE: "0170 9999999",
        ADDRESS_POSTAL: "Musterstr. 1",
      },
      selected_block_ids: ["KONTAKT", "ADRESSE", "KONTAKT"],
    });
    const lines = result.split("\n");
    expect(lines.filter((l) => l === "Kontaktdaten")).toHaveLength(1);
    expect(lines.filter((l) => l === "Adresse")).toHaveLength(1);
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

describe("buildMedicalRecordNote – Block-Reihenfolge nach displayOrder", () => {
  it("ordnet Blöcke unabhängig von Eingabe-Reihenfolge nach displayOrder", () => {
    const result = buildMedicalRecordNote({
      answers: {
        IDENTITY_FIRST_NAME: "Son-Young",
        CONTACT_PHONE: "0170 1234567",
        ADDRESS_POSTAL: "Straße",
        ANAMNESE_GP: "nein",
      },
      selected_block_ids: ["KURZANAMNESE", "ADRESSE", "KONTAKT", "IDENTITAET"],
    });
    const lines = result.split("\n");
    const idents = lines.indexOf("Identität");
    const kontakt = lines.indexOf("Kontaktdaten");
    const adresse = lines.indexOf("Adresse");
    const kurz = lines.indexOf("Kurzanamnese");
    expect(idents).toBeGreaterThanOrEqual(0);
    expect(idents).toBeLessThan(kontakt);
    expect(kontakt).toBeLessThan(adresse);
    expect(adresse).toBeLessThan(kurz);
  });

  it("entspricht dem dokumentierten Soll-Output für Identität+Versicherung+Kontakt+Adresse+Kurzanamnese", () => {
    const result = buildMedicalRecordNote({
      answers: {
        IDENTITY_FIRST_NAME: "Son-Young",
        IDENTITY_LAST_NAME: "Test",
        IDENTITY_BIRTHDATE: "1999-01-05",
        IDENTITY_INSURANCE_TYPE: "gesetzlich versichert",
        CONTACT_PHONE: "09043219875167",
        CONTACT_DOCTOLIB: "ja",
        ADDRESS_POSTAL: "Straße\nOrt",
        ANAMNESE_GP: "nein",
        ANAMNESE_HEIGHT: "187",
        ANAMNESE_WEIGHT: "90",
        ANAMNESE_CHRONIC: "keine",
        ANAMNESE_HEREDITARY: "keine",
        ANAMNESE_ALLERGIES: "pollen",
        ANAMNESE_MEDICATIONS: "nix",
        ANAMNESE_SMOKING: "ja",
        ANAMNESE_ALCOHOL: "nein",
        ANAMNESE_SUBSTANCES: "kaffee",
        ANAMNESE_VACCINATION: "ja",
      },
      selected_block_ids: [
        "IDENTITAET",
        "VERSICHERUNG",
        "KONTAKT",
        "ADRESSE",
        "KURZANAMNESE",
      ],
    });
    const expected = [
      "Digitale Anfrage",
      "",
      "Identität",
      "Vorname: Son-Young",
      "Nachname: Test",
      "Geburtsdatum: 1999-01-05",
      "",
      "Versicherungsdaten",
      "Versicherungsart: gesetzlich versichert",
      "",
      "Kontaktdaten",
      "Tel.: 09043219875167",
      "Doctolib: ja",
      "",
      "Adresse",
      "Adresse: Straße",
      "Ort",
      "",
      "Kurzanamnese",
      "Hausarzt: nein",
      "Größe: 187",
      "Gewicht: 90",
      "Chronische Erkrankungen: keine",
      "Erbkrankheiten: keine",
      "Allergien: pollen",
      "Medikamente: nix",
      "Rauchen: ja",
      "Alkohol: nein",
      "Sonstige Substanzen: kaffee",
      "Impfstatus bekannt: ja",
    ].join("\n");
    expect(result).toBe(expected);
  });
});
