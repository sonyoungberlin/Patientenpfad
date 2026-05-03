/**
 * P2: getCurrentPractice ist ein reiner Selektor — kein DB-Zugriff.
 */

import { getCurrentPractice } from "@/lib/authz";
import type { SessionAccount } from "@/lib/auth";

const practice = {
  id: "p-1",
  slug: "p1",
  name: "Practice 1",
  is_approved: true,
  inquiry_assistant_enabled: true,
  patient_communication_enabled: true,
  website_forms_enabled: true,
};

function acc(overrides: Partial<SessionAccount>): SessionAccount {
  return {
    id: "a",
    email: "a@b.de",
    is_approved: true,
    is_admin: false,
    inquiry_assistant_enabled: false,
    patient_communication_enabled: false,
    website_forms_enabled: false,
    current_practice: null,
    memberships: [],
    ...overrides,
  };
}

describe("getCurrentPractice", () => {
  it("liefert die aktive Practice", () => {
    expect(getCurrentPractice(acc({ current_practice: practice }))).toEqual(
      practice,
    );
  });

  it("liefert null, wenn keine aktive Practice gesetzt ist", () => {
    expect(getCurrentPractice(acc({ current_practice: null }))).toBeNull();
  });
});
