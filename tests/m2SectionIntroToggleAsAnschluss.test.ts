import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Regressions-Tests: Antwortkontext-Toggle ist der Anschluss-Satz selbst.
//
// Der frühere Doppel-Look (Button „Als Antwortkontext wählen“ + Text
// „Anschluss: …“) wurde durch einen einzigen klickbaren Anschluss-Satz
// ersetzt. Diese Tests sichern dies via Quelltext-Inspektion ab und stellen
// sicher, dass die Toggle-Logik (`onSectionIntroToggle` → `aria-pressed`)
// erhalten bleibt.
// ---------------------------------------------------------------------------

function loadInquiryM2ClientSource(): string {
  return fs.readFileSync(
    path.join(process.cwd(), "app/inquiries/[id]/m2/InquiryM2Client.tsx"),
    "utf8",
  );
}

describe("M2 Antwortkontext-Toggle ist der Anschluss-Satz", () => {
  const src = loadInquiryM2ClientSource();

  it("entfernt den Button-Text „Als Antwortkontext wählen“", () => {
    expect(src).not.toMatch(/Als Antwortkontext wählen/);
  });

  it("entfernt den ehemaligen aktiven Button-Text „Antwortkontext aktiv“", () => {
    // "Antwortkontext aktiv" als Button-Label wurde abgeschafft; das aria-Label
    // "aktiver Antwortkontext" am AKTIV-Badge bleibt davon unberührt.
    expect(src).not.toMatch(/"Antwortkontext aktiv"/);
  });

  it("entfernt das vorangestellte Label „Anschluss:“", () => {
    expect(src).not.toMatch(/Anschluss:\s*„/);
  });

  it("rendert den previewText direkt als Button-Label", () => {
    // Erwartetes Muster: `„… ${sectionIntro.previewText}"` als Button-Inhalt.
    expect(src).toMatch(/`„… \$\{sectionIntro\.previewText\}"`/);
  });

  it("Toggle-Button trägt aria-pressed und ruft onSectionIntroToggle auf", () => {
    expect(src).toMatch(/aria-pressed=\{isIntroActive\}/);
    expect(src).toMatch(/onSectionIntroToggle\(sectionIntro\.id\)/);
  });

  it("Toggle-Logik nutzt unverändert applySectionIntroToggle", () => {
    expect(src).toMatch(/applySectionIntroToggle\s*\(\s*prev\s*,\s*clickedId\s*,\s*sectionIntroIds\s*\)/);
  });
});
