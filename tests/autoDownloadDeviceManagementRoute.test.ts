import { PracticeRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import {
  GET,
  POST,
} from "@/app/api/practice/auto-download-devices/route";
import { PATCH } from "@/app/api/practice/auto-download-devices/[id]/route";

jest.mock("@/lib/authz", () => ({ requirePracticeRole: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    practiceAutoDownloadDevice: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { requirePracticeRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

const authorize = requirePracticeRole as jest.Mock;
const db = prisma.practiceAutoDownloadDevice as unknown as {
  create: jest.Mock;
  findFirst: jest.Mock;
  findMany: jest.Mock;
  update: jest.Mock;
};

function account(role: PracticeRole) {
  return {
    id: "account-1",
    current_practice: {
      id: "practice-1",
      is_approved: true,
      disabled_at: null,
    },
    memberships: [{ practice_id: "practice-1", role }],
  };
}

function collectionRequest(method: "GET" | "POST", body?: object) {
  return new NextRequest("http://localhost/api/practice/auto-download-devices", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function deviceRequest(action: string) {
  return new NextRequest(
    "http://localhost/api/practice/auto-download-devices/device-1",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    },
  );
}

describe("Auto-Download-Geräteverwaltung", () => {
  beforeEach(() => {
    authorize.mockReset().mockResolvedValue({
      account: account(PracticeRole.OWNER),
      error: null,
    });
    db.create.mockReset().mockResolvedValue({
      id: "device-1",
      name: "Praxisserver",
      is_active: true,
      created_at: new Date("2026-09-13T10:00:00.000Z"),
    });
    db.findMany.mockReset().mockResolvedValue([]);
    db.findFirst.mockReset().mockResolvedValue({ id: "device-1", revoked_at: null });
    db.update.mockReset().mockResolvedValue({});
  });

  it.each([PracticeRole.OWNER, PracticeRole.ADMIN])(
    "%s kann ein praxisgebundenes Gerät mit kurzlebigem Einmalcode anlegen",
    async (role) => {
      authorize.mockResolvedValue({ account: account(role), error: null });

      const response = await POST(collectionRequest("POST", {
        name: " Praxisserver ",
        practiceId: "foreign-practice",
      }));
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(body.enrollmentCode).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(db.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          practice_id: "practice-1",
          name: "Praxisserver",
          created_by_account_id: "account-1",
          enrollment_token_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
          enrollment_expires_at: expect.any(Date),
        }),
      }));
      expect(JSON.stringify(db.create.mock.calls[0][0].data)).not.toContain(
        body.enrollmentCode,
      );
    },
  );

  it("weist Benutzer ohne OWNER-/ADMIN-Rolle ab", async () => {
    authorize.mockResolvedValue({
      account: null,
      error: NextResponse.json({ ok: false }, { status: 403 }),
    });

    const response = await POST(collectionRequest("POST", { name: "Gerät" }));

    expect(response.status).toBe(403);
    expect(db.create).not.toHaveBeenCalled();
    expect(authorize.mock.calls[0][1]).toEqual([
      PracticeRole.OWNER,
      PracticeRole.ADMIN,
    ]);
  });

  it.each([
    ["nicht freigegebene", { is_approved: false, disabled_at: null }],
    ["deaktivierte", { is_approved: true, disabled_at: new Date() }],
  ])("weist eine %s Praxis ab", async (_label, practice) => {
    authorize.mockResolvedValue({
      account: { ...account(PracticeRole.OWNER), current_practice: { id: "practice-1", ...practice } },
      error: null,
    });

    expect((await GET(collectionRequest("GET"))).status).toBe(403);
    expect((await POST(collectionRequest("POST", { name: "Gerät" }))).status).toBe(403);
    expect((await PATCH(deviceRequest("deactivate"), {
      params: Promise.resolve({ id: "device-1" }),
    })).status).toBe(403);
    expect(db.create).not.toHaveBeenCalled();
    expect(db.findMany).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it("listet nur Geräte der aktuellen Praxis und gibt keine Hashes aus", async () => {
    db.findMany.mockResolvedValue([{
      id: "device-1",
      name: "Praxisserver",
      is_active: true,
      revoked_at: null,
      last_seen_at: null,
      created_at: new Date("2026-09-13T10:00:00.000Z"),
      enrollment_expires_at: new Date("2026-09-13T10:15:00.000Z"),
      credential_hash: null,
    }]);

    const response = await GET(collectionRequest("GET"));
    const body = await response.json();

    expect(db.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { practice_id: "practice-1" },
    }));
    expect(body.devices[0].enrolled).toBe(false);
    expect(JSON.stringify(body)).not.toContain("credential_hash");
  });

  it("deaktiviert und reaktiviert ein eigenes, nicht widerrufenes Gerät", async () => {
    expect((await PATCH(deviceRequest("deactivate"), {
      params: Promise.resolve({ id: "device-1" }),
    })).status).toBe(200);
    expect((await PATCH(deviceRequest("reactivate"), {
      params: Promise.resolve({ id: "device-1" }),
    })).status).toBe(200);

    expect(db.update.mock.calls.map(([input]) => input.data)).toEqual([
      { is_active: false },
      { is_active: true },
    ]);
  });

  it("widerruft dauerhaft und invalidiert einen offenen Enrollment-Code", async () => {
    const response = await PATCH(deviceRequest("revoke"), {
      params: Promise.resolve({ id: "device-1" }),
    });

    expect(response.status).toBe(200);
    expect(db.update).toHaveBeenCalledWith({
      where: { id: "device-1" },
      data: {
        is_active: false,
        revoked_at: expect.any(Date),
        enrollment_token_hash: null,
        enrollment_expires_at: null,
      },
    });
  });

  it("weist Geräte einer anderen Praxis wie unbekannte IDs ab", async () => {
    db.findFirst.mockResolvedValue(null);

    const response = await PATCH(deviceRequest("deactivate"), {
      params: Promise.resolve({ id: "foreign-device" }),
    });

    expect(response.status).toBe(404);
    expect(db.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "foreign-device", practice_id: "practice-1" },
    }));
    expect(db.update).not.toHaveBeenCalled();
  });
});
