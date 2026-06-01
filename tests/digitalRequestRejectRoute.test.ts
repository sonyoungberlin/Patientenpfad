/**
 * Tests für POST /api/digital-requests/[id]/reject
 *
 * Prüft:
 * - 401 wenn nicht angemeldet
 * - 403 für INBOX_ONLY
 * - 404 bei fremder/unbekannter Practice
 * - 409 bei terminalen Statuswerten (sent / closed / rejected)
 * - 400 wenn submitter_email fehlt
 * - Mailfehler → 500, Status bleibt unverändert (kein DB-Update)
 * - Erfolg → Status = "rejected", Mail wurde gesendet
 * - Praxis-Name-Fallback wenn owner_practice null
 * - Signatur wird an Mail übergeben
 */

import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks müssen vor allen Imports deklariert werden
// ---------------------------------------------------------------------------

const sendDigitalRequestRejectionEmailMock = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    digitalRequest: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
}));

jest.mock("@/lib/mail/sendDigitalRequestRejectionEmail", () => ({
  __esModule: true,
  sendDigitalRequestRejectionEmail: (...args: unknown[]) =>
    sendDigitalRequestRejectionEmailMock(...args),
}));

import { POST } from "@/app/api/digital-requests/[id]/reject/route";
import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";

type PrismaMock = {
  digitalRequest: {
    findFirst: jest.Mock;
    update: jest.Mock;
  };
};
const pm = prisma as unknown as PrismaMock;
const getSessionAccountMock = getSessionAccount as jest.Mock;

// ---------------------------------------------------------------------------
// Fixture-Accounts
// ---------------------------------------------------------------------------

const PRACTICE_FIXTURE = {
  id: "p-1",
  slug: "praxis-1",
  name: "Hausarztpraxis Muster",
  is_approved: true,
  inquiry_assistant_enabled: true,
  patient_communication_enabled: true,
  website_forms_enabled: false,
  office_cases_enabled: false,
};

const ACCOUNT_WITH_PRACTICE = {
  id: "account-1",
  email: "arzt@example.com",
  is_approved: true,
  is_admin: false,
  inquiry_assistant_enabled: false,
  patient_communication_enabled: true,
  current_practice: PRACTICE_FIXTURE,
  memberships: [{ practice_id: "p-1", role: "OWNER" }],
};

const ACCOUNT_OTHER_PRACTICE = {
  ...ACCOUNT_WITH_PRACTICE,
  id: "account-2",
  current_practice: {
    ...PRACTICE_FIXTURE,
    id: "p-2",
    slug: "praxis-2",
    name: "Andere Praxis",
  },
  memberships: [{ practice_id: "p-2", role: "OWNER" }],
};

const INBOX_ONLY_ACCOUNT = {
  ...ACCOUNT_WITH_PRACTICE,
  memberships: [{ practice_id: "p-1", role: "INBOX_ONLY" }],
};

// ---------------------------------------------------------------------------
// Fixture: DigitalRequest aus der DB
// ---------------------------------------------------------------------------

const DR_NEW = {
  id: "dr-1",
  status: "new",
  submitter_email: "patient@example.com",
  owner_practice_id: "p-1",
  owner_practice: {
    id: "p-1",
    name: "Hausarztpraxis Muster",
    message_signature: "Dr. Muster · Musterstraße 1",
  },
};

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeRequest(id: string) {
  return new NextRequest(
    `http://localhost/api/digital-requests/${id}/reject`,
    { method: "POST" },
  );
}

