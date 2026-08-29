/**
 * Tests für die Berechtigungsarchitektur des Office-Bewerbungsanfragen-Flows.
 *
 * Prüft:
 * - requireOfficeApplicationsAccess: OWNER / ADMIN / USER erlaubt, INBOX_ONLY abgelehnt
 * - PATCH /api/office-cases/applications/[id]: USER erlaubt
 * - POST /api/office-cases/applications/[id]/process: USER erlaubt
 * - POST /api/office-cases/applications/[id]/reject: USER erlaubt
 * - DELETE /api/office-cases/applications/[id]: USER abgelehnt, OWNER/ADMIN erlaubt
 * - Questionnaire-Routen: USER weiterhin abgelehnt
 */

import { NextRequest } from "next/server";
import { PracticeRole } from "@prisma/client";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const sendTokenEmailMock = jest.fn();
const sendRejectionEmailMock = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    digitalRequest: {
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    patientQuestionnaireSession: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    session: { findUnique: jest.fn(), delete: jest.fn() },
  },
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
  getSessionAccountFromCookies: jest.fn(),
  SESSION_COOKIE: "pp_session",
}));

jest.mock("@/lib/mail/sendDigitalRequestTokenEmail", () => ({
  __esModule: true,
  sendDigitalRequestTokenEmail: (...args: unknown[]) =>
    sendTokenEmailMock(...args),
}));

jest.mock("@/lib/mail/sendDigitalRequestRejectionEmail", () => ({
  __esModule: true,
  sendDigitalRequestRejectionEmail: (...args: unknown[]) =>
    sendRejectionEmailMock(...args),
}));

jest.mock("@/lib/questionnaire/createSession", () => ({
  createQuestionnaireSession: jest.fn().mockResolvedValue({
    sessionId: "sess-1",
    token: "tok-1",
    tokenLink: "http://localhost/q/tok-1",
  }),
}));

import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import {
  requireOfficeApplicationsAccess,
} from "@/lib/authz";

type PrismaMock = {
  digitalRequest: {
    findFirst: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  session: { findUnique: jest.Mock; delete: jest.Mock };
};
const pm = prisma as unknown as PrismaMock;
const getSessionAccountMock = getSessionAccount as jest.Mock;

// ---------------------------------------------------------------------------
// Fixture-Accounts
// ---------------------------------------------------------------------------

const BASE_PRACTICE = {
  id: "p-1",
  slug: "praxis-1",
  name: "Praxis 1",
  is_approved: true,
  inquiry_assistant_enabled: true,
  patient_communication_enabled: true,
  website_forms_enabled: false,
  office_cases_enabled: true,
  arbeitsprozesse_enabled: false,
  message_signature: null,
};

function makeAccount(role: PracticeRole) {
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

const DR_NEW = {
  id: "dr-1",
  status: "new",
  submitter_email: "bewerber@example.de",
  submitter_name: "Max Muster",
  selected_block_ids: ["BEWERBER_KONTAKT"],
  birth_date_hash: null,
  owner_account_id: "acc-1",
  owner_practice_id: "p-1",
  owner_practice: BASE_PRACTICE,
};

function patchReq(body: unknown = {}) {
  return new NextRequest("http://localhost/api/office-cases/applications/dr-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function postReq(path: string) {
  return new NextRequest(`http://localhost${path}`, { method: "POST" });
}

function deleteReq() {
  return new NextRequest(
    "http://localhost/api/office-cases/applications/dr-1",
    { method: "DELETE" },
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  sendTokenEmailMock.mockResolvedValue("console");
  sendRejectionEmailMock.mockResolvedValue("console");
});

// ===========================================================================
// requireOfficeApplicationsAccess — Unit-Tests
// ===========================================================================

describe("requireOfficeApplicationsAccess — Rollen", () => {
  for (const role of [PracticeRole.OWNER, PracticeRole.ADMIN, PracticeRole.USER]) {
    it(`erlaubt ${role}`, async () => {
      getSessionAccountMock.mockResolvedValue(makeAccount(role));
      const req = new NextRequest("http://localhost/x");
      const result = await requireOfficeApplicationsAccess(req);
      expect(result.error).toBeNull();
      expect(result.account).not.toBeNull();
    });
  }

  it("lehnt INBOX_ONLY ab (403)", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount(PracticeRole.INBOX_ONLY));
    const req = new NextRequest("http://localhost/x");
    const result = await requireOfficeApplicationsAccess(req);
    expect(result.error).not.toBeNull();
    expect(result.account).toBeNull();
    const resp = result.error!;
    expect(resp.status).toBe(403);
  });

  it("lehnt nicht angemeldete ab (401)", async () => {
    getSessionAccountMock.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/x");
    const result = await requireOfficeApplicationsAccess(req);
    expect(result.error).not.toBeNull();
    expect(result.error!.status).toBe(401);
  });

  it("lehnt ab wenn office_cases_enabled=false (403)", async () => {
    const account = {
      ...makeAccount(PracticeRole.USER),
      office_cases_enabled: false,
      current_practice: { ...BASE_PRACTICE, office_cases_enabled: false },
    };
    getSessionAccountMock.mockResolvedValue(account);
    const req = new NextRequest("http://localhost/x");
    const result = await requireOfficeApplicationsAccess(req);
    expect(result.error).not.toBeNull();
    expect(result.error!.status).toBe(403);
  });
});

// ===========================================================================
// PATCH — USER erlaubt
// ===========================================================================

describe("PATCH /api/office-cases/applications/[id]", () => {
  let PATCH: (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;

  beforeAll(async () => {
    ({ PATCH } = await import(
      "@/app/api/office-cases/applications/[id]/route"
    ));
  });

  it("USER darf Blockauswahl speichern (200)", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount(PracticeRole.USER));
    pm.digitalRequest.findFirst.mockResolvedValue({ id: "dr-1", status: "new" });
    pm.digitalRequest.update.mockResolvedValue({});

    const res = await PATCH(
      patchReq({ selected_block_ids: ["BEWERBER_KONTAKT"], status: "in_review" }),
      { params: Promise.resolve({ id: "dr-1" }) },
    );
    const body = (await res.json()) as { ok: boolean };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
  });

  it("INBOX_ONLY wird abgelehnt (403)", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount(PracticeRole.INBOX_ONLY));
    const res = await PATCH(patchReq({ selected_block_ids: [] }), {
      params: Promise.resolve({ id: "dr-1" }),
    });
    expect(res.status).toBe(403);
  });
});

