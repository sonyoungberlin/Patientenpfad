import * as fs from "fs";
import * as path from "path";
import {
  hasSectionIntroMapping,
  isOnboardingDocsDrawerCheckpoint,
} from "@/app/inquiries/[id]/m2/InquiryM2Client";
import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";

/**
 * Regressionstest speziell für `ONBOARDING`:
 *
 * Im Profil „Patientenaufnahme / Registrierung" wurden die alten
 * `ONBOARDING_GROUPS`-Akkordeons (Patient eindeutig identifizieren,
 * Praxiszuständigkeit, Versicherung / Unterlagen, Weitere passende Hinweise)
 * zusätzlich zur neuen `ProfileSectionIntroDrawers`-Antwortkontext-Struktur
 * gerendert. Dadurch erschienen dieselben EXPLANATION-Checkpoints doppelt.
 *
 * Dieser Test sichert konkret:
 *  1. ONBOARDING ist im neuen `SECTION_INTRO_GROUPS_BY_PROFILE`-Mapping enthalten,
 *     so dass `hasSectionIntroMapping("ONBOARDING")` true liefert.
 *  2. Die `OnboardingSpecificSection` rendert `ProfileSectionIntroDrawers`
 *     (neue Antwortkontext-Struktur).
 *  3. Sowohl der `ONBOARDING_GROUPS.map(...)`-Block als auch der
 *     "onb_weitere_hinweise"-Fallback sind hinter
 *     `!hasSectionIntroMapping(section.inquiryId)` gekapselt – damit sie nicht
 *     mehr gleichzeitig mit den Antwortkontexten gerendert werden.
 */

function loadM2ClientSource(): string {
  return fs.readFileSync(
    path.join(process.cwd(), "app/inquiries/[id]/m2/InquiryM2Client.tsx"),
    "utf8",
  );
}

function sliceOnboardingSection(src: string): string {
  const start = src.indexOf("function OnboardingSpecificSection(");
  expect(start).toBeGreaterThan(0);
  // Suche den Anfang der nächsten Top-Level-Funktion bzw. Ende-Marker.
  const endMarker = src.indexOf(
    "// Ende ONBOARDING M2 Gruppen-Prototyp",
    start,
  );
  expect(endMarker).toBeGreaterThan(start);
  return src.slice(start, endMarker);
}

describe("M2 ONBOARDING – keine doppelte Akkordeon-Struktur", () => {
  const src = loadM2ClientSource();

  it("ONBOARDING ist als Eintrag in SECTION_INTRO_GROUPS_BY_PROFILE registriert", () => {
    expect(hasSectionIntroMapping("ONBOARDING")).toBe(true);
  });

  it("SECTION_INTRO_DOCS_MISSING enthält die beiden aktiven ONBOARDING-Dokumenten-Checkpoints", () => {
    expect(isOnboardingDocsDrawerCheckpoint("ONBOARDING_GKV_DOCUMENT_MISSING")).toBe(true);
    expect(isOnboardingDocsDrawerCheckpoint("ONBOARDING_PKV_PAS_MISSING")).toBe(true);
  });

  it("ONBOARDING-Dokumenten-Checkpoints werden nur für den Dokumente-Drawer vom Shelf-Filter ausgenommen", () => {
    expect(isOnboardingDocsDrawerCheckpoint("ONBOARDING_DATA_INCOMPLETE")).toBe(false);
    expect(isOnboardingDocsDrawerCheckpoint("ONBOARDING_GKV_DOCUMENT_MISSING")).toBe(true);
    expect(isOnboardingDocsDrawerCheckpoint("ONBOARDING_PKV_PAS_MISSING")).toBe(true);
  });

  it("die bestehenden ONBOARDING-Schubladen und die separate M3-Action bleiben unverändert", () => {
    expect(src).toContain('sectionIntroId: "SECTION_INTRO_REVIEWED"');
    expect(src).toContain('sectionIntroId: "SECTION_INTRO_INFO_MISSING"');
    expect(src).toContain('sectionIntroId: "SECTION_INTRO_NOT_RESPONSIBLE"');
    expect(INQUIRY_PROFILE_CATALOG_V2.ONBOARDING.availableActionIds).toContain(
      "SPECIALIST_PRACTICES_INFO",
    );
    expect(src).not.toContain("Globale Hinweise");
    expect(src).not.toContain("Prozessregale");
  });

  it("OnboardingSpecificSection rendert die neue ProfileSectionIntroDrawers-Struktur", () => {
    const sectionSrc = sliceOnboardingSection(src);
    expect(sectionSrc).toMatch(/<ProfileSectionIntroDrawers\b/);
  });

  it("ONBOARDING_GROUPS.map(...) ist hinter !hasSectionIntroMapping(...) gekapselt", () => {
    const sectionSrc = sliceOnboardingSection(src);
    const renderIdx = sectionSrc.indexOf("ONBOARDING_GROUPS.map(");
    expect(renderIdx).toBeGreaterThan(0);
    // Prüfe, dass kurz vor dem Render der hasSectionIntroMapping-Gate steht.
    const window = sectionSrc.slice(Math.max(0, renderIdx - 600), renderIdx);
    expect(window).toMatch(/!hasSectionIntroMapping\(/);
  });

  it("Fallback-Drawer 'onb_weitere_hinweise' ist hinter !hasSectionIntroMapping(...) gekapselt", () => {
    const sectionSrc = sliceOnboardingSection(src);
    const idx = sectionSrc.indexOf('"onb_weitere_hinweise"');
    expect(idx).toBeGreaterThan(0);
    const window = sectionSrc.slice(Math.max(0, idx - 1500), idx);
    expect(window).toMatch(/!hasSectionIntroMapping\(/);
  });
});