const CTX = (id: string) => ({ params: Promise.resolve({ id }) });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/digital-requests/[id]/reject", () => {
  beforeEach(() => {
    pm.digitalRequest.findFirst.mockReset();
    pm.digitalRequest.update.mockReset();
    getSessionAccountMock.mockReset();
    sendDigitalRequestRejectionEmailMock.mockReset();
  });

  // --- Auth ---

  it("gibt 401 zurück wenn nicht angemeldet", async () => {
    getSessionAccountMock.mockResolvedValue(null);
    const res = await POST(makeRequest("dr-1"), CTX("dr-1"));
    expect(res.status).toBe(401);
  });

  it("gibt 403 zurück für INBOX_ONLY", async () => {
    getSessionAccountMock.mockResolvedValue(INBOX_ONLY_ACCOUNT);
    const res = await POST(makeRequest("dr-1"), CTX("dr-1"));
    expect(res.status).toBe(403);
  });

  // --- Eigentum ---

  it("gibt 404 zurück bei fremder Practice", async () => {
    getSessionAccountMock.mockResolvedValue(ACCOUNT_OTHER_PRACTICE);
    pm.digitalRequest.findFirst.mockResolvedValue(null);
    const res = await POST(makeRequest("dr-1"), CTX("dr-1"));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("gibt 404 zurück bei unbekannter ID", async () => {
    getSessionAccountMock.mockResolvedValue(ACCOUNT_WITH_PRACTICE);
    pm.digitalRequest.findFirst.mockResolvedValue(null);
    const res = await POST(makeRequest("nonexistent"), CTX("nonexistent"));
    expect(res.status).toBe(404);
  });

  // --- Terminal-Status (409) ---

  it("gibt 409 zurück wenn status = 'sent'", async () => {
    getSessionAccountMock.mockResolvedValue(ACCOUNT_WITH_PRACTICE);
    pm.digitalRequest.findFirst.mockResolvedValue({ ...DR_NEW, status: "sent" });
    const res = await POST(makeRequest("dr-1"), CTX("dr-1"));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("gibt 409 zurück wenn status = 'closed'", async () => {
    getSessionAccountMock.mockResolvedValue(ACCOUNT_WITH_PRACTICE);
    pm.digitalRequest.findFirst.mockResolvedValue({ ...DR_NEW, status: "closed" });
    const res = await POST(makeRequest("dr-1"), CTX("dr-1"));
    expect(res.status).toBe(409);
  });

  it("gibt 409 zurück wenn status = 'rejected'", async () => {
    getSessionAccountMock.mockResolvedValue(ACCOUNT_WITH_PRACTICE);
    pm.digitalRequest.findFirst.mockResolvedValue({ ...DR_NEW, status: "rejected" });
    const res = await POST(makeRequest("dr-1"), CTX("dr-1"));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toMatch(/rejected/i);
  });

  // --- Validierung (400) ---

  it("gibt 400 zurück wenn submitter_email fehlt", async () => {
    getSessionAccountMock.mockResolvedValue(ACCOUNT_WITH_PRACTICE);
    pm.digitalRequest.findFirst.mockResolvedValue({
      ...DR_NEW,
      submitter_email: null,
    });
    const res = await POST(makeRequest("dr-1"), CTX("dr-1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toMatch(/E-Mail/i);
  });

  // --- Mailversand schlägt fehl ---

  it("setzt Status NICHT auf rejected wenn Mailversand fehlschlägt", async () => {
    getSessionAccountMock.mockResolvedValue(ACCOUNT_WITH_PRACTICE);
    pm.digitalRequest.findFirst.mockResolvedValue(DR_NEW);
    sendDigitalRequestRejectionEmailMock.mockRejectedValue(
      new Error("SMTP connection refused"),
    );

    const res = await POST(makeRequest("dr-1"), CTX("dr-1"));

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toMatch(/Mailversand/i);

    // DB darf nicht aktualisiert werden
    expect(pm.digitalRequest.update).not.toHaveBeenCalled();
  });

  // --- Erfolgreicher Ablehnung ---

  it("sendet Mail und setzt Status auf 'rejected'", async () => {
    getSessionAccountMock.mockResolvedValue(ACCOUNT_WITH_PRACTICE);
    pm.digitalRequest.findFirst.mockResolvedValue(DR_NEW);
    sendDigitalRequestRejectionEmailMock.mockResolvedValue("practice");
    pm.digitalRequest.update.mockResolvedValue({});

    const res = await POST(makeRequest("dr-1"), CTX("dr-1"));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.status).toBe("rejected");

    // Mail wurde gesendet
    expect(sendDigitalRequestRejectionEmailMock).toHaveBeenCalledTimes(1);
    const [mailInput] = sendDigitalRequestRejectionEmailMock.mock.calls[0];
    expect(mailInput.to).toBe("patient@example.com");
    expect(mailInput.practiceName).toBe("Hausarztpraxis Muster");
    expect(mailInput.practiceSignature).toBe("Dr. Muster · Musterstraße 1");
    expect(mailInput.practiceId).toBe("p-1");

    // DB wurde auf rejected gesetzt
    expect(pm.digitalRequest.update).toHaveBeenCalledTimes(1);
    const [{ where, data }] = pm.digitalRequest.update.mock.calls[0];
    expect(where.id).toBe("dr-1");
    expect(data.status).toBe("rejected");
  });

  it("akzeptiert status = 'in_review' zum Ablehnen", async () => {
    getSessionAccountMock.mockResolvedValue(ACCOUNT_WITH_PRACTICE);
    pm.digitalRequest.findFirst.mockResolvedValue({ ...DR_NEW, status: "in_review" });
    sendDigitalRequestRejectionEmailMock.mockResolvedValue("console");
    pm.digitalRequest.update.mockResolvedValue({});

    const res = await POST(makeRequest("dr-1"), CTX("dr-1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("rejected");
  });

  it("verwendet 'Ihre Praxis' als Fallback wenn owner_practice null", async () => {
    getSessionAccountMock.mockResolvedValue(ACCOUNT_WITH_PRACTICE);
    pm.digitalRequest.findFirst.mockResolvedValue({
      ...DR_NEW,
      owner_practice: null,
    });
    sendDigitalRequestRejectionEmailMock.mockResolvedValue("console");
    pm.digitalRequest.update.mockResolvedValue({});

    await POST(makeRequest("dr-1"), CTX("dr-1"));

    const [mailInput] = sendDigitalRequestRejectionEmailMock.mock.calls[0];
    expect(mailInput.practiceName).toBe("Ihre Praxis");
  });
});
