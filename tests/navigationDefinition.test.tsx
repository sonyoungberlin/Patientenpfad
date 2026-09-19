import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AppShell from "@/components/AppShell";
import {
  getActiveNavigationItem,
  getAppShellContext,
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
  it.each([
    ["/questionnaires", "inbox", "Posteingang", "/context-icons/context-inbox.png"],
    ["/digital-requests/detail", "inbox", "Posteingang", "/context-icons/context-inbox.png"],
    ["/office-cases/applications/detail", "inbox", "Posteingang", "/context-icons/context-inbox.png"],
    ["/office-cases/questionnaire/detail", "inbox", "Posteingang", "/context-icons/context-inbox.png"],
    ["/inquiries/new", "patient", "Patient", "/context-icons/context-patient.png"],
    ["/cases/new", "patient", "Patient", "/context-icons/context-patient.png"],
    ["/cases/123", "patient", "Patient", "/context-icons/context-patient.png"],
    ["/cases/internal-documentation/123", "doctor", "Ärztlich", "/context-icons/context-doctor.png"],
    ["/office-cases/123", "office", "Office", "/context-icons/context-office.png"],
    ["/workflow-cases/123", "office", "Office", "/context-icons/context-office.png"],
    ["/office-cases/questionnaire/new", "office", "Office", "/context-icons/context-office.png"],
    ["/dashboard", null, null, null],
    ["/practice/members", null, null, null],
    ["/website-forms", null, null, null],
  ])("löst %s in den AppShell-Kontext auf", (pathname, id, label, iconSrc) => {
    expect(getAppShellContext(pathname)).toEqual(
      id ? { id, label, iconSrc } : null,
    );
  });

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
      "Bewerbungsanfragen",
      "Bewerber-Fragebögen",
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
      "Neuer Officefall",
      "Bewerbungsfragebögen",
      "Neuer Bewerber-Fragebogen",
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
    expect(labels).not.toContain("Bewerbungsanfragen");
    expect(labels).not.toContain("Bewerber-Fragebögen");
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
    ["/office-cases/questionnaire/abc", "inbox", "applicant-questionnaire-inbox"],
    ["/office-cases/questionnaire/new", "office-path", "new-office-questionnaire"],
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
    ["/questionnaires", "Posteingang", "/context-icons/context-inbox.png"],
    ["/inquiries", "Patient", "/context-icons/context-patient.png"],
    ["/cases/internal-documentation", "Ärztlich", "/context-icons/context-doctor.png"],
    ["/office-cases", "Office", "/context-icons/context-office.png"],
    ["/dashboard", null, null],
    ["/practice/members", null, null],
  ])("rendert den Kontext vor den Accountaktionen auf %s", (pathname, label, iconSrc) => {
    mockedPathname = pathname;
    const html = renderToStaticMarkup(<AppShell account={account()} />);

    if (label && iconSrc) {
      expect(html).toContain(`url=${encodeURIComponent(iconSrc)}`);
      expect(html).toContain('width="40"');
      expect(html).toContain('height="40"');
      expect(html).toContain(`alt="${label}"`);
      expect(html).toContain(`title="Aktueller Kontext: ${label}"`);
      expect(html).toContain(label);
    } else {
      expect(html).not.toContain('data-testid="app-shell-context"');
    }

    expect(html).toContain("owner@example.com");
    expect(html).toContain("Abmelden");
    expect(html).toContain('data-testid="app-shell-topline"');
    expect(html).toContain('data-testid="app-shell-account-group"');
    if (pathname !== "/dashboard") {
      expect(html).toContain('data-testid="app-shell-section-nav"');
    } else {
      expect(html).not.toContain('data-testid="app-shell-section-nav"');
    }
    if (label && iconSrc) {
      expect(html.indexOf('data-testid="app-shell-context"')).toBeGreaterThan(
        html.indexOf('data-testid="app-shell-account-group"'),
      );
      expect(html.indexOf('data-testid="app-shell-context"')).toBeLessThan(
        html.indexOf("owner@example.com"),
      );
    }
  });

  it.each([
    ["/inquiries", ["Vorlagen", "Neue Nachricht", "Fragebogen zusammenstellen"]],
    ["/inquiries/new", ["Vorlagen", "Neue Nachricht", "Fragebogen zusammenstellen"]],
    ["/questionnaires", ["Fragebogen-Posteingang", "Digitale Anfragen", "Bewerbungsanfragen", "Bewerber-Fragebögen"]],
    ["/digital-requests/abc", ["Fragebogen-Posteingang", "Digitale Anfragen", "Bewerbungsanfragen", "Bewerber-Fragebögen"]],
    ["/office-cases/applications/abc", ["Fragebogen-Posteingang", "Digitale Anfragen", "Bewerbungsanfragen", "Bewerber-Fragebögen"]],
    ["/office-cases/questionnaire/abc", ["Fragebogen-Posteingang", "Digitale Anfragen", "Bewerbungsanfragen", "Bewerber-Fragebögen"]],
    ["/office-cases/questionnaire/new", ["Officefälle", "Neuer Officefall", "Bewerbungsfragebögen", "Neuer Bewerber-Fragebogen", "Bewerbungsanfragen", "Arbeitsprozesse", "Neue Sitzung", "Praxisprozesse"]],
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

  it("blendet Office-Eingänge ohne Office-Feature aus", () => {
    const noOffice = account("OWNER", { office_cases_enabled: false });
    const labels = getVisibleNavigationSections(noOffice)
      .find((section) => section.id === "inbox")!
      .items.map((item) => item.label);

    expect(labels).toEqual(["Fragebogen-Posteingang", "Digitale Anfragen"]);
  });

  it("ordnet den Officefall-Neustart dem Officepfad zu", () => {
    const sections = getVisibleNavigationSections(account());
    const section = getNavigationSectionForPath(sections, "/office-cases/new");

    expect(section?.id).toBe("office-path");
    expect(getActiveNavigationItem(section!, "/office-cases/new")).toBe(
      "new-office-case",
    );
  });
});