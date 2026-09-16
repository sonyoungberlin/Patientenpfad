import { NextRequest } from "next/server";
import { POST } from "@/app/api/questionnaire/[id]/kiosk-handoff/route";

jest.mock("@/lib/authz", () => ({ requireQuestionnaireInboxAccess: jest.fn() }));
jest.mock("@/lib/questionnaire/practiceScope", () => ({ ownsSession: jest.fn(() => true) }));
jest.mock("@/lib/questionnaire/kioskCheckIn", () => ({ isKioskCheckInSession: jest.fn(() => true) }));
jest.mock("@/lib/questionnaire/createSession", () => ({ createQuestionnaireSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    patientQuestionnaireSession: { findUnique: jest.fn(), updateMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

import { requireQuestionnaireInboxAccess } from "@/lib/authz";
import { createQuestionnaireSession } from "@/lib/questionnaire/createSession";
import { prisma } from "@/lib/prisma";
import { isKioskCheckInSession } from "@/lib/questionnaire/kioskCheckIn";

const auth = requireQuestionnaireInboxAccess as jest.Mock;
const createSession = createQuestionnaireSession as jest.Mock;
const isCheckIn = isKioskCheckInSession as jest.Mock;
const db = prisma as unknown as {
  patientQuestionnaireSession: { findUnique: jest.Mock; updateMany: jest.Mock };
  $transaction: jest.Mock;
};
const parent = {
  owner_account_id: null,
  owner_practice_id: "practice-1",
  created_by_kiosk_device_id: "device-1",
  patient_reference: "12345",
  patient_language: "de",
  selected_block_ids: ["KONTAKT", "CHECK_IN"],
  source: "kiosk_direct",
  session_kind: "patient_communication",
  status: "completed",
  deleted_at: null,
  kiosk_handoff_status: "waiting",
};

function request(body: unknown) {
  return new NextRequest("http://localhost/api/questionnaire/check-in-1/kiosk-handoff", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
const context = { params: Promise.resolve({ id: "check-in-1" }) };

describe("POST questionnaire kiosk handoff", () => {
  beforeEach(() => {
    auth.mockReset().mockResolvedValue({ account: { id: "account-1" }, error: null });
    db.patientQuestionnaireSession.findUnique.mockReset().mockResolvedValue(parent);
    db.patientQuestionnaireSession.updateMany.mockReset().mockResolvedValue({ count: 1 });
    createSession.mockReset().mockResolvedValue({ sessionId: "child-1", token: "secret", tokenLink: "secret-link" });
    isCheckIn.mockReset().mockReturnValue(true);
    db.$transaction.mockReset().mockImplementation(async (callback: (transaction: unknown) => unknown) =>
      callback({ patientQuestionnaireSession: { create: jest.fn(), updateMany: db.patientQuestionnaireSession.updateMany } }));
  });

  it("verweigert Aktionen vor der Patientenzuordnung", async () => {
    db.patientQuestionnaireSession.findUnique.mockResolvedValue({ ...parent, patient_reference: null });
    const response = await POST(request({ action: "close" }), context);
    expect(response.status).toBe(404);
    expect(db.patientQuestionnaireSession.updateMany).not.toHaveBeenCalled();
  });

  it.each([
    ["manipulierter Session-ID", null],
    ["falscher Practice", { ...parent, owner_practice_id: "practice-2" }],
    ["fehlendem Kioskgerät", { ...parent, created_by_kiosk_device_id: null }],
    ["noch nicht abgeschlossener Session", { ...parent, status: "pending" }],
  ])("verweigert Aktionen bei %s", async (_case, session) => {
    db.patientQuestionnaireSession.findUnique.mockResolvedValue(session);
    if (_case === "falscher Practice") {
      const { ownsSession } = jest.requireMock("@/lib/questionnaire/practiceScope") as {
        ownsSession: jest.Mock;
      };
      ownsSession.mockReturnValueOnce(false);
    }
    const response = await POST(request({ action: "close" }), context);
    expect(response.status).toBe(404);
    expect(db.patientQuestionnaireSession.updateMany).not.toHaveBeenCalled();
  });

  it("verweigert Aktionen für eine normale Kiosk-Session", async () => {
    isCheckIn.mockReturnValue(false);
    const response = await POST(request({ action: "close" }), context);
    expect(response.status).toBe(404);
    expect(db.patientQuestionnaireSession.updateMany).not.toHaveBeenCalled();
  });

  it("schließt einen zugeordneten Check-in idempotent", async () => {
    const response = await POST(request({ action: "close" }), context);
    expect(await response.json()).toEqual({ ok: true, status: "closed" });
    expect(db.patientQuestionnaireSession.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ kiosk_handoff_status: "waiting" }),
      data: { kiosk_handoff_status: "closed" },
    }));
  });

  it("erzeugt und veröffentlicht den Folgefragebogen atomar mit geerbtem Kontext", async () => {
    const response = await POST(request({
      action: "start_questionnaire",
      selected_block_ids: ["KONTAKT"],
    }), context);
    expect(response.status).toBe(200);
    const responseBody = await response.json();
    expect(responseBody).toEqual({ ok: true, status: "questionnaire_ready" });
    expect(createSession).toHaveBeenCalledWith(expect.objectContaining({
      patientReference: "12345",
      ownerPracticeId: "practice-1",
      createdByKioskDeviceId: "device-1",
      source: "kiosk_direct",
      databaseClient: expect.any(Object),
    }));
    expect(db.patientQuestionnaireSession.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: {
        kiosk_handoff_status: "questionnaire_ready",
        kiosk_follow_up_session_id: "child-1",
      },
    }));
    expect(JSON.stringify(responseBody)).not.toContain("secret");
  });

  it("übernimmt mehrere ausgewählte Blöcke unverändert", async () => {
    const response = await POST(request({
      action: "start_questionnaire",
      selected_block_ids: ["KONTAKT", "IDENTITAET"],
    }), context);
    expect(response.status).toBe(200);
    expect(createSession).toHaveBeenCalledWith(expect.objectContaining({
      selectedBlockIds: ["KONTAKT", "IDENTITAET"],
    }));
  });

  it("meldet ein verlorenes Rennen als Konflikt", async () => {
    db.patientQuestionnaireSession.updateMany.mockResolvedValue({ count: 0 });
    const response = await POST(request({
      action: "start_questionnaire",
      selected_block_ids: ["KONTAKT"],
    }), context);
    expect(response.status).toBe(409);
  });

  it.each([
    ["zwei Folgefragebögen", "start_questionnaire", "start_questionnaire"],
    ["Beenden und Folgefragebogen", "close", "start_questionnaire"],
    ["zwei Beenden-Aktionen", "close", "close"],
  ])("lässt bei %s nur eine Aktion gewinnen", async (_case, firstAction, secondAction) => {
    let claimed = false;
    const claim = jest.fn(async () => {
      if (claimed) return { count: 0 };
      claimed = true;
      return { count: 1 };
    });
    db.patientQuestionnaireSession.updateMany.mockImplementation(claim);
    db.$transaction.mockImplementation(async (callback: (transaction: unknown) => unknown) =>
      callback({ patientQuestionnaireSession: { create: jest.fn(), updateMany: claim } }));

    const makeBody = (action: string) => action === "start_questionnaire"
      ? { action, selected_block_ids: ["KONTAKT"] }
      : { action };
    const responses = await Promise.all([
      POST(request(makeBody(firstAction)), context),
      POST(request(makeBody(secondAction)), context),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
  });
});