import { NextRequest } from "next/server";
import { POST as unlock } from "@/app/api/questionnaire-kiosk/unlock/route";
import { POST as lock } from "@/app/api/questionnaire-kiosk/lock/route";

jest.mock("@/lib/password", () => ({ verifyPassword: jest.fn() }));
jest.mock("@/lib/questionnaireKiosk/auth", () => {
  const actual = jest.requireActual("@/lib/questionnaireKiosk/auth");
  return { ...actual, requireQuestionnaireKioskDevice: jest.fn(), invalidateKioskUnlock: jest.fn() };
});
jest.mock("@/lib/prisma", () => ({ prisma: { questionnaireKioskDevice: { findUnique: jest.fn(), update: jest.fn() } } }));

import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { invalidateKioskUnlock, requireQuestionnaireKioskDevice } from "@/lib/questionnaireKiosk/auth";

const guard = requireQuestionnaireKioskDevice as jest.Mock;
const verify = verifyPassword as jest.Mock;
const invalidate = invalidateKioskUnlock as jest.Mock;
const db = prisma.questionnaireKioskDevice as unknown as { findUnique: jest.Mock; update: jest.Mock };
const DEVICE = { deviceId: "device-1", practiceId: "practice-1", deviceName: "Empfang" };

function request(pin = "123456") {
  return new NextRequest("http://localhost/api/questionnaire-kiosk/unlock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
}

describe("Kiosk PIN und Lock", () => {
  beforeEach(() => {
    guard.mockReset().mockResolvedValue({ device: DEVICE, error: null });
    verify.mockReset();
    invalidate.mockReset().mockResolvedValue(undefined);
    db.findUnique.mockReset().mockResolvedValue({ pin_hash: "hash", failed_pin_attempts: 0, locked_until: null });
    db.update.mockReset().mockResolvedValue({ failed_pin_attempts: 1 });
  });

  it("setzt bei korrekter PIN einen gehashten absoluten 15-Minuten-Unlock", async () => {
    verify.mockResolvedValue(true);
    const before = Date.now();
    const response = await unlock(request());
    expect(response.status).toBe(200);
    const data = db.update.mock.calls[0][0].data;
    expect(data.unlock_token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(data.unlock_expires_at.getTime()).toBeGreaterThanOrEqual(before + 15 * 60 * 1000);
    expect(response.headers.get("set-cookie")).toContain("pp_questionnaire_kiosk_unlock=");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("zählt Fehlversuche persistent und sperrt beim fünften Versuch", async () => {
    verify.mockResolvedValue(false);
    db.findUnique.mockResolvedValue({ pin_hash: "hash", failed_pin_attempts: 4, locked_until: null });
    db.update.mockResolvedValueOnce({ failed_pin_attempts: 5 }).mockResolvedValueOnce({});
    const response = await unlock(request("999999"));
    expect(response.status).toBe(429);
    expect(db.update).toHaveBeenNthCalledWith(1, expect.objectContaining({ data: expect.objectContaining({ failed_pin_attempts: { increment: 1 }, unlock_token_hash: null }) }));
    expect(db.update).toHaveBeenNthCalledWith(2, expect.objectContaining({ data: expect.objectContaining({ failed_pin_attempts: 0, locked_until: expect.any(Date), unlock_token_hash: null }) }));
  });

  it("weist während der Sperrzeit auch eine korrekte PIN ohne Hashprüfung ab", async () => {
    db.findUnique.mockResolvedValue({ pin_hash: "hash", failed_pin_attempts: 0, locked_until: new Date(Date.now() + 60_000) });
    const response = await unlock(request());
    expect(response.status).toBe(429);
    expect(verify).not.toHaveBeenCalled();
  });

  it("invalidiert beim manuellen Sperren Unlock in DB und Cookie", async () => {
    const response = await lock(new NextRequest("http://localhost/api/questionnaire-kiosk/lock", { method: "POST" }));
    expect(invalidate).toHaveBeenCalledWith("device-1");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});