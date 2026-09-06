import { NextRequest } from "next/server";
import {
  createKioskSecret,
  hashKioskSecret,
  KIOSK_DEVICE_COOKIE,
  KIOSK_UNLOCK_COOKIE,
  requireQuestionnaireKioskDevice,
  requireUnlockedQuestionnaireKioskDevice,
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

function request(credential = "credential", unlock?: string) {
  const headers = new Headers();
  headers.set("cookie", `${KIOSK_DEVICE_COOKIE}=${credential}${unlock ? `; ${KIOSK_UNLOCK_COOKIE}=${unlock}` : ""}`);
  return new NextRequest("http://localhost/questionnaire-kiosk", { headers });
}

const ACTIVE_DEVICE = {
  id: "device-1",
  practice_id: "practice-1",
  name: "Empfang",
  is_active: true,
  revoked_at: null,
  unlock_token_hash: hashKioskSecret("unlock"),
  unlock_expires_at: new Date(Date.now() + 60_000),
  practice: { is_approved: true, disabled_at: null },
};

describe("Questionnaire Kiosk Auth", () => {
  beforeEach(() => {
    db.findUnique.mockReset();
    db.update.mockReset().mockResolvedValue({});
  });

  it("erzeugt mindestens 256 Bit Zufall und speichert/vergleicht nur dessen Hash", () => {
    const first = createKioskSecret();
    const second = createKioskSecret();
    expect(Buffer.from(first, "base64url")).toHaveLength(32);
    expect(first).not.toBe(second);
    expect(hashKioskSecret(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashKioskSecret(first)).not.toContain(first);
  });

  it("autorisiert ein aktives Gerät über den Credential-Hash", async () => {
    db.findUnique.mockResolvedValue(ACTIVE_DEVICE);
    const result = await requireQuestionnaireKioskDevice(request());
    expect(result.error).toBeNull();
    expect(result.device).toEqual({ deviceId: "device-1", practiceId: "practice-1", deviceName: "Empfang" });
    expect(db.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { credential_hash: hashKioskSecret("credential") } }));
  });

  it.each([
    ["deaktiviert", { is_active: false }],
    ["widerrufen", { revoked_at: new Date() }],
    ["Praxis deaktiviert", { practice: { is_approved: true, disabled_at: new Date() } }],
  ])("weist ein %s Gerät ab", async (_label, patch) => {
    db.findUnique.mockResolvedValue({ ...ACTIVE_DEVICE, ...patch });
    const result = await requireQuestionnaireKioskDevice(request());
    expect(result.device).toBeNull();
    expect(result.error?.status).toBe(401);
  });

  it("verlangt für geschützte Aktionen einen gültigen, nicht abgelaufenen Unlock", async () => {
    db.findUnique.mockResolvedValue(ACTIVE_DEVICE);
    expect((await requireUnlockedQuestionnaireKioskDevice(request("credential", "unlock"))).device).not.toBeNull();
    db.findUnique.mockResolvedValue({ ...ACTIVE_DEVICE, unlock_expires_at: new Date(Date.now() - 1) });
    expect((await requireUnlockedQuestionnaireKioskDevice(request("credential", "unlock"))).device).toBeNull();
  });
});
