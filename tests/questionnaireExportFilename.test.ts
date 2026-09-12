import { BLOCK_CATALOG } from "@/lib/questionnaire/blockCatalog";
import { buildQuestionnaireExportFilename } from "@/lib/questionnaire/questionnaireExportFilename";
import { resolveQuestionnaireGdtExport } from "@/lib/questionnaire/questionnaireExportService";

function buildSession(selectedBlockIds: string[], overrides: Record<string, unknown> = {}) {
  return {
    patient_reference: "12345",
    submitted_at: new Date("2026-09-10T10:00:00.000Z"),
    submitted_by: "patient",
    selected_block_ids: selectedBlockIds,
    deduplicated_questions: [],
    frozen_blocks: null,
    answers: {},
    source: "internal_link",
    practice_form: null,
    session_kind: "patient_communication",
    internal_workflow_id: null,
    ...overrides,
  };
}

it("verwendet für PDF, XML und GDT einen identischen Dateistamm", () => {
  const session = {
    patient_reference: "12345",
    submitted_at: new Date("2026-09-10T10:00:00.000Z"),
    selected_block_ids: ["VERSICHERUNG"],
    answers: {},
    source: "internal_link",
    practice_form: null,
  };
  const options = {
    blockCatalog: BLOCK_CATALOG,
    filenameLabel: "Gesundheitsuntersuchung",
  };

  const pdfFilename = buildQuestionnaireExportFilename(session, {
    ...options,
    extension: "pdf",
  });
  const xmlFilename = buildQuestionnaireExportFilename(session, {
    ...options,
    extension: "xml",
  });
  const gdtFilename = buildQuestionnaireExportFilename(session, {
    ...options,
    extension: "gdt",
  });

  expect(pdfFilename).toBe("20260910_12345_Gesundheitsuntersuchung.pdf");
  expect(xmlFilename).toBe("20260910_12345_Gesundheitsuntersuchung.xml");
  expect(gdtFilename).toBe("20260910_12345_Gesundheitsuntersuchung.gdt");
  expect(pdfFilename.slice(0, -4)).toBe(xmlFilename.slice(0, -4));
  expect(pdfFilename.slice(0, -4)).toBe(gdtFilename.slice(0, -4));
});

it.each([
  ["ARBEITSUNFAEHIGKEIT", "AUAnfrage", "AU-Anfrage"],
  ["REZEPT", "Rezeptanfrage", "Rezeptanfrage"],
  ["HEILMITTELVERORDNUNG", "Anfrage_HMV", "Anfrage HMV"],
  ["UEBERWEISUNG", "Ueberweisungsanfrage", "Überweisungsanfrage"],
  ["HOSPITAL_ADMISSION", "Anfrage_Krankenhauseinweisung", "Anfrage Krankenhauseinweisung"],
  ["TRANSPORT", "Anfrage_Krankenbefoerderung", "Anfrage Krankenbeförderung"],
])("verwendet für %s die kanonische Exportbezeichnung", (blockId, filenameLabel, gdtLabel) => {
  const session = buildSession([blockId]);

  expect(buildQuestionnaireExportFilename(session, {
    blockCatalog: BLOCK_CATALOG,
    extension: "pdf",
  })).toBe(`20260910_12345_${filenameLabel}.pdf`);
  expect(resolveQuestionnaireGdtExport(session)?.documentationText)
    .toBe(`System: ${gdtLabel} eingegangen`);
});

it("stellt Kontaktdaten im Dateinamen voran, aber nicht im GDT-Text", () => {
  const session = buildSession(["IDENTITAET", "REZEPT", "KONTAKT"]);

  expect(buildQuestionnaireExportFilename(session, {
    blockCatalog: BLOCK_CATALOG,
    extension: "pdf",
  })).toBe("20260910_12345_Kontaktdaten_Rezeptanfrage.pdf");
  expect(resolveQuestionnaireGdtExport(session)).toEqual(expect.objectContaining({
    filename: "20260910_12345_Kontaktdaten_Rezeptanfrage.gdt",
    documentationText: "System: Rezeptanfrage eingegangen",
  }));
});

it("behält bei mehreren fachlichen Blöcken einen spezifischen Dateinamen und neutralisiert nur GDT", () => {
  const session = buildSession(["KONTAKT", "REZEPT", "UEBERWEISUNG"]);

  expect(buildQuestionnaireExportFilename(session, {
    blockCatalog: BLOCK_CATALOG,
    extension: "pdf",
  })).toBe("20260910_12345_Kontaktdaten_Rezeptanfrage_Ueberweisungsanfrage.pdf");
  expect(resolveQuestionnaireGdtExport(session)).toEqual(expect.objectContaining({
    filename: "20260910_12345_Kontaktdaten_Rezeptanfrage_Ueberweisungsanfrage.gdt",
    documentationText: "System: Patientenfragebogen eingegangen",
  }));
});

it("behält den Titel eines Website-Formulars als Exportbezeichnung", () => {
  const session = buildSession(["KONTAKT", "KURZANAMNESE"], {
    source: "website",
    practice_form: { title: "Neupatient ÄÖÜ" },
  });

  expect(buildQuestionnaireExportFilename(session, {
    blockCatalog: BLOCK_CATALOG,
    extension: "pdf",
  })).toBe("20260910_12345_Kontaktdaten_Neupatient_AeOeUe.pdf");
  expect(resolveQuestionnaireGdtExport(session)?.documentationText)
    .toBe("System: Neupatient ÄÖÜ eingegangen");
});