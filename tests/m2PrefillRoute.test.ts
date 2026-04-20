import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/cases/[id]/m2/prefill/route";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    caseSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn().mockResolvedValue({
    id: "acc-test",
    email: "test@example.com",
    is_approved: true,
  }),
}));

import { prisma } from "@/lib/prisma";

type PrismaMock = {
  caseSession: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};

const prismaMock = prisma as unknown as PrismaMock;

describe("PATCH /api/cases/[id]/m2/prefill", () => {
  beforeEach(() => {
    prismaMock.caseSession.findUnique.mockReset();
    prismaMock.caseSession.update.mockReset();
  });

  it("speichert strukturierte Prefill-Daten in ctx_prefill", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({ owner_account_id: "acc-test" });
    prismaMock.caseSession.update.mockResolvedValue({});

    const structuredPrefill = {
      K04: { "M2-01": "ja", "M2-02": "nein", "M2-03": "unklar" },
    };

    const req = new NextRequest("http://localhost/api/cases/case-1/m2/prefill", {
      method: "PATCH",
      body: JSON.stringify({ prefill: structuredPrefill }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(req, {
      params: Promise.resolve({ id: "case-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(prismaMock.caseSession.update).toHaveBeenCalledWith({
      where: { id: "case-1" },
      data: { ctx_prefill: structuredPrefill, preparation_mode: "mfa" },
    });
  });

  it("gibt 404 zurück wenn Session nicht gefunden", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/cases/x/m2/prefill", {
      method: "PATCH",
      body: JSON.stringify({ prefill: {} }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(req, {
      params: Promise.resolve({ id: "x" }),
    });

    expect(response.status).toBe(404);
  });

  it("gibt 400 zurück bei fehlendem oder ungültigem prefill-Feld", async () => {
    const req = new NextRequest("http://localhost/api/cases/case-1/m2/prefill", {
      method: "PATCH",
      body: JSON.stringify({ prefill: "ungültig" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(req, {
      params: Promise.resolve({ id: "case-1" }),
    });

    expect(response.status).toBe(400);
  });
});
