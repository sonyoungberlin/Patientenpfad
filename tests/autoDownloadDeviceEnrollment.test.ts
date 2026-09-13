import { NextRequest } from "next/server";
import {
  createAutoDownloadEnrollmentCode,
  enrollAutoDownloadDevice,
  hashAutoDownloadEnrollmentCode,
} from "@/lib/autoDownloadDevices/enrollment";
import { POST } from "@/app/api/auto-download-devices/enroll/route";

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

function request(code: string) {
  return new NextRequest("http://localhost/api/auto-download-devices/enroll", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
}

describe("Auto-Download-Geräte-Enrollment", () => {
  let code: string;

  beforeEach(() => {
    code = createAutoDownloadEnrollmentCode();
    db.findUnique.mockReset().mockResolvedValue({
      id: "device-1",
      name: "Praxisserver",
    });
    db.updateMany.mockReset().mockResolvedValue({ count: 1 });
  });

  it("löst einen gültigen Code einmalig ein und gibt das Credential nur zurück", async () => {
    const result = await enrollAutoDownloadDevice(code);

    expect(result).toEqual({
      deviceId: "device-1",
      deviceName: "Praxisserver",
      credential: expect.stringMatching(/^device-1\.[A-Za-z0-9_-]{43}$/),
    });
    const update = db.updateMany.mock.calls[0][0];
    expect(update.where).toEqual(expect.objectContaining({
      enrollment_token_hash: hashAutoDownloadEnrollmentCode(code),
      enrollment_expires_at: { gt: expect.any(Date) },
      enrollment_used_at: null,
      credential_hash: null,
      is_active: true,
      revoked_at: null,
      practice: { is: { is_approved: true, disabled_at: null } },
    }));
    expect(update.data.credential_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(update.data).not.toHaveProperty("credential");
    expect(update.data.enrollment_token_hash).toBeNull();
    expect(update.data.enrollment_used_at).toEqual(expect.any(Date));
    expect(update.data.credential_hash).not.toContain(
      result!.credential.split(".")[1],
    );
  });

  it("weist ein zweites Einlösen desselben Codes ab", async () => {
    db.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    expect(await enrollAutoDownloadDevice(code)).not.toBeNull();
    expect(await enrollAutoDownloadDevice(code)).toBeNull();
  });

  it("weist abgelaufene Codes über die atomare Ablaufbedingung ab", async () => {
    const now = new Date("2026-09-13T12:00:00.000Z");
    db.updateMany.mockResolvedValue({ count: 0 });

    expect(await enrollAutoDownloadDevice(code, now)).toBeNull();
    expect(db.updateMany.mock.calls[0][0].where.enrollment_expires_at).toEqual({
      gt: now,
    });
  });

  it("lässt bei parallelem Einlösen höchstens einen Gewinner zu", async () => {
    let call = 0;
    db.updateMany.mockImplementation(async () => ({ count: call++ === 0 ? 1 : 0 }));

    const results = await Promise.all([
      enrollAutoDownloadDevice(code),
      enrollAutoDownloadDevice(code),
    ]);

    expect(results.filter((result) => result !== null)).toHaveLength(1);
  });

  it("liefert das Credential über den Endpoint mit no-store genau einmal", async () => {
    const first = await POST(request(code));
    db.updateMany.mockResolvedValue({ count: 0 });
    const second = await POST(request(code));

    expect(first.status).toBe(200);
    expect(first.headers.get("cache-control")).toBe("no-store");
    expect((await first.json()).credential).toMatch(/^device-1\.[A-Za-z0-9_-]{43}$/);
    expect(second.status).toBe(401);
    expect(await second.json()).not.toHaveProperty("credential");
  });
});
