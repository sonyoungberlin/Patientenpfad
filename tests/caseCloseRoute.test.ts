import { NextRequest } from "next/server";
import { PATCH as closeHandler } from "@/app/api/cases/[id]/close/route";
import { SESSION_COOKIE } from "@/lib/auth";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    session: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    caseSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

type PrismaMock = {
  session: { findUnique: jest.Mock; delete: jest.Mock };
  caseSession: { findUnique: jest.Mock; update: jest.Mock };
};

const pm = prisma as unknown as PrismaMock;

function requestWithCookie(url: string) {
  return new NextRequest(url, {
    method: "PATCH",
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

describe("PATCH /api/cases/[id]/close", () => {
  it("401 ohne Session", async () => {
    const req = new NextRequest("http://localhost/api/cases/case-1/close", {
      method: "PATCH",
    });
    const res = await closeHandler(req, { params: Promise.resolve({ id: "case-1" }) });
    expect(res.status).toBe(401);
  });

  it("403 wenn nicht freigeschaltet", async () => {
    mockSession(false);
    const req = requestWithCookie("http://localhost/api/cases/case-1/close");
    const res = await closeHandler(req, { params: Promise.resolve({ id: "case-1" }) });
    expect(res.status).toBe(403);
  });

  it("404 bei fremdem Fall", async () => {
    mockSession(true);
    pm.caseSession.findUnique.mockResolvedValue({ owner_account_id: "acc-other" });
    const req = requestWithCookie("http://localhost/api/cases/case-1/close");
    const res = await closeHandler(req, { params: Promise.resolve({ id: "case-1" }) });
    expect(res.status).toBe(404);
  });

  it("200 setzt stage_status=CLOSED + doctor_confirmed + doctor_confirmed_at", async () => {
    mockSession(true);
    pm.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-owner",
      doctor_confirmed: false,
    });
    pm.caseSession.update.mockResolvedValue({});
    const req = requestWithCookie("http://localhost/api/cases/case-1/close");
    const res = await closeHandler(req, { params: Promise.resolve({ id: "case-1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(pm.caseSession.update).toHaveBeenCalledTimes(1);
    const updateCall = pm.caseSession.update.mock.calls[0][0];
    expect(updateCall.where).toEqual({ id: "case-1" });
    expect(updateCall.data.stage_status).toBe("CLOSED");
    expect(updateCall.data.doctor_confirmed).toBe(true);
    expect(updateCall.data.doctor_confirmed_at).toBeInstanceOf(Date);
  });

  it("200 idempotent wenn bereits ärztlich bestätigt – kein DB-Update", async () => {
    mockSession(true);
    pm.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-owner",
      doctor_confirmed: true,
    });
    const req = requestWithCookie("http://localhost/api/cases/case-1/close");
    const res = await closeHandler(req, { params: Promise.resolve({ id: "case-1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.already_confirmed).toBe(true);
    expect(pm.caseSession.update).not.toHaveBeenCalled();
  });
});
