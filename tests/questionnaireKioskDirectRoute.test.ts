import { NextRequest } from "next/server";
import { POST } from "@/app/api/questionnaire-kiosk/direct/route";

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
  return new NextRequest("http://localhost/api/questionnaire-kiosk/direct", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/questionnaire-kiosk/direct", () => {
  beforeEach(() => {
    guard.mockReset().mockResolvedValue({ device: { deviceId: "device-1", practiceId: "practice-1", deviceName: "Empfang" }, error: null });
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

  it("erzeugt ausschließlich eine practice-owned Kiosk-Session", async () => {
    const response = await POST(request({ patient_reference: "PAT-1", selected_block_ids: ["KONTAKT"], language: "de", selected_confirmation_ids: [] }));
    expect(response.status).toBe(200);
    const data = db.patientQuestionnaireSession.create.mock.calls[0][0].data;
    expect(data).toEqual(expect.objectContaining({
      owner_account_id: null,
      owner_practice_id: "practice-1",
      created_by_kiosk_device_id: "device-1",
      source: "kiosk_direct",
      inquiry_session_id: null,
      patient_reference: "PAT-1",
    }));
  });

  it("erzeugt keinen normalen Kiosk-Fragebogen ohne Patientenreferenz", async () => {
    const response = await POST(request({
      selected_block_ids: ["KONTAKT"],
      language: "de",
      selected_confirmation_ids: [],
    }));
    expect(response.status).toBe(400);
    expect(db.patientQuestionnaireSession.create).not.toHaveBeenCalled();
  });

  it.each(["practice_id", "owner_account_id", "created_by_kiosk_device_id", "inquiry_session_id", "mode", "message", "link"])("weist das kontrollierte Feld %s ab", async (field) => {
    const response = await POST(request({ patient_reference: "PAT-1", selected_block_ids: ["KONTAKT"], selected_confirmation_ids: [], [field]: "attacker" }));
    expect(response.status).toBe(400);
    expect(db.patientQuestionnaireSession.create).not.toHaveBeenCalled();
  });
});
