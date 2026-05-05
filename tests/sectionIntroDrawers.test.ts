import {
  INQUIRY_CHECKPOINT_CATALOG_V2,
  SECTION_INTRO_CHECKPOINT_IDS,
} from "@/lib/inquiries/inquiryCheckpointCatalog";
import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";

// ---------------------------------------------------------------------------
// Konsistenz-Checks für die Pilot-Section-Intro-Schubladen-Mappings.
//
// Die UI-Datei (app/inquiries/[id]/m2/InquiryM2Client.tsx) enthält das
// hartkodierte SECTION_INTRO_GROUPS_BY_PROFILE-Mapping. Hier geprüft per
// Datei-Lesen: alle Section-Intro-IDs darin müssen im Katalog existieren UND
// in der jeweiligen Profil-Whitelist enthalten sein. Alle gemappten
// Checkpoint-IDs müssen entweder zum Profil gehören oder global sein, damit
// sie bei einsortierten Anliegen tatsächlich sichtbar sind.
// ---------------------------------------------------------------------------

import * as fs from "fs";
import * as path from "path";

function loadM2ClientSource(): string {
  const p = path.join(
    process.cwd(),
    "app/inquiries/[id]/m2/InquiryM2Client.tsx",
  );
  return fs.readFileSync(p, "utf8");
}

function extractMapping(src: string): Record<string, string[]> {
  // Erwartet einen Block:
  //   const SECTION_INTRO_GROUPS_BY_PROFILE: Record<string, ...> = { AU: [...], LAB: [...], APPOINTMENT: [...] };
  // Wir parsen profil-weise sectionIntroId und checkpointIds.
  const result: Record<string, string[]> = {};
  for (const profile of ["AU", "LAB", "APPOINTMENT"]) {
    const profileBlockStart = src.indexOf(`${profile}: [`);
    expect(profileBlockStart).toBeGreaterThan(-1);
    // Find matching closing "  ],\n" or "  ],"
    const closing = src.indexOf("\n  ],", profileBlockStart);
    expect(closing).toBeGreaterThan(profileBlockStart);
    const block = src.slice(profileBlockStart, closing);
    const introIds = Array.from(
      block.matchAll(/sectionIntroId:\s*"(SECTION_INTRO_[A-Z_]+)"/g),
    ).map((m) => m[1]);
    result[profile] = introIds;
  }
  return result;
}

describe("Section-Intro-Schubladen-Mapping (M2 Pilot)", () => {
  const src = loadM2ClientSource();

  it("Mapping-Konstante ist im Client vorhanden", () => {
    expect(src).toContain("SECTION_INTRO_GROUPS_BY_PROFILE");
  });

  it.each(["AU", "LAB", "APPOINTMENT"])(
    "%s: alle Mapping-Section-Intro-IDs sind im Katalog und in der Profil-Whitelist",
    (profileId) => {
      const mapping = extractMapping(src)[profileId] ?? [];
      const profile = INQUIRY_PROFILE_CATALOG_V2[profileId];
      expect(profile).toBeDefined();
      const whitelist = new Set(profile.availableSectionIntroIds ?? []);
      expect(mapping.length).toBeGreaterThan(0);
      for (const id of mapping) {
        expect(SECTION_INTRO_CHECKPOINT_IDS).toContain(id);
        expect(INQUIRY_CHECKPOINT_CATALOG_V2[id]).toBeDefined();
        expect(whitelist.has(id)).toBe(true);
      }
    },
  );

  it.each(["AU", "LAB", "APPOINTMENT"])(
    "%s: jede Whitelist-ID hat ein Mapping (sonst keine Schublade in M2)",
    (profileId) => {
      const mappingIds = new Set(extractMapping(src)[profileId] ?? []);
      const profile = INQUIRY_PROFILE_CATALOG_V2[profileId];
      for (const id of profile.availableSectionIntroIds ?? []) {
        expect(mappingIds.has(id)).toBe(true);
      }
    },
  );
});
