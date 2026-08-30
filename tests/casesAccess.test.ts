import { NextRequest } from "next/server";
import { PracticeRole } from "@prisma/client";

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
  getSessionAccountFromCookies: jest.fn(),
}));

import { getSessionAccount } from "@/lib/auth";
import { requireCasesAccess } from "@/lib/authz";

const getSessionAccountMock = getSessionAccount as jest.Mock;

function account(role: PracticeRole) {
  return {
    id: "acc-1",
    email: "team@example.test",
    is_approved: true,
    is_admin: false,
    inquiry_assistant_enabled: true,
    patient_communication_enabled: true,
    website_forms_enabled: true,
    office_cases_enabled: true,
    arbeitsprozesse_enabled: true,
    current_practice: {
      id: "practice-1",
      is_approved: true,
      patient_communication_enabled: true,
      website_forms_enabled: true,
    },
    memberships: [{ practice_id: "practice-1", role }],
  };
}

describe("requireCasesAccess", () => {
  it.each([PracticeRole.OWNER, PracticeRole.ADMIN, PracticeRole.USER])(
    "erlaubt %s",
    async (role) => {
      getSessionAccountMock.mockResolvedValue(account(role));
      const result = await requireCasesAccess(new NextRequest("http://localhost/api/cases"));
      expect(result.error).toBeNull();
    },
  );

  it("sperrt INBOX_ONLY", async () => {
    getSessionAccountMock.mockResolvedValue(account(PracticeRole.INBOX_ONLY));
    const result = await requireCasesAccess(new NextRequest("http://localhost/api/cases"));
    expect(result.error?.status).toBe(403);
    expect(await result.error!.json()).toEqual({
      ok: false,
      error: "Rolle nicht ausreichend.",
    });
  });
});