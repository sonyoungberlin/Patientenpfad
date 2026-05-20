/**
 * Phase A: Tests für Digitale Anfragen.
 *
 * Abgedeckt:
 *   1. Öffentliche Seite `/anfrage/[slug]` — rendert bei aktivem Form.
 *   2. Öffentliche Seite — notFound bei inaktivem Form.
 *   3. Öffentliche Seite — notFound wenn patient_communication_enabled=false.
 *   4. Öffentliche Seite — rendert auch wenn website_forms_enabled=false
 *      (Digitale Anfragen brauchen dieses Flag NICHT).
 *   5. Submit-Endpoint: erstellt DigitalRequest mit email im Klartext + Hash.
 *   6. Submit-Endpoint: speichert birth_date NUR als Hash, keinen Klartext.
 *   7. Submit-Endpoint: Honeypot-Treffer → Redirect, keine DB-Schreibung.
 *   8. Submit-Endpoint: 404 wenn patient_communication_enabled=false.
 *   9. Submit-Endpoint: 404 wenn website_forms_enabled=false wird ignoriert
 *      (Form wird trotzdem gefunden wenn patient_communication_enabled=true).
 *  10. Interne Liste `/digital-requests` — zeigt nur eigene Anfragen (scoped).
 *  11. Interne Liste — INBOX_ONLY wird zu /questionnaires weitergeleitet.
 *  12. AppShell: INBOX_ONLY hat keinen "Digitale Anfragen"-NavItem.
 */

import { NextRequest } from "next/server";
import { renderToStaticMarkup } from "react-dom/server";

import type { AppShellPracticeRole } from "@/components/AppShell";

// ──────────────────────────────────────────────────────────────────────────────
// Shared mocks
// ──────────────────────────────────────────────────────────────────────────────

const redirectMock = jest.fn((url: string) => {
  throw new Error(`__REDIRECT__:${url}`);
});
const notFoundMock = jest.fn(() => {
  throw new Error("__NOTFOUND__");
});

jest.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
  notFound: () => notFoundMock(),
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => "/digital-requests",
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccountFromCookies: jest.fn(),
}));

jest.mock("@/lib/authz", () => ({
  requirePatientCommunicationAccessFromCookies: jest.fn(),
  isInboxOnlyAccount: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    practiceQuestionnaireForm: {
      findUnique: jest.fn(),
    },
    digitalRequest: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  requirePatientCommunicationAccessFromCookies,
  isInboxOnlyAccount,
} from "@/lib/authz";
import { hashSubmitterEmail } from "@/lib/websiteForms/emailHash";
import { POST } from "@/app/api/anfrage/[slug]/route";
import AnfragePage from "@/app/anfrage/[slug]/page";
import EingegangeneAnfragePage from "@/app/anfrage/[slug]/eingegangen/page";
import DigitalRequestsPage from "@/app/digital-requests/page";

type PrismaMock = {
  practiceQuestionnaireForm: { findUnique: jest.Mock };
  digitalRequest: { create: jest.Mock; findMany: jest.Mock };
};
const pm = prisma as unknown as PrismaMock;
const requirePatComm =
  requirePatientCommunicationAccessFromCookies as jest.Mock;
const isInboxOnly = isInboxOnlyAccount as jest.Mock;

const SLUG = "test-praxis";

const ENABLED_OWNER = {
  is_approved: true,
  patient_communication_enabled: true,
  website_forms_enabled: true,
};

function makeForm(overrides: Record<string, unknown> = {}) {
  return {
    id: "form-1",
    is_active: true,
    owner_account_id: "acc-1",
    owner_practice_id: null,
    owner_account: ENABLED_OWNER,
    owner_practice: null,
    ...overrides,
  };
}

function makeAccount(over: Record<string, unknown> = {}) {
  return {
    id: "acc-1",
    email: "praxis@example.com",
    is_approved: true,
    is_admin: false,
    patient_communication_enabled: true,
    website_forms_enabled: true,
    inquiry_assistant_enabled: false,
    office_cases_enabled: false,
    current_practice: null,
    memberships: [],
    ...over,
  };
}

function formReq(
  fields: Record<string, string>,
  slug = SLUG,
  ip = uniqueIp(),
): NextRequest {
  const body = new URLSearchParams(fields).toString();
  return new NextRequest(`http://localhost/api/anfrage/${slug}`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-forwarded-for": ip,
    },
    body,
  });
}

async function runPage<T>(
  fn: () => Promise<T>,
): Promise<{ redirect: string | null; notFound: boolean; result: T | null }> {
  try {
    const result = await fn();
    return { redirect: null, notFound: false, result };
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m === "__NOTFOUND__")
      return { redirect: null, notFound: true, result: null };
    if (m.startsWith("__REDIRECT__:"))
      return {
        redirect: m.slice("__REDIRECT__:".length),
        notFound: false,
        result: null,
      };
    throw err;
  }
}

let consoleInfoSpy: jest.SpyInstance;
let consoleErrorSpy: jest.SpyInstance;
// Jeder Test bekommt eine frische IP, damit der Modul-scope-Limiter
// keine Interference zwischen Tests verursacht.
let ipCounter = 0;
function uniqueIp() {
  ipCounter++;
  return `10.${Math.floor(ipCounter / 65536) % 256}.${Math.floor(ipCounter / 256) % 256}.${ipCounter % 256}`;
}

beforeEach(() => {
  jest.clearAllMocks();
  pm.digitalRequest.create.mockResolvedValue({ id: "dr-1" });
  pm.digitalRequest.findMany.mockResolvedValue([]);
  consoleInfoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleInfoSpy.mockRestore();
  consoleErrorSpy.mockRestore();
});

// ──────────────────────────────────────────────────────────────────────────────
// Öffentliche Seite — Sichtbarkeits-Cascade
// ──────────────────────────────────────────────────────────────────────────────

describe("AnfragePage — Sichtbarkeits-Cascade", () => {
  it("rendert bei aktivem Form mit patient_communication_enabled=true", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(makeForm());

    const { notFound, result } = await runPage(() =>
      AnfragePage({ params: Promise.resolve({ slug: SLUG }) }),
    );

    expect(notFound).toBe(false);
    const markup = renderToStaticMarkup(result as React.ReactElement);
    expect(markup).toContain("Digitales Anliegen");
  });

  it("notFound bei inaktivem Form", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(
      makeForm({ is_active: false }),
    );

    const { notFound } = await runPage(() =>
      AnfragePage({ params: Promise.resolve({ slug: SLUG }) }),
    );

    expect(notFound).toBe(true);
  });

  it("notFound wenn patient_communication_enabled=false", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(
      makeForm({
        owner_account: {
          ...ENABLED_OWNER,
          patient_communication_enabled: false,
        },
      }),
    );

    const { notFound } = await runPage(() =>
      AnfragePage({ params: Promise.resolve({ slug: SLUG }) }),
    );

    expect(notFound).toBe(true);
  });

  it("rendert auch wenn website_forms_enabled=false (nicht erforderlich)", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(
      makeForm({
        owner_account: {
          ...ENABLED_OWNER,
          website_forms_enabled: false,
        },
      }),
    );

    const { notFound } = await runPage(() =>
      AnfragePage({ params: Promise.resolve({ slug: SLUG }) }),
    );

    // Sollte NICHT notFound sein — website_forms_enabled ist irrelevant
    expect(notFound).toBe(false);
  });

  it("notFound bei ungültigem Slug", async () => {
    const { notFound } = await runPage(() =>
      AnfragePage({ params: Promise.resolve({ slug: "INVALID SLUG!" }) }),
    );

    expect(notFound).toBe(true);
    expect(pm.practiceQuestionnaireForm.findUnique).not.toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Bestätigungsseite
// ──────────────────────────────────────────────────────────────────────────────

describe("EingegangeneAnfragePage", () => {
  it("rendert die Bestätigung", () => {
    const markup = renderToStaticMarkup(EingegangeneAnfragePage());
    expect(markup).toContain("Anfrage eingegangen");
    expect(markup).toContain("Vielen Dank");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Submit-Endpoint
// ──────────────────────────────────────────────────────────────────────────────

describe("POST /api/anfrage/[slug] — Submit-Endpoint", () => {
  it("erstellt DigitalRequest mit email im Klartext UND Hash", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(makeForm());

    const req = formReq({
      submitter_name: "Max Mustermann",
      email: "Max@Beispiel.de",
    });
    const res = await POST(req, { params: Promise.resolve({ slug: SLUG }) });

    expect(res.status).toBe(303);
    expect(pm.digitalRequest.create).toHaveBeenCalledTimes(1);

    const data = pm.digitalRequest.create.mock.calls[0][0].data as Record<
      string,
      unknown
    >;
    // Klartext gespeichert (normalisiert/lowercase)
    expect(data.submitter_email).toBe("max@beispiel.de");
    // Hash gespeichert
    expect(data.submitter_email_hash).toBe(
      hashSubmitterEmail("max@beispiel.de"),
    );
  });

  it("speichert Geburtsdatum als Hash, KEIN Klartext", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(makeForm());

    const req = formReq({
      submitter_name: "Anna Muster",
      email: "anna@beispiel.de",
      birth_date: "1990-05-15",
    });
    const res = await POST(req, { params: Promise.resolve({ slug: SLUG }) });

    expect(res.status).toBe(303);

    const data = pm.digitalRequest.create.mock.calls[0][0].data as Record<
      string,
      unknown
    >;
    // Kein Klartext-Geburtsdatum
    expect(data).not.toHaveProperty("birth_date");
    // Hash muss gesetzt sein
    expect(typeof data.birth_date_hash).toBe("string");
    expect(data.birth_date_hash).toHaveLength(64); // SHA-256 hex
  });

  it("Honeypot-Treffer → Redirect ohne DB-Schreibung", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(makeForm());

    const req = formReq({
      submitter_name: "Bot",
      email: "bot@example.com",
      company_website: "http://spam.example",
    });
    const res = await POST(req, { params: Promise.resolve({ slug: SLUG }) });

    expect(res.status).toBe(303);
    expect(pm.digitalRequest.create).not.toHaveBeenCalled();
  });

  it("404 wenn patient_communication_enabled=false", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(
      makeForm({
        owner_account: {
          ...ENABLED_OWNER,
          patient_communication_enabled: false,
        },
      }),
    );

    const req = formReq({
      submitter_name: "Jemand",
      email: "jemand@beispiel.de",
    });
    const res = await POST(req, { params: Promise.resolve({ slug: SLUG }) });

    expect(res.status).toBe(404);
    expect(pm.digitalRequest.create).not.toHaveBeenCalled();
  });

  it("akzeptiert wenn website_forms_enabled=false (nicht erforderlich)", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(
      makeForm({
        owner_account: {
          ...ENABLED_OWNER,
          website_forms_enabled: false,
        },
      }),
    );

    const req = formReq({
      submitter_name: "Jemand",
      email: "websiteforms-test@beispiel.de",
    });
    const res = await POST(req, { params: Promise.resolve({ slug: SLUG }) });

    expect(res.status).toBe(303);
    expect(pm.digitalRequest.create).toHaveBeenCalledTimes(1);
  });

  it("400 bei ungültiger E-Mail", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(makeForm());

    const req = formReq({
      submitter_name: "Jemand",
      email: "keine-email",
    });
    const res = await POST(req, { params: Promise.resolve({ slug: SLUG }) });

    expect(res.status).toBe(400);
    expect(pm.digitalRequest.create).not.toHaveBeenCalled();
  });

  it("400 bei leerem Namen", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(makeForm());

    const req = formReq({
      submitter_name: "   ",
      email: "leername-test@beispiel.de",
    });
    const res = await POST(req, { params: Promise.resolve({ slug: SLUG }) });

    expect(res.status).toBe(400);
    expect(pm.digitalRequest.create).not.toHaveBeenCalled();
  });

  it("setzt status='new' beim Erstellen", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(makeForm());

    const req = formReq({
      submitter_name: "Jemand",
      email: "status-test@beispiel.de",
    });
    await POST(req, { params: Promise.resolve({ slug: SLUG }) });

    const data = pm.digitalRequest.create.mock.calls[0][0].data as Record<
      string,
      unknown
    >;
    expect(data.status).toBe("new");
  });

  it("Redirect-Ziel ist /anfrage/[slug]/eingegangen", async () => {
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(makeForm());

    const req = formReq({
      submitter_name: "Jemand",
      email: "redirect-test@beispiel.de",
    });
    const res = await POST(req, { params: Promise.resolve({ slug: SLUG }) });

    expect(res.status).toBe(303);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain(`/anfrage/${SLUG}/eingegangen`);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Interne Liste
// ──────────────────────────────────────────────────────────────────────────────

describe("DigitalRequestsPage — Interne Liste", () => {
  it("zeigt eigene Anfragen (scoped nach Praxis)", async () => {
    const account = makeAccount({
      current_practice: { id: "praxis-1" },
      memberships: [{ practice_id: "praxis-1", role: "OWNER" }],
    });
    requirePatComm.mockResolvedValue(account);
    isInboxOnly.mockReturnValue(false);

    pm.digitalRequest.findMany.mockResolvedValue([
      {
        id: "dr-1",
        createdAt: new Date("2026-05-20T10:00:00Z"),
        submitter_name: "Gabi Testerin",
        status: "new",
        concern_text: "Ich hätte gerne einen Termin.",
      },
    ]);

    const { result } = await runPage(() => DigitalRequestsPage());
    const markup = renderToStaticMarkup(result as React.ReactElement);

    expect(markup).toContain("Gabi Testerin");
    expect(markup).toContain("Neu");

    // Scoping: owner_practice_id aus current_practice
    const whereArg = pm.digitalRequest.findMany.mock.calls[0][0].where as Record<
      string,
      unknown
    >;
    expect(whereArg.owner_practice_id).toBe("praxis-1");
  });

  it("INBOX_ONLY wird zu /questionnaires weitergeleitet", async () => {
    const account = makeAccount({
      current_practice: { id: "praxis-1" },
      memberships: [{ practice_id: "praxis-1", role: "INBOX_ONLY" }],
    });
    requirePatComm.mockResolvedValue(account);
    isInboxOnly.mockReturnValue(true);

    const { redirect } = await runPage(() => DigitalRequestsPage());

    expect(redirect).toBe("/questionnaires");
    expect(pm.digitalRequest.findMany).not.toHaveBeenCalled();
  });

  it("nicht eingeloggter Nutzer wird zu / weitergeleitet", async () => {
    requirePatComm.mockResolvedValue(null);

    const { redirect } = await runPage(() => DigitalRequestsPage());

    expect(redirect).toBe("/");
    expect(pm.digitalRequest.findMany).not.toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// AppShell — INBOX_ONLY hat kein "Digitale Anfragen"-NavItem
// ──────────────────────────────────────────────────────────────────────────────

describe("AppShell — Digitale Anfragen NavItem", () => {
  // Dynamische Imports nach Jest-Mocks
  let AppShell: typeof import("@/components/AppShell").default;

  beforeAll(async () => {
    AppShell = (await import("@/components/AppShell")).default;
  });

  function renderNav(role: AppShellPracticeRole | null): string {
    const account = {
      id: "acc-1",
      email: "praxis@example.com",
      is_approved: true,
      is_admin: false,
      inquiry_assistant_enabled: false,
      patient_communication_enabled: true,
      website_forms_enabled: false,
      office_cases_enabled: false,
      current_practice: role !== null ? { id: "praxis-1" } : null,
      memberships:
        role !== null
          ? ([{ practice_id: "praxis-1", role }] as Array<{
              practice_id: string;
              role: AppShellPracticeRole;
            }>)
          : [],
    };
    return renderToStaticMarkup(
      React.createElement(AppShell, { account }),
    );
  }

  // React wird nicht automatisch importiert — wir brauchen es für createElement
  let React: typeof import("react");
  beforeAll(async () => {
    React = await import("react");
  });

  it("OWNER sieht 'Digitale Anfragen' in der Nav wenn auf /digital-requests", () => {
    const markup = renderNav("OWNER");
    expect(markup).toContain("Digitale Anfragen");
  });

  it("INBOX_ONLY sieht KEIN 'Digitale Anfragen' NavItem", () => {
    const markup = renderNav("INBOX_ONLY");
    expect(markup).not.toContain("Digitale Anfragen");
  });
});
