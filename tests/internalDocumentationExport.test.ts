import { resolveInternalDocumentationExportMetadata } from "@/lib/questionnaire/internalDocumentationExport";

const blocks = [{
  id: "CARE_PLAN_HA",
  label: "Hausärztliche Betreuung",
  displayOrder: 10,
  questions: [],
  conditionalRules: [],
  initiallyVisible: true,
  outputSemantics: "documented-content-v1" as const,
}];

function session(frozenBlocks: unknown, patientReference: unknown = "81426") {
  return {
    patient_reference: patientReference,
    submitted_at: new Date("2026-09-11T22:30:00.000Z"),
    frozen_blocks: frozenBlocks,
  };
}

describe("resolveInternalDocumentationExportMetadata", () => {
  it("liefert normalisierte Referenz, festen Titel, Basisdateinamen und GDT-Text", () => {
    const metadata = resolveInternalDocumentationExportMetadata(session({
      schemaVersion: 2,
      metadata: {
        documentTitleOption: "bescheinigung",
        documentTitle: "Bescheinigung",
      },
      blocks,
    }, " 81426 "));

    expect(metadata).toEqual({
      patientReference: "81426",
      documentTitle: "Bescheinigung",
      baseFilename: "20260912_81426_Bescheinigung",
      gdtText: "System: Bescheinigung dokumentiert",
    });
  });

  it("verwendet den persistierten individuellen Titel und sanitisiert nur den Dateinamen", () => {
    const metadata = resolveInternalDocumentationExportMetadata(session({
      schemaVersion: 2,
      metadata: {
        documentTitleOption: "andere",
        documentTitle: "Ärztliche Stellungnahme & Bericht",
      },
      blocks,
    }));

    expect(metadata.documentTitle).toBe("Ärztliche Stellungnahme & Bericht");
    expect(metadata.baseFilename)
      .toBe("20260912_81426_Aerztliche_Stellungnahme_Bericht");
    expect(metadata.gdtText)
      .toBe("System: Ärztliche Stellungnahme & Bericht dokumentiert");
  });

  it("lässt eine ungültige Legacy-Referenz aus und verwendet den zentralen Titelfallback", () => {
    const metadata = resolveInternalDocumentationExportMetadata(
      session(blocks, "PAT-ALT"),
    );

    expect(metadata).toEqual({
      patientReference: null,
      documentTitle: "Interne Dokumentation",
      baseFilename: "20260912_Interne_Dokumentation",
      gdtText: "System: Interne Dokumentation dokumentiert",
    });
  });
});
