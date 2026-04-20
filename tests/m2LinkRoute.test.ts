import { NextRequest } from "next/server";
import { POST } from "@/app/api/cases/[id]/m2-link/route";

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
  return new NextRequest(`http://localhost/api/cases/${id}/m2-link`, {
    method: "POST",
  });
}

describe("POST /api/cases/[id]/m2-link", () => {
  beforeEach(() => {
    prismaMock.caseSession.findUnique.mockReset();
    prismaMock.caseSession.update.mockReset();
    getSessionAccountMock.mockReset();
  });

  it("erzeugt Token und gibt vollständigen Link zurück", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED_ACCOUNT);
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
    });
    prismaMock.caseSession.update.mockResolvedValue({});

    const req = makeRequest("case-1");
    const response = await POST(req, {
      params: Promise.resolve({ id: "case-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(typeof json.link).toBe("string");
    expect(json.link).toMatch(/\/m2-link\/[0-9a-f-]{36}$/);

    const updateCall = prismaMock.caseSession.update.mock.calls[0][0];
    expect(updateCall.where).toEqual({ id: "case-1" });
    expect(typeof updateCall.data.m2_token).toBe("string");
    expect(updateCall.data.m2_token.length).toBeGreaterThan(0);
    expect(updateCall.data.m2_token_expires_at).toBeInstanceOf(Date);
    expect(updateCall.data.m2_status).toBe("waiting_for_patient");
    expect(updateCall.data.preparation_mode).toBe("patient");

    const expiresIn = updateCall.data.m2_token_expires_at.getTime() - Date.now();
    expect(expiresIn).toBeGreaterThan(13 * 24 * 60 * 60 * 1000);
    expect(expiresIn).toBeLessThanOrEqual(14 * 24 * 60 * 60 * 1000 + 1000);
  });

  it("gibt 401 zurück wenn nicht eingeloggt", async () => {
    getSessionAccountMock.mockResolvedValue(null);

    const req = makeRequest("case-1");
    const response = await POST(req, {
      params: Promise.resolve({ id: "case-1" }),
    });

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.ok).toBe(false);
  });

  it("gibt 403 zurück wenn Account nicht freigeschaltet", async () => {
    getSessionAccountMock.mockResolvedValue({
      ...APPROVED_ACCOUNT,
      is_approved: false,
    });

    const req = makeRequest("case-1");
    const response = await POST(req, {
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
    const response = await POST(req, {
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
    const response = await POST(req, {
      params: Promise.resolve({ id: "case-other" }),
    });

    expect(response.status).toBe(404);
  });
});
