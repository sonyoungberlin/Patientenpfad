/**
 * Tests für app/office-cases/applications/[id]/page.tsx – UI-Aspekte
 *
 * Prüft:
 * - „Zum erzeugten Fragebogen"-Link wird nicht mehr gerendert (auch nicht
 *   wenn questionnaire_session_id gesetzt und Status = "sent")
 * - canDelete=true wird an OfficeApplicationDetailClient übergeben wenn OWNER
 * - canDelete=true wird an OfficeApplicationDetailClient übergeben wenn ADMIN
 * - canDelete=false wird an OfficeApplicationDetailClient übergeben wenn USER
 * - Auch bei sent-Application wird canDelete=true für OWNER/ADMIN übergeben
 * - Versand-Hinweis (sent-notice) wird bei Status="sent" gerendert
 * - Ablehnungs-Hinweis bleibt vorhanden
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const redirectMock = jest.fn((url: string) => {
  throw new Error(`__REDIRECT__:${url}`);
});
const notFoundMock = jest.fn(() => {
  throw new Error("__NOTFOUND__");
});

jest.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
  notFound: () => notFoundMock(),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [k: string]: unknown }) =>
    (<a href={href} {...rest}>{children}</a>) as unknown as React.JSX.Element,
}));

// Captures the props passed to OfficeApplicationDetailClient
let capturedClientProps: Record<string, unknown> | null = null;
jest.mock("@/components/office/OfficeApplicationDetailClient", () => ({
  __esModule: true,
  OfficeApplicationDetailClient: (props: Record<string, unknown>) => {
    capturedClientProps = props;
    return (<div data-testid="client-stub" />) as unknown as React.JSX.Element;
  },
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    digitalRequest: { findFirst: jest.fn() },
  },
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
  getSessionAccountFromCookies: jest.fn(),
}));

jest.mock("@/lib/questionnaire/officeBlockCatalog", () => ({
  __esModule: true,
  OFFICE_BLOCK_CATALOG: { BEWERBER_KONTAKT: { label: "Kontaktdaten" } },
  OFFICE_BLOCK_IDS_SORTED: ["BEWERBER_KONTAKT"],
}));

jest.mock("@/lib/digitalRequests/applicationRoles", () => ({
  applicationRoleLabel: (r: string) => r,
}));

jest.mock("@/lib/office/scope", () => ({
  getOfficeOwnershipFilter: () => ({ owner_practice_id: "p-1" }),
  canAccessOfficeCases: (account: { office_cases_enabled?: boolean }) =>
    account.office_cases_enabled !== false,
}));

import { prisma } from "@/lib/prisma";
import { getSessionAccountFromCookies } from "@/lib/auth";
import OfficeApplicationDetailPage from "@/app/office-cases/applications/[id]/page";

type PrismaMock = { digitalRequest: { findFirst: jest.Mock } };
const pm = prisma as unknown as PrismaMock;
const getCookies = getSessionAccountFromCookies as jest.Mock;

const BASE_PRACTICE = {
  id: "p-1",
  slug: "praxis-1",
  name: "Praxis 1",
  is_approved: true,
  office_cases_enabled: true,
  inquiry_assistant_enabled: false,
  patient_communication_enabled: true,
  website_forms_enabled: false,
  arbeitsprozesse_enabled: false,
  message_signature: null,
};

function makeAccount(role: "OWNER" | "ADMIN" | "USER") {
  return {
    id: "acc-1",
    email: "x@praxis.de",
    is_approved: true,
    is_admin: false,
    inquiry_assistant_enabled: false,
    patient_communication_enabled: true,
    website_forms_enabled: false,
    office_cases_enabled: true,
    arbeitsprozesse_enabled: false,
    current_practice: BASE_PRACTICE,
    memberships: [{ practice_id: "p-1", role }],
  };
}

const APP_SENT = {
  id: "dr-1",
  createdAt: new Date("2026-08-01T10:00:00Z"),
  submitter_name: "Anna Müller",
  submitter_email: "anna@example.de",
  requested_topics: ["MFA"],
  concern_text: null,
  status: "sent",
  selected_block_ids: ["BEWERBER_KONTAKT"],
  questionnaire_session_id: "sess-99",
  sent_at: new Date("2026-08-01T11:00:00Z"),
};

const APP_NEW = { ...APP_SENT, status: "new", questionnaire_session_id: null, sent_at: null };
const APP_REJECTED = { ...APP_SENT, status: "rejected", questionnaire_session_id: null, sent_at: null };

async function renderPage(id = "dr-1"): Promise<string | null> {
  try {
    const node = await OfficeApplicationDetailPage({
      params: Promise.resolve({ id }),
    });
    return renderToStaticMarkup(node);
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m === "__NOTFOUND__" || m.startsWith("__REDIRECT__")) return null;
    throw err;
  }
}

beforeEach(() => {
  capturedClientProps = null;
  pm.digitalRequest.findFirst.mockReset();
  getCookies.mockReset();
});

// ---------------------------------------------------------------------------
// Kein „Zum erzeugten Fragebogen"-Link
// ---------------------------------------------------------------------------

describe("Kein Fragebogen-Link in der Applications-UI", () => {
  it("rendert questionnaire-link NICHT wenn Status=sent und Session vorhanden", async () => {
    getCookies.mockResolvedValue(makeAccount("OWNER"));
    pm.digitalRequest.findFirst.mockResolvedValue(APP_SENT);
    const markup = await renderPage();
    expect(markup).not.toBeNull();
    expect(markup).not.toContain("questionnaire-link");
    expect(markup).not.toContain("Zum erzeugten Fragebogen");
  });

  it("sent-notice selbst bleibt sichtbar", async () => {
    getCookies.mockResolvedValue(makeAccount("OWNER"));
    pm.digitalRequest.findFirst.mockResolvedValue(APP_SENT);
    const markup = await renderPage();
    expect(markup).toContain("sent-notice");
    expect(markup).toContain("Fragebogen wurde versendet");
  });
});

// ---------------------------------------------------------------------------
// canDelete – unabhängig von isSent
// ---------------------------------------------------------------------------

describe("canDelete wird korrekt an OfficeApplicationDetailClient übergeben", () => {
  it("OWNER + new → canDelete=true", async () => {
    getCookies.mockResolvedValue(makeAccount("OWNER"));
    pm.digitalRequest.findFirst.mockResolvedValue(APP_NEW);
    await renderPage();
    expect(capturedClientProps?.canDelete).toBe(true);
  });

  it("OWNER + sent → canDelete=true", async () => {
    getCookies.mockResolvedValue(makeAccount("OWNER"));
    pm.digitalRequest.findFirst.mockResolvedValue(APP_SENT);
    await renderPage();
    expect(capturedClientProps?.canDelete).toBe(true);
  });

  it("ADMIN + sent → canDelete=true", async () => {
    getCookies.mockResolvedValue(makeAccount("ADMIN"));
    pm.digitalRequest.findFirst.mockResolvedValue(APP_SENT);
    await renderPage();
    expect(capturedClientProps?.canDelete).toBe(true);
  });

  it("USER + new → canDelete=false", async () => {
    getCookies.mockResolvedValue(makeAccount("USER"));
    pm.digitalRequest.findFirst.mockResolvedValue(APP_NEW);
    await renderPage();
    expect(capturedClientProps?.canDelete).toBe(false);
  });

  it("USER + sent → canDelete=false", async () => {
    getCookies.mockResolvedValue(makeAccount("USER"));
    pm.digitalRequest.findFirst.mockResolvedValue(APP_SENT);
    await renderPage();
    expect(capturedClientProps?.canDelete).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Ablehnungs-Hinweis bleibt
// ---------------------------------------------------------------------------

describe("rejected-notice bleibt vorhanden", () => {
  it("rendert rejected-notice wenn Status=rejected", async () => {
    getCookies.mockResolvedValue(makeAccount("OWNER"));
    pm.digitalRequest.findFirst.mockResolvedValue(APP_REJECTED);
    const markup = await renderPage();
    expect(markup).toContain("rejected-notice");
    expect(markup).toContain("abgelehnt");
  });
});
