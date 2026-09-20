import { renderToStaticMarkup } from "react-dom/server";
import AppShell from "@/components/AppShell";

const pushMock = jest.fn();
const refreshMock = jest.fn();

let mockedPathname = "/inquiries";

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
  usePathname: () => mockedPathname,
}));

function inboxOnlyAccount() {
  return {
    id: "acc-inbox",
    email: "inbox@example.com",
    is_approved: true,
    is_admin: false,
    inquiry_assistant_enabled: true,
    patient_communication_enabled: true,
    website_forms_enabled: true,
    office_cases_enabled: false,
    arbeitsprozesse_enabled: false,
    current_practice: { id: "p-1" },
    memberships: [{ practice_id: "p-1", role: "INBOX_ONLY" as const }],
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

describe("AppShell INBOX_ONLY", () => {
  beforeEach(() => {
    pushMock.mockClear();
    refreshMock.mockClear();
  });

  it("zeigt in Kommunikation nur die erlaubten Posteingänge", () => {
    mockedPathname = "/inquiries";
    const html = renderToStaticMarkup(
      <AppShell account={inboxOnlyAccount()} />,
    );

    expect(html).toContain('href="/questionnaires">Hauptmenü</a>');
    expect(html).toContain("Fragebogen-Posteingang");
    expect(html).toContain("Digitale Anfragen");
    expect(html).not.toContain("Neue Nachricht");
    expect(html).not.toContain("Vorlagen");
  });

  it("zeigt keine Praxis- oder Website-Management-Links", () => {
    mockedPathname = "/practice";
    const htmlPractice = renderToStaticMarkup(
      <AppShell account={inboxOnlyAccount()} />,
    );
    expect(htmlPractice).not.toContain("Mitglieder");
    expect(htmlPractice).not.toContain("Signatur");

    mockedPathname = "/website-forms";
    const htmlWebsiteForms = renderToStaticMarkup(
      <AppShell account={inboxOnlyAccount()} />,
    );
    expect(htmlWebsiteForms).not.toContain("Formularverwaltung");
  });

  it("zeigt Digitale Anfragen mit Unread-Indikator", () => {
    mockedPathname = "/questionnaires";
    const html = renderToStaticMarkup(
      <AppShell account={inboxOnlyAccount()} digitalRequestsHasUnread={true} />,
    );
    expect(html).toContain("Digitale Anfragen");
    expect(html).toContain("Neue Anfragen vorhanden");
  });
});

describe("AppShell interne Pfadnavigation", () => {
  it("behandelt /dashboard als Hauptmenü ohne Fallnavigation", () => {
    mockedPathname = "/dashboard";
    const html = renderToStaticMarkup(
      <AppShell account={ownerAccount()} />,
    );

    expect(html).toContain('href="/dashboard">Hauptmenü</a>');
    expect(html).not.toContain("Fallliste");
    expect(html).not.toContain("Neuer Fall");
  });

  it.each(["/cases", "/cases/new"])(
    "zeigt die Fallnavigation auf %s",
    (pathname) => {
      mockedPathname = pathname;
      const html = renderToStaticMarkup(
        <AppShell account={ownerAccount()} />,
      );

      expect(html).toContain('href="/dashboard">Hauptmenü</a>');
      expect(html).toContain('href="/cases"');
      expect(html).toContain("Fallliste");
      expect(html).toContain('href="/cases/new"');
      expect(html).toContain("Neuer Fall");
    },
  );

  it("zeigt dem Owner auf /practice/members die Praxisnavigation", () => {
    mockedPathname = "/practice/members";
    const html = renderToStaticMarkup(
      <AppShell account={ownerAccount()} />,
    );

    expect(html).toContain('href="/dashboard">Hauptmenü</a>');
    expect(html).toContain('href="/practice/members">Mitglieder</a>');
  });
});
