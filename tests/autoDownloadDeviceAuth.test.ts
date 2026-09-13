import { NextRequest } from "next/server";
import {
  authenticateAutoDownloadDevice,
  requireAutoDownloadDevice,
} from "@/lib/autoDownloadDevices/auth";
import {
  createAutoDownloadDeviceSecret,
  hashAutoDownloadDeviceSecret,
} from "@/lib/autoDownloadDevices/credentials";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    practiceAutoDownloadDevice: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const db = prisma.practiceAutoDownloadDevice as unknown as {
  findUnique: jest.Mock;
  updateMany: jest.Mock;
};
const SECRET = createAutoDownloadDeviceSecret();
const ACTIVE_DEVICE = {
  id: "device-1",
  practice_id: "practice-1",
  name: "Praxisserver",
  credential_hash: hashAutoDownloadDeviceSecret(SECRET),
  is_active: true,
  revoked_at: null,
  practice: { is_approved: true, disabled_at: null },
};

function request(credential = `device-1.${SECRET}`, practiceId?: string) {
  const headers = new Headers({ authorization: `Device ${credential}` });
  if (practiceId) headers.set("x-practice-id", practiceId);
  return new NextRequest("http://localhost/api/unused", { headers });
}

describe("Auto-Download-Geräteauthentifizierung", () => {
  beforeEach(() => {
    db.findUnique.mockReset().mockResolvedValue(ACTIVE_DEVICE);
    db.updateMany.mockReset().mockResolvedValue({ count: 1 });
  });

  it("erzeugt 32 Byte Zufall und persistierbare SHA-256-Hashes", () => {
    const first = createAutoDownloadDeviceSecret();
    const second = createAutoDownloadDeviceSecret();

    expect(Buffer.from(first, "base64url")).toHaveLength(32);
    expect(first).not.toBe(second);
    expect(hashAutoDownloadDeviceSecret(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashAutoDownloadDeviceSecret(first)).not.toContain(first);
  });

  it("authentifiziert ein korrektes Credential und aktualisiert last_seen_at", async () => {
    const identity = await authenticateAutoDownloadDevice(request());

    expect(identity).toEqual({
      deviceId: "device-1",
      practiceId: "practice-1",
      deviceName: "Praxisserver",
    });
    expect(db.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "device-1" },
    }));
    expect(db.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { last_seen_at: expect.any(Date) },
    }));
  });

  it("übernimmt die Praxis ausschließlich aus dem Gerätedatensatz", async () => {
    const identity = await authenticateAutoDownloadDevice(
      request(undefined, "foreign-practice"),
    );

    expect(identity?.practiceId).toBe("practice-1");
  });

  it("weist falsches Credential und falsche Device-ID ab", async () => {
    expect(await authenticateAutoDownloadDevice(
      request(`device-1.${createAutoDownloadDeviceSecret()}`),
    )).toBeNull();

    db.findUnique.mockResolvedValueOnce(null);
    expect(await authenticateAutoDownloadDevice(
      request(`unknown.${SECRET}`),
    )).toBeNull();
    expect(db.updateMany).not.toHaveBeenCalled();
  });

  it.each([
    ["deaktiviertes Gerät", { is_active: false }],
    ["widerrufenes Gerät", { revoked_at: new Date() }],
    ["nicht freigegebene Praxis", { practice: { is_approved: false, disabled_at: null } }],
    ["deaktivierte Praxis", { practice: { is_approved: true, disabled_at: new Date() } }],
  ])("weist %s ab", async (_label, patch) => {
    db.findUnique.mockResolvedValue({ ...ACTIVE_DEVICE, ...patch });

    expect(await authenticateAutoDownloadDevice(request())).toBeNull();
    expect(db.updateMany).not.toHaveBeenCalled();
  });

  it("liefert für ungültige Authentifizierung eine neutrale 401-Antwort", async () => {
    const result = await requireAutoDownloadDevice(
      new NextRequest("http://localhost/api/unused"),
    );

    expect(result.device).toBeNull();
    expect(result.error?.status).toBe(401);
  });
});
