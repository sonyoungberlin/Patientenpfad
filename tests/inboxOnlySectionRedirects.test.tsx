const redirectMock = jest.fn((url: string) => {
  throw new Error(`__REDIRECT__:${url}`);
});

jest.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccountFromCookies: jest.fn(),
}));

jest.mock("@/components/AppShell", () => ({
  __esModule: true,
  default: () => null,
}));

import CasesLayout from "@/app/cases/layout";
import InquiriesLayout from "@/app/inquiries/layout";
import OfficeCasesLayout from "@/app/office-cases/layout";
import PracticeLayout from "@/app/practice/layout";
import WebsiteFormsLayout from "@/app/website-forms/layout";
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
    website_forms_enabled: true,
    office_cases_enabled: true,
    current_practice: {
      id: "p-1",
      slug: "p-1",
      name: "Praxis 1",
      is_approved: true,
      inquiry_assistant_enabled: true,
      patient_communication_enabled: true,
      website_forms_enabled: true,
      office_cases_enabled: true,
    },
    memberships: [{ practice_id: "p-1", role: "INBOX_ONLY" }],
  };
}

describe("INBOX_ONLY Bereichs-Redirects", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    getCookies.mockReset();
    getCookies.mockResolvedValue(inboxOnlyAccount());
  });

  it.each([
    ["cases", () => CasesLayout({ children: null })],
    ["inquiries", () => InquiriesLayout({ children: null })],
    ["office-cases", () => OfficeCasesLayout({ children: null })],
    ["practice", () => PracticeLayout({ children: null })],
    ["website-forms", () => WebsiteFormsLayout({ children: null })],
  ])("leitet %s nach /questionnaires um", async (_label, renderLayout) => {
    await expect(renderLayout()).rejects.toThrow("__REDIRECT__:/questionnaires");
    expect(redirectMock).toHaveBeenCalledWith("/questionnaires");
  });
});