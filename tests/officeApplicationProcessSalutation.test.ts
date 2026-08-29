/**
 * Tests für POST /api/office-cases/applications/[id]/process
 * Fokus: salutation-Parameter (Du/Sie-Ansprache für Bewerbungsanamnese)
 *
 * Prüft:
 * - Kein Body → Default "sie" wird an createSession übergeben
 * - Body { salutation: "du" } → "du" wird übergeben
 * - Body { salutation: "sie" } → "sie" wird übergeben
 * - Body { salutation: "UNGUELTIG" } → 400
 * - salutation wird auf PatientQuestionnaireSession gespeichert (via createSession)
 * - salutation wird an Mail weitergegeben
 * - manueller Office-Create-Pfad setzt weiterhin null (anderer Endpunkt)
 */

import { NextRequest } from "next/server";

const createQuestionnaireSessionMock = jest.fn();
const sendDigitalRequestTokenEmailMock = jest.fn();

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

import { POST } from "@/app/api/office-cases/applications/[id]/process/route";
import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";

type PrismaMock = {
  digitalRequest: { findFirst: jest.Mock; update: jest.Mock };
};
const pm = prisma as unknown as PrismaMock;
const getSessionAccountMock = getSessionAccount as jest.Mock;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PRACTICE_FIXTURE = {
  id: "p-1",
  slug: "praxis-1",
  name: "Hausarztpraxis Muster",
  is_approved: true,
  inquiry_assistant_enabled: true,
  patient_communication_enabled: true,
  website_forms_enabled: false,
  office_cases_enabled: true,
  arbeitsprozesse_enabled: false,
};

const ACCOUNT = {
  id: "account-1",
  email: "arzt@example.com",
  is_approved: true,
  is_admin: false,
  inquiry_assistant_enabled: false,
  patient_communication_enabled: true,
  website_forms_enabled: false,
  office_cases_enabled: true,
  arbeitsprozesse_enabled: false,
  current_practice: PRACTICE_FIXTURE,
  memberships: [{ practice_id: "p-1", role: "OWNER" }],
};

const DR_READY = {
  id: "dr-1",
  status: "in_review",
  submitter_email: "bewerber@example.com",
  submitter_name: "Anna Müller",
  selected_block_ids: ["BEWERBER_KONTAKT"],
  owner_account_id: "account-1",
  owner_practice_id: "p-1",
  owner_practice: {
    id: "p-1",
    name: "Hausarztpraxis Muster",
    message_signature: null,
  },
};

const SESSION_RESULT = {
  sessionId: "session-uuid-1",
  token: "token-uuid-1",
  tokenLink: "https://localhost:3000/q/token-uuid-1",
};

function makeRequest(id: string, body?: unknown) {
  if (body !== undefined) {
    return new NextRequest(
      `http://localhost/api/office-cases/applications/${id}/process`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
  }
  return new NextRequest(
    `http://localhost/api/office-cases/applications/${id}/process`,
    { method: "POST" },
  );
}

const CTX = (id: string) => ({ params: Promise.resolve({ id }) });

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  pm.digitalRequest.findFirst.mockReset();
  pm.digitalRequest.update.mockReset();
  getSessionAccountMock.mockReset();
  createQuestionnaireSessionMock.mockReset();
  sendDigitalRequestTokenEmailMock.mockReset();

  getSessionAccountMock.mockResolvedValue(ACCOUNT);
  pm.digitalRequest.findFirst.mockResolvedValue(DR_READY);
  createQuestionnaireSessionMock.mockResolvedValue(SESSION_RESULT);
  sendDigitalRequestTokenEmailMock.mockResolvedValue("console");
  pm.digitalRequest.update.mockResolvedValue({});
});

// ---------------------------------------------------------------------------
// salutation-Validierung
// ---------------------------------------------------------------------------

describe("POST process – salutation-Validierung", () => {
  it("akzeptiert salutation='du' und gibt 200 zurück", async () => {
    const res = await POST(makeRequest("dr-1", { salutation: "du" }), CTX("dr-1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("akzeptiert salutation='sie' und gibt 200 zurück", async () => {
    const res = await POST(makeRequest("dr-1", { salutation: "sie" }), CTX("dr-1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("lehnt ungültige salutation ab mit 400", async () => {
    const res = await POST(makeRequest("dr-1", { salutation: "they" }), CTX("dr-1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toMatch(/Ansprache/i);
  });

  it("lehnt weitere ungültige Werte ab (Großschreibung)", async () => {
    const res = await POST(makeRequest("dr-1", { salutation: "Du" }), CTX("dr-1"));
    expect(res.status).toBe(400);
  });

  it("verwendet 'sie' als Default wenn kein Body gesendet wird", async () => {
    const res = await POST(makeRequest("dr-1"), CTX("dr-1"));
    expect(res.status).toBe(200);

    const [sessionInput] = createQuestionnaireSessionMock.mock.calls[0];
    expect(sessionInput.salutation).toBe("sie");
  });

  it("verwendet 'sie' als Default wenn Body kein salutation-Feld enthält", async () => {
    const res = await POST(makeRequest("dr-1", { other: "field" }), CTX("dr-1"));
    expect(res.status).toBe(200);

    const [sessionInput] = createQuestionnaireSessionMock.mock.calls[0];
    expect(sessionInput.salutation).toBe("sie");
  });
});

// ---------------------------------------------------------------------------
// salutation wird korrekt durchgereicht
// ---------------------------------------------------------------------------

describe("POST process – salutation-Durchreichung", () => {
  it("übergibt salutation='du' an createQuestionnaireSession", async () => {
    await POST(makeRequest("dr-1", { salutation: "du" }), CTX("dr-1"));

    expect(createQuestionnaireSessionMock).toHaveBeenCalledTimes(1);
    const [input] = createQuestionnaireSessionMock.mock.calls[0];
    expect(input.salutation).toBe("du");
    expect(input.context).toBe("office");
  });

  it("übergibt salutation='sie' an createQuestionnaireSession", async () => {
    await POST(makeRequest("dr-1", { salutation: "sie" }), CTX("dr-1"));

    const [input] = createQuestionnaireSessionMock.mock.calls[0];
    expect(input.salutation).toBe("sie");
  });

  it("übergibt salutation='du' an sendDigitalRequestTokenEmail", async () => {
    await POST(makeRequest("dr-1", { salutation: "du" }), CTX("dr-1"));

    expect(sendDigitalRequestTokenEmailMock).toHaveBeenCalledTimes(1);
    const [mailInput] = sendDigitalRequestTokenEmailMock.mock.calls[0];
    expect(mailInput.salutation).toBe("du");
    expect(mailInput.variant).toBe("office");
  });

  it("übergibt salutation='sie' an sendDigitalRequestTokenEmail", async () => {
    await POST(makeRequest("dr-1", { salutation: "sie" }), CTX("dr-1"));

    const [mailInput] = sendDigitalRequestTokenEmailMock.mock.calls[0];
    expect(mailInput.salutation).toBe("sie");
  });
});
