import { NextRequest } from "next/server";
import { POST } from "@/app/api/practice/questionnaire-kiosk-devices/route";

jest.mock("@/lib/authz", () => ({ requirePracticeRole: jest.fn() }));
jest.mock("@/lib/password", () => ({ hashPassword: jest.fn().mockResolvedValue("scrypt-hash") }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    questionnaireKioskDevice: { create: jest.fn() },
    session: { deleteMany: jest.fn() },
  },
}));

import { requirePracticeRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { KIOSK_DEVICE_COOKIE } from "@/lib/questionnaireKiosk/auth";

const authorize = requirePracticeRole as jest.Mock;
const db = prisma as unknown as {
  questionnaireKioskDevice: { create: jest.Mock };
  session: { deleteMany: jest.Mock };
};

function request(body: unknown) {
  return new NextRequest("http://localhost/api/practice/questionnaire-kiosk-devices", {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: "pp_session=owner-token" },
    body: JSON.stringify(body),
  });
}

describe("Kiosk-Geräteaktivierung", () => {
  beforeEach(() => {
    authorize.mockReset().mockResolvedValue({ account: { id: "owner-1", current_practice: { id: "practice-1" } }, error: null });
    db.questionnaireKioskDevice.create.mockReset().mockResolvedValue({ id: "device-1", name: "Empfang" });
    db.session.deleteMany.mockReset().mockResolvedValue({ count: 1 });
  });

  it("speichert nur Credential- und PIN-Hashes und invalidiert die Owner-Session", async () => {
    const response = await POST(request({ name: "Empfang", pin: "123456", pin_confirmation: "123456" }));
    expect(response.status).toBe(201);
    const data = db.questionnaireKioskDevice.create.mock.calls[0][0].data;
    expect(data.practice_id).toBe("practice-1");
    expect(data.created_by_account_id).toBe("owner-1");
    expect(data.pin_hash).toBe("scrypt-hash");
    expect(data.credential_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(data).not.toHaveProperty("credential");
    expect(db.session.deleteMany).toHaveBeenCalledWith({ where: { token: "owner-token" } });
    expect(response.headers.get("set-cookie")).toContain(`${KIOSK_DEVICE_COOKIE}=`);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("überlässt die Rollenentscheidung ausschließlich dem OWNER-Guard", async () => {
    authorize.mockResolvedValue({ account: null, error: new Response(null, { status: 403 }) });
    const response = await POST(request({ name: "Empfang", pin: "123456", pin_confirmation: "123456" }));
    expect(response.status).toBe(403);
    expect(db.questionnaireKioskDevice.create).not.toHaveBeenCalled();
  });

  it("weist ungültige oder abweichende PINs ab", async () => {
    const response = await POST(request({ name: "Empfang", pin: "12345", pin_confirmation: "12346" }));
    expect(response.status).toBe(400);
    expect(db.questionnaireKioskDevice.create).not.toHaveBeenCalled();
  });
});
