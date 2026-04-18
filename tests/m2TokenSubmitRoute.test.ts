import { NextRequest } from "next/server";
import { POST } from "@/app/api/m2-link/[token]/route";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    caseSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

type PrismaMock = {
  caseSession: { findUnique: jest.Mock; update: jest.Mock };
};
const prismaMock = prisma as unknown as PrismaMock;

function futureDate(daysFromNow: number): Date {
  return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
}

function pastDate(daysAgo: number): Date {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
}

function makeRequest(token: string, body: unknown) {
  return new NextRequest(`http://localhost/api/m2-link/${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/m2-link/[token]", () => {
  beforeEach(() => {
    prismaMock.caseSession.findUnique.mockReset();
    prismaMock.caseSession.update.mockReset();
  });

  it("schreibt ctx_prefill bei gültigem Token", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      id: "case-1",
      m2_token_expires_at: futureDate(14),
    });
    prismaMock.caseSession.update.mockResolvedValue({});

    const prefill = { K04: { "M2-01": "ja", "M2-02": "nein" } };
    const req = makeRequest("valid-token", { prefill });
    const response = await POST(req, {
      params: Promise.resolve({ token: "valid-token" }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(prismaMock.caseSession.update).toHaveBeenCalledWith({
      where: { id: "case-1" },
      data: { ctx_prefill: prefill },
    });
  });

  it("gibt 410 zurück bei abgelaufenem Token", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      id: "case-1",
      m2_token_expires_at: pastDate(1),
    });

    const req = makeRequest("expired-token", { prefill: {} });
    const response = await POST(req, {
      params: Promise.resolve({ token: "expired-token" }),
    });

    expect(response.status).toBe(410);
    const json = await response.json();
    expect(json.ok).toBe(false);
  });

  it("gibt 404 zurück bei unbekanntem Token", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue(null);

    const req = makeRequest("unknown-token", { prefill: {} });
    const response = await POST(req, {
      params: Promise.resolve({ token: "unknown-token" }),
    });

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.ok).toBe(false);
  });

  it("gibt 400 zurück bei fehlendem prefill-Feld", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      id: "case-1",
      m2_token_expires_at: futureDate(14),
    });

    const req = makeRequest("valid-token", { prefill: "invalid" });
    const response = await POST(req, {
      params: Promise.resolve({ token: "valid-token" }),
    });

    expect(response.status).toBe(400);
  });

  it("löscht den Token nach dem Submit nicht", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      id: "case-1",
      m2_token_expires_at: futureDate(14),
    });
    prismaMock.caseSession.update.mockResolvedValue({});

    const req = makeRequest("valid-token", {
      prefill: { K01: { "M2-01": "ja" } },
    });
    await POST(req, { params: Promise.resolve({ token: "valid-token" }) });

    const updateData = prismaMock.caseSession.update.mock.calls[0][0].data;
    expect(updateData).not.toHaveProperty("m2_token");
    expect(updateData).not.toHaveProperty("m2_token_expires_at");
  });
});
