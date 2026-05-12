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
    current_practice: {
      id: "p-1",
      slug: "p-1",
      name: "Praxis 1",
      is_approved: true,
      inquiry_assistant_enabled: true,
      patient_communication_enabled: true,
      website_forms_enabled: false,
      office_cases_enabled: false,
    },
    memberships: [{ practice_id: "p-1", role: "INBOX_ONLY" }],
  };
}

describe("HomePage INBOX_ONLY", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    getCookies.mockReset();
  });

  it("leitet freigeschaltete INBOX_ONLY-Accounts nach /questionnaires um", async () => {
    getCookies.mockResolvedValue(inboxOnlyAccount());

    await expect(HomePage()).rejects.toThrow("__REDIRECT__:/questionnaires");
    expect(redirectMock).toHaveBeenCalledWith("/questionnaires");
  });

  it("rendert für andere Aufrufer die Client-Startseite", async () => {
    getCookies.mockResolvedValue(null);

    const html = renderToStaticMarkup(await HomePage());

    expect(html).toContain("HOME_CLIENT");
    expect(redirectMock).not.toHaveBeenCalled();
  });
});