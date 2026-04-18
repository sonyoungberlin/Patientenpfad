/**
 * Tests für GET + POST /api/admin/accounts.
 *
 * Gemockt werden:
 *   - @/lib/prisma  (Datenbankoperationen)
 *   - @/lib/adminActions (approveAccount, revokeAccount)
 */

import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Prisma-Mock
// ---------------------------------------------------------------------------

jest.mock("@/lib/prisma", () => ({
  prisma: {
    session: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    account: {
      findMany: jest.fn(),
    },
  },
}));

// ---------------------------------------------------------------------------
// adminActions-Mock
// ---------------------------------------------------------------------------

jest.mock("@/lib/adminActions", () => ({
  approveAccount: jest.fn(),
  revokeAccount: jest.fn(),
}));

import { prisma } from "@/lib/prisma";
import { approveAccount, revokeAccount } from "@/lib/adminActions";
import { GET as getHandler, POST as postHandler } from "@/app/api/admin/accounts/route";
import { SESSION_COOKIE } from "@/lib/auth";

type PrismaMock = {
  session: { findUnique: jest.Mock; delete: jest.Mock };
  account: { findMany: jest.Mock };
};

const pm = prisma as unknown as PrismaMock;
const mockApprove = approveAccount as jest.Mock;
const mockRevoke = revokeAccount as jest.Mock;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function requestWithCookie(
  url: string,
  opts?: { method?: string; body?: string; headers?: Record<string, string> },
) {
  return new NextRequest(url, {
    method: opts?.method,
    body: opts?.body,
    headers: { ...(opts?.headers ?? {}), Cookie: `${SESSION_COOKIE}=good-token` },
  });
}

function mockSession(is_admin: boolean, is_approved = true) {
  pm.session.findUnique.mockResolvedValue({
    token: "good-token",
    expiresAt: new Date(Date.now() + 100_000),
    account: {
      id: "acc-admin",
      email: "admin@example.com",
      is_approved,
      is_admin,
    },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// GET /api/admin/accounts
// ---------------------------------------------------------------------------

describe("GET /api/admin/accounts", () => {
  it("401 ohne Session", async () => {
    const req = new NextRequest("http://localhost/api/admin/accounts");
    const res = await getHandler(req);
    expect(res.status).toBe(401);
  });

  it("403 wenn is_admin = false", async () => {
    mockSession(false);
    const req = requestWithCookie("http://localhost/api/admin/accounts");
    const res = await getHandler(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("200 mit Account-Liste für Admin", async () => {
    mockSession(true);
    pm.account.findMany.mockResolvedValue([
      { id: "acc-1", email: "a@example.com", is_approved: false, is_admin: false, createdAt: new Date() },
      { id: "acc-2", email: "b@example.com", is_approved: true, is_admin: false, createdAt: new Date() },
    ]);

    const req = requestWithCookie("http://localhost/api/admin/accounts");
    const res = await getHandler(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.accounts).toHaveLength(2);
    expect(json.accounts[0].email).toBe("a@example.com");
  });

  it("sortiert nach is_approved asc, dann createdAt desc", async () => {
    mockSession(true);
    pm.account.findMany.mockResolvedValue([]);

    await getHandler(requestWithCookie("http://localhost/api/admin/accounts"));

    expect(pm.account.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ is_approved: "asc" }, { createdAt: "desc" }],
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// POST /api/admin/accounts
// ---------------------------------------------------------------------------

describe("POST /api/admin/accounts", () => {
  it("401 ohne Session", async () => {
    const req = new NextRequest("http://localhost/api/admin/accounts", {
      method: "POST",
      body: JSON.stringify({ email: "x@example.com", action: "approve" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await postHandler(req);
    expect(res.status).toBe(401);
  });

  it("403 wenn is_admin = false", async () => {
    mockSession(false);
    const req = requestWithCookie("http://localhost/api/admin/accounts", {
      method: "POST",
      body: JSON.stringify({ email: "x@example.com", action: "approve" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await postHandler(req);
    expect(res.status).toBe(403);
  });

  it("400 bei fehlendem action-Parameter", async () => {
    mockSession(true);
    const req = requestWithCookie("http://localhost/api/admin/accounts", {
      method: "POST",
      body: JSON.stringify({ email: "x@example.com" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await postHandler(req);
    expect(res.status).toBe(400);
  });

  it("schaltet Account frei (approve)", async () => {
    mockSession(true);
    mockApprove.mockResolvedValue({ ok: true, message: "freigeschaltet" });

    const req = requestWithCookie("http://localhost/api/admin/accounts", {
      method: "POST",
      body: JSON.stringify({ email: "tester@example.com", action: "approve" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await postHandler(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(mockApprove).toHaveBeenCalledWith("tester@example.com");
    expect(mockRevoke).not.toHaveBeenCalled();
  });

  it("sperrt Account (revoke)", async () => {
    mockSession(true);
    mockRevoke.mockResolvedValue({ ok: true, message: "gesperrt" });

    const req = requestWithCookie("http://localhost/api/admin/accounts", {
      method: "POST",
      body: JSON.stringify({ email: "tester@example.com", action: "revoke" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await postHandler(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(mockRevoke).toHaveBeenCalledWith("tester@example.com");
    expect(mockApprove).not.toHaveBeenCalled();
  });

  it("404 wenn E-Mail nicht existiert", async () => {
    mockSession(true);
    mockApprove.mockResolvedValue({ ok: false, message: "Kein Account gefunden." });

    const req = requestWithCookie("http://localhost/api/admin/accounts", {
      method: "POST",
      body: JSON.stringify({ email: "nobody@example.com", action: "approve" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await postHandler(req);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });
});
