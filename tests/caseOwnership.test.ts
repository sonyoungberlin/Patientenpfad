/**
 * Owner-Schutz-Tests für fallbezogene API-Routen.
 *
 * Testet:
 *  1. nicht eingeloggt → 401
 *  2. nicht freigeschaltet → 403
 *  3. fremder Fall per ID → 404
 *  4. eigener Fall bleibt nutzbar
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
    caseSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { GET as getCaseHandler } from "@/app/api/cases/[id]/route";
import { PATCH as prefillHandler } from "@/app/api/cases/[id]/m2/prefill/route";
import { PATCH as checkpointHandler } from "@/app/api/cases/[id]/checkpoint/update/route";
import { POST as blockUpdateHandler } from "@/app/api/cases/[id]/block/update/route";
import { SESSION_COOKIE } from "@/lib/auth";
import {
  CheckpointCategory,
  CheckpointRelevance,
  CheckpointType,
  type ActiveCheckpoint,
} from "@/lib/types";

type PrismaMock = {
  session: { findUnique: jest.Mock; delete: jest.Mock };
  caseSession: { findUnique: jest.Mock; update: jest.Mock };
};

const pm = prisma as unknown as PrismaMock;

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

function mockSession(is_approved: boolean, accountId = "acc-owner") {
  pm.session.findUnique.mockResolvedValue({
    token: "good-token",
    expiresAt: new Date(Date.now() + 100_000),
    account: { id: accountId, email: "owner@example.com", is_approved },
  });
}

const OWNER_CASE = {
  id: "case-owner",
  owner_account_id: "acc-owner",
  active_checkpoints: [],
  block_status_anchor: [],
  ctx_prefill: null,
};

const FOREIGN_CASE = {
  id: "case-foreign",
  owner_account_id: "acc-other",
  active_checkpoints: [],
  block_status_anchor: [],
  ctx_prefill: null,
};

const mCheckpoint: ActiveCheckpoint = {
  id: "cp-1",
  block_id: "diagnosis_status",
  type: CheckpointType.VERIFIKATION,
  relevance: CheckpointRelevance.P,
  title: "Test",
  category: CheckpointCategory.M,
  status: "TO_DO",
  m4: { type: "ACTION", text: "M4" },
};

// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// GET /api/cases/[id]
// ---------------------------------------------------------------------------

describe("GET /api/cases/[id]", () => {
  it("401 ohne Session", async () => {
    const req = new NextRequest("http://localhost/api/cases/case-owner");
    const res = await getCaseHandler(req, { params: Promise.resolve({ id: "case-owner" }) });
    expect(res.status).toBe(401);
  });

  it("403 wenn nicht freigeschaltet", async () => {
    mockSession(false);
    const req = requestWithCookie("http://localhost/api/cases/case-owner");
    const res = await getCaseHandler(req, { params: Promise.resolve({ id: "case-owner" }) });
    expect(res.status).toBe(403);
  });

  it("404 bei fremdem Fall", async () => {
    mockSession(true);
    pm.caseSession.findUnique.mockResolvedValue(FOREIGN_CASE);
    const req = requestWithCookie("http://localhost/api/cases/case-foreign");
    const res = await getCaseHandler(req, { params: Promise.resolve({ id: "case-foreign" }) });
    expect(res.status).toBe(404);
  });

  it("200 für eigenen Fall", async () => {
    mockSession(true);
    pm.caseSession.findUnique.mockResolvedValue(OWNER_CASE);
    const req = requestWithCookie("http://localhost/api/cases/case-owner");
    const res = await getCaseHandler(req, { params: Promise.resolve({ id: "case-owner" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/cases/[id]/m2/prefill
// ---------------------------------------------------------------------------

describe("PATCH /api/cases/[id]/m2/prefill", () => {
  it("401 ohne Session", async () => {
    const req = new NextRequest("http://localhost/api/cases/case-owner/m2/prefill", {
      method: "PATCH",
      body: JSON.stringify({ prefill: {} }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await prefillHandler(req, { params: Promise.resolve({ id: "case-owner" }) });
    expect(res.status).toBe(401);
  });

  it("403 wenn nicht freigeschaltet", async () => {
    mockSession(false);
    const req = requestWithCookie("http://localhost/api/cases/case-owner/m2/prefill", {
      method: "PATCH",
      body: JSON.stringify({ prefill: {} }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await prefillHandler(req, { params: Promise.resolve({ id: "case-owner" }) });
    expect(res.status).toBe(403);
  });

  it("404 bei fremdem Fall", async () => {
    mockSession(true);
    pm.caseSession.findUnique.mockResolvedValue({ owner_account_id: "acc-other" });
    const req = requestWithCookie("http://localhost/api/cases/case-foreign/m2/prefill", {
      method: "PATCH",
      body: JSON.stringify({ prefill: { K01: {} } }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await prefillHandler(req, { params: Promise.resolve({ id: "case-foreign" }) });
    expect(res.status).toBe(404);
  });

  it("200 für eigenen Fall", async () => {
    mockSession(true);
    pm.caseSession.findUnique.mockResolvedValue({ owner_account_id: "acc-owner" });
    pm.caseSession.update.mockResolvedValue({});
    const req = requestWithCookie("http://localhost/api/cases/case-owner/m2/prefill", {
      method: "PATCH",
      body: JSON.stringify({ prefill: { K01: { "M2-01": "ja" } } }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await prefillHandler(req, { params: Promise.resolve({ id: "case-owner" }) });
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/cases/[id]/checkpoint/update
// ---------------------------------------------------------------------------

describe("PATCH /api/cases/[id]/checkpoint/update", () => {
  it("401 ohne Session", async () => {
    const req = new NextRequest("http://localhost/api/cases/case-owner/checkpoint/update", {
      method: "PATCH",
      body: JSON.stringify({ checkpoint_id: "cp-1", status: "OK" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await checkpointHandler(req, { params: Promise.resolve({ id: "case-owner" }) });
    expect(res.status).toBe(401);
  });

  it("403 wenn nicht freigeschaltet", async () => {
    mockSession(false);
    const req = requestWithCookie("http://localhost/api/cases/case-owner/checkpoint/update", {
      method: "PATCH",
      body: JSON.stringify({ checkpoint_id: "cp-1", status: "OK" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await checkpointHandler(req, { params: Promise.resolve({ id: "case-owner" }) });
    expect(res.status).toBe(403);
  });

  it("404 bei fremdem Fall", async () => {
    mockSession(true);
    pm.caseSession.findUnique.mockResolvedValue({ ...FOREIGN_CASE, active_checkpoints: [mCheckpoint] });
    const req = requestWithCookie("http://localhost/api/cases/case-foreign/checkpoint/update", {
      method: "PATCH",
      body: JSON.stringify({ checkpoint_id: "cp-1", status: "OK" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await checkpointHandler(req, { params: Promise.resolve({ id: "case-foreign" }) });
    expect(res.status).toBe(404);
  });

  it("200 für eigenen Fall", async () => {
    mockSession(true);
    pm.caseSession.findUnique.mockResolvedValue({ ...OWNER_CASE, active_checkpoints: [mCheckpoint] });
    pm.caseSession.update.mockResolvedValue({});
    const req = requestWithCookie("http://localhost/api/cases/case-owner/checkpoint/update", {
      method: "PATCH",
      body: JSON.stringify({ checkpoint_id: "cp-1", status: "OK" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await checkpointHandler(req, { params: Promise.resolve({ id: "case-owner" }) });
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// POST /api/cases/[id]/block/update
// ---------------------------------------------------------------------------

describe("POST /api/cases/[id]/block/update", () => {
  it("401 ohne Session", async () => {
    const req = new NextRequest("http://localhost/api/cases/case-owner/block/update", {
      method: "POST",
      body: JSON.stringify({ block_id: "diagnosis_status" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await blockUpdateHandler(req, { params: Promise.resolve({ id: "case-owner" }) });
    expect(res.status).toBe(401);
  });

  it("403 wenn nicht freigeschaltet", async () => {
    mockSession(false);
    const req = requestWithCookie("http://localhost/api/cases/case-owner/block/update", {
      method: "POST",
      body: JSON.stringify({ block_id: "diagnosis_status" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await blockUpdateHandler(req, { params: Promise.resolve({ id: "case-owner" }) });
    expect(res.status).toBe(403);
  });

  it("404 bei fremdem Fall", async () => {
    mockSession(true);
    pm.caseSession.findUnique.mockResolvedValue(FOREIGN_CASE);
    const req = requestWithCookie("http://localhost/api/cases/case-foreign/block/update", {
      method: "POST",
      body: JSON.stringify({ block_id: "diagnosis_status" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await blockUpdateHandler(req, { params: Promise.resolve({ id: "case-foreign" }) });
    expect(res.status).toBe(404);
  });

  it("200 für eigenen Fall", async () => {
    mockSession(true);
    pm.caseSession.findUnique.mockResolvedValue({
      ...OWNER_CASE,
      block_status_anchor: [
        { block_id: "diagnosis_status", block_title: "Diagnose", block_status: "OFFEN", active_checkpoint_count: 0 },
      ],
    });
    pm.caseSession.update.mockResolvedValue({});
    const req = requestWithCookie("http://localhost/api/cases/case-owner/block/update", {
      method: "POST",
      body: JSON.stringify({ block_id: "diagnosis_status" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await blockUpdateHandler(req, { params: Promise.resolve({ id: "case-owner" }) });
    expect(res.status).toBe(200);
  });
});
