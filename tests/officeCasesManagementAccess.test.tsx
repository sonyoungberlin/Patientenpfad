/**
 * Tests für die Berechtigungsarchitektur allgemeiner Office-Fälle.
 *
 * Prüft:
 * - requireOfficeCasesManagementAccess: nur OWNER/ADMIN, USER/INBOX_ONLY abgelehnt
 * - requireOfficeCasesManagementAccessFromCookies: analog
 * - AppShell-Navigation: USER sieht kein „Officefälle"-Item
 * - Regression: requireOfficeApplicationsAccess lässt USER weiterhin durch
 * - Regression: requireOfficeQuestionnaireAccess lehnt USER weiterhin ab
 */

import { NextRequest } from "next/server";
import { renderToStaticMarkup } from "react-dom/server";
import { PracticeRole } from "@prisma/client";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/lib/prisma", () => ({
  prisma: {
    officeCaseSession: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
  getSessionAccountFromCookies: jest.fn(),
  SESSION_COOKIE: "pp_session",
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => "/office-cases",
  redirect: jest.fn((url: string) => {
    throw new Error(`__REDIRECT__:${url}`);
  }),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [k: string]: unknown;
  }) => <a href={href} {...rest}>{children}</a>,
}));

import { getSessionAccount, getSessionAccountFromCookies } from "@/lib/auth";
import {
  requireOfficeCasesManagementAccess,
  requireOfficeCasesManagementAccessFromCookies,
  requireOfficeApplicationsAccess,
  requireOfficeQuestionnaireAccess,
} from "@/lib/authz";
import AppShell from "@/components/AppShell";

const getAccountMock = getSessionAccount as jest.Mock;
const getCookiesMock = getSessionAccountFromCookies as jest.Mock;

// ---------------------------------------------------------------------------
// Fixture-Accounts
// ---------------------------------------------------------------------------

const BASE_PRACTICE = {
  id: "p-1",
  slug: "praxis-1",
  name: "Praxis 1",
  is_approved: true,
  inquiry_assistant_enabled: false,
  patient_communication_enabled: true,
  website_forms_enabled: false,
  office_cases_enabled: true,
  arbeitsprozesse_enabled: false,
  message_signature: null,
};

function makeAccount(role: PracticeRole) {
  return {
    id: "acc-1",
    email: "x@praxis.de",
    is_approved: true,
    is_admin: false,
    inquiry_assistant_enabled: false,
    patient_communication_enabled: true,
    website_forms_enabled: false,
    office_cases_enabled: true,
    arbeitsprozesse_enabled: false,
    current_practice: BASE_PRACTICE,
    memberships: [{ practice_id: "p-1", role }],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ===========================================================================
// requireOfficeCasesManagementAccess – API-Guard
// ===========================================================================

describe("requireOfficeCasesManagementAccess – Rollen", () => {
  for (const role of [PracticeRole.OWNER, PracticeRole.ADMIN]) {
    it(`erlaubt ${role}`, async () => {
      getAccountMock.mockResolvedValue(makeAccount(role));
      const result = await requireOfficeCasesManagementAccess(
        new NextRequest("http://localhost/x"),
      );
      expect(result.error).toBeNull();
      expect(result.account).not.toBeNull();
    });
  }

  it("lehnt USER ab (403)", async () => {
    getAccountMock.mockResolvedValue(makeAccount(PracticeRole.USER));
    const result = await requireOfficeCasesManagementAccess(
      new NextRequest("http://localhost/x"),
    );
    expect(result.account).toBeNull();
    expect(result.error?.status).toBe(403);
  });

  it("lehnt INBOX_ONLY ab (403)", async () => {
    getAccountMock.mockResolvedValue(makeAccount(PracticeRole.INBOX_ONLY));
    const result = await requireOfficeCasesManagementAccess(
      new NextRequest("http://localhost/x"),
    );
    expect(result.account).toBeNull();
    expect(result.error?.status).toBe(403);
  });

  it("lehnt nicht angemeldete ab (401)", async () => {
    getAccountMock.mockResolvedValue(null);
    const result = await requireOfficeCasesManagementAccess(
      new NextRequest("http://localhost/x"),
    );
    expect(result.error?.status).toBe(401);
  });

  it("lehnt ab wenn office_cases_enabled=false (403)", async () => {
    getAccountMock.mockResolvedValue({
      ...makeAccount(PracticeRole.OWNER),
      office_cases_enabled: false,
      current_practice: { ...BASE_PRACTICE, office_cases_enabled: false },
    });
    const result = await requireOfficeCasesManagementAccess(
      new NextRequest("http://localhost/x"),
    );
    expect(result.error?.status).toBe(403);
  });
});

// ===========================================================================
// requireOfficeCasesManagementAccessFromCookies – Server-Component-Guard
// ===========================================================================

describe("requireOfficeCasesManagementAccessFromCookies – Rollen", () => {
  for (const role of [PracticeRole.OWNER, PracticeRole.ADMIN]) {
    it(`gibt Account zurück für ${role}`, async () => {
      getCookiesMock.mockResolvedValue(makeAccount(role));
      const account = await requireOfficeCasesManagementAccessFromCookies();
      expect(account).not.toBeNull();
    });
  }

  it("gibt null zurück für USER", async () => {
    getCookiesMock.mockResolvedValue(makeAccount(PracticeRole.USER));
    const account = await requireOfficeCasesManagementAccessFromCookies();
    expect(account).toBeNull();
  });

  it("gibt null zurück für INBOX_ONLY", async () => {
    getCookiesMock.mockResolvedValue(makeAccount(PracticeRole.INBOX_ONLY));
    const account = await requireOfficeCasesManagementAccessFromCookies();
    expect(account).toBeNull();
  });

  it("gibt null zurück wenn nicht angemeldet", async () => {
    getCookiesMock.mockResolvedValue(null);
    const account = await requireOfficeCasesManagementAccessFromCookies();
    expect(account).toBeNull();
  });
});

// ===========================================================================
// AppShell Navigation
// ===========================================================================

describe("AppShell-Navigation – Office-Bereich Rollentrennung", () => {
  function renderNav(
    role: PracticeRole,
    officeCasesEnabled = true,
  ): string {
    const account = {
      ...makeAccount(role),
      office_cases_enabled: officeCasesEnabled,
      current_practice: { ...BASE_PRACTICE, office_cases_enabled: officeCasesEnabled },
    };
    return renderToStaticMarkup(
      <AppShell account={account} />,
    );
  }

  it("OWNER sieht Officefälle, Fragebögen und Bewerbungsanfragen", () => {
    const html = renderNav(PracticeRole.OWNER);
    expect(html).toContain("Officefälle");
    expect(html).toContain("Fragebögen");
    expect(html).toContain("Bewerbungsanfragen");
  });

  it("ADMIN sieht Officefälle, Fragebögen und Bewerbungsanfragen", () => {
    const html = renderNav(PracticeRole.ADMIN);
    expect(html).toContain("Officefälle");
    expect(html).toContain("Fragebögen");
    expect(html).toContain("Bewerbungsanfragen");
  });

  it("USER sieht NUR Bewerbungsanfragen – kein Officefälle, kein Fragebögen", () => {
    const html = renderNav(PracticeRole.USER);
    expect(html).toContain("Bewerbungsanfragen");
    expect(html).not.toContain("Officefälle");
    expect(html).not.toContain("Fragebögen");
  });

  it("INBOX_ONLY sieht keinen der Office-Links", () => {
    const html = renderNav(PracticeRole.INBOX_ONLY);
    expect(html).not.toContain("Officefälle");
    expect(html).not.toContain("Fragebögen");
    expect(html).not.toContain("Bewerbungsanfragen");
  });
});

// ===========================================================================
// Regression: requireOfficeApplicationsAccess – USER bleibt erlaubt
// ===========================================================================

describe("Regression: requireOfficeApplicationsAccess – USER bleibt erlaubt", () => {
  it("USER darf auf Bewerbungsanfragen zugreifen", async () => {
    getAccountMock.mockResolvedValue(makeAccount(PracticeRole.USER));
    const result = await requireOfficeApplicationsAccess(
      new NextRequest("http://localhost/x"),
    );
    expect(result.error).toBeNull();
    expect(result.account).not.toBeNull();
  });

  it("OWNER darf auf Bewerbungsanfragen zugreifen", async () => {
    getAccountMock.mockResolvedValue(makeAccount(PracticeRole.OWNER));
    const result = await requireOfficeApplicationsAccess(
      new NextRequest("http://localhost/x"),
    );
    expect(result.error).toBeNull();
  });

  it("INBOX_ONLY darf NICHT auf Bewerbungsanfragen zugreifen", async () => {
    getAccountMock.mockResolvedValue(makeAccount(PracticeRole.INBOX_ONLY));
    const result = await requireOfficeApplicationsAccess(
      new NextRequest("http://localhost/x"),
    );
    expect(result.error?.status).toBe(403);
  });
});

// ===========================================================================
// Regression: requireOfficeQuestionnaireAccess – USER bleibt gesperrt
// ===========================================================================

describe("Regression: requireOfficeQuestionnaireAccess – USER bleibt gesperrt", () => {
  it("USER darf NICHT auf Fragebogen-Inbox zugreifen", async () => {
    getAccountMock.mockResolvedValue(makeAccount(PracticeRole.USER));
    const result = await requireOfficeQuestionnaireAccess(
      new NextRequest("http://localhost/x"),
    );
    expect(result.error?.status).toBe(403);
  });

  it("OWNER darf auf Fragebogen-Inbox zugreifen", async () => {
    getAccountMock.mockResolvedValue(makeAccount(PracticeRole.OWNER));
    const result = await requireOfficeQuestionnaireAccess(
      new NextRequest("http://localhost/x"),
    );
    expect(result.error).toBeNull();
  });

  it("ADMIN darf auf Fragebogen-Inbox zugreifen", async () => {
    getAccountMock.mockResolvedValue(makeAccount(PracticeRole.ADMIN));
    const result = await requireOfficeQuestionnaireAccess(
      new NextRequest("http://localhost/x"),
    );
    expect(result.error).toBeNull();
  });
});
