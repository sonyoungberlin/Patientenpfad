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
    // LAB_FASTING_REQUIRED now has hideWhenAny: [] → condition-controlled, no longer a M2 switch
    expect(m2ActionIds).not.toContain("LAB_FASTING_REQUIRED");
  });

  it("includes the new LAB follow-up action in LAB M2 action rows", () => {
    const m2ActionIds = buildM2ActionCps("LAB");
    expect(m2ActionIds).toContain("LAB_SAMPLE_FOLLOWUP_APPOINTMENT_RECOMMENDED");
  });

  it("keeps genuine M2 switches (no boundActionConditions entry) in LAB", () => {
    const m2ActionIds = buildM2ActionCps("LAB");
    // LAB_RESULT_TIME now has hideWhenAny: [] → condition-controlled, no longer a M2 switch
    expect(m2ActionIds).not.toContain("LAB_RESULT_TIME");
    // LAB_FASTING_REQUIRED is no longer a M2 switch (has hideWhenAny: [] → always-visible M3 item)
    expect(m2ActionIds).not.toContain("LAB_FASTING_REQUIRED");
  });

  it("LAB_RESULT_TIME now has hideWhenAny: [] → excluded from LAB M2 action rows", () => {
    const m2ActionIds = buildM2ActionCps("LAB");
    expect(m2ActionIds).not.toContain("LAB_RESULT_TIME");
  });

  it("excludes condition-controlled REF_ORIGINAL_VS_PDF from REFERRAL M2 action rows", () => {
    const m2ActionIds = buildM2ActionCps("REFERRAL");
    // REF_ORIGINAL_VS_PDF now has hideWhenAny: [] → always-visible M3 item, not a M2 switch
    expect(m2ActionIds).not.toContain("REF_ORIGINAL_VS_PDF");
  });

  it("excludes REF_BOOKING_CODE_PROCESS from REFERRAL M2 action rows (has showWhenAny condition via REF_HAV_CASE)", () => {
    const m2ActionIds = buildM2ActionCps("REFERRAL");
    // REF_BOOKING_CODE_PROCESS now has showWhenAny: [{ REF_HAV_CASE: "YES" }] → M3-visible, not a plain M2 switch
    expect(m2ActionIds).not.toContain("REF_BOOKING_CODE_PROCESS");
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

describe("Profile binding – LAB und SAMPLE_COLLECTION", () => {
  it("LAB bindet den neuen Follow-up-Baustein", () => {
    const profile = INQUIRY_PROFILE_CATALOG_V2.LAB;
    expect(profile.boundActionCheckpointIds).toContain("LAB_SAMPLE_FOLLOWUP_APPOINTMENT_RECOMMENDED");
    expect(profile.specificCheckpointIds).toContain("LAB_SAMPLE_FOLLOWUP_APPOINTMENT_RECOMMENDED");
  });

  it("SAMPLE_COLLECTION bindet den neuen Follow-up-Baustein", () => {
    const profile = INQUIRY_PROFILE_CATALOG_V2.SAMPLE_COLLECTION;
    expect(profile.boundActionCheckpointIds).toContain("LAB_SAMPLE_FOLLOWUP_APPOINTMENT_RECOMMENDED");
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

// ---------------------------------------------------------------------------
// Tests – M2 boundActionCheckpointIds filter – BILLING
// ---------------------------------------------------------------------------

describe("M2 boundActionCheckpointIds filter – BILLING", () => {
  it("BILLING_NOT_COVERED_BY_STATUTORY ist condition-controlled und erscheint nicht in M2-Rows", () => {
    const m2ActionIds = buildM2ActionCps("BILLING");
    expect(m2ActionIds).not.toContain("BILLING_NOT_COVERED_BY_STATUTORY");
  });

  it("BILLING_GOA_BILLING ist condition-controlled und erscheint nicht in M2-Rows", () => {
    const m2ActionIds = buildM2ActionCps("BILLING");
    expect(m2ActionIds).not.toContain("BILLING_GOA_BILLING");
  });

  it("BILLING_ONSITE_PAYMENT ist condition-controlled und erscheint nicht in M2-Rows", () => {
    const m2ActionIds = buildM2ActionCps("BILLING");
    expect(m2ActionIds).not.toContain("BILLING_ONSITE_PAYMENT");
  });
});

// ---------------------------------------------------------------------------
// Tests – APPOINTMENT.DOCUMENT_UPLOAD ist condition-controlled (externer Befund)
// ---------------------------------------------------------------------------

describe("APPOINTMENT – DOCUMENT_UPLOAD nur bei externem Befund sichtbar", () => {
  it("DOCUMENT_UPLOAD ist condition-controlled (boundActionConditions) und erscheint nicht in M2-Rows", () => {
    const m2ActionIds = buildM2ActionCps("APPOINTMENT");
    expect(m2ActionIds).not.toContain("DOCUMENT_UPLOAD");
  });

  it("DOCUMENT_UPLOAD ist NICHT in der globalen M3-Actionliste des APPOINTMENT-Profils", () => {
    // Folgt der Architekturregel: boundActionCheckpointIds ⊄ availableActionIds
    const m3ActionIds = buildM3ActionCheckpoints(["APPOINTMENT"]);
    expect(m3ActionIds).not.toContain("DOCUMENT_UPLOAD");
  });

  it("APPOINTMENT.boundActionConditions.DOCUMENT_UPLOAD bindet exakt an APPOINTMENT_EXTERNAL_FINDING_PRESENT=YES", () => {
    const APPOINTMENT = INQUIRY_PROFILE_CATALOG_V2["APPOINTMENT"]!;
    const conditions = (APPOINTMENT as any).boundActionConditions;
    expect(conditions?.DOCUMENT_UPLOAD?.showWhenAny).toEqual([
      { APPOINTMENT_EXTERNAL_FINDING_PRESENT: "YES" },
    ]);
  });

  it("Andere Termin-Profile (LAB, REFERRAL, HOSPITAL) referenzieren kein APPOINTMENT_EXTERNAL_FINDING_PRESENT", () => {
    for (const profileId of ["LAB", "REFERRAL", "HOSPITAL"] as const) {
      const profile = INQUIRY_PROFILE_CATALOG_V2[profileId];
      if (!profile) continue;
      expect(profile.specificCheckpointIds).not.toContain("APPOINTMENT_EXTERNAL_FINDING_PRESENT");
      const conditions = (profile as any).boundActionConditions ?? {};
      const referencesExternalFinding = Object.values(conditions).some((cond: any) => {
        const sets = [...(cond?.showWhenAny ?? []), ...(cond?.hideWhenAny ?? [])];
        return sets.some((s) => Object.prototype.hasOwnProperty.call(s, "APPOINTMENT_EXTERNAL_FINDING_PRESENT"));
      });
      expect(referencesExternalFinding).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Tests – M3 visibleSpecificCps – leere textByStatus werden ausgefiltert
// ---------------------------------------------------------------------------

/**
 * Spiegelt die Filter-Logik für visibleSpecificCps in InquiryM3Client.tsx:
 * EXPLANATION-Checkpoints dürfen nur erscheinen, wenn textByStatus[status] nicht leer ist.
 */
function isVisibleSpecificCp(
  cp: { kind: InquiryCheckpointKind; textByStatus: Partial<Record<string, string>> },
  status: string | undefined,
): boolean {
  if (cp.kind !== InquiryCheckpointKind.EXPLANATION) return true;
  if (status !== "YES" && status !== "NO") return false;
  const text = cp.textByStatus[status];
  return !!text;
}

describe("M3 visibleSpecificCps – Leertext-Filter", () => {
  it("EXPLANATION-Checkpoint mit nicht-leerem YES-Text und Status YES wird angezeigt", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_GKV_DOCUMENT_MISSING"];
    expect(cp).toBeDefined();
    const text = cp!.textByStatus["YES"];
    expect(text).toBeTruthy(); // hat echten Text
    expect(isVisibleSpecificCp(cp!, "YES")).toBe(true);
  });

  it("ONBOARDING_IDENTITY_MISMATCH mit Status YES wird NICHT angezeigt (textByStatus.YES leer)", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_IDENTITY_MISMATCH"];
    expect(cp).toBeDefined();
    const text = cp!.textByStatus["YES"] ?? "";
    expect(text).toBe(""); // leer nach Refactoring
    expect(isVisibleSpecificCp(cp!, "YES")).toBe(false);
  });

  it("ONBOARDING_DATA_INCOMPLETE mit Status YES wird NICHT angezeigt (textByStatus.YES leer)", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_DATA_INCOMPLETE"];
    expect(cp).toBeDefined();
    const text = cp!.textByStatus["YES"] ?? "";
    expect(text).toBe(""); // leer nach Refactoring
    expect(isVisibleSpecificCp(cp!, "YES")).toBe(false);
  });

  it("ONBOARDING_WRONG_PRACTICE mit Status YES wird NICHT angezeigt (textByStatus.YES leer)", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_WRONG_PRACTICE"];
    expect(cp).toBeDefined();
    const text = cp!.textByStatus["YES"] ?? "";
    expect(text).toBe(""); // leer nach Refactoring
    expect(isVisibleSpecificCp(cp!, "YES")).toBe(false);
  });

  it("Checkpoint ohne Status (undefined) wird NICHT angezeigt", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_IDENTITY_MISMATCH"]!;
    expect(isVisibleSpecificCp(cp, undefined)).toBe(false);
  });

  it("Checkpoint mit Status NO wird NICHT angezeigt (textByStatus.NO leer/undefiniert)", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_WRONG_PRACTICE"]!;
    // NO ist immer leer (keine Erklärung bei NO)
    expect(isVisibleSpecificCp(cp, "NO")).toBe(false);
  });

  it("Kein EXPLANATION-Checkpoint mit leerem textByStatus würde in M3 als Zusatzinfo erscheinen", () => {
    const violations: string[] = [];
    for (const [id, cp] of Object.entries(INQUIRY_CHECKPOINT_CATALOG_V2)) {
      if (!cp || cp.kind !== InquiryCheckpointKind.EXPLANATION) continue;
      for (const status of ["YES", "NO"] as const) {
        const text = cp.textByStatus[status] ?? "";
        if (text === "") {
          // Mit dem neuen Filter sollte isVisibleSpecificCp false zurückgeben → ok
          if (isVisibleSpecificCp(cp, status)) {
            violations.push(`${id} status=${status}: leerer Text wäre sichtbar`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Tests – actionsOpen – Auto-Öffnen wenn showWhenAny-Bedingungen erfüllt
// ---------------------------------------------------------------------------

/**
 * Spiegelt die actionsOpen-Initialisierungslogik aus InquiryM3Client.tsx:
 * actionsOpen=true wenn showWhenAny-Bedingungen eines boundActionCheckpoints erfüllt sind.
 */
function computeActionsOpen(
  sections: Array<{
    boundActionCheckpoints: Array<{
      showWhenAny?: Record<string, string>[];
    }>;
  }>,
  initialCheckpointStatuses: Record<string, string>,
  initialActionStatuses: Record<string, string>,
  actionIds: string[],
): boolean {
  const allBoundActionIds = sections.flatMap((s) =>
    s.boundActionCheckpoints.map((_, i) => `bound-${i}`),
  );
  const hasExplicitActionStatus =
    actionIds.some(
      (id) => initialActionStatuses[id] === "ACTIVE" || initialActionStatuses[id] === "INACTIVE",
    ) ||
    allBoundActionIds.some(
      (id) => initialActionStatuses[id] === "ACTIVE" || initialActionStatuses[id] === "INACTIVE",
    );
  if (hasExplicitActionStatus) return true;

  const allStatuses = { ...initialCheckpointStatuses, ...initialActionStatuses };
  const matchesConditionSet = (condSet: Record<string, string>) =>
    Object.entries(condSet).every(([id, expected]) => allStatuses[id] === expected);

  return sections.some((s) =>
    s.boundActionCheckpoints.some(
      (cp) => cp.showWhenAny && cp.showWhenAny.some(matchesConditionSet),
    ),
  );
}

describe("actionsOpen – Auto-Öffnen via showWhenAny", () => {
  it("bleibt geschlossen wenn kein Status gesetzt und keine Conditions erfüllt", () => {
    const open = computeActionsOpen(
      [{ boundActionCheckpoints: [{ showWhenAny: [{ ONBOARDING_IDENTITY_MISMATCH: "YES" }] }] }],
      {},
      {},
      [],
    );
    expect(open).toBe(false);
  });

  it("öffnet sich wenn ONBOARDING_IDENTITY_MISMATCH=YES und showWhenAny-Condition matcht", () => {
    const open = computeActionsOpen(
      [{ boundActionCheckpoints: [{ showWhenAny: [{ ONBOARDING_IDENTITY_MISMATCH: "YES" }] }] }],
      { ONBOARDING_IDENTITY_MISMATCH: "YES" },
      {},
      [],
    );
    expect(open).toBe(true);
  });

  it("öffnet sich wenn ONBOARDING_DATA_INCOMPLETE=YES und showWhenAny-Condition matcht", () => {
    const open = computeActionsOpen(
      [{ boundActionCheckpoints: [{ showWhenAny: [{ ONBOARDING_DATA_INCOMPLETE: "YES" }] }] }],
      { ONBOARDING_DATA_INCOMPLETE: "YES" },
      {},
      [],
    );
    expect(open).toBe(true);
  });

  it("öffnet sich wenn ONBOARDING_WRONG_PRACTICE=YES und showWhenAny-Condition matcht", () => {
    const open = computeActionsOpen(
      [{ boundActionCheckpoints: [{ showWhenAny: [{ ONBOARDING_WRONG_PRACTICE: "YES" }] }] }],
      { ONBOARDING_WRONG_PRACTICE: "YES" },
      {},
      [],
    );
    expect(open).toBe(true);
  });

  it("öffnet sich wenn expliziter Action-Status ACTIVE gesetzt ist", () => {
    const open = computeActionsOpen(
      [{ boundActionCheckpoints: [] }],
      {},
      { SOME_ACTION: "ACTIVE" },
      ["SOME_ACTION"],
    );
    expect(open).toBe(true);
  });

  it("bleibt geschlossen wenn Condition mit Status NO nicht matcht", () => {
    const open = computeActionsOpen(
      [{ boundActionCheckpoints: [{ showWhenAny: [{ ONBOARDING_IDENTITY_MISMATCH: "YES" }] }] }],
      { ONBOARDING_IDENTITY_MISMATCH: "NO" },
      {},
      [],
    );
    expect(open).toBe(false);
  });
});

