import { BLOCK_CATALOG } from "@/lib/questionnaire/blockCatalog";
import { buildQuestionnaireExportFilename } from "@/lib/questionnaire/questionnaireExportFilename";

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