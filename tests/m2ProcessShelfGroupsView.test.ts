import * as fs from "fs";
import * as path from "path";
import { PROCESS_SHELF_GROUPS } from "@/lib/inquiries/processShelfGroups";

function loadM2ClientSource(): string {
  return fs.readFileSync(
    path.join(process.cwd(), "app/inquiries/[id]/m2/InquiryM2Client.tsx"),
    "utf8",
  );
}

describe("M2 Prozessregale Sicht (global)", () => {
  const src = loadM2ClientSource();

  it("rendert weder Globale Hinweise noch Prozessregale", () => {
    expect(src).not.toContain("Globale Hinweise");
    expect(src).not.toContain("Prozessregale");
    expect(src).not.toContain("ProcessShelfOrientationSection");
  });

  it("routet globale Explanations in bestehende thematische Schubladen", () => {
    expect(src).toMatch(/checkpointIds:\s*\[\s*"REQUIRED_INFORMATION_COMPLETE"/);
    expect(src).toContain('"DOCUMENTS_RECEIVED_AND_ASSIGNED",');
    expect(src).toContain('"DIGITAL_REQUEST_MEDICAL_REVIEW",');
    expect(src).toContain('"INFECTIOUS_PROTOCOL",');
    expect(src).toContain('sectionIntroId: "SECTION_INTRO_REVIEWED"');
  });

  it("führt gebundene globale Checkpoints in die Profil-Sections ein", () => {
    const pageSrc = fs.readFileSync(
      path.join(process.cwd(), "app/inquiries/[id]/m2/page.tsx"),
      "utf8",
    );
    expect(pageSrc).toContain("...profile.boundGlobalCheckpointIds");
  });
  it("behält die Prozessregal-Kataloge außerhalb der M2-Darstellung bei", () => {
    expect(PROCESS_SHELF_GROUPS.missingInfoOrDocuments.checkpointIds).toContain("AU_MISSING_QUESTIONNAIRE");
    expect(PROCESS_SHELF_GROUPS.documentsAndUpload.checkpointIds).toContain("DOCUMENT_UPLOAD");
  });

  it("laesst das bestehende Fach-Rendering ueber SpecificSection-Varianten bestehen", () => {
    expect(src).toContain("<PrescriptionSpecificSection");
    expect(src).toContain("<AUSpecificSection");
    expect(src).toContain("<SpecificSection");
  });
});
