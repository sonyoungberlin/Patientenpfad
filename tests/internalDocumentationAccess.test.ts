import { PracticeRole } from "@prisma/client";
import { canAccessInternalDocumentation } from "@/lib/authz";

function account(role: PracticeRole | null, hasPractice = true) {
  return {
    is_approved: true,
    patient_communication_enabled: true,
    current_practice: hasPractice ? {
      id: "practice-1",
      slug: "practice-1",
      name: "Praxis 1",
      is_approved: true,
      inquiry_assistant_enabled: true,
      patient_communication_enabled: true,
      website_forms_enabled: false,
      office_cases_enabled: false,
      arbeitsprozesse_enabled: false,
    } : null,
    memberships: role
      ? [{ practice_id: "practice-1", role }]
      : [],
  };
}

describe("canAccessInternalDocumentation", () => {
  it.each([PracticeRole.ADMIN, PracticeRole.OWNER, PracticeRole.USER])(
    "erlaubt %s",
    (role) => {
      expect(canAccessInternalDocumentation(account(role))).toBe(true);
    },
  );

  it("verbietet INBOX_ONLY", () => {
    expect(canAccessInternalDocumentation(account(PracticeRole.INBOX_ONLY))).toBe(false);
  });

  it("verbietet Accounts ohne aktive Praxis", () => {
    expect(canAccessInternalDocumentation(account(PracticeRole.OWNER, false))).toBe(false);
  });

  it("verwendet das bestehende Patientenkommunikations-Gate", () => {
    expect(canAccessInternalDocumentation({
      ...account(PracticeRole.OWNER),
      patient_communication_enabled: false,
    })).toBe(false);
  });
});