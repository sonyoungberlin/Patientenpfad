/**
 * Tests for M3 visibility gating:
 *
 * 1. Global actions (availableActionIds) are only shown in M3 when ACTIVE in M2.
 * 2. boundGlobalOutputCheckpoints are only shown in M3 when the global checkpoint was YES in M2.
 * 3. M2 action filter: condition-controlled boundActionCheckpointIds are excluded from M2 action rows.
 */

import { INQUIRY_CHECKPOINT_CATALOG_V2 } from "@/lib/inquiries/inquiryCheckpointCatalog";
import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";
import { InquiryCheckpointKind } from "@/lib/inquiries/types";

// ---------------------------------------------------------------------------
// Helpers – mirror the filter logic used in InquiryM3Client.tsx
// ---------------------------------------------------------------------------

/** Filters actionCheckpoints to those set ACTIVE in statuses (M3 display rule). */
function filterActiveActions(
  actionCheckpoints: Array<{ id: string; label: string }>,
  statuses: Record<string, string>,
): Array<{ id: string; label: string }> {
  return actionCheckpoints.filter((cp) => statuses[cp.id] === "ACTIVE");
}

/** Filters boundGlobalOutputCheckpoints to those whose global checkpoint was YES in statuses (M3 display rule). */
function filterYesGlobalOutputCheckpoints(
  boundGlobalOutputCheckpoints: Array<{ id: string; label: string }>,
  statuses: Record<string, string>,
): Array<{ id: string; label: string }> {
  return boundGlobalOutputCheckpoints.filter((cp) => statuses[cp.id] === "YES");
}

// ---------------------------------------------------------------------------
// Fixture data from the real checkpoint catalog
// ---------------------------------------------------------------------------

const DIGITAL_REQUEST_CP = INQUIRY_CHECKPOINT_CATALOG_V2["DIGITAL_REQUEST"];
const BOOK_APPOINTMENT_CP = INQUIRY_CHECKPOINT_CATALOG_V2["BOOK_APPOINTMENT"];
const MEDICAL_CONSULTATION_CP = INQUIRY_CHECKPOINT_CATALOG_V2["MEDICAL_CONSULTATION_REQUIRED"];

if (!DIGITAL_REQUEST_CP || !BOOK_APPOINTMENT_CP || !MEDICAL_CONSULTATION_CP) {
  throw new Error("Required checkpoint fixtures not found in catalog");
}

const ACTION_FIXTURES = [
  { id: DIGITAL_REQUEST_CP.id, label: DIGITAL_REQUEST_CP.label },
  { id: BOOK_APPOINTMENT_CP.id, label: BOOK_APPOINTMENT_CP.label },
];

const GLOBAL_OUTPUT_FIXTURES = [
  { id: MEDICAL_CONSULTATION_CP.id, label: MEDICAL_CONSULTATION_CP.label },
];

// ---------------------------------------------------------------------------
// Tests – global actions
// ---------------------------------------------------------------------------

describe("M3 global action visibility", () => {
  it("hides actions when no M2 status is set", () => {
    const result = filterActiveActions(ACTION_FIXTURES, {});
    expect(result).toHaveLength(0);
  });

  it("shows only ACTIVE actions", () => {
    const statuses: Record<string, string> = {
      [DIGITAL_REQUEST_CP.id]: "ACTIVE",
      [BOOK_APPOINTMENT_CP.id]: "INACTIVE",
    };
    const result = filterActiveActions(ACTION_FIXTURES, statuses);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(DIGITAL_REQUEST_CP.id);
  });
});

// ---------------------------------------------------------------------------
// Tests – boundGlobalOutputCheckpoints
// ---------------------------------------------------------------------------

describe("M3 boundGlobalOutputCheckpoint visibility", () => {
  it("hides global output checkpoints when no M2 status is set", () => {
    const result = filterYesGlobalOutputCheckpoints(GLOBAL_OUTPUT_FIXTURES, {});
    expect(result).toHaveLength(0);
  });

  it("shows global output checkpoints only when M2 status is YES", () => {
    const statuses: Record<string, string> = {
      [MEDICAL_CONSULTATION_CP.id]: "YES",
    };
    const result = filterYesGlobalOutputCheckpoints(GLOBAL_OUTPUT_FIXTURES, statuses);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(MEDICAL_CONSULTATION_CP.id);
  });
});

// ---------------------------------------------------------------------------
// Helpers – mirror the M2 page filter logic for boundActionCheckpointIds
// ---------------------------------------------------------------------------

/**
 * Mirrors the filter applied in app/inquiries/[id]/m2/page.tsx:
 * Only include ACTION checkpoints from boundActionCheckpointIds that do NOT have
 * an entry in profile.boundActionConditions (condition-controlled items go directly
 * to M3 and must not appear as manual M2 switches).
 */
function buildM2ActionCps(profileId: string): string[] {
  const profile = INQUIRY_PROFILE_CATALOG_V2[profileId];
  if (!profile) return [];
  return (profile.boundActionCheckpointIds ?? [])
    .filter((cpId) => !profile.boundActionConditions?.[cpId])
    .map((cpId) => INQUIRY_CHECKPOINT_CATALOG_V2[cpId])
    .filter((cp) => !!cp && cp.kind === InquiryCheckpointKind.ACTION)
    .map((cp) => cp!.id);
}

// ---------------------------------------------------------------------------
// Tests – M2 action filter (condition-controlled checkpoints excluded)
// ---------------------------------------------------------------------------

describe("M2 boundActionCheckpointIds filter", () => {
  it("excludes condition-controlled checkpoints from LAB M2 action rows", () => {
    const m2ActionIds = buildM2ActionCps("LAB");
    // These have boundActionConditions and must NOT appear in M2
    expect(m2ActionIds).not.toContain("LAB_APPOINTMENT_INTERNAL");
    expect(m2ActionIds).not.toContain("LAB_APPOINTMENT_INDIVIDUAL");
    expect(m2ActionIds).not.toContain("LAB_APPOINTMENT_DOCTOR");
    expect(m2ActionIds).not.toContain("LAB_BRING_REFERRAL");
    expect(m2ActionIds).not.toContain("LAB_COST_COVERED_BY_REFERRAL");
    expect(m2ActionIds).not.toContain("LAB_SELF_PAYER_NOTE");
  });

  it("keeps genuine M2 switches (no boundActionConditions entry) in LAB", () => {
    const m2ActionIds = buildM2ActionCps("LAB");
    // These two have no conditions and must remain as manual M2 switches
    expect(m2ActionIds).toContain("LAB_FASTING_REQUIRED");
    expect(m2ActionIds).toContain("LAB_RESULT_TIME");
  });

  it("returns all action checkpoints unchanged for a profile with no boundActionConditions", () => {
    // Find a profile that has boundActionCheckpointIds but no boundActionConditions
    const profileId = Object.keys(INQUIRY_PROFILE_CATALOG_V2).find((id) => {
      const p = INQUIRY_PROFILE_CATALOG_V2[id];
      return (
        p &&
        (p.boundActionCheckpointIds?.length ?? 0) > 0 &&
        (!p.boundActionConditions || Object.keys(p.boundActionConditions).length === 0)
      );
    });
    if (!profileId) return; // skip if no such profile exists
    const profile = INQUIRY_PROFILE_CATALOG_V2[profileId]!;
    const expected = (profile.boundActionCheckpointIds ?? [])
      .map((id) => INQUIRY_CHECKPOINT_CATALOG_V2[id])
      .filter((cp) => !!cp && cp.kind === InquiryCheckpointKind.ACTION)
      .map((cp) => cp!.id);
    expect(buildM2ActionCps(profileId)).toEqual(expected);
  });
});

// ---------------------------------------------------------------------------
// Helpers – mirror the M3 page.tsx logic for building actionCheckpoints
// ---------------------------------------------------------------------------

/**
 * Mirrors the page.tsx logic after the fix:
 * actionCheckpoints is built from displayActionIds (availableActionIds only),
 * NOT from the full actionIds set that also includes boundActionCheckpointIds.
 */
function buildM3ActionCheckpoints(selectedIds: string[]): string[] {
  const displayActionIds = new Set<string>();
  for (const inquiryId of selectedIds) {
    const profile = INQUIRY_PROFILE_CATALOG_V2[inquiryId];
    if (!profile) continue;
    profile.availableActionIds.forEach((cpId) => displayActionIds.add(cpId));
    // boundActionCheckpointIds are intentionally NOT added here
  }
  return Array.from(displayActionIds)
    .map((cpId) => INQUIRY_CHECKPOINT_CATALOG_V2[cpId])
    .filter((cp) => !!cp && cp.kind === InquiryCheckpointKind.ACTION)
    .map((cp) => cp!.id);
}

// ---------------------------------------------------------------------------
// Tests – M3 global actionCheckpoints must not contain boundActionCheckpointIds
// ---------------------------------------------------------------------------

describe("M3 actionCheckpoints – keine boundActionCheckpointIds in der globalen Liste", () => {
  it("LAB: boundActionCheckpointIds erscheinen nicht in actionCheckpoints", () => {
    const actionCheckpointIds = buildM3ActionCheckpoints(["LAB"]);
    const LAB = INQUIRY_PROFILE_CATALOG_V2["LAB"];
    expect(LAB).toBeDefined();
    for (const cpId of LAB!.boundActionCheckpointIds ?? []) {
      expect(actionCheckpointIds).not.toContain(cpId);
    }
  });

  it("LAB: availableActionIds erscheinen weiterhin in actionCheckpoints", () => {
    const actionCheckpointIds = buildM3ActionCheckpoints(["LAB"]);
    const LAB = INQUIRY_PROFILE_CATALOG_V2["LAB"];
    expect(LAB).toBeDefined();
    for (const cpId of LAB!.availableActionIds) {
      const cp = INQUIRY_CHECKPOINT_CATALOG_V2[cpId];
      if (cp && cp.kind === InquiryCheckpointKind.ACTION) {
        expect(actionCheckpointIds).toContain(cpId);
      }
    }
  });

  it("kein Profil fügt boundActionCheckpointIds in die globale M3-Actionliste ein", () => {
    const violations: string[] = [];
    for (const [profileId, profile] of Object.entries(INQUIRY_PROFILE_CATALOG_V2)) {
      if (!profile) continue;
      const actionCheckpointIds = new Set(buildM3ActionCheckpoints([profileId]));
      for (const cpId of profile.boundActionCheckpointIds ?? []) {
        if (actionCheckpointIds.has(cpId)) {
          violations.push(`Profil ${profileId}: boundActionCheckpointId "${cpId}" ist fälschlich in actionCheckpoints`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
