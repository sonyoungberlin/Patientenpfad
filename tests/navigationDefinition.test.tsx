import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AppShell from "@/components/AppShell";
import {
  getActiveNavigationItem,
  getNavigationSectionForPath,
  getVisibleNavigationSections,
} from "@/lib/navigation";
import DashboardPage from "@/app/dashboard/page";

let mockedPathname = "/dashboard";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => mockedPathname,
  redirect: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccountFromCookies: jest.fn(),
}));

import { getSessionAccountFromCookies } from "@/lib/auth";

function account(
  role: "OWNER" | "INBOX_ONLY" = "OWNER",
  overrides: Partial<ReturnType<typeof ownerAccount>> = {},
) {
  return {
    ...ownerAccount(),
    memberships: [{ practice_id: "p-1", role }],
    ...overrides,
  };
}

function ownerAccount() {
  return {
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
}

describe("zentrale Bereichsdefinition", () => {
  it("liefert für Owner alle Bereiche und direkten Seitenlinks", () => {
    const sections = getVisibleNavigationSections(account());

    expect(sections.map((section) => section.title)).toEqual([
      "Posteingang",
      "Patientenkommunikation",
      "Patientenpfad",
      "Officepfad",
      "Praxisverwaltung",
    ]);
    expect(sections[0].items.map((item) => item.label)).toEqual([
      "Fragebogen-Posteingang",
      "Digitale Anfragen",
      "Bewerber-Eingang",
    ]);
    expect(sections[1].items.map((item) => item.label)).toEqual([
      "Vorlagen",
      "Neue Nachricht",
      "Fragebogen zusammenstellen",
    ]);
    expect(sections[2].items.map((item) => item.label)).toEqual([
      "Fallliste",
      "Neuer Fall",
      "Interne Dokumentation",
    ]);
    expect(sections[3].items.map((item) => item.label)).toEqual([
      "Officefälle",
      "Bewerbungsfragebögen",
      "Bewerbungsanfragen",
      "Arbeitsprozesse",
      "Neue Sitzung",
      "Praxisprozesse",
    ]);
    expect(sections[4].title).toBe("Praxisverwaltung");
  });

  it("beschränkt INBOX_ONLY auf den Fragebogen-Posteingang", () => {
    const sections = getVisibleNavigationSections(account("INBOX_ONLY"));

    expect(sections.map((section) => section.title)).toEqual(["Posteingang"]);
    expect(sections[0].items.map((item) => item.label)).toEqual([
      "Fragebogen-Posteingang",
    ]);
  });

  it("filtert Feature-abhängige Eingänge und Verwaltungsseiten", () => {
    const sections = getVisibleNavigationSections(
      account("OWNER", {
        patient_communication_enabled: false,
        website_forms_enabled: false,
        office_cases_enabled: false,
        arbeitsprozesse_enabled: false,
      }),
    );
    const labels = sections.flatMap((section) =>
      section.items.map((item) => item.label),
    );

    expect(labels).not.toContain("Digitale Anfragen");
    expect(labels).not.toContain("Bewerber-Eingang");
    expect(labels).not.toContain("Website-Formulare");
    expect(labels).toContain("Fallliste");
  });

  it.each([
    ["/inquiries/new", "patient-communication", "new-inquiry"],
    ["/inquiries/abc/m3", "patient-communication", "inquiry-templates"],
    ["/cases/abc/m2", "patient-path", "case-list"],
    ["/cases/internal-documentation/abc", "patient-path", "internal-documentation"],
    ["/practice/members", "practice-management", "practice-members"],
    ["/website-forms/abc", "practice-management", "website-forms"],
    ["/office-cases/applications/abc", "inbox", "applicant-inbox"],
  ])("ordnet Detailroute %s dem richtigen Menüpunkt zu", (pathname, sectionId, itemId) => {
    const sections = getVisibleNavigationSections(account());
    const section = getNavigationSectionForPath(sections, pathname);

    expect(section?.id).toBe(sectionId);
    expect(section && getActiveNavigationItem(section, pathname)).toBe(itemId);
  });
});

describe("AppShell Bereichsmenüs", () => {
  beforeEach(() => {
    mockedPathname = "/dashboard";
  });

  it.each([
    ["/inquiries", ["Vorlagen", "Neue Nachricht", "Fragebogen zusammenstellen"]],
    ["/inquiries/new", ["Vorlagen", "Neue Nachricht", "Fragebogen zusammenstellen"]],
    ["/questionnaires", ["Fragebogen-Posteingang", "Digitale Anfragen", "Bewerber-Eingang"]],
    ["/digital-requests/abc", ["Fragebogen-Posteingang", "Digitale Anfragen", "Bewerber-Eingang"]],
    ["/office-cases/applications/abc", ["Fragebogen-Posteingang", "Digitale Anfragen", "Bewerber-Eingang"]],
    ["/cases/internal-documentation", ["Fallliste", "Neuer Fall", "Interne Dokumentation"]],
    ["/practice/signature", ["Praxiskatalog", "Mitglieder", "Signatur", "Website-Formulare"]],
  ])("zeigt auf %s das vollständige Bereichsmenü", (pathname, labels) => {
    mockedPathname = pathname;
    const html = renderToStaticMarkup(<AppShell account={account()} />);

    for (const label of labels) expect(html).toContain(label);
  });

  it("zeigt auf dem Dashboard dieselben Einganglinks wie die AppShell", async () => {
    const sections = getVisibleNavigationSections(account());
    const inboxLinks = sections
      .find((section) => section.id === "inbox")!
      .items.map((item) => item.href);
    (getSessionAccountFromCookies as jest.Mock).mockResolvedValue(account());

    const dashboardHtml = renderToStaticMarkup(await DashboardPage());
    const inboxTile = dashboardHtml.slice(
      dashboardHtml.indexOf('data-testid="inbox-tile"'),
      dashboardHtml.indexOf("</section>", dashboardHtml.indexOf('data-testid="inbox-tile"')),
    );

    mockedPathname = "/questionnaires";
    const shellHtml = renderToStaticMarkup(<AppShell account={account()} />);
    const dashboardLinks = Array.from(
      inboxTile.matchAll(/href="([^"]+)"/g),
      (match) => match[1],
    );
    const shellLinks = Array.from(
      shellHtml.matchAll(/href="([^"]+)"/g),
      (match) => match[1],
    ).filter((href) => inboxLinks.includes(href));

    expect(dashboardLinks).toEqual(inboxLinks);
    expect(shellLinks).toEqual(inboxLinks);
  });
});