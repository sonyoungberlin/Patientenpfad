/**
 * Tests for M3 visibility gating:
 *
 * 1. Global actions (availableActionIds) are only shown in M3 when ACTIVE in M2.
 * 2. boundGlobalOutputCheckpoints are only shown in M3 when the global checkpoint was YES in M2.
 */

import { INQUIRY_CHECKPOINT_CATALOG_V2 } from "@/lib/inquiries/inquiryCheckpointCatalog";
import { InquiryCheckpointKind, InquiryCheckpointScope } from "@/lib/inquiries/types";

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
