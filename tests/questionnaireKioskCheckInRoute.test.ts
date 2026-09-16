import { NextRequest } from "next/server";
import { POST } from "@/app/api/questionnaire-kiosk/check-in/route";

jest.mock("@/lib/questionnaireKiosk/auth", () => ({
  requireUnlockedQuestionnaireKioskDevice: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    practice: { findUnique: jest.fn() },
    patientQuestionnaireSession: { create: jest.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { requireUnlockedQuestionnaireKioskDevice } from "@/lib/questionnaireKiosk/auth";

const guard = requireUnlockedQuestionnaireKioskDevice as jest.Mock;
const db = prisma as unknown as {
  practice: { findUnique: jest.Mock };
  patientQuestionnaireSession: { create: jest.Mock };
};

function request(body: unknown) {
  return new NextRequest("http://localhost/api/questionnaire-kiosk/check-in", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/questionnaire-kiosk/check-in", () => {
  beforeEach(() => {
    guard.mockReset().mockResolvedValue({
      device: { deviceId: "device-1", practiceId: "practice-1", deviceName: "Empfang" },
      error: null,
    });
    db.practice.findUnique.mockReset().mockResolvedValue({
      questionnaire_confirmation_text_1: null,
      questionnaire_confirmation_text_2: null,
      questionnaire_confirmation_text_3: null,
      questionnaire_confirmation_send_copy_1: false,
      questionnaire_confirmation_send_copy_2: false,
      questionnaire_confirmation_send_copy_3: false,
      legal_profile: null,
    });
    db.patientQuestionnaireSession.create.mockReset().mockResolvedValue({ id: "session-1" });
  });

  it("erzeugt einen unzugeordneten Kiosk-Check-in mit exakt KONTAKT und CHECK_IN", async () => {
    const response = await POST(request({}));

    expect(response.status).toBe(200);
    const responseBody = await response.json();
    expect(responseBody).toEqual(expect.objectContaining({
      sessionId: "session-1",
      link: expect.stringMatching(/^http:\/\/localhost\/q\/.+$/),
    }));
    const data = db.patientQuestionnaireSession.create.mock.calls[0][0].data;
    expect(data).toEqual(expect.objectContaining({
      owner_account_id: null,
      owner_practice_id: "practice-1",
      created_by_kiosk_device_id: "device-1",
      source: "kiosk_direct",
      inquiry_session_id: null,
      patient_reference: null,
      kiosk_handoff_status: "waiting",
      patient_language: "de",
      selected_block_ids: ["KONTAKT", "CHECK_IN"],
    }));
    expect(data.frozen_blocks.map((block: { id: string }) => block.id)).toEqual([
      "KONTAKT",
      "CHECK_IN",
    ]);
    expect(data.frozen_blocks.map((block: { id: string }) => block.id))
      .not.toContain("KURZANAMNESE");
  });

  it.each([
    "selected_block_ids",
    "selected_confirmation_ids",
    "practice_id",
    "owner_account_id",
    "created_by_kiosk_device_id",
    "inquiry_session_id",
    "mode",
    "message",
    "link",
  ])("weist das kontrollierte Feld %s ab", async (field) => {
    const response = await POST(request({
      [field]: "attacker",
    }));

    expect(response.status).toBe(400);
    expect(db.patientQuestionnaireSession.create).not.toHaveBeenCalled();
  });

  it("weist eine vom Client gesetzte Patientenreferenz ab", async () => {
    const response = await POST(request({ patient_reference: "PAT-1" }));

    expect(response.status).toBe(400);
    expect(db.patientQuestionnaireSession.create).not.toHaveBeenCalled();
  });
});