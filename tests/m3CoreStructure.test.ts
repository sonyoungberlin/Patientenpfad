/**
 * Katalog-Invarianztests für die M3 4er-Core-Struktur.
 *
 * Regel (dokumentiert in types.ts):
 *   1. OUTCOME_INFO darf nur bei ISSUE_CONFIRMED vorkommen.
 *   2. PROCESS_INFO muss über PROCESS_EXPLAINED abgebildet sein (keine Ersatz-IDs).
 *   3. ISSUE_BLOCKED_*-Goals dürfen kein OUTCOME_INFO enthalten.
 *
 * Geprüft werden alle Profile in INQUIRY_PROFILE_CATALOG_V2.
 */

import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";

// Alle Profile, die responseGoals definieren
const profilesWithGoals = Object.entries(INQUIRY_PROFILE_CATALOG_V2).filter(
  ([, profile]) => Array.isArray(profile.responseGoals) && profile.responseGoals!.length > 0,
);

// ---------------------------------------------------------------------------
// Invariante 1: OUTCOME_INFO darf nur bei ISSUE_CONFIRMED vorkommen
// ---------------------------------------------------------------------------

describe("M3-Invariante 1 – OUTCOME_INFO nur bei ISSUE_CONFIRMED", () => {
  it("kein anderes ResponseGoal als ISSUE_CONFIRMED trägt OUTCOME_INFO", () => {
    const violations: string[] = [];
    for (const [profileId, profile] of profilesWithGoals) {
      for (const goal of profile.responseGoals!) {
        if (goal.id !== "ISSUE_CONFIRMED" && goal.relevantSpecificRoles.includes("OUTCOME_INFO")) {
          violations.push(
            `Profil ${profileId}: Goal "${goal.id}" enthält OUTCOME_INFO, ist aber kein ISSUE_CONFIRMED`,
          );
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("ISSUE_CONFIRMED trägt in jedem Profil OUTCOME_INFO", () => {
    const violations: string[] = [];
    for (const [profileId, profile] of profilesWithGoals) {
      const confirmed = profile.responseGoals!.find((g) => g.id === "ISSUE_CONFIRMED");
      if (confirmed && !confirmed.relevantSpecificRoles.includes("OUTCOME_INFO")) {
        violations.push(
          `Profil ${profileId}: ISSUE_CONFIRMED fehlt OUTCOME_INFO (hat: ${confirmed.relevantSpecificRoles.join(", ")})`,
        );
      }
    }
    expect(violations).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Invariante 2: PROCESS_INFO muss über PROCESS_EXPLAINED abgebildet sein
// ---------------------------------------------------------------------------

describe("M3-Invariante 2 – PROCESS_INFO nur über PROCESS_EXPLAINED", () => {
  it("kein Goal außer PROCESS_EXPLAINED trägt PROCESS_INFO als einzige oder primäre Rolle", () => {
    const violations: string[] = [];
    for (const [profileId, profile] of profilesWithGoals) {
      for (const goal of profile.responseGoals!) {
        if (goal.id !== "PROCESS_EXPLAINED" && goal.relevantSpecificRoles.includes("PROCESS_INFO")) {
          violations.push(
            `Profil ${profileId}: Goal "${goal.id}" enthält PROCESS_INFO, ist aber kein PROCESS_EXPLAINED`,
          );
        }
      }
    }
    expect(violations).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Invariante 3: ISSUE_BLOCKED_* darf kein OUTCOME_INFO enthalten
// ---------------------------------------------------------------------------

describe("M3-Invariante 3 – ISSUE_BLOCKED_* ohne OUTCOME_INFO", () => {
  it("kein ISSUE_BLOCKED_*-Goal enthält OUTCOME_INFO", () => {
    const violations: string[] = [];
    for (const [profileId, profile] of profilesWithGoals) {
      for (const goal of profile.responseGoals!) {
        if (
          goal.id.startsWith("ISSUE_BLOCKED_") &&
          goal.relevantSpecificRoles.includes("OUTCOME_INFO")
        ) {
          violations.push(
            `Profil ${profileId}: BLOCKED-Goal "${goal.id}" enthält verbotene OUTCOME_INFO`,
          );
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
