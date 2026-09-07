import { NextRequest } from "next/server";
import { GET } from "@/app/api/questionnaire-kiosk-recovery/route";
import {
  hashKioskSecret,
  KIOSK_DEVICE_COOKIE,
  KIOSK_UNLOCK_COOKIE,
} from "@/lib/questionnaireKiosk/auth";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    questionnaireKioskDevice: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const db = prisma.questionnaireKioskDevice as unknown as {
  findUnique: jest.Mock;
  update: jest.Mock;
};

const ACTIVE_DEVICE = {
  id: "device-1",
  practice_id: "practice-1",
  name: "Empfang",
  is_active: true,
  revoked_at: null,
  unlock_token_hash: null,
  unlock_expires_at: null,
  capabilities: ["questionnaires"],
  practice: { is_approved: true, disabled_at: null },
};

function request(credential = "credential") {
  return new NextRequest("http://localhost/api/questionnaire-kiosk-recovery", {
    headers: {
      cookie: `${KIOSK_DEVICE_COOKIE}=${credential}; ${KIOSK_UNLOCK_COOKIE}=unlock`,
    },
  });
}

describe("Questionnaire Kiosk Recovery", () => {
  beforeEach(() => {
    db.findUnique.mockReset();
    db.update.mockReset().mockResolvedValue({});
  });

  it("behält bei einem gültigen aktiven Gerät beide Cookies und die Kiosk-Isolation bei", async () => {
    db.findUnique.mockResolvedValue(ACTIVE_DEVICE);

    const response = await GET(request());

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/questionnaire-kiosk/lock");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(db.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { credential_hash: hashKioskSecret("credential") } }),
    );
  });

  it.each([
    ["deaktiviertes", { ...ACTIVE_DEVICE, is_active: false }],
    ["widerrufenes", { ...ACTIVE_DEVICE, revoked_at: new Date() }],
    ["nicht existentes", null],
  ])("bereinigt ein %s Gerät und leitet zum normalen Einstieg", async (_label, device) => {
    db.findUnique.mockResolvedValue(device);

    const response = await GET(request());

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/");
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${KIOSK_DEVICE_COOKIE}=`);
    expect(setCookie).toContain(`${KIOSK_UNLOCK_COOKIE}=`);
    expect(setCookie.match(/Max-Age=0/g)).toHaveLength(2);
  });

  it("bereinigt einen ungültigen Device-Cookie", async () => {
    db.findUnique.mockResolvedValue(null);

    const response = await GET(request("invalid-credential"));

    expect(response.headers.get("location")).toBe("http://localhost/");
    expect(response.headers.get("set-cookie")).toContain(`${KIOSK_DEVICE_COOKIE}=`);
    expect(db.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { credential_hash: hashKioskSecret("invalid-credential") } }),
    );
  });
});