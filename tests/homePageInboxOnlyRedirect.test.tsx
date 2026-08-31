import { renderToStaticMarkup } from "react-dom/server";

const redirectMock = jest.fn((url: string) => {
  throw new Error(`__REDIRECT__:${url}`);
});

jest.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccountFromCookies: jest.fn(),
}));

jest.mock("@/app/HomePageClient", () => ({
  __esModule: true,
  default: () => "HOME_CLIENT",
}));

jest.mock("@/app/dashboard/page", () => ({
  __esModule: true,
  default: () => "DASHBOARD_CLIENT",
}));

import HomePage from "@/app/page";
import { getSessionAccountFromCookies } from "@/lib/auth";

const getCookies = getSessionAccountFromCookies as jest.Mock;

function inboxOnlyAccount() {
  return {
    id: "acc-inbox",
    email: "inbox@example.com",
    is_approved: true,
    is_admin: false,
    inquiry_assistant_enabled: true,
    patient_communication_enabled: true,
    website_forms_enabled: false,
    office_cases_enabled: false,
    arbeitsprozesse_enabled: false,
    current_practice: {
      id: "p-1",
      slug: "p-1",
      name: "Praxis 1",
      is_approved: true,
      inquiry_assistant_enabled: true,
      patient_communication_enabled: true,
      website_forms_enabled: false,
      office_cases_enabled: false,
      arbeitsprozesse_enabled: false,
    },
    memberships: [{ practice_id: "p-1", role: "INBOX_ONLY" }],
  };
}

describe("HomePage", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    getCookies.mockReset();
  });

  it("zeigt für freigeschaltete Accounts das Dashboard", async () => {
    getCookies.mockResolvedValue(inboxOnlyAccount());

    const html = renderToStaticMarkup(await HomePage());
    expect(html).toContain("DASHBOARD_CLIENT");
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("rendert für andere Aufrufer die Client-Startseite", async () => {
    getCookies.mockResolvedValue(null);

    const html = renderToStaticMarkup(await HomePage());

    expect(html).toContain("HOME_CLIENT");
    expect(redirectMock).not.toHaveBeenCalled();
  });
});