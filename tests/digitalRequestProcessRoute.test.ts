/**
 * Tests für POST /api/digital-requests/[id]/process
 *
 * Prüft:
 * - Erzeugt Session + sendet Mail + setzt status = "sent"
 * - Verknüpft questionnaire_session_id
 * - submitter_email wird als Empfänger verwendet
 * - patient_reference fehlt → 400
 * - selected_block_ids leer / fehlt → 400
 * - ungültige Block-IDs in selected_block_ids → 400
 * - status "sent" → 409
 * - status "closed" → 409
 * - fremde Practice → 404
 * - INBOX_ONLY → 403
 * - nicht angemeldet → 401
 * - Mailversand schlägt fehl → 500, kein DB-Update
 */

import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks müssen vor allen Imports deklariert werden
// ---------------------------------------------------------------------------

const createQuestionnaireSessionMock = jest.fn();
const sendDigitalRequestTokenEmailMock = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    digitalRequest: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    patientQuestionnaireSession: {
      create: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
}));

jest.mock("@/lib/questionnaire/createSession", () => ({
  __esModule: true,
  createQuestionnaireSession: (...args: unknown[]) =>
    createQuestionnaireSessionMock(...args),
}));

jest.mock("@/lib/mail/sendDigitalRequestTokenEmail", () => ({
  __esModule: true,
  sendDigitalRequestTokenEmail: (...args: unknown[]) =>
    sendDigitalRequestTokenEmailMock(...args),
}));

import { POST } from "@/app/api/digital-requests/[id]/process/route";
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

const DR_READY = {
  id: "dr-1",
  status: "in_review",
  submitter_email: "patient@example.com",
  patient_reference: "PAT-001",
  selected_block_ids: ["IDENTITAET"],
  birth_date_hash: null,
  owner_account_id: "account-1",
  owner_practice_id: "p-1",
  owner_practice: {
    id: "p-1",
    name: "Hausarztpraxis Muster",
    message_signature: "Dr. Muster · Musterstraße 1",
  },
};

const SESSION_RESULT = {
  sessionId: "session-uuid-1",
  token: "token-uuid-1",
  tokenLink: "https://localhost:3000/q/token-uuid-1",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(id: string) {
  return new NextRequest(
    `http://localhost/api/digital-requests/${id}/process`,
    { method: "POST" },
  );
}

const CTX = (id: string) => ({ params: Promise.resolve({ id }) });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/digital-requests/[id]/process", () => {
  beforeEach(() => {
    pm.digitalRequest.findFirst.mockReset();
    pm.digitalRequest.update.mockReset();
    getSessionAccountMock.mockReset();
    createQuestionnaireSessionMock.mockReset();
    sendDigitalRequestTokenEmailMock.mockReset();
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
    pm.digitalRequest.findFirst.mockResolvedValue(null); // anderer Scope → nicht gefunden
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
    pm.digitalRequest.findFirst.mockResolvedValue({ ...DR_READY, status: "sent" });
    const res = await POST(makeRequest("dr-1"), CTX("dr-1"));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("gibt 409 zurück wenn status = 'closed'", async () => {
    getSessionAccountMock.mockResolvedValue(ACCOUNT_WITH_PRACTICE);
    pm.digitalRequest.findFirst.mockResolvedValue({ ...DR_READY, status: "closed" });
    const res = await POST(makeRequest("dr-1"), CTX("dr-1"));
    expect(res.status).toBe(409);
  });

  // --- Validierung (400) ---

  it("gibt 400 zurück wenn patient_reference fehlt", async () => {
    getSessionAccountMock.mockResolvedValue(ACCOUNT_WITH_PRACTICE);
    pm.digitalRequest.findFirst.mockResolvedValue({
      ...DR_READY,
      patient_reference: null,
    });
    const res = await POST(makeRequest("dr-1"), CTX("dr-1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toMatch(/Patientenreferenz/i);
  });

  it("gibt 400 zurück wenn selected_block_ids null ist", async () => {
    getSessionAccountMock.mockResolvedValue(ACCOUNT_WITH_PRACTICE);
    pm.digitalRequest.findFirst.mockResolvedValue({
      ...DR_READY,
      selected_block_ids: null,
    });
    const res = await POST(makeRequest("dr-1"), CTX("dr-1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Block/i);
  });

  it("gibt 400 zurück wenn selected_block_ids leeres Array ist", async () => {
    getSessionAccountMock.mockResolvedValue(ACCOUNT_WITH_PRACTICE);
    pm.digitalRequest.findFirst.mockResolvedValue({
      ...DR_READY,
      selected_block_ids: [],
    });
    const res = await POST(makeRequest("dr-1"), CTX("dr-1"));
    expect(res.status).toBe(400);
  });

  it("gibt 400 zurück bei ungültiger Block-ID in selected_block_ids", async () => {
    getSessionAccountMock.mockResolvedValue(ACCOUNT_WITH_PRACTICE);
    pm.digitalRequest.findFirst.mockResolvedValue({
      ...DR_READY,
      selected_block_ids: ["IDENTITAET", "INVALID_BLOCK_ID"],
    });
    const res = await POST(makeRequest("dr-1"), CTX("dr-1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.invalid_ids).toContain("INVALID_BLOCK_ID");
  });

  // --- Erfolgreicher Prozess ---

  it("erzeugt Session mit korrekten Parametern", async () => {
    getSessionAccountMock.mockResolvedValue(ACCOUNT_WITH_PRACTICE);
    pm.digitalRequest.findFirst.mockResolvedValue(DR_READY);
    createQuestionnaireSessionMock.mockResolvedValue(SESSION_RESULT);
    sendDigitalRequestTokenEmailMock.mockResolvedValue("practice");
    pm.digitalRequest.update.mockResolvedValue({});

    await POST(makeRequest("dr-1"), CTX("dr-1"));

    expect(createQuestionnaireSessionMock).toHaveBeenCalledTimes(1);
    const [input] = createQuestionnaireSessionMock.mock.calls[0];
    expect(input.selectedBlockIds).toEqual(["IDENTITAET"]);
    expect(input.patientReference).toBe("PAT-001");
    expect(input.patientLanguage).toBe("de");
    expect(input.ownerAccountId).toBe("account-1");
    expect(input.ownerPracticeId).toBe("p-1");
  });

  it("sendet Mail an submitter_email mit tokenLink", async () => {
    getSessionAccountMock.mockResolvedValue(ACCOUNT_WITH_PRACTICE);
    pm.digitalRequest.findFirst.mockResolvedValue(DR_READY);
    createQuestionnaireSessionMock.mockResolvedValue(SESSION_RESULT);
    sendDigitalRequestTokenEmailMock.mockResolvedValue("practice");
    pm.digitalRequest.update.mockResolvedValue({});

    await POST(makeRequest("dr-1"), CTX("dr-1"));

    expect(sendDigitalRequestTokenEmailMock).toHaveBeenCalledTimes(1);
    const [mailInput] = sendDigitalRequestTokenEmailMock.mock.calls[0];
    expect(mailInput.to).toBe("patient@example.com");
    expect(mailInput.questionnaireUrl).toBe(SESSION_RESULT.tokenLink);
    expect(mailInput.practiceName).toBe("Hausarztpraxis Muster");
    expect(mailInput.practiceSignature).toBe("Dr. Muster · Musterstraße 1");
    expect(mailInput.practiceId).toBe("p-1");
  });

  it("setzt status = 'sent', questionnaire_session_id und sent_at nach erfolgreichem Versand", async () => {
    getSessionAccountMock.mockResolvedValue(ACCOUNT_WITH_PRACTICE);
    pm.digitalRequest.findFirst.mockResolvedValue(DR_READY);
    createQuestionnaireSessionMock.mockResolvedValue(SESSION_RESULT);
    sendDigitalRequestTokenEmailMock.mockResolvedValue("practice");
    pm.digitalRequest.update.mockResolvedValue({});

    const res = await POST(makeRequest("dr-1"), CTX("dr-1"));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.status).toBe("sent");
    expect(json.sessionId).toBe("session-uuid-1");

    expect(pm.digitalRequest.update).toHaveBeenCalledTimes(1);
    const [{ where, data }] = pm.digitalRequest.update.mock.calls[0];
    expect(where.id).toBe("dr-1");
    expect(data.status).toBe("sent");
    expect(data.questionnaire_session_id).toBe("session-uuid-1");
    expect(data.sent_at).toBeInstanceOf(Date);
  });

  // --- Mailversand schlägt fehl ---

  it("setzt status NICHT auf sent wenn Mailversand fehlschlägt", async () => {
    getSessionAccountMock.mockResolvedValue(ACCOUNT_WITH_PRACTICE);
    pm.digitalRequest.findFirst.mockResolvedValue(DR_READY);
    createQuestionnaireSessionMock.mockResolvedValue(SESSION_RESULT);
    sendDigitalRequestTokenEmailMock.mockRejectedValue(
      new Error("SMTP connection refused"),
    );

    const res = await POST(makeRequest("dr-1"), CTX("dr-1"));

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toMatch(/Mailversand/i);

    // DB darf nicht auf sent gesetzt werden
    expect(pm.digitalRequest.update).not.toHaveBeenCalled();
  });

  // --- Verifikation: Praxis-Name-Fallback ---

  it("verwendet 'Ihre Praxis' als Fallback wenn owner_practice null", async () => {
    getSessionAccountMock.mockResolvedValue(ACCOUNT_WITH_PRACTICE);
    pm.digitalRequest.findFirst.mockResolvedValue({
      ...DR_READY,
      owner_practice: null,
    });
    createQuestionnaireSessionMock.mockResolvedValue(SESSION_RESULT);
    sendDigitalRequestTokenEmailMock.mockResolvedValue("console");
    pm.digitalRequest.update.mockResolvedValue({});

    await POST(makeRequest("dr-1"), CTX("dr-1"));

    const [mailInput] = sendDigitalRequestTokenEmailMock.mock.calls[0];
    expect(mailInput.practiceName).toBe("Ihre Praxis");
  });
});
