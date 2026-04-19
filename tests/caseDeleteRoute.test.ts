import { NextRequest } from "next/server";
import { DELETE as deleteHandler } from "@/app/api/cases/[id]/route";
import { SESSION_COOKIE } from "@/lib/auth";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    session: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    caseSession: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

type PrismaMock = {
  session: { findUnique: jest.Mock; delete: jest.Mock };
  caseSession: { findUnique: jest.Mock; delete: jest.Mock };
};

const pm = prisma as unknown as PrismaMock;

function requestWithCookie(url: string) {
  return new NextRequest(url, {
    method: "DELETE",
    headers: { Cookie: `${SESSION_COOKIE}=good-token` },
  });
}

function mockSession(is_approved: boolean, accountId = "acc-owner") {
  pm.session.findUnique.mockResolvedValue({
    token: "good-token",
    expiresAt: new Date(Date.now() + 100_000),
    account: { id: accountId, email: "owner@example.com", is_approved },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("DELETE /api/cases/[id]", () => {
  it("401 ohne Session", async () => {
    const req = new NextRequest("http://localhost/api/cases/case-1", {
      method: "DELETE",
    });
    const res = await deleteHandler(req, { params: Promise.resolve({ id: "case-1" }) });
    expect(res.status).toBe(401);
  });

  it("403 wenn nicht freigeschaltet", async () => {
    mockSession(false);
    const req = requestWithCookie("http://localhost/api/cases/case-1");
    const res = await deleteHandler(req, { params: Promise.resolve({ id: "case-1" }) });
    expect(res.status).toBe(403);
  });

  it("404 bei fremdem Fall", async () => {
    mockSession(true);
    pm.caseSession.findUnique.mockResolvedValue({ owner_account_id: "acc-other" });
    const req = requestWithCookie("http://localhost/api/cases/case-1");
    const res = await deleteHandler(req, { params: Promise.resolve({ id: "case-1" }) });
    expect(res.status).toBe(404);
  });

  it("404 bei nicht existierendem Fall", async () => {
    mockSession(true);
    pm.caseSession.findUnique.mockResolvedValue(null);
    const req = requestWithCookie("http://localhost/api/cases/case-1");
    const res = await deleteHandler(req, { params: Promise.resolve({ id: "case-1" }) });
    expect(res.status).toBe(404);
  });

  it("200 und löscht den Fall", async () => {
    mockSession(true);
    pm.caseSession.findUnique.mockResolvedValue({ owner_account_id: "acc-owner" });
    pm.caseSession.delete.mockResolvedValue({});
    const req = requestWithCookie("http://localhost/api/cases/case-1");
    const res = await deleteHandler(req, { params: Promise.resolve({ id: "case-1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(pm.caseSession.delete).toHaveBeenCalledWith({
      where: { id: "case-1" },
    });
  });
});
