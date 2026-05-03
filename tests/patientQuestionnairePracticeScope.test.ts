/**
 * Phase P3b: Unit-Tests für lib/questionnaire/practiceScope.
 */

import {
  getCreateOwnershipData,
  getOwnershipFilter,
  ownsSession,
} from "@/lib/questionnaire/practiceScope";

const ACCOUNT_NO_PRACTICE = {
  id: "acc-1",
  current_practice: null,
} as const;

const ACCOUNT_WITH_PRACTICE = {
  id: "acc-1",
  current_practice: {
    id: "p-1",
    name: "Praxis A",
    slug: "praxis-a",
    is_approved: true,
    inquiry_assistant_enabled: false,
    patient_communication_enabled: true,
    website_forms_enabled: true,
  },
} as const;

const ACCOUNT_DIFFERENT_PRACTICE = {
  id: "acc-2",
  current_practice: {
    id: "p-2",
    name: "Praxis B",
    slug: "praxis-b",
    is_approved: true,
    inquiry_assistant_enabled: false,
    patient_communication_enabled: true,
    website_forms_enabled: true,
  },
} as const;

describe("getOwnershipFilter (questionnaire)", () => {
  it("filtert über owner_practice_id wenn current_practice gesetzt", () => {
    expect(getOwnershipFilter(ACCOUNT_WITH_PRACTICE)).toEqual({
      owner_practice_id: "p-1",
    });
  });

  it("fällt zurück auf owner_account_id ohne current_practice", () => {
    expect(getOwnershipFilter(ACCOUNT_NO_PRACTICE)).toEqual({
      owner_account_id: "acc-1",
    });
  });
});

describe("ownsSession", () => {
  it("erlaubt Cross-Account-Zugriff in derselben Practice", () => {
    expect(
      ownsSession(ACCOUNT_WITH_PRACTICE, {
        owner_account_id: "acc-OTHER",
        owner_practice_id: "p-1",
      }),
    ).toBe(true);
  });

  it("blockiert Session aus fremder Practice (kein Cross-Practice)", () => {
    expect(
      ownsSession(ACCOUNT_WITH_PRACTICE, {
        owner_account_id: "acc-1",
        owner_practice_id: "p-2",
      }),
    ).toBe(false);
  });

  it("blockiert Session mit owner_practice_id=null im Practice-Modus (kein Backfill)", () => {
    expect(
      ownsSession(ACCOUNT_WITH_PRACTICE, {
        owner_account_id: "acc-1",
        owner_practice_id: null,
      }),
    ).toBe(false);
  });

  it("blockiert Practice A ↔ Practice B Zugriff", () => {
    expect(
      ownsSession(ACCOUNT_DIFFERENT_PRACTICE, {
        owner_account_id: "acc-1",
        owner_practice_id: "p-1",
      }),
    ).toBe(false);
  });

  it("Fallback auf owner_account_id ohne current_practice", () => {
    expect(
      ownsSession(ACCOUNT_NO_PRACTICE, {
        owner_account_id: "acc-1",
      }),
    ).toBe(true);
    expect(
      ownsSession(ACCOUNT_NO_PRACTICE, {
        owner_account_id: "acc-OTHER",
      }),
    ).toBe(false);
  });
});

describe("getCreateOwnershipData (questionnaire)", () => {
  it("Doppelschreiben mit current_practice", () => {
    expect(getCreateOwnershipData(ACCOUNT_WITH_PRACTICE)).toEqual({
      owner_account_id: "acc-1",
      owner_practice_id: "p-1",
    });
  });

  it("nur owner_account_id ohne current_practice (kein null setzen)", () => {
    const data = getCreateOwnershipData(ACCOUNT_NO_PRACTICE);
    expect(data).toEqual({ owner_account_id: "acc-1" });
    expect(
      Object.prototype.hasOwnProperty.call(data, "owner_practice_id"),
    ).toBe(false);
  });
});
