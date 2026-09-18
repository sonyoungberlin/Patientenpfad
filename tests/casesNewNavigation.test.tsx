import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const pushMock = jest.fn();
const appShellMock = jest.fn(() => <nav data-testid="app-shell" />);

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: jest.fn() }),
  usePathname: () => "/cases/new",
}));

jest.mock("@/components/AppShell", () => ({
  __esModule: true,
  default: appShellMock,
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccountFromCookies: jest.fn(),
}));

jest.mock("@/lib/authz", () => ({
  isInboxOnlyAccount: () => false,
}));

import CasesLayout from "@/app/cases/layout";
import HomePageClient from "@/app/HomePageClient";

const account = {
  id: "acc-owner",
  email: "owner@example.com",
  is_approved: true,
  is_admin: false,
  inquiry_assistant_enabled: true,
  patient_communication_enabled: true,
  website_forms_enabled: true,
  office_cases_enabled: true,
  arbeitsprozesse_enabled: true,
  current_practice: { id: "p-1" },
  memberships: [{ practice_id: "p-1", role: "OWNER" as const }],
};

describe("/cases/new deterministischer Renderpfad", () => {
  beforeEach(() => {
    appShellMock.mockClear();
    pushMock.mockClear();
    global.fetch = jest.fn();
  });

  it("rendert genau eine Shell über das Cases-Layout", async () => {
    const html = renderToStaticMarkup(
      await CasesLayout({
        children: <HomePageClient initialAccount={account} />,
      }),
    );

    expect(appShellMock).toHaveBeenCalledTimes(1);
    expect(html).toContain('data-testid="app-shell"');
  });

  it("rendert initial den Fallanlageinhalt ohne Auth-Fetch oder Ladezustand", () => {
    const html = renderToStaticMarkup(
      <HomePageClient initialAccount={account} />,
    );

    expect(global.fetch).not.toHaveBeenCalledWith("/api/auth/me");
    expect(html).toContain("Liegt genug Information vor");
    expect(html).not.toContain("Lädt…");
    expect(html).not.toContain("Für Pilotphase registrieren");
    expect(appShellMock).not.toHaveBeenCalled();
  });
});