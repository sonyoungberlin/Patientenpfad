import { NextRequest } from "next/server";
import { GET } from "@/app/api/questionnaire-kiosk/check-in/[id]/handoff/route";

jest.mock("@/lib/questionnaireKiosk/auth", () => ({
  requireQuestionnaireKioskDevice: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: { patientQuestionnaireSession: { findFirst: jest.fn() } },
}));

import { prisma } from "@/lib/prisma";
import { requireQuestionnaireKioskDevice } from "@/lib/questionnaireKiosk/auth";

const auth = requireQuestionnaireKioskDevice as jest.Mock;
const findFirst = prisma.patientQuestionnaireSession.findFirst as jest.Mock;
const request = new NextRequest("http://localhost/api/questionnaire-kiosk/check-in/check-in-1/handoff");
const context = { params: Promise.resolve({ id: "check-in-1" }) };
const usableFollowUp = {
  token: "secret-token",
  token_expires_at: new Date(Date.now() + 60_000),
  status: "pending",
  deleted_at: null,
  owner_practice_id: "practice-1",
  created_by_kiosk_device_id: "device-1",
};

describe("GET kiosk check-in handoff", () => {
  beforeEach(() => {
    auth.mockReset().mockResolvedValue({
      device: { deviceId: "device-1", practiceId: "practice-1", deviceName: "Kiosk" },
      error: null,
    });
    findFirst.mockReset();
  });

  it("bindet den Check-in an Praxis und Gerät", async () => {
    findFirst.mockResolvedValue(null);
    const response = await GET(request, context);
    expect(response.status).toBe(404);
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: "check-in-1",
        owner_practice_id: "practice-1",
        created_by_kiosk_device_id: "device-1",
      }),
    }));
  });

  it("verweigert Polling ohne registriertes Kioskgerät", async () => {
    auth.mockResolvedValue({
      device: null,
      error: new Response(JSON.stringify({ ok: false }), { status: 401 }),
    });
    const response = await GET(request, context);
    expect(response.status).toBe(401);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("liefert bei Reload den Zustand waiting unverändert", async () => {
    findFirst.mockResolvedValue({
      kiosk_handoff_status: "waiting",
      kiosk_follow_up_session: null,
    });
    const response = await GET(request, context);
    expect(await response.json()).toEqual({ ok: true, status: "waiting" });
  });

  it("liefert bei Reload den Zustand closed unverändert", async () => {
    findFirst.mockResolvedValue({
      kiosk_handoff_status: "closed",
      kiosk_follow_up_session: null,
    });
    const response = await GET(request, context);
    expect(await response.json()).toEqual({ ok: true, status: "closed" });
  });

  it("liefert nur dem Kiosk den Link zum bereitgestellten Folgefragebogen", async () => {
    findFirst.mockResolvedValue({
      kiosk_handoff_status: "questionnaire_ready",
      kiosk_follow_up_session: usableFollowUp,
    });
    const response = await GET(request, context);
    expect(await response.json()).toEqual({
      ok: true,
      status: "questionnaire_ready",
      link: "/q/secret-token",
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it.each([
    ["fehlendem Token", { token: null }],
    ["fehlendem Ablaufzeitpunkt", { token_expires_at: null }],
    ["abgelaufenem Token", { token_expires_at: new Date(Date.now() - 60_000) }],
    ["abgeschlossener Session", { status: "completed" }],
    ["gelöschter Session", { deleted_at: new Date() }],
    ["falscher Practice", { owner_practice_id: "practice-2" }],
    ["falschem Kioskgerät", { created_by_kiosk_device_id: "device-2" }],
  ])("fällt bei %s sicher auf closed zurück", async (_case, overrides) => {
    findFirst.mockResolvedValue({
      kiosk_handoff_status: "questionnaire_ready",
      kiosk_follow_up_session: { ...usableFollowUp, ...overrides },
    });
    const response = await GET(request, context);
    expect(await response.json()).toEqual({ ok: true, status: "closed" });
  });

  it("fällt bei fehlender Folge-Session sicher auf closed zurück", async () => {
    findFirst.mockResolvedValue({
      kiosk_handoff_status: "questionnaire_ready",
      kiosk_follow_up_session: null,
    });
    const response = await GET(request, context);
    expect(await response.json()).toEqual({ ok: true, status: "closed" });
  });
});