import {
  INQUIRY_CHECKPOINT_CATALOG_V2,
  SECTION_INTRO_CHECKPOINT_IDS,
} from "@/lib/inquiries/inquiryCheckpointCatalog";
import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";

// ---------------------------------------------------------------------------
// Konsistenz-Checks für die Antwortkontext-Schubladen-Mappings.
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

// Alle V2-Profile, für die ein Mapping vorhanden sein soll.
const PROFILES_WITH_MAPPING = Object.keys(INQUIRY_PROFILE_CATALOG_V2);

function extractMapping(src: string): Record<string, string[]> {
  // Erwartet einen Block:
  //   const SECTION_INTRO_GROUPS_BY_PROFILE: Record<string, ...> = { AU: [...], ... };
  // Wir parsen profil-weise sectionIntroId.
  const result: Record<string, string[]> = {};
  for (const profile of PROFILES_WITH_MAPPING) {
    const profileBlockStart = src.indexOf(`  ${profile}: [`);
    if (profileBlockStart === -1) {
      result[profile] = [];
      continue;
    }
    // Find matching closing "  ],\n"
    const closing = src.indexOf("\n  ],", profileBlockStart);
    if (closing === -1) {
      result[profile] = [];
      continue;
    }
    const block = src.slice(profileBlockStart, closing);
    const introIds = Array.from(
      block.matchAll(/sectionIntroId:\s*"(SECTION_INTRO_[A-Z_]+)"/g),
    ).map((m) => m[1]);
    result[profile] = introIds;
  }
  return result;
}

