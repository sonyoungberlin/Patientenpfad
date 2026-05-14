import * as fs from "fs";
import * as path from "path";

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
    expect(src).toContain("Fehlende Angaben / Unterlagen");
    expect(src).toContain("Dokumente & Upload");
    expect(src).toContain("Versicherungsdaten");
    expect(src).toContain("Termine & Buchung");
    expect(src).toContain("Digitale Anfrage");
    expect(src).toContain("Warten / Technik");
  });

  it("rendert Prozessregale genau einmal global und nicht pro Profil", () => {
    const globalRenderRegex = /<ProcessShelfOrientationSection\s+sections=\{sections\}\s+profileActionCheckpoints=\{profileActionCheckpoints\}\s+statuses=\{statuses\}\s*\/?>/m;
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

  it("laesst das bestehende Fach-Rendering ueber SpecificSection-Varianten bestehen", () => {
    expect(src).toContain("<PrescriptionSpecificSection");
    expect(src).toContain("<AUSpecificSection");
    expect(src).toContain("<SpecificSection");
  });
});
