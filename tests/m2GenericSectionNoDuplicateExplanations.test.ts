import * as fs from "fs";
import * as path from "path";

/**
 * Regressionstest: Im generischen `SpecificSection`-Renderer von
 * `InquiryM2Client.tsx` dürfen EXPLANATION-Checkpoints nicht doppelt
 * gerendert werden, wenn das Profil eine `SECTION_INTRO_GROUPS_BY_PROFILE`-
 * Antwortkontext-Struktur besitzt. In diesem Fall übernimmt
 * `ProfileSectionIntroDrawers` (oben in derselben Section) bereits sowohl
 * die gruppierten als auch die ungruppierten EXPLANATION-Checkpoints
 * (Fallback-Drawer „Weitere passende Hinweise"), und die alte
 * "+ ZUSATZFRAGEN"-Liste würde dieselben Checkpoints ein zweites Mal zeigen
 * (Bug zuerst beobachtet bei ACUTE_CARE).
 *
 * Profile, die bislang den generischen `SpecificSection`-Pfad nutzen und
 * gleichzeitig im Mapping stehen: ACUTE_CARE, SAMPLE_COLLECTION,
 * TECH_SUPPORT, BILLING, MEDICAL_DOCUMENTS.
 */

function loadM2ClientSource(): string {
  return fs.readFileSync(
    path.join(process.cwd(), "app/inquiries/[id]/m2/InquiryM2Client.tsx"),
    "utf8",
  );
}

describe("M2 SpecificSection (generisch) – keine Doppel-Render von EXPLANATION-Checkpoints", () => {
  const src = loadM2ClientSource();

  it("filtert specificCheckpoints in SpecificSection auf eine `visibleSpecificCheckpoints`-Liste, sobald hasSectionIntroMapping zutrifft", () => {
    // Wir suchen die Stelle im SpecificSection-Komponentenkopf, an der die
    // sichtbaren Checkpoints abgeleitet werden.
    expect(src).toMatch(/const visibleSpecificCheckpoints\s*=\s*hasIntroMapping/);
    // Der Filter muss EXPLANATION-Einträge entfernen.
    expect(src).toMatch(
      /visibleSpecificCheckpoints\s*=\s*hasIntroMapping[\s\S]{0,200}cp\.kind\s*!==\s*InquiryCheckpointKind\.EXPLANATION/,
    );
  });

  it("die '+ Zusatzfragen'-Liste in SpecificSection iteriert NICHT mehr direkt über section.specificCheckpoints", () => {
    // Das alte Render-Pattern war:
    //   {section.specificCheckpoints.map((cp) =>
    //     cp.kind === InquiryCheckpointKind.EXPLANATION ? (...
    // Wir prüfen, dass der gefilterte Lookup verwendet wird statt der rohen Liste.
    const directExplanationRender =
      /\{\s*section\.specificCheckpoints\.map\(\(cp\)\s*=>\s*[\s\S]{0,80}EXPLANATION/;
    expect(src).not.toMatch(directExplanationRender);
    // Stattdessen muss visibleSpecificCheckpoints.map verwendet werden.
    expect(src).toMatch(/\{\s*visibleSpecificCheckpoints\.map\(\(cp\)\s*=>/);
  });
});
