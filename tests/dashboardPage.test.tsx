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

// Dashboard rendert AppShell. Fuer diesen Test reicht ein stabiler Platzhalter.
jest.mock("@/components/AppShell", () => ({
  __esModule: true,
  default: () => null,
}));

import { getSessionAccountFromCookies } from "@/lib/auth";
import DashboardPage from "@/app/dashboard/page";

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
    memberships: [
      { practice_id: "p-1", role: "INBOX_ONLY" },
    ],
  };
}

describe("Dashboard INBOX_ONLY", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    getCookies.mockReset();
  });

  it("zeigt nur Fragebogen-Posteingang und keine operativen/Management-Kacheln", async () => {
    getCookies.mockResolvedValue(inboxOnlyAccount());

    const node = await DashboardPage();
    const html = renderToStaticMarkup(node);

    expect(html).toContain("Posteingang öffnen");

    expect(html).not.toContain("Neue Nachricht");
    expect(html).not.toContain("Vorlagen öffnen");
    expect(html).not.toContain("Fallliste öffnen");
    expect(html).not.toContain("Neuer Fall");
    expect(html).not.toContain("Praxis öffnen");
    expect(html).not.toContain("Officefälle öffnen");
  });
});
