/**
 * Tests für POST /api/admin/practices/[id]/members.
 *
 * Prüft Auth-Gate (nur Plattform-Admin, kein Praxis-Membership-Check),
 * Validierung (E-Mail, Rolle inkl. OWNER erlaubt), Practice-Existenz,
 * Account-Existenz, P2002 → 409, sowie practice_id strikt aus URL.
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    practice: {
      findUnique: jest.fn(),
    },
    account: {
      findUnique: jest.fn(),
    },
    practiceMembership: {
      create: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
  getSessionAccountFromCookies: jest.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import { POST } from "@/app/api/admin/practices/[id]/members/route";

type PrismaMock = {
  practice: { findUnique: jest.Mock };
  account: { findUnique: jest.Mock };
  practiceMembership: { create: jest.Mock };
};
const pm = prisma as unknown as PrismaMock;
const getSessionAccountMock = getSessionAccount as jest.Mock;

function adminAccount(over: Partial<{ is_admin: boolean }> = {}) {
  return {
    id: "acc-admin",
    email: "admin@example.com",
    is_approved: true,
    is_admin: true,
    inquiry_assistant_enabled: false,
    patient_communication_enabled: false,
    website_forms_enabled: false,
    current_practice: null,
    memberships: [],
    ...over,
  };
}

function jsonReq(id: string, body: unknown) {
  return new NextRequest(
    `http://localhost/api/admin/practices/${id}/members`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

function formReq(id: string, fields: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) params.append(k, v);
  return new NextRequest(
    `http://localhost/api/admin/practices/${id}/members`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    },
  );
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  pm.practice.findUnique.mockReset();
  pm.account.findUnique.mockReset();
  pm.practiceMembership.create.mockReset();
  getSessionAccountMock.mockReset();
});

describe("POST /api/admin/practices/[id]/members — Auth-Gate", () => {
  it("401 ohne Session", async () => {
    getSessionAccountMock.mockResolvedValue(null);
    const res = await POST(
      jsonReq("p-1", { email: "x@y.de", role: "USER" }),
      ctx("p-1"),
    );
    expect(res.status).toBe(401);
    expect(pm.practiceMembership.create).not.toHaveBeenCalled();
  });

  it("403 wenn is_admin = false", async () => {
    getSessionAccountMock.mockResolvedValue(
      adminAccount({ is_admin: false }),
    );
    const res = await POST(
      jsonReq("p-1", { email: "x@y.de", role: "USER" }),
      ctx("p-1"),
    );
    expect(res.status).toBe(403);
    expect(pm.practiceMembership.create).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/practices/[id]/members — Validierung", () => {
  beforeEach(() => {
    getSessionAccountMock.mockResolvedValue(adminAccount());
  });

  it("400 bei ungültiger E-Mail", async () => {
    const res = await POST(
      jsonReq("p-1", { email: "not-an-email", role: "USER" }),
      ctx("p-1"),
    );
    expect(res.status).toBe(400);
    expect(pm.practice.findUnique).not.toHaveBeenCalled();
    expect(pm.account.findUnique).not.toHaveBeenCalled();
  });

  it("400 bei unbekannter Rolle", async () => {
    const res = await POST(
      jsonReq("p-1", { email: "x@y.de", role: "BANANA" }),
      ctx("p-1"),
    );
    expect(res.status).toBe(400);
    expect(pm.practice.findUnique).not.toHaveBeenCalled();
  });

  it("400 bei ungültigem JSON", async () => {
    const req = new NextRequest(
      "http://localhost/api/admin/practices/p-1/members",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{not-json",
      },
    );
    const res = await POST(req, ctx("p-1"));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/admin/practices/[id]/members — Lookups", () => {
  beforeEach(() => {
    getSessionAccountMock.mockResolvedValue(adminAccount());
  });

  it("404 wenn Practice nicht existiert", async () => {
    pm.practice.findUnique.mockResolvedValue(null);
    const res = await POST(
      jsonReq("p-missing", { email: "x@y.de", role: "USER" }),
      ctx("p-missing"),
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("Practice nicht gefunden.");
    expect(pm.account.findUnique).not.toHaveBeenCalled();
    expect(pm.practiceMembership.create).not.toHaveBeenCalled();
  });

  it("404 wenn Account nicht existiert (kein Account-Create)", async () => {
    pm.practice.findUnique.mockResolvedValue({ id: "p-1" });
    pm.account.findUnique.mockResolvedValue(null);
    const res = await POST(
      jsonReq("p-1", { email: "unknown@example.com", role: "USER" }),
      ctx("p-1"),
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe(
      "Kein Account mit dieser E-Mail vorhanden.",
    );
    expect(pm.practiceMembership.create).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/practices/[id]/members — Happy Path", () => {
  beforeEach(() => {
    getSessionAccountMock.mockResolvedValue(adminAccount());
    pm.practice.findUnique.mockResolvedValue({ id: "p-1" });
    pm.account.findUnique.mockResolvedValue({
      id: "acc-2",
      email: "neu@example.com",
    });
  });

  it.each(["OWNER", "ADMIN", "USER"])(
    "Plattform-Admin fügt %s hinzu (201)",
    async (role) => {
      pm.practiceMembership.create.mockResolvedValue({
        id: "m-1",
        account_id: "acc-2",
        role,
      });
      const res = await POST(
        jsonReq("p-1", { email: "neu@example.com", role }),
        ctx("p-1"),
      );
      expect(res.status).toBe(201);
      const j = await res.json();
      expect(j).toEqual({
        ok: true,
        membership: {
          id: "m-1",
          account_id: "acc-2",
          email: "neu@example.com",
          role,
        },
      });
      const args = pm.practiceMembership.create.mock.calls[0][0];
      expect(args.data).toEqual({
        account_id: "acc-2",
        practice_id: "p-1",
        role,
      });
    },
  );

  it("ignoriert practice_id aus Body (URL-Segment ist Quelle)", async () => {
    pm.practiceMembership.create.mockResolvedValue({
      id: "m-1",
      account_id: "acc-2",
      role: "USER",
    });
    await POST(
      jsonReq("p-1", {
        email: "neu@example.com",
        role: "USER",
        practice_id: "p-EVIL",
        practiceId: "p-EVIL",
      } as Record<string, unknown>),
      ctx("p-1"),
    );
    const args = pm.practiceMembership.create.mock.calls[0][0];
    expect(args.data.practice_id).toBe("p-1");
  });

  it("normalisiert E-Mail (lowercase + trim)", async () => {
    pm.practiceMembership.create.mockResolvedValue({
      id: "m-1",
      account_id: "acc-2",
      role: "USER",
    });
    await POST(
      jsonReq("p-1", { email: "  NEU@Example.COM ", role: "USER" }),
      ctx("p-1"),
    );
    expect(pm.account.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "neu@example.com" } }),
    );
  });

  it("Form-encoded: 303-Redirect mit ?added=<email>", async () => {
    pm.practiceMembership.create.mockResolvedValue({
      id: "m-1",
      account_id: "acc-2",
      role: "USER",
    });
    const res = await POST(
      formReq("p-1", { email: "neu@example.com", role: "USER" }),
      ctx("p-1"),
    );
    expect(res.status).toBe(303);
    const loc = res.headers.get("location") ?? "";
    expect(loc).toContain("/admin/practices/p-1");
    expect(loc).toContain("added=neu");
  });
});

describe("POST /api/admin/practices/[id]/members — Konflikte", () => {
  beforeEach(() => {
    getSessionAccountMock.mockResolvedValue(adminAccount());
    pm.practice.findUnique.mockResolvedValue({ id: "p-1" });
    pm.account.findUnique.mockResolvedValue({
      id: "acc-2",
      email: "neu@example.com",
    });
  });

  it("409 bei Prisma P2002 (bereits Mitglied)", async () => {
    const { Prisma } = await import("@prisma/client");
    pm.practiceMembership.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    const res = await POST(
      jsonReq("p-1", { email: "neu@example.com", role: "USER" }),
      ctx("p-1"),
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(
      "Account ist bereits Mitglied dieser Praxis.",
    );
  });

  it("Form-encoded Validierungsfehler: 303 ohne Prisma-Aufruf", async () => {
    const res = await POST(
      formReq("p-1", { email: "not-an-email", role: "USER" }),
      ctx("p-1"),
    );
    expect(res.status).toBe(303);
    expect(pm.practice.findUnique).not.toHaveBeenCalled();
    expect(pm.account.findUnique).not.toHaveBeenCalled();
    expect(pm.practiceMembership.create).not.toHaveBeenCalled();
  });
});
