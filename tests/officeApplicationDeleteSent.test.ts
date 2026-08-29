/**
 * Tests für das aktualisierte Lösch-Verhalten von Bewerbungsanfragen.
 *
 * Prüft:
 * - OWNER kann unsent Application löschen
 * - OWNER kann sent Application löschen (neu: kein 409 mehr)
 * - ADMIN kann sent Application löschen
 * - INBOX_ONLY kann nicht löschen (403)
 * - Löschen einer sent Application löscht die PatientQuestionnaireSession NICHT
 * - DELETE ruft prisma.digitalRequest.delete auf (Hard-Delete)
 * - DELETE ruft NICHT prisma.patientQuestionnaireSession.delete auf
 * - PATCH (Auswahl speichern) bleibt weiterhin für USER erlaubt
 * - POST /reject (Ablehnen) bleibt weiterhin vorhanden
 * - POST /process (Fragebogen senden) bleibt weiterhin vorhanden
 */

import { NextRequest } from "next/server";
import { PracticeRole } from "@prisma/client";

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
      delete: jest.fn(),
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

type PrismaMock = {
  digitalRequest: { findFirst: jest.Mock; update: jest.Mock; delete: jest.Mock };
  patientQuestionnaireSession: { findFirst: jest.Mock; update: jest.Mock; delete: jest.Mock };
  session: { findUnique: jest.Mock; delete: jest.Mock };
};
const pm = prisma as unknown as PrismaMock;
const getSessionAccountMock = getSessionAccount as jest.Mock;

const BASE_PRACTICE = {
  id: "p-1",
  slug: "praxis-1",
  name: "Praxis 1",
  is_approved: true,
  inquiry_assistant_enabled: false,
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

function deleteReq() {
  return new NextRequest(
    "http://localhost/api/office-cases/applications/dr-1",
    { method: "DELETE" },
  );
}

function patchReq(body: unknown) {
  return new NextRequest("http://localhost/api/office-cases/applications/dr-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function postReq(path: string) {
  return new NextRequest(`http://localhost${path}`, { method: "POST" });
}

const CTX = { params: Promise.resolve({ id: "dr-1" }) };

const DR_SENT = {
  id: "dr-1",
  status: "sent",
  questionnaire_session_id: "sess-99",
};

const DR_NEW = {
  id: "dr-1",
  status: "new",
  questionnaire_session_id: null,
  submitter_email: "bewerber@example.de",
  submitter_name: "Max Muster",
  selected_block_ids: ["BEWERBER_KONTAKT"],
  birth_date_hash: null,
  owner_account_id: "acc-1",
  owner_practice_id: "p-1",
  owner_practice: BASE_PRACTICE,
};

beforeEach(() => {
  jest.clearAllMocks();
  sendTokenEmailMock.mockResolvedValue("console");
  sendRejectionEmailMock.mockResolvedValue("console");
  pm.digitalRequest.delete.mockResolvedValue({});
  pm.digitalRequest.update.mockResolvedValue({});
});

// ---------------------------------------------------------------------------
// DELETE — neue Regeln
// ---------------------------------------------------------------------------

describe("DELETE /api/office-cases/applications/[id] – aktualisierte Lösch-Regeln", () => {
  let DELETE: (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;

  beforeAll(async () => {
    ({ DELETE } = await import(
      "@/app/api/office-cases/applications/[id]/route"
    ));
  });

  it("OWNER kann unsent Application löschen (200)", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount(PracticeRole.OWNER));
    pm.digitalRequest.findFirst.mockResolvedValue({ id: "dr-1", status: "new" });
    const res = await DELETE(deleteReq(), CTX);
    expect(res.status).toBe(200);
    expect(pm.digitalRequest.delete).toHaveBeenCalledWith({
      where: { id: "dr-1" },
    });
  });

  it("OWNER kann sent Application löschen (kein 409 mehr)", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount(PracticeRole.OWNER));
    pm.digitalRequest.findFirst.mockResolvedValue(DR_SENT);
    const res = await DELETE(deleteReq(), CTX);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it("ADMIN kann sent Application löschen (200)", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount(PracticeRole.ADMIN));
    pm.digitalRequest.findFirst.mockResolvedValue(DR_SENT);
    const res = await DELETE(deleteReq(), CTX);
    expect(res.status).toBe(200);
  });

  it("INBOX_ONLY kann nicht löschen (403)", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount(PracticeRole.INBOX_ONLY));
    const res = await DELETE(deleteReq(), CTX);
    expect(res.status).toBe(403);
    expect(pm.digitalRequest.delete).not.toHaveBeenCalled();
  });

  it("Löschen einer sent Application löscht die PatientQuestionnaireSession NICHT", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount(PracticeRole.OWNER));
    pm.digitalRequest.findFirst.mockResolvedValue(DR_SENT);
    await DELETE(deleteReq(), CTX);
    expect(pm.patientQuestionnaireSession.delete).not.toHaveBeenCalled();
  });

  it("DELETE löscht nur den DigitalRequest (Hard-Delete)", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount(PracticeRole.OWNER));
    pm.digitalRequest.findFirst.mockResolvedValue(DR_SENT);
    await DELETE(deleteReq(), CTX);
    expect(pm.digitalRequest.delete).toHaveBeenCalledTimes(1);
    expect(pm.digitalRequest.delete).toHaveBeenCalledWith({
      where: { id: "dr-1" },
    });
  });
});

// ---------------------------------------------------------------------------
// Bestehende Aktionen bleiben unverändert
// ---------------------------------------------------------------------------

describe("Bestehende Aktionen bleiben vorhanden", () => {
  let PATCH: (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;
  let PROCESS_POST: (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;
  let REJECT_POST: (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;

  beforeAll(async () => {
    ({ PATCH } = await import("@/app/api/office-cases/applications/[id]/route"));
    ({ POST: PROCESS_POST } = await import(
      "@/app/api/office-cases/applications/[id]/process/route"
    ));
    ({ POST: REJECT_POST } = await import(
      "@/app/api/office-cases/applications/[id]/reject/route"
    ));
  });

  it("PATCH (Auswahl speichern) bleibt für USER erlaubt (200)", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount(PracticeRole.USER));
    pm.digitalRequest.findFirst.mockResolvedValue({ id: "dr-1", status: "new" });
    const res = await PATCH(
      patchReq({ selected_block_ids: ["BEWERBER_KONTAKT"], status: "in_review" }),
      CTX,
    );
    expect(res.status).toBe(200);
  });

  it("POST /process (Fragebogen senden) bleibt vorhanden (200)", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount(PracticeRole.OWNER));
    pm.digitalRequest.findFirst.mockResolvedValue(DR_NEW);
    const res = await PROCESS_POST(
      postReq("/api/office-cases/applications/dr-1/process"),
      CTX,
    );
    expect(res.status).toBe(200);
    expect(sendTokenEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "office" }),
    );
  });

  it("POST /reject (Ablehnen) bleibt vorhanden (200)", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount(PracticeRole.USER));
    pm.digitalRequest.findFirst.mockResolvedValue({
      id: "dr-1",
      status: "new",
      submitter_email: "b@b.de",
      owner_practice_id: "p-1",
      owner_practice: BASE_PRACTICE,
    });
    const res = await REJECT_POST(
      postReq("/api/office-cases/applications/dr-1/reject"),
      CTX,
    );
    expect(res.status).toBe(200);
    expect(sendRejectionEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "office" }),
    );
  });
});
