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
    ["/office-cases/questionnaire/new", "inbox", "Posteingang", "/context-icons/context-inbox.png"],
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
      "Arbeitsprozesse",
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
      "Bewerbungsanfragen",
    ]);
    expect(sections[4].items.map((item) => item.label)).toEqual([
      "Arbeitsprozesse",
      "Neue Sitzung",
      "Praxisprozesse",
      "Praxisfall-Ketten",
    ]);
    expect(sections[5].title).toBe("Praxisverwaltung");
    expect(sections[5].items.slice(0, 2).map(({ label, href }) => ({ label, href }))).toEqual([
      {
        label: "Dokumentationsbibliothek",
        href: "/practice/documentation-library",
      },
      {
        label: "Dokumentationsvorlagen",
        href: "/practice/documentation-templates",
      },
    ]);
  });

  it("beschränkt INBOX_ONLY auf die erlaubten Posteingänge", () => {
    const sections = getVisibleNavigationSections(account("INBOX_ONLY"));

    expect(sections.map((section) => section.title)).toEqual(["Posteingang"]);
    expect(sections[0].items.map((item) => item.label)).toEqual([
      "Fragebogen-Posteingang",
      "Digitale Anfragen",
    ]);
  });

  it("führt Arbeitsprozesse nur mit freigeschaltetem Feature", () => {
    const withoutWorkflow = getVisibleNavigationSections(
      account("OWNER", { arbeitsprozesse_enabled: false }),
    );
    const withWorkflow = getVisibleNavigationSections(
      account("OWNER", { arbeitsprozesse_enabled: true }),
    );

    expect(withoutWorkflow.map((section) => section.id)).not.toContain("workflow-path");
    expect(withWorkflow.find((section) => section.id === "workflow-path")?.items.map((item) => item.href)).toEqual([
      "/workflow-cases",
      "/workflow-cases/new",
      "/workflow-cases/internal-protocol/new",
      "/practice/chains",
    ]);
  });

  it("hält Workflow-Routen im eigenständigen Bereich und den Officepfad workflowfrei", () => {
    const sections = getVisibleNavigationSections(account());
    const workflow = sections.find((section) => section.id === "workflow-path");
    const office = sections.find((section) => section.id === "office-path");

    expect(getNavigationSectionForPath(sections, "/workflow-cases/123")?.id).toBe(
      "workflow-path",
    );
    expect(office?.items.some((item) => item.href.startsWith("/workflow-cases"))).toBe(false);
    expect(workflow?.items.map((item) => item.label)).toEqual([
      "Arbeitsprozesse",
      "Neue Sitzung",
      "Praxisprozesse",
      "Praxisfall-Ketten",
    ]);
  });

  it("gibt INBOX_ONLY keinen Arbeitsprozesszugriff", () => {
    const sections = getVisibleNavigationSections(
      account("INBOX_ONLY", { arbeitsprozesse_enabled: true }),
    );

    expect(sections.map((section) => section.id)).not.toContain("workflow-path");
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
    ["/practice/documentation-library", "practice-management", "documentation-library"],
    ["/practice/documentation-templates", "practice-management", "documentation-templates"],
    ["/practice/members", "practice-management", "practice-members"],
    ["/website-forms/abc", "practice-management", "website-forms"],
    ["/office-cases/applications/abc", "inbox", "applicant-inbox"],
    ["/office-cases/questionnaire/abc", "inbox", "applicant-questionnaire-inbox"],
    ["/office-cases/questionnaire/new", "inbox", "applicant-questionnaire-inbox"],
    ["/workflow-cases/abc", "workflow-path", "workflow-cases"],
    ["/workflow-cases/internal-protocol/new", "workflow-path", "new-practice-process"],
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
      expect(html).toContain('width="32"');
      expect(html).toContain('height="32"');
      expect(html).toContain('alt=""');
      expect(html).toContain(`title="Aktueller Kontext: ${label}"`);
      expect(html).toContain('role="img"');
      expect(html).not.toContain(`>${label}</span>`);
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
      expect(html.indexOf('data-testid="app-shell-context"')).toBeGreaterThan(
        html.indexOf('data-testid="app-shell-section-nav"'),
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
    ["/office-cases/questionnaire/new", ["Fragebogen-Posteingang", "Digitale Anfragen", "Bewerbungsanfragen", "Bewerber-Fragebögen"]],
    ["/workflow-cases", ["Arbeitsprozesse", "Neue Sitzung", "Praxisprozesse"]],
    ["/workflow-cases/new", ["Arbeitsprozesse", "Neue Sitzung", "Praxisprozesse"]],
    ["/cases/internal-documentation", ["Fallliste", "Neuer Fall", "Interne Dokumentation"]],
    ["/practice/signature", ["Dokumentationsbibliothek", "Dokumentationsvorlagen", "Praxiskatalog", "Mitglieder", "Signatur", "Website-Formulare"]],
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