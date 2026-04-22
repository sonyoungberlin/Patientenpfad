import { NextRequest } from "next/server";
import { PATCH as clinicalStatusHandler } from "@/app/api/cases/[id]/clinical-status/route";
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

function requestWithCookie(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "PATCH",
    headers: {
      Cookie: `${SESSION_COOKIE}=good-token`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
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

describe("PATCH /api/cases/[id]/clinical-status", () => {
  it("401 ohne Session", async () => {
    const req = new NextRequest("http://localhost/api/cases/case-1/clinical-status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "prepared" }),
    });
    const res = await clinicalStatusHandler(req, {
      params: Promise.resolve({ id: "case-1" }),
    });
    expect(res.status).toBe(401);
  });

  it("403 wenn nicht freigeschaltet", async () => {
    mockSession(false);
    const req = requestWithCookie(
      "http://localhost/api/cases/case-1/clinical-status",
      { status: "prepared" },
    );
    const res = await clinicalStatusHandler(req, {
      params: Promise.resolve({ id: "case-1" }),
    });
    expect(res.status).toBe(403);
  });

  it("400 bei ungültigem Status", async () => {
    mockSession(true);
    const req = requestWithCookie(
      "http://localhost/api/cases/case-1/clinical-status",
      { status: "garbage" },
    );
    const res = await clinicalStatusHandler(req, {
      params: Promise.resolve({ id: "case-1" }),
    });
    expect(res.status).toBe(400);
    expect(pm.caseSession.update).not.toHaveBeenCalled();
  });

  it("404 bei fremdem Fall", async () => {
    mockSession(true);
    pm.caseSession.findUnique.mockResolvedValue({ owner_account_id: "acc-other" });
    const req = requestWithCookie(
      "http://localhost/api/cases/case-1/clinical-status",
      { status: "prepared" },
    );
    const res = await clinicalStatusHandler(req, {
      params: Promise.resolve({ id: "case-1" }),
    });
    expect(res.status).toBe(404);
    expect(pm.caseSession.update).not.toHaveBeenCalled();
  });

  it("200 setzt clinical_status=prepared", async () => {
    mockSession(true);
    pm.caseSession.findUnique.mockResolvedValue({ owner_account_id: "acc-owner" });
    pm.caseSession.update.mockResolvedValue({});
    const req = requestWithCookie(
      "http://localhost/api/cases/case-1/clinical-status",
      { status: "prepared" },
    );
    const res = await clinicalStatusHandler(req, {
      params: Promise.resolve({ id: "case-1" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.clinical_status).toBe("prepared");
    expect(pm.caseSession.update).toHaveBeenCalledWith({
      where: { id: "case-1" },
      data: { clinical_status: "prepared" },
    });
  });

  it("200 setzt clinical_status=confirmed", async () => {
    mockSession(true);
    pm.caseSession.findUnique.mockResolvedValue({ owner_account_id: "acc-owner" });
    pm.caseSession.update.mockResolvedValue({});
    const req = requestWithCookie(
      "http://localhost/api/cases/case-1/clinical-status",
      { status: "confirmed" },
    );
    const res = await clinicalStatusHandler(req, {
      params: Promise.resolve({ id: "case-1" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.clinical_status).toBe("confirmed");
    expect(pm.caseSession.update).toHaveBeenCalledWith({
      where: { id: "case-1" },
      data: { clinical_status: "confirmed" },
    });
  });
});
