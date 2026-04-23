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

jest.mock("@/lib/server/prefillRuns", () => ({
  appendFrozenRun: jest.fn(),
}));

import { prisma } from "@/lib/prisma";
import { appendFrozenRun } from "@/lib/server/prefillRuns";

type PrismaMock = {
  caseSession: { findUnique: jest.Mock; update: jest.Mock };
};
const prismaMock = prisma as unknown as PrismaMock;
const appendFrozenRunMock = appendFrozenRun as unknown as jest.Mock;

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
    appendFrozenRunMock.mockReset();
    appendFrozenRunMock.mockResolvedValue({
      id: "run-patient",
      sequence: 1,
      frozen_at: new Date(),
      source: "patient",
    });
  });

  it("schreibt ctx_prefill und löscht Token bei erfolgreichem Submit", async () => {
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
    const updateData = prismaMock.caseSession.update.mock.calls[0][0].data;
    expect(updateData.ctx_prefill).toEqual(prefill);
    expect(updateData.m2_token).toBeNull();
    expect(updateData.m2_token_expires_at).toBeNull();
    expect(updateData.m2_status).toBe("completed");
    // Patientenlink-Rücklauf gehört eindeutig zum Patienten-Weg.
    expect(updateData.preparation_mode).toBe("patient");
  });

  it("verwirft MFA-IDs im Patientenlink-Rücklauf (kein Datenmix)", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      id: "case-1",
      m2_token_expires_at: futureDate(14),
    });
    prismaMock.caseSession.update.mockResolvedValue({});

    const mixedPrefill = {
      K01: { "M2-01": "ja", "MFA-K01-01": "nein" },
    };
    const req = makeRequest("valid-token", { prefill: mixedPrefill });
    const response = await POST(req, {
      params: Promise.resolve({ token: "valid-token" }),
    });

    expect(response.status).toBe(200);
    const updateData = prismaMock.caseSession.update.mock.calls[0][0].data;
    // Nur die Patienten-ID überlebt die Sanitisierung.
    expect(updateData.ctx_prefill).toEqual({ K01: { "M2-01": "ja" } });
    expect(updateData.preparation_mode).toBe("patient");
  });

  it("nach erfolgreichem Submit ist der Token nicht mehr auffindbar (404)", async () => {
    // Simulate the state after nullification: findUnique returns null for the old token
    prismaMock.caseSession.findUnique.mockResolvedValue(null);

    const req = makeRequest("consumed-token", { prefill: { K01: { "M2-01": "ja" } } });
    const response = await POST(req, {
      params: Promise.resolve({ token: "consumed-token" }),
    });

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.ok).toBe(false);
  });

  it("neuer Token kann nach Verbrauch erneut erzeugt und genutzt werden", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      id: "case-1",
      m2_token_expires_at: futureDate(14),
    });
    prismaMock.caseSession.update.mockResolvedValue({});

    const req = makeRequest("new-token", { prefill: { K02: { "M2-01": "nein" } } });
    const response = await POST(req, {
      params: Promise.resolve({ token: "new-token" }),
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.ok).toBe(true);
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

});
