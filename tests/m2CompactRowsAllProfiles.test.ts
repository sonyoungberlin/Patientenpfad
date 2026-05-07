import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Regressions-Test: Die kompakte M2-Listenansicht (CompactExplanationRow)
// ist für ALLE Profile aktiviert – nicht nur für APPOINTMENT.
//
// Hintergrund: Die kompakte Darstellung wird über den `compactRows`-Prop von
// `<ProfileSectionIntroDrawers />` angesteuert. Sobald ein einzelnes Profil
// den Prop vergisst, fällt es zurück auf die alte „große" Frageblock-
// Darstellung (`QuestionBlock`). Das soll dauerhaft verhindert werden.
// ---------------------------------------------------------------------------

function loadM2ClientSource(): string {
  return fs.readFileSync(
    path.join(process.cwd(), "app/inquiries/[id]/m2/InquiryM2Client.tsx"),
    "utf8",
  );
}

describe("M2 kompakte Darstellung (CompactExplanationRow) für alle Profile", () => {
  const src = loadM2ClientSource();

  it("CompactExplanationRow-Komponente existiert", () => {
    expect(src).toMatch(/function CompactExplanationRow\s*\(/);
  });

  it("CompactTooltip-Komponente existiert", () => {
    expect(src).toMatch(/function CompactTooltip\s*\(/);
  });

  it("jeder <ProfileSectionIntroDrawers ... />-Aufruf setzt compactRows", () => {
    // Greife alle JSX-Blöcke `<ProfileSectionIntroDrawers ... />` ab und
    // prüfe, dass im Block der Prop `compactRows` gesetzt ist.
    const blocks = src.match(/<ProfileSectionIntroDrawers\b[\s\S]*?\/>/g) ?? [];
    expect(blocks.length).toBeGreaterThanOrEqual(8);
    for (const block of blocks) {
      expect(block).toMatch(/\bcompactRows\b/);
    }
  });

  it("mindestens ein Nicht-APPOINTMENT-Profil rendert über CompactExplanationRow", () => {
    // Indirekter Beweis: Im Drawer-Renderpfad wird CompactExplanationRow
    // genau dann verwendet, wenn `compactRows` true ist. Da alle Profil-
    // SpecificSections diesen Prop setzen (siehe Test oben) und CompactExplanationRow
    // im Source vorkommt, ist die kompakte Darstellung nicht auf APPOINTMENT
    // beschränkt. Zusätzlich prüfen wir, dass mehrere SHORT_LABELS-Maps
    // existieren (eine pro Profil) und alle in `<ProfileSectionIntroDrawers ... />`
    // mit compactRows gesetzt referenziert werden.
    const profiles = [
      "PRESCRIPTION_SHORT_LABELS",
      "AU_SHORT_LABELS",
      "REFERRAL_SHORT_LABELS",
      "HOSPITAL_ADMISSION_SHORT_LABELS",
      "LAB_SHORT_LABELS",
      "IMMUNIZATION_SHORT_LABELS",
      "APPOINTMENT_SHORT_LABELS",
      "ONBOARDING_SHORT_LABELS",
    ];
    for (const profile of profiles) {
      // Im Quelltext muss es einen <ProfileSectionIntroDrawers ... /> Block geben,
      // der genau dieses SHORT_LABELS-Set verwendet UND compactRows setzt.
      const blocks = src.match(/<ProfileSectionIntroDrawers\b[\s\S]*?\/>/g) ?? [];
      const found = blocks.some(
        (b) => b.includes(`shortLabels={${profile}}`) && /\bcompactRows\b/.test(b),
      );
      expect({ profile, found }).toEqual({ profile, found: true });
    }
  });
});
