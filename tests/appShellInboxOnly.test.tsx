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
    current_practice: { id: "p-1" },
    memberships: [{ practice_id: "p-1", role: "INBOX_ONLY" as const }],
  };
}

describe("AppShell INBOX_ONLY", () => {
  beforeEach(() => {
    pushMock.mockClear();
    refreshMock.mockClear();
  });

  it("zeigt in Kommunikation nur Fragebogen-Posteingang", () => {
    mockedPathname = "/inquiries";
    const html = renderToStaticMarkup(
      <AppShell account={inboxOnlyAccount()} />,
    );

    expect(html).toContain('href="/questionnaires">Hauptmenü</a>');
    expect(html).toContain("Fragebogen-Posteingang");
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

  it("zeigt keinen 'Digitale Anfragen'-Link und keinen Unread-Punkt", () => {
    mockedPathname = "/questionnaires";
    const html = renderToStaticMarkup(
      <AppShell account={inboxOnlyAccount()} digitalRequestsHasUnread={true} />,
    );
    expect(html).not.toContain("Digitale Anfragen");
    expect(html).not.toContain("digital-requests-unread-dot");
  });
});
