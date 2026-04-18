import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/cases/[id]/m2-skip/route";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    caseSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";

type PrismaMock = {
  caseSession: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};

const prismaMock = prisma as unknown as PrismaMock;
const getSessionAccountMock = getSessionAccount as jest.Mock;

const APPROVED_ACCOUNT = {
  id: "acc-test",
  email: "arzt@example.com",
  is_approved: true,
  is_admin: false,
};

function makeRequest(id: string) {
  return new NextRequest(`http://localhost/api/cases/${id}/m2-skip`, {
    method: "PATCH",
  });
}

describe("PATCH /api/cases/[id]/m2-skip", () => {
  beforeEach(() => {
    prismaMock.caseSession.findUnique.mockReset();
    prismaMock.caseSession.update.mockReset();
    getSessionAccountMock.mockReset();
  });

  it("setzt m2_status auf skipped und gibt 200 zurück", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
    });
    prismaMock.caseSession.update.mockResolvedValue({});

    const req = makeRequest("case-1");
    const response = await PATCH(req, {
      params: Promise.resolve({ id: "case-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);

    const updateCall = prismaMock.caseSession.update.mock.calls[0][0];
    expect(updateCall.where).toEqual({ id: "case-1" });
    expect(updateCall.data.m2_status).toBe("skipped");
  });

  it("gibt 401 zurück wenn nicht eingeloggt", async () => {
    getSessionAccountMock.mockResolvedValue(null);

    const req = makeRequest("case-1");
    const response = await PATCH(req, {
      params: Promise.resolve({ id: "case-1" }),
    });

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.ok).toBe(false);
  });

  it("gibt 403 zurück wenn Account nicht freigeschaltet", async () => {
    getSessionAccountMock.mockResolvedValue({ ...APPROVED_ACCOUNT, is_approved: false });

    const req = makeRequest("case-1");
    const response = await PATCH(req, {
      params: Promise.resolve({ id: "case-1" }),
    });

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.ok).toBe(false);
  });

  it("gibt 404 zurück wenn Fall nicht gefunden", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);
    prismaMock.caseSession.findUnique.mockResolvedValue(null);

    const req = makeRequest("nonexistent");
    const response = await PATCH(req, {
      params: Promise.resolve({ id: "nonexistent" }),
    });

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.ok).toBe(false);
  });

  it("gibt 404 zurück wenn Fall einem anderen Account gehört", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "other-account",
    });

    const req = makeRequest("case-other");
    const response = await PATCH(req, {
      params: Promise.resolve({ id: "case-other" }),
    });

    expect(response.status).toBe(404);
  });
});