// ===========================================================================
// DELETE — USER abgelehnt, OWNER/ADMIN erlaubt
// ===========================================================================

describe("DELETE /api/office-cases/applications/[id]", () => {
  let DELETE: (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;

  beforeAll(async () => {
    ({ DELETE } = await import(
      "@/app/api/office-cases/applications/[id]/route"
    ));
  });

  it("USER darf NICHT löschen (403)", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount(PracticeRole.USER));
    const res = await DELETE(deleteReq(), {
      params: Promise.resolve({ id: "dr-1" }),
    });
    expect(res.status).toBe(403);
  });

  it("OWNER darf löschen (200)", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount(PracticeRole.OWNER));
    pm.digitalRequest.findFirst.mockResolvedValue({ id: "dr-1", status: "new" });
    pm.digitalRequest.delete.mockResolvedValue({});
    const res = await DELETE(deleteReq(), {
      params: Promise.resolve({ id: "dr-1" }),
    });
    expect(res.status).toBe(200);
  });

  it("ADMIN darf löschen (200)", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount(PracticeRole.ADMIN));
    pm.digitalRequest.findFirst.mockResolvedValue({ id: "dr-1", status: "new" });
    pm.digitalRequest.delete.mockResolvedValue({});
    const res = await DELETE(deleteReq(), {
      params: Promise.resolve({ id: "dr-1" }),
    });
    expect(res.status).toBe(200);
  });
});

// ===========================================================================
// Process — USER erlaubt
// ===========================================================================

describe("POST /api/office-cases/applications/[id]/process", () => {
  let POST: (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;

  beforeAll(async () => {
    ({ POST } = await import(
      "@/app/api/office-cases/applications/[id]/process/route"
    ));
  });

  it("USER darf Fragebogen senden (200)", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount(PracticeRole.USER));
    pm.digitalRequest.findFirst.mockResolvedValue(DR_NEW);
    pm.digitalRequest.update.mockResolvedValue({});

    const res = await POST(
      postReq("/api/office-cases/applications/dr-1/process"),
      { params: Promise.resolve({ id: "dr-1" }) },
    );
    const body = (await res.json()) as { ok: boolean };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(sendTokenEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "office" }),
    );
  });

  it("INBOX_ONLY darf nicht senden (403)", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount(PracticeRole.INBOX_ONLY));
    const res = await POST(
      postReq("/api/office-cases/applications/dr-1/process"),
      { params: Promise.resolve({ id: "dr-1" }) },
    );
    expect(res.status).toBe(403);
  });
});

// ===========================================================================
// Reject — USER erlaubt
// ===========================================================================

