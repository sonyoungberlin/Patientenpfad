import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/practice/questionnaire-kiosk-devices/[id]/route";

jest.mock("@/lib/authz", () => ({ requirePracticeRole: jest.fn() }));
jest.mock("@/lib/password", () => ({ hashPassword: jest.fn().mockResolvedValue("new-pin-hash") }));
jest.mock("@/lib/prisma", () => ({ prisma: { questionnaireKioskDevice: { findFirst: jest.fn(), update: jest.fn() } } }));

import { requirePracticeRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

const authorize = requirePracticeRole as jest.Mock;
const db = prisma.questionnaireKioskDevice as unknown as { findFirst: jest.Mock; update: jest.Mock };

function request(action: string, pin?: string) {
  return new NextRequest("http://localhost/api/practice/questionnaire-kiosk-devices/device-1", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, pin }) });
}

describe("Kiosk-Geräteverwaltung", () => {
  beforeEach(() => {
    authorize.mockReset().mockResolvedValue({ account: { current_practice: { id: "practice-1" } }, error: null });
    db.findFirst.mockReset().mockResolvedValue({ id: "device-1" });
    db.update.mockReset().mockResolvedValue({});
  });

  it("scopt jede Aktion auf Gerät und aktuelle Practice", async () => {
    await PATCH(request("lock"), { params: Promise.resolve({ id: "device-1" }) });
    expect(db.findFirst).toHaveBeenCalledWith({ where: { id: "device-1", practice_id: "practice-1" } });
  });

  it("invalidiert beim PIN-Wechsel den Unlock und setzt Lockout zurück", async () => {
    const response = await PATCH(request("change_pin", "654321"), { params: Promise.resolve({ id: "device-1" }) });
    expect(response.status).toBe(200);
    expect(db.update).toHaveBeenCalledWith({ where: { id: "device-1" }, data: { pin_hash: "new-pin-hash", failed_pin_attempts: 0, locked_until: null, unlock_token_hash: null, unlock_expires_at: null } });
  });

  it("widerruft dauerhaft und invalidiert den Unlock", async () => {
    await PATCH(request("revoke"), { params: Promise.resolve({ id: "device-1" }) });
    expect(db.update).toHaveBeenCalledWith({ where: { id: "device-1" }, data: { is_active: false, revoked_at: expect.any(Date), unlock_token_hash: null, unlock_expires_at: null } });
  });

  it("gibt für eine fremde Practice dieselbe 404 wie für unbekannte IDs zurück", async () => {
    db.findFirst.mockResolvedValue(null);
    const response = await PATCH(request("lock"), { params: Promise.resolve({ id: "foreign-device" }) });
    expect(response.status).toBe(404);
    expect(db.update).not.toHaveBeenCalled();
  });
});