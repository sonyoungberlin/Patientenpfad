import * as fs from "fs";
import * as path from "path";
import { PROCESS_SHELF_GROUPS } from "@/lib/inquiries/processShelfGroups";
import { buildGlobalProcessShelfGroups } from "@/app/inquiries/[id]/m2/InquiryM2Client";
import { InquiryCheckpointKind, InquiryCheckpointScope } from "@/lib/inquiries/types";

function loadM2ClientSource(): string {
  return fs.readFileSync(
    path.join(process.cwd(), "app/inquiries/[id]/m2/InquiryM2Client.tsx"),
    "utf8",
  );
}

describe("M2 Prozessregale Sicht (global)", () => {
  const src = loadM2ClientSource();

  it("nutzt PROCESS_SHELF_GROUPS als ergaenzende Zuordnung", () => {
    expect(src).toMatch(/from "@\/lib\/inquiries\/processShelfGroups"/);
    expect(src).toMatch(/buildGlobalProcessShelfGroups\s*\(/);
    expect(src).toMatch(/getProcessShelfGroupForCheckpointId\(/);
  });

  it("enthaelt die geforderten sechs Prozessregal-Labels", () => {
    expect(PROCESS_SHELF_GROUPS.missingInfoOrDocuments.label).toBe("Fehlende Angaben / Unterlagen");
    expect(PROCESS_SHELF_GROUPS.documentsAndUpload.label).toBe("Dokumente & Upload");
    expect(PROCESS_SHELF_GROUPS.insuranceData.label).toBe("Versicherungsdaten");
    expect(PROCESS_SHELF_GROUPS.appointmentsAndBooking.label).toBe("Termine & Buchung");
    expect(PROCESS_SHELF_GROUPS.digitalRequest.label).toBe("Digitale Anfrage");
    expect(src).toContain("Warten / Technik");
  });

  it("rendert Prozessregale genau einmal global und nicht pro Profil", () => {
    const globalRenderRegex = /<ProcessShelfOrientationSection\s+sections=\{sections\}\s+profileActionCheckpoints=\{profileActionCheckpoints\}\s+statuses=\{statuses\}\s+onChange=\{setStatus\}\s*\/?>/m;
    expect(src).toMatch(globalRenderRegex);
    expect(src).not.toMatch(/<ProcessShelfOrientationSection\s+section=\{section\}/);
  });

  it("sammelt IDs aus allen geforderten Quellen und dedupliziert nach Checkpoint-ID", () => {
    expect(src).toContain("const checkpointById = new Map<string, PlainCheckpoint>()");
    expect(src).toContain("for (const section of sections)");
    expect(src).toContain("for (const cp of section.specificCheckpoints)");
    expect(src).toContain("for (const cp of section.actionCheckpoints)");
    expect(src).toContain("for (const cp of section.allBoundActionCheckpoints ?? [])");
    expect(src).toContain("for (const cp of section.sectionIntroCheckpoints ?? [])");
    expect(src).toContain("for (const cp of profileActionCheckpoints)");
  });

  it("zeigt profilbezogene AU-Explanations nicht zusätzlich im globalen Regal", () => {
    const groups = buildGlobalProcessShelfGroups(
      [{
        inquiryId: "AU",
        label: "AU",
        decisionQuestions: [],
        specificCheckpoints: [
          {
            id: "AU_MISSING_QUESTIONNAIRE",
            label: "Angaben zur Erkrankung fehlen",
            kind: InquiryCheckpointKind.EXPLANATION,
            scope: InquiryCheckpointScope.SPECIFIC,
          },
        ],
        actionCheckpoints: [],
      }],
      [{
        id: "DIGITAL_REQUEST",
        label: "Digitale Anfrage",
        kind: InquiryCheckpointKind.ACTION,
        scope: InquiryCheckpointScope.GLOBAL,
      }],
    );
    const ids = groups.flatMap((group) => group.checkpoints.map((checkpoint) => checkpoint.id));
    expect(ids).not.toContain("AU_MISSING_QUESTIONNAIRE");
    expect(ids).toContain("DIGITAL_REQUEST");
  });

  it("laesst das bestehende Fach-Rendering ueber SpecificSection-Varianten bestehen", () => {
    expect(src).toContain("<PrescriptionSpecificSection");
    expect(src).toContain("<AUSpecificSection");
    expect(src).toContain("<SpecificSection");
  });
});