describe("Antwortkontext-Schubladen-Mapping (M2)", () => {
  const src = loadM2ClientSource();

  it("Mapping-Konstante ist im Client vorhanden", () => {
    expect(src).toContain("SECTION_INTRO_GROUPS_BY_PROFILE");
  });

  it.each(PROFILES_WITH_MAPPING)(
    "%s: Mapping ist vorhanden und enthält nur gültige Section-Intro-IDs aus der Profil-Whitelist",
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

  it.each(PROFILES_WITH_MAPPING)(
    "%s: jede Whitelist-ID hat ein Mapping (sonst keine Schublade in M2)",
    (profileId) => {
      const mappingIds = new Set(extractMapping(src)[profileId] ?? []);
      const profile = INQUIRY_PROFILE_CATALOG_V2[profileId];
      for (const id of profile.availableSectionIntroIds ?? []) {
        expect(mappingIds.has(id)).toBe(true);
      }
    },
  );

  it.each(PROFILES_WITH_MAPPING)(
    "%s: alle sechs Antwortkontexte sind in der Profil-Whitelist enthalten",
    (profileId) => {
      const profile = INQUIRY_PROFILE_CATALOG_V2[profileId];
      const whitelist = new Set(profile.availableSectionIntroIds ?? []);
      for (const id of SECTION_INTRO_CHECKPOINT_IDS) {
        expect(whitelist.has(id)).toBe(true);
      }
    },
  );
});

// ---------------------------------------------------------------------------
// Profilübergreifende Reihenfolge der Antwortkontext-Akkordeons (M2-UI).
// Alle Profile müssen exakt dieselbe Reihenfolge verwenden, damit die UI
// einheitlich bleibt. Kein Akkordeon darf mit `defaultOpen: true` markiert
// sein – alle Schubladen sind beim Öffnen von M2 initial geschlossen.
// ---------------------------------------------------------------------------

const EXPECTED_SECTION_INTRO_ORDER: readonly string[] = [
  "SECTION_INTRO_DOCS_COMPLETE",
  "SECTION_INTRO_REVIEWED",
  "SECTION_INTRO_INFO_MISSING",
  "SECTION_INTRO_DOCS_MISSING",
  "SECTION_INTRO_IN_PROGRESS",
  "SECTION_INTRO_NOT_RESPONSIBLE",
];

describe("Antwortkontext-Reihenfolge (M2)", () => {
  const src = loadM2ClientSource();
  const mapping = extractMapping(src);

  it.each(PROFILES_WITH_MAPPING)(
    "%s: nutzt die kanonische Antwortkontext-Reihenfolge",
    (profileId) => {
      expect(mapping[profileId]).toEqual([...EXPECTED_SECTION_INTRO_ORDER]);
    },
  );

  it("Reihenfolge ist profilübergreifend identisch", () => {
    const orders = PROFILES_WITH_MAPPING.map((p) => mapping[p].join("|"));
    const unique = Array.from(new Set(orders));
    expect(unique).toHaveLength(1);
  });

  it("kein Antwortkontext hat defaultOpen: true im SECTION_INTRO_GROUPS_BY_PROFILE-Block", () => {
    // Block-genau prüfen: Ende des Mappings ist der nächste `};` auf Spalte 0.
    const blockStart = src.indexOf(
      "const SECTION_INTRO_GROUPS_BY_PROFILE",
    );
    expect(blockStart).toBeGreaterThan(-1);
    const blockEnd = src.indexOf("\n};", blockStart);
    expect(blockEnd).toBeGreaterThan(blockStart);
    const block = src.slice(blockStart, blockEnd);
    expect(block).not.toMatch(/defaultOpen:\s*true/);
  });

  it("SAMPLE_COLLECTION: SECTION_INTRO_DOCS_COMPLETE enthält REQUIRED_INFORMATION_COMPLETE", () => {
    const profileBlockStart = src.indexOf("  SAMPLE_COLLECTION: [");
    expect(profileBlockStart).toBeGreaterThan(-1);
    const profileBlockEnd = src.indexOf("\n  ],", profileBlockStart);
    expect(profileBlockEnd).toBeGreaterThan(profileBlockStart);
    const profileBlock = src.slice(profileBlockStart, profileBlockEnd);

    expect(profileBlock).toContain('sectionIntroId: "SECTION_INTRO_DOCS_COMPLETE"');
    expect(profileBlock).toContain('"REQUIRED_INFORMATION_COMPLETE"');
  });

  it("SAMPLE_COLLECTION: SECTION_INTRO_INFO_MISSING enthält SAMPLE_COLLECTION_INFORMATION_INCOMPLETE", () => {
    const profileBlockStart = src.indexOf("  SAMPLE_COLLECTION: [");
    expect(profileBlockStart).toBeGreaterThan(-1);
    const profileBlockEnd = src.indexOf("\n  ],", profileBlockStart);
    expect(profileBlockEnd).toBeGreaterThan(profileBlockStart);
    const profileBlock = src.slice(profileBlockStart, profileBlockEnd);

    expect(profileBlock).toContain('sectionIntroId: "SECTION_INTRO_INFO_MISSING"');
    expect(profileBlock).toContain('"SAMPLE_COLLECTION_INFORMATION_INCOMPLETE"');
  });

  it("SAMPLE_COLLECTION: SECTION_INTRO_DOCS_MISSING enthält SAMPLE_COLLECTION_ORDER_UNCLEAR_OR_MISSING", () => {
    const profileBlockStart = src.indexOf("  SAMPLE_COLLECTION: [");
    expect(profileBlockStart).toBeGreaterThan(-1);
    const profileBlockEnd = src.indexOf("\n  ],", profileBlockStart);
    expect(profileBlockEnd).toBeGreaterThan(profileBlockStart);
    const profileBlock = src.slice(profileBlockStart, profileBlockEnd);

    expect(profileBlock).toContain('sectionIntroId: "SECTION_INTRO_DOCS_MISSING"');
    expect(profileBlock).toContain('"SAMPLE_COLLECTION_ORDER_UNCLEAR_OR_MISSING"');
  });

  it("APPOINTMENT: SECTION_INTRO_REVIEWED enthält APPOINTMENT_EXTERNAL_FINDING_LONG_ABSENCE", () => {
    const profileBlockStart = src.indexOf("  APPOINTMENT: [");
    expect(profileBlockStart).toBeGreaterThan(-1);
    const profileBlockEnd = src.indexOf("\n  ],", profileBlockStart);
    expect(profileBlockEnd).toBeGreaterThan(profileBlockStart);
    const profileBlock = src.slice(profileBlockStart, profileBlockEnd);

    expect(profileBlock).toContain('sectionIntroId: "SECTION_INTRO_REVIEWED"');
    expect(profileBlock).toContain('"APPOINTMENT_EXTERNAL_FINDING_LONG_ABSENCE"');
  });

  it("APPOINTMENT: SECTION_INTRO_REVIEWED enthält APPOINTMENT_TYPE_MATCH_CONFIRMED", () => {
    const profileBlockStart = src.indexOf("  APPOINTMENT: [");
    expect(profileBlockStart).toBeGreaterThan(-1);
    const profileBlockEnd = src.indexOf("\n  ],", profileBlockStart);
    expect(profileBlockEnd).toBeGreaterThan(profileBlockStart);
    const profileBlock = src.slice(profileBlockStart, profileBlockEnd);

    expect(profileBlock).toContain('sectionIntroId: "SECTION_INTRO_REVIEWED"');
    expect(profileBlock).toContain('"APPOINTMENT_TYPE_MATCH_CONFIRMED"');
  });

  it("APPOINTMENT: SECTION_INTRO_DOCS_COMPLETE enthält DOCUMENTS_RECEIVED_AND_ASSIGNED", () => {
    const profileBlockStart = src.indexOf("  APPOINTMENT: [");
    expect(profileBlockStart).toBeGreaterThan(-1);
    const profileBlockEnd = src.indexOf("\n  ],", profileBlockStart);
    expect(profileBlockEnd).toBeGreaterThan(profileBlockStart);
    const profileBlock = src.slice(profileBlockStart, profileBlockEnd);

    expect(profileBlock).toContain('sectionIntroId: "SECTION_INTRO_DOCS_COMPLETE"');
    expect(profileBlock).toContain('"DOCUMENTS_RECEIVED_AND_ASSIGNED"');
  });

  it("ONBOARDING: SECTION_INTRO_REVIEWED enthält ONBOARDING_PRIMARY_CARE_CONFIRMATION", () => {
    const profileBlockStart = src.indexOf("  ONBOARDING: [");
    expect(profileBlockStart).toBeGreaterThan(-1);
    const profileBlockEnd = src.indexOf("\n  ],", profileBlockStart);
    expect(profileBlockEnd).toBeGreaterThan(profileBlockStart);
    const profileBlock = src.slice(profileBlockStart, profileBlockEnd);

    expect(profileBlock).toContain('sectionIntroId: "SECTION_INTRO_REVIEWED"');
    expect(profileBlock).toContain('"ONBOARDING_PRIMARY_CARE_CONFIRMATION"');
  });
});
