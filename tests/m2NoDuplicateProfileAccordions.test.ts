import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Regressions-Tests: keine doppelte Akkordeon-Struktur in M2.
//
// Hintergrund: Nach Einführung der `SECTION_INTRO_GROUPS_BY_PROFILE`-
// Antwortkontexte (oben pro Profil-Section) dürfen die alten profilinternen
// Akkordeon-Gruppen (PRESCRIPTION_GROUPS, REFERRAL_GROUPS, …) nicht mehr
// zusätzlich gerendert werden. Sie sollen ausschließlich als Fallback
// dienen, wenn ein Profil noch kein neues Mapping besitzt.
//
// Dieser Test liest den Quelltext der M2-UI und prüft, dass jeder
// `*_GROUPS.map(`-Renderaufruf hinter `hasSectionIntroMapping(`
// gekapselt ist – damit die Doppelanzeige nicht zurückkehrt.
// ---------------------------------------------------------------------------

function loadM2ClientSource(): string {
  return fs.readFileSync(
    path.join(process.cwd(), "app/inquiries/[id]/m2/InquiryM2Client.tsx"),
    "utf8",
  );
}

const PROFILE_GROUPS_CONSTS = [
  "PRESCRIPTION_GROUPS",
  "REFERRAL_GROUPS",
  "HOSPITAL_ADMISSION_GROUPS",
  "IMMUNIZATION_GROUPS",
  "ONBOARDING_GROUPS",
  "AU_GROUPS",
  "LAB_GROUPS",
  "APPOINTMENT_GROUPS",
];

describe("M2 doppelte Akkordeon-Struktur (Regression)", () => {
  const src = loadM2ClientSource();

  it("Helper hasSectionIntroMapping ist im Client definiert", () => {
    expect(src).toMatch(/function hasSectionIntroMapping\s*\(/);
  });

  it.each(PROFILE_GROUPS_CONSTS)(
    "Render-Aufruf %s.map(...) ist hinter hasSectionIntroMapping(...) gekapselt (oder gar nicht gerendert)",
    (groupsConst) => {
      const renderCallRegex = new RegExp(`\\{${groupsConst}\\.map\\(`, "g");
      const renderMatches = Array.from(src.matchAll(renderCallRegex));

      for (const match of renderMatches) {
        // Schaue zurück bis ca. 800 Zeichen vor dem Render-Aufruf, ob in der
        // umschließenden JSX-Bedingung `!hasSectionIntroMapping(` vorkommt.
        const start = Math.max(0, (match.index ?? 0) - 800);
        const window = src.slice(start, match.index ?? 0);
        expect(window).toMatch(/!hasSectionIntroMapping\(/);
      }
    },
  );

  it("Onboarding-Fallback `Weitere passende Hinweise` ist ebenfalls gekapselt", () => {
    // Der „Weitere passende Hinweise"-Block in OnboardingSpecificSection
    // gehört konzeptionell zur alten Gruppen-Struktur und muss ebenfalls
    // hinter dem Mapping-Check liegen, weil die neue
    // ProfileSectionIntroDrawers bereits einen eigenen Fallback-Drawer hat.
    const idx = src.indexOf('"onb_weitere_hinweise"');
    expect(idx).toBeGreaterThan(0);
    const start = Math.max(0, idx - 1500);
    const window = src.slice(start, idx);
    expect(window).toMatch(/!hasSectionIntroMapping\(/);
  });
});
