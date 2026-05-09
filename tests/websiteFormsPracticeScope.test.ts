/**
 * Phase P3a: Unit-Tests für lib/websiteForms/practiceScope.
 *
 * Sicherungen:
 *   - Lese-Filter: Practice gewinnt; Fallback auf Account ohne Practice.
 *   - Ownership-Predicate: Practice-Vergleich; Fallback ohne Practice.
 *   - Effective Flags: Practice gewinnt; Fallback auf Account; null wenn
 *     beides fehlt.
 *   - Create-Doppelschreiben: `owner_practice_id` wird gesetzt, wenn
 *     `current_practice` da ist; sonst weggelassen (kein `null` setzen).
 */

import {
  getCreateOwnershipData,
  getEffectivePracticeFlags,
  getOwnershipFilter,
  ownsForm,
} from "@/lib/websiteForms/practiceScope";

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
    office_cases_enabled: false,
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
    office_cases_enabled: false,
  },
} as const;

const ENABLED_FLAGS = {
  is_approved: true,
  patient_communication_enabled: true,
  website_forms_enabled: true,
};

describe("getOwnershipFilter", () => {
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

describe("ownsForm", () => {
  it("erlaubt Cross-Account-Zugriff in derselben Practice", () => {
    expect(
      ownsForm(ACCOUNT_WITH_PRACTICE, {
        owner_account_id: "acc-OTHER", // anderer Kollege derselben Praxis
        owner_practice_id: "p-1",
      }),
    ).toBe(true);
  });

  it("blockiert Form aus fremder Practice (kein Cross-Practice)", () => {
    expect(
      ownsForm(ACCOUNT_WITH_PRACTICE, {
        owner_account_id: "acc-1",
        owner_practice_id: "p-2",
      }),
    ).toBe(false);
  });

  it("blockiert Form mit owner_practice_id=null im Practice-Modus (kein Backfill)", () => {
    expect(
      ownsForm(ACCOUNT_WITH_PRACTICE, {
        owner_account_id: "acc-1",
        owner_practice_id: null,
      }),
    ).toBe(false);
  });

  it("blockiert Practice A ↔ Practice B Zugriff", () => {
    expect(
      ownsForm(ACCOUNT_DIFFERENT_PRACTICE, {
        owner_account_id: "acc-1",
        owner_practice_id: "p-1",
      }),
    ).toBe(false);
  });

  it("Fallback auf owner_account_id ohne current_practice", () => {
    expect(
      ownsForm(ACCOUNT_NO_PRACTICE, {
        owner_account_id: "acc-1",
      }),
    ).toBe(true);
    expect(
      ownsForm(ACCOUNT_NO_PRACTICE, {
        owner_account_id: "acc-OTHER",
      }),
    ).toBe(false);
  });
});

describe("getEffectivePracticeFlags", () => {
  it("Practice-Flags überstimmen Account-Flags", () => {
    expect(
      getEffectivePracticeFlags({
        owner_practice: { ...ENABLED_FLAGS, website_forms_enabled: true },
        owner_account: { ...ENABLED_FLAGS, website_forms_enabled: false },
      }),
    ).toEqual(ENABLED_FLAGS);
  });

  it("Practice deaktiviert → Form unsichtbar, auch wenn Account aktiv", () => {
    const flags = getEffectivePracticeFlags({
      owner_practice: { ...ENABLED_FLAGS, website_forms_enabled: false },
      owner_account: ENABLED_FLAGS,
    });
    expect(flags?.website_forms_enabled).toBe(false);
  });

  it("Fallback auf Account-Flags wenn keine Practice geladen", () => {
    expect(
      getEffectivePracticeFlags({
        owner_practice: null,
        owner_account: ENABLED_FLAGS,
      }),
    ).toEqual(ENABLED_FLAGS);
  });

  it("liefert null wenn weder Practice noch Account vorhanden", () => {
    expect(
      getEffectivePracticeFlags({ owner_practice: null, owner_account: null }),
    ).toBeNull();
  });
});

describe("getCreateOwnershipData", () => {
  it("Doppelschreiben mit current_practice", () => {
    expect(getCreateOwnershipData(ACCOUNT_WITH_PRACTICE)).toEqual({
      owner_account_id: "acc-1",
      owner_practice_id: "p-1",
    });
  });

  it("nur owner_account_id ohne current_practice (kein null setzen)", () => {
    const data = getCreateOwnershipData(ACCOUNT_NO_PRACTICE);
    expect(data).toEqual({ owner_account_id: "acc-1" });
    expect(Object.prototype.hasOwnProperty.call(data, "owner_practice_id")).toBe(
      false,
    );
  });
});