describe("POST /api/office-cases/applications/[id]/reject", () => {
  let POST: (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;

  beforeAll(async () => {
    ({ POST } = await import(
      "@/app/api/office-cases/applications/[id]/reject/route"
    ));
  });

  it("USER darf ablehnen (200)", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount(PracticeRole.USER));
    pm.digitalRequest.findFirst.mockResolvedValue({
      id: "dr-1",
      status: "new",
      submitter_email: "b@b.de",
      owner_practice_id: "p-1",
      owner_practice: BASE_PRACTICE,
    });
    pm.digitalRequest.update.mockResolvedValue({});

    const res = await POST(
      postReq("/api/office-cases/applications/dr-1/reject"),
      { params: Promise.resolve({ id: "dr-1" }) },
    );
    const body = (await res.json()) as { ok: boolean };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(sendRejectionEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "office" }),
    );
  });

  it("INBOX_ONLY darf nicht ablehnen (403)", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount(PracticeRole.INBOX_ONLY));
    const res = await POST(
      postReq("/api/office-cases/applications/dr-1/reject"),
      { params: Promise.resolve({ id: "dr-1" }) },
    );
    expect(res.status).toBe(403);
  });
});

// ===========================================================================
// Questionnaire-Isolation: USER weiterhin abgelehnt
// ===========================================================================

describe("Questionnaire-Isolation: USER bleibt gesperrt", () => {
  it("requireOfficeQuestionnaireAccess lehnt USER ab (403)", async () => {
    const { requireOfficeQuestionnaireAccess } = await import("@/lib/authz");
    getSessionAccountMock.mockResolvedValue(makeAccount(PracticeRole.USER));
    const req = new NextRequest("http://localhost/x");
    const result = await requireOfficeQuestionnaireAccess(req);
    expect(result.error).not.toBeNull();
    expect(result.error!.status).toBe(403);
  });

  it("requireOfficeQuestionnaireAccess erlaubt OWNER", async () => {
    const { requireOfficeQuestionnaireAccess } = await import("@/lib/authz");
    getSessionAccountMock.mockResolvedValue(makeAccount(PracticeRole.OWNER));
    const req = new NextRequest("http://localhost/x");
    const result = await requireOfficeQuestionnaireAccess(req);
    expect(result.error).toBeNull();
  });

  it("requireOfficeQuestionnaireAccess erlaubt ADMIN", async () => {
    const { requireOfficeQuestionnaireAccess } = await import("@/lib/authz");
    getSessionAccountMock.mockResolvedValue(makeAccount(PracticeRole.ADMIN));
    const req = new NextRequest("http://localhost/x");
    const result = await requireOfficeQuestionnaireAccess(req);
    expect(result.error).toBeNull();
  });

  it("requireOfficeQuestionnaireAccess lehnt INBOX_ONLY ab (403)", async () => {
    const { requireOfficeQuestionnaireAccess } = await import("@/lib/authz");
    getSessionAccountMock.mockResolvedValue(makeAccount(PracticeRole.INBOX_ONLY));
    const req = new NextRequest("http://localhost/x");
    const result = await requireOfficeQuestionnaireAccess(req);
    expect(result.error).not.toBeNull();
    expect(result.error!.status).toBe(403);
  });
});

// ===========================================================================
// AppShell Navigation
// ===========================================================================

describe("AppShell-Navigation: Rollentrennung Bewerbungsanfragen vs. Fragebögen", () => {
  /** Hilfsfunktion: simuliert canManagePractice und practiceRole wie AppShell */
  function navItems(role: PracticeRole | null, officeCasesEnabled: boolean) {
    const canManagePractice = role === "OWNER" || role === "ADMIN";
    const items: string[] = [];
    if (officeCasesEnabled) {
      items.push("Officefälle");
      if (canManagePractice) items.push("Fragebögen");
      if (canManagePractice || role === "USER") items.push("Bewerbungsanfragen");
    }
    return items;
  }

  it("OWNER sieht Fragebögen und Bewerbungsanfragen", () => {
    const items = navItems("OWNER", true);
    expect(items).toContain("Fragebögen");
    expect(items).toContain("Bewerbungsanfragen");
  });

  it("ADMIN sieht Fragebögen und Bewerbungsanfragen", () => {
    const items = navItems("ADMIN", true);
    expect(items).toContain("Fragebögen");
    expect(items).toContain("Bewerbungsanfragen");
  });

  it("USER sieht Bewerbungsanfragen aber NICHT Fragebögen", () => {
    const items = navItems("USER", true);
    expect(items).toContain("Bewerbungsanfragen");
    expect(items).not.toContain("Fragebögen");
  });

  it("INBOX_ONLY sieht weder Fragebögen noch Bewerbungsanfragen", () => {
    const items = navItems("INBOX_ONLY", true);
    expect(items).not.toContain("Fragebögen");
    expect(items).not.toContain("Bewerbungsanfragen");
  });

  it("ohne office_cases_enabled werden keine Office-Links angezeigt", () => {
    const items = navItems("OWNER", false);
    expect(items).not.toContain("Fragebögen");
    expect(items).not.toContain("Bewerbungsanfragen");
  });
});
