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
    memberships: [
      { practice_id: "p-1", role: "INBOX_ONLY" },
    ],
  };
}

function makeAccount(
  role: string,
  patientCommunicationEnabled: boolean,
  officeCasesEnabled = false,
) {
  return {
    id: "acc-1",
    email: "user@example.com",
    is_approved: true,
    is_admin: false,
    inquiry_assistant_enabled: true,
    patient_communication_enabled: patientCommunicationEnabled,
    website_forms_enabled: false,
    office_cases_enabled: officeCasesEnabled,
    arbeitsprozesse_enabled: false,
    current_practice: {
      id: "p-1",
      slug: "p-1",
      name: "Praxis 1",
      is_approved: true,
      inquiry_assistant_enabled: true,
      patient_communication_enabled: patientCommunicationEnabled,
      website_forms_enabled: false,
      office_cases_enabled: officeCasesEnabled,
      arbeitsprozesse_enabled: false,
    },
    memberships: [{ practice_id: "p-1", role }],
  };
}

describe("Dashboard INBOX_ONLY", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    getCookies.mockReset();
  });

  it("zeigt nur den erlaubten Fragebogen-Einstieg", async () => {
    getCookies.mockResolvedValue(inboxOnlyAccount());

    const html = renderToStaticMarkup(await DashboardPage());
    expect(html).toContain("Fragebögen");
    expect(html).not.toContain("Patientenkommunikation");
    expect(html).not.toContain("Patientenfälle");
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe("Dashboard — Kachel 'Digitale Anfragen'", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    getCookies.mockReset();
  });

  it.each(["OWNER", "ADMIN", "USER"])(
    "%s mit patient_communication_enabled=true sieht die Kachel",
    async (role) => {
      getCookies.mockResolvedValue(makeAccount(role, true));
      const html = renderToStaticMarkup(await DashboardPage());
      expect(html).toContain("Digitale Anfragen");
      expect(html).toContain("/digital-requests");
    },
  );

  it("OWNER mit patient_communication_enabled=false sieht die Kachel nicht", async () => {
    getCookies.mockResolvedValue(makeAccount("OWNER", false));
    const html = renderToStaticMarkup(await DashboardPage());
    expect(html).not.toContain("data-testid=\"digital-requests-tile\"");
  });

  it("INBOX_ONLY sieht die Kachel nicht", async () => {
    getCookies.mockResolvedValue(inboxOnlyAccount());
    const html = renderToStaticMarkup(await DashboardPage());
    expect(html).not.toContain('data-testid="digital-requests-tile"');
  });
});

describe("Dashboard — Kachel 'Officepfad'", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    getCookies.mockReset();
  });

  it.each(["OWNER", "ADMIN"])(
    "%s sieht beide Officepfad-Aktionen mit korrekten Zielen",
    async (role) => {
      getCookies.mockResolvedValue(makeAccount(role, true, true));
      const html = renderToStaticMarkup(await DashboardPage());

      expect(html).toContain('data-testid="office-path-tile"');
      expect(html).toContain("Organisatorische Aufgaben strukturiert klären.");
      expect(html).not.toContain("Snapshots");
      expect(html).toContain(
        '<a href="/office-cases"><button type="button">Officefälle öffnen</button></a>',
      );
      expect(html).toContain(
        '<a href="/office-cases/applications"><button type="button">Bewerbungsanfragen öffnen</button></a>',
      );
    },
  );

  it("USER sieht nur Bewerbungsanfragen", async () => {
    getCookies.mockResolvedValue(makeAccount("USER", true, true));
    const html = renderToStaticMarkup(await DashboardPage());

    expect(html).toContain('data-testid="office-path-tile"');
    expect(html).not.toContain("Officefälle öffnen");
    expect(html).not.toContain('<a href="/office-cases">');
    expect(html).toContain(
      '<a href="/office-cases/applications"><button type="button">Bewerbungsanfragen öffnen</button></a>',
    );
  });

  it("INBOX_ONLY sieht die Officepfad-Kachel nicht", async () => {
    getCookies.mockResolvedValue(inboxOnlyAccount());

    const html = renderToStaticMarkup(await DashboardPage());
    expect(html).not.toContain('data-testid="office-path-tile"');
  });
});
