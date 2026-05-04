/**
 * Tests für die generische Selbstzahler-Action PAYMENT_ONSITE_INFO.
 *
 * Anforderungen:
 *  - Globaler Action-Checkpoint (ACTION / GLOBAL / SHARED_BOTTOM / NEXT_STEP).
 *  - Wiederverwendbar – kein Attest-Bezug in ID, Label oder Text.
 *  - Im MEDICAL_DOCUMENTS-Profil über boundActionConditions an
 *    `MEDICAL_DOCUMENT_PRIVATE_SERVICE = YES` gekoppelt (Selbstzahlerleistung).
 *  - Erscheint daher NICHT bei Kassenleistungen (z. B. AU-Profil).
 */

import { INQUIRY_CHECKPOINT_CATALOG_V2 } from "@/lib/inquiries/inquiryCheckpointCatalog";
import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";
import {
  ActionStatus,
  ExplanationStatus,
  InquiryCheckpointKind,
  InquiryCheckpointPlacement,
  InquiryCheckpointScope,
} from "@/lib/inquiries/types";

// ---------------------------------------------------------------------------
// Mini-Engine, die die Sichtbarkeitslogik aus boundActionConditions
// (showWhenAny / hideWhenAny) für Tests spiegelt.
// ---------------------------------------------------------------------------

type Cond = {
  showWhenAny?: Array<Record<string, string>>;
  hideWhenAny?: Array<Record<string, string>>;
};

function isVisible(cond: Cond | undefined, statuses: Record<string, string>): boolean {
  const matchesAny = (sets?: Array<Record<string, string>>) =>
    !!sets &&
    sets.some((set) =>
      Object.entries(set).every(([cpId, expected]) => statuses[cpId] === expected),
    );
  if (cond?.hideWhenAny && matchesAny(cond.hideWhenAny)) return false;
  if (cond?.showWhenAny) return matchesAny(cond.showWhenAny);
  return true;
}

// ---------------------------------------------------------------------------
// Katalog-Eigenschaften des neuen Action-Checkpoints
// ---------------------------------------------------------------------------

describe("PAYMENT_ONSITE_INFO – Katalog-Definition", () => {
  const cp = INQUIRY_CHECKPOINT_CATALOG_V2["PAYMENT_ONSITE_INFO"];

  it("ist im Checkpoint-Katalog vorhanden", () => {
    expect(cp).toBeDefined();
  });

  it("ist ACTION / GLOBAL / SHARED_BOTTOM / NEXT_STEP", () => {
    expect(cp.kind).toBe(InquiryCheckpointKind.ACTION);
    expect(cp.scope).toBe(InquiryCheckpointScope.GLOBAL);
    expect(cp.placement).toBe(InquiryCheckpointPlacement.SHARED_BOTTOM);
    expect((cp as any).actionCategory).toBe("NEXT_STEP");
  });

  it("liefert den geforderten Text im ACTIVE-Status", () => {
    expect(cp.textByStatus[ActionStatus.ACTIVE]).toBe(
      "Die Zahlung erfolgt vor Ort per EC- oder Kreditkarte.",
    );
  });

  it("ist generisch formuliert (kein Attest-/Bescheinigungs-Bezug in ID, Label, Text)", () => {
    const haystack = [
      cp.id,
      cp.label,
      ...Object.values(cp.textByStatus ?? {}),
    ]
      .filter((v): v is string => typeof v === "string")
      .join(" ")
      .toLowerCase();
    expect(haystack).not.toMatch(/attest|bescheinigung/);
  });
});

// ---------------------------------------------------------------------------
// Bindung im MEDICAL_DOCUMENTS-Profil
// ---------------------------------------------------------------------------

describe("MEDICAL_DOCUMENTS – PAYMENT_ONSITE_INFO Bindung", () => {
  const profile = INQUIRY_PROFILE_CATALOG_V2["MEDICAL_DOCUMENTS"]!;

  it("listet PAYMENT_ONSITE_INFO in boundActionCheckpointIds", () => {
    expect(profile.boundActionCheckpointIds).toContain("PAYMENT_ONSITE_INFO");
  });

  it("nimmt PAYMENT_ONSITE_INFO NICHT in availableActionIds auf (condition-controlled)", () => {
    expect(profile.availableActionIds ?? []).not.toContain("PAYMENT_ONSITE_INFO");
  });

  it("bindet exakt an MEDICAL_DOCUMENT_PRIVATE_SERVICE = YES", () => {
    const cond = (profile as any).boundActionConditions?.PAYMENT_ONSITE_INFO;
    expect(cond?.showWhenAny).toEqual([
      { MEDICAL_DOCUMENT_PRIVATE_SERVICE: "YES" },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Sichtbarkeitslogik – sichtbar bei Selbstzahler, sonst nicht
// ---------------------------------------------------------------------------

describe("PAYMENT_ONSITE_INFO – Sichtbarkeit im MEDICAL_DOCUMENTS-Profil", () => {
  const profile = INQUIRY_PROFILE_CATALOG_V2["MEDICAL_DOCUMENTS"]!;
  const cond = (profile as any).boundActionConditions
    ?.PAYMENT_ONSITE_INFO as Cond | undefined;

  it("erscheint bei MEDICAL_DOCUMENT_PRIVATE_SERVICE = YES", () => {
    expect(
      isVisible(cond, {
        MEDICAL_DOCUMENT_PRIVATE_SERVICE: ExplanationStatus.YES,
      }),
    ).toBe(true);
  });

  it("erscheint NICHT bei MEDICAL_DOCUMENT_PRIVATE_SERVICE = NO", () => {
    expect(
      isVisible(cond, {
        MEDICAL_DOCUMENT_PRIVATE_SERVICE: ExplanationStatus.NO,
      }),
    ).toBe(false);
  });

  it("erscheint NICHT, wenn die Selbstzahler-Frage gar nicht beantwortet wurde", () => {
    expect(isVisible(cond, {})).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Andere Profile (z. B. AU/Kassenleistung) kennen die Bindung nicht
// ---------------------------------------------------------------------------

describe("PAYMENT_ONSITE_INFO – nicht an Kassenleistungen gebunden", () => {
  it("AU-Profil bindet PAYMENT_ONSITE_INFO nicht (Kassenleistung)", () => {
    const au = INQUIRY_PROFILE_CATALOG_V2["AU"];
    if (!au) return;
    expect(au.boundActionCheckpointIds ?? []).not.toContain("PAYMENT_ONSITE_INFO");
    const cond = (au as any).boundActionConditions?.PAYMENT_ONSITE_INFO;
    expect(cond).toBeUndefined();
  });
});
