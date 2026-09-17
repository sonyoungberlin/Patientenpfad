import { NextRequest } from "next/server";
import { POST } from "@/app/api/questionnaire/[id]/public-handoff/route";

jest.mock("@/lib/authz", () => ({ requireQuestionnaireInboxAccess: jest.fn() }));
jest.mock("@/lib/questionnaire/practiceScope", () => ({ ownsSession: jest.fn(() => true) }));
jest.mock("@/lib/questionnaire/publicCheckIn", () => ({ isPublicCheckInSession: jest.fn(() => true) }));
jest.mock("@/lib/questionnaire/createSession", () => ({ createQuestionnaireSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    patientQuestionnaireSession: { findUnique: jest.fn(), updateMany: jest.fn() },
    publicQuestionnaireHandoff: { updateMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

import { requireQuestionnaireInboxAccess } from "@/lib/authz";
import { createQuestionnaireSession } from "@/lib/questionnaire/createSession";
import { prisma } from "@/lib/prisma";

const auth = requireQuestionnaireInboxAccess as jest.Mock;
const createSession = createQuestionnaireSession as jest.Mock;
const db = prisma as unknown as {
  patientQuestionnaireSession: { findUnique: jest.Mock; updateMany: jest.Mock };
  publicQuestionnaireHandoff: { updateMany: jest.Mock };
  $transaction: jest.Mock;
};
const parent = {
  owner_account_id: null, owner_practice_id: "practice-1", created_by_kiosk_device_id: null,
  patient_reference: "4711", patient_language: "de", selected_block_ids: ["KONTAKT", "CHECK_IN"],
  frozen_blocks: [{ id: "KONTAKT", questions: [] }, { id: "CHECK_IN", questions: [] }],
  source: "public_check_in", session_kind: "patient_communication", context: "patient",
  status: "completed", deleted_at: null,
  public_check_in_handoff: { status: "waiting", expires_at: new Date(Date.now() + 60_000), follow_up_session_id: null },
};
const context = { params: Promise.resolve({ id: "parent-1" }) };
function request(action: string) {
  return new NextRequest("http://localhost/api/questionnaire/parent-1/public-handoff", {
    method: "POST", headers: { origin: "http://localhost", "content-type": "application/json" },
    body: JSON.stringify(action === "start_questionnaire"
      ? { action, selected_block_ids: ["KONTAKT", "IDENTITAET"] } : { action }),
  });
}

describe("POST public questionnaire handoff", () => {
  beforeEach(() => {
    auth.mockReset().mockResolvedValue({ account: { id: "account-1", current_practice: { id: "practice-1" } }, error: null });
    db.patientQuestionnaireSession.findUnique.mockReset().mockResolvedValue(parent);
    db.patientQuestionnaireSession.updateMany.mockReset().mockResolvedValue({ count: 1 });
    db.publicQuestionnaireHandoff.updateMany.mockReset().mockResolvedValue({ count: 1 });
    createSession.mockReset().mockResolvedValue({ sessionId: "child-1", token: "secret", tokenLink: "secret-link" });
    db.$transaction.mockReset().mockImplementation(async (callback) => callback({
      patientQuestionnaireSession: {
        create: jest.fn(),
        updateMany: db.patientQuestionnaireSession.updateMany,
      },
      publicQuestionnaireHandoff: { updateMany: db.publicQuestionnaireHandoff.updateMany },
    }));
  });

  it("schließt genau einmal", async () => {
    expect((await POST(request("close"), context)).status).toBe(200);
    db.publicQuestionnaireHandoff.updateMany.mockResolvedValue({ count: 0 });
    expect((await POST(request("close"), context)).status).toBe(409);
  });

  it("erzeugt ein device-freies Child mit geerbtem Kontext ohne Token-Response", async () => {
    const response = await POST(request("start_questionnaire"), context);
    expect(response.status).toBe(200);
    expect(createSession).toHaveBeenCalledWith(expect.objectContaining({
      selectedBlockIds: ["KONTAKT", "IDENTITAET"], patientReference: "4711",
      patientLanguage: "de", ownerPracticeId: "practice-1", source: "public_check_in",
    }));
    expect(createSession.mock.calls[0][0].createdByKioskDeviceId).toBeUndefined();
    expect(JSON.stringify(await response.json())).not.toContain("secret");
  });

  it.each([
    ["zwei Follow-ups", "start_questionnaire", "start_questionnaire"],
    ["Close gegen Follow-up", "close", "start_questionnaire"],
    ["zwei Close", "close", "close"],
  ])("lässt bei %s nur einen Gewinner zu", async (_label, first, second) => {
    let claimed = false;
    const claim = jest.fn(async () => claimed ? { count: 0 } : (claimed = true, { count: 1 }));
    db.publicQuestionnaireHandoff.updateMany.mockImplementation(claim);
    db.$transaction.mockImplementation(async (callback) => callback({
      patientQuestionnaireSession: {
        create: jest.fn(),
        updateMany: db.patientQuestionnaireSession.updateMany,
      },
      publicQuestionnaireHandoff: { updateMany: claim },
    }));
    const responses = await Promise.all([POST(request(first), context), POST(request(second), context)]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
  });

  it("rollt das Child zurück, wenn ein paralleles Löschen den Parent-Claim gewinnt", async () => {
    db.patientQuestionnaireSession.updateMany.mockResolvedValue({ count: 0 });
    const response = await POST(request("start_questionnaire"), context);
    expect(response.status).toBe(409);
    expect(createSession).not.toHaveBeenCalled();
    expect(db.publicQuestionnaireHandoff.updateMany).not.toHaveBeenCalled();
  });

  it("verweigert Aktionen vor Assignment, nach Ablauf und Cross-Origin", async () => {
    db.patientQuestionnaireSession.findUnique.mockResolvedValue({ ...parent, patient_reference: null });
    expect((await POST(request("close"), context)).status).toBe(404);
    db.patientQuestionnaireSession.findUnique.mockResolvedValue({ ...parent, public_check_in_handoff: { ...parent.public_check_in_handoff, expires_at: new Date(0) } });
    expect((await POST(request("close"), context)).status).toBe(404);
    const evil = request("close");
    evil.headers.set("origin", "https://evil.test");
    expect((await POST(evil, context)).status).toBe(404);
  });
});