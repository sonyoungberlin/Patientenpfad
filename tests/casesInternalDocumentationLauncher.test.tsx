import { renderToStaticMarkup } from "react-dom/server";
import { PracticeRole } from "@prisma/client";

jest.mock("next/navigation", () => ({ redirect: jest.fn() }));
jest.mock("@/lib/auth", () => ({ getSessionAccountFromCookies: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    caseSession: { findMany: jest.fn(), count: jest.fn() },
    practice: { findUnique: jest.fn() },
  },
}));
jest.mock("@/app/cases/CaseListClient", () => () => <div data-case-list />);

import { getSessionAccountFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CasesPage from "@/app/cases/page";

const getAccount = getSessionAccountFromCookies as jest.Mock;
const caseFindMany = prisma.caseSession.findMany as jest.Mock;
const practiceFindUnique = prisma.practice.findUnique as jest.Mock;
const caseCount = prisma.caseSession.count as jest.Mock;

function account(role: PracticeRole) {
  return {
    id: "account-1",
    is_approved: true,
    patient_communication_enabled: true,
    current_practice: { id: "practice-1" },
    memberships: [{ practice_id: "practice-1", role }],
  };
}

describe("Patientenpfad launcher", () => {
  beforeEach(() => {
    caseFindMany.mockReset().mockResolvedValue([]);
    practiceFindUnique.mockReset().mockResolvedValue({ case_quota: null });
    caseCount.mockReset().mockResolvedValue(0);
  });

  it.each([PracticeRole.ADMIN, PracticeRole.OWNER, PracticeRole.USER])(
    "entfernt die doppelten Alltags-Shortcuts (%s)",
    async (role) => {
      getAccount.mockResolvedValue(account(role));
      const html = renderToStaticMarkup(await CasesPage());
      expect(html).not.toContain("Patientenfall eröffnen");
      expect(html).not.toContain('href="/cases/new"');
      expect(html).not.toContain('href="/cases/internal-documentation"');
      expect(html).toContain("Fälle");
    },
  );

  it("zeigt INBOX_ONLY keinen internen Launcher", async () => {
    getAccount.mockResolvedValue(account(PracticeRole.INBOX_ONLY));
    const html = renderToStaticMarkup(await CasesPage());
    expect(html).not.toContain('href="/cases/new"');
    expect(html).not.toContain('href="/cases/internal-documentation"');
  });
});