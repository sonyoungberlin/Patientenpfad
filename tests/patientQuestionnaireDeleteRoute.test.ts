/**
 * Tests für DELETE /api/questionnaire/[id]
 *
 * Prüft:
 * - 401 ohne Session
 * - 403 wenn nicht freigeschaltet
 * - 404 bei nicht existierender Session
 * - 404 bei fremdem Account
 * - 200 und tatsächliches Löschen für Owner
 */

import { NextRequest } from "next/server";
import { DELETE as deleteHandler } from "@/app/api/questionnaire/[id]/route";
import { SESSION_COOKIE } from "@/lib/auth";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    session: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    patientQuestionnaireSession: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

type PrismaMock = {
  session: { findUnique: jest.Mock; delete: jest.Mock };
  patientQuestionnaireSession: { findUnique: jest.Mock; delete: jest.Mock };
};

const pm = prisma as unknown as PrismaMock;

function requestWithCookie(url: string) {
  return new NextRequest(url, {
    method: "DELETE",
    headers: { Cookie: `${SESSION_COOKIE}=good-token` },
  });
}

function mockSession(is_approved: boolean, accountId = "acc-owner", patient_communication_enabled = true) {
  pm.session.findUnique.mockResolvedValue({
    token: "good-token",
    expiresAt: new Date(Date.now() + 100_000),
    account: {
      id: accountId,
      email: "owner@example.com",
      is_approved,
      is_admin: false,
      inquiry_assistant_enabled: false,
      patient_communication_enabled,
    },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("DELETE /api/questionnaire/[id]", () => {
  it("401 ohne Session-Cookie", async () => {
    const req = new NextRequest("http://localhost/api/questionnaire/q-1", {
      method: "DELETE",
    });
    const res = await deleteHandler(req, { params: Promise.resolve({ id: "q-1" }) });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("403 wenn Account nicht freigeschaltet", async () => {
    mockSession(false);
    const req = requestWithCookie("http://localhost/api/questionnaire/q-1");
    const res = await deleteHandler(req, { params: Promise.resolve({ id: "q-1" }) });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("403 wenn patient_communication_enabled = false", async () => {
    mockSession(true, "acc-owner", false);
    const req = requestWithCookie("http://localhost/api/questionnaire/q-1");
    const res = await deleteHandler(req, { params: Promise.resolve({ id: "q-1" }) });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toBe("Patientenkommunikation nicht freigeschaltet.");
  });

  it("404 wenn Fragebogen nicht existiert", async () => {
    mockSession(true);
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue(null);
    const req = requestWithCookie("http://localhost/api/questionnaire/q-1");
    const res = await deleteHandler(req, { params: Promise.resolve({ id: "q-1" }) });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("404 bei fremdem Account (nicht Owner)", async () => {
    mockSession(true, "acc-owner");
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-other",
    });
    const req = requestWithCookie("http://localhost/api/questionnaire/q-1");
    const res = await deleteHandler(req, { params: Promise.resolve({ id: "q-1" }) });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("200 und löscht completed Session", async () => {
    mockSession(true, "acc-owner");
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-owner",
    });
    pm.patientQuestionnaireSession.delete.mockResolvedValue({});
    const req = requestWithCookie("http://localhost/api/questionnaire/q-completed");
    const res = await deleteHandler(req, { params: Promise.resolve({ id: "q-completed" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(pm.patientQuestionnaireSession.delete).toHaveBeenCalledWith({
      where: { id: "q-completed" },
    });
  });

  it("200 und löscht pending Session", async () => {
    mockSession(true, "acc-owner");
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-owner",
    });
    pm.patientQuestionnaireSession.delete.mockResolvedValue({});
    const req = requestWithCookie("http://localhost/api/questionnaire/q-pending");
    const res = await deleteHandler(req, { params: Promise.resolve({ id: "q-pending" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(pm.patientQuestionnaireSession.delete).toHaveBeenCalledWith({
      where: { id: "q-pending" },
    });
  });

  it("500 bei Datenbankfehler", async () => {
    mockSession(true, "acc-owner");
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-owner",
    });
    pm.patientQuestionnaireSession.delete.mockRejectedValue(new Error("DB error"));
    const req = requestWithCookie("http://localhost/api/questionnaire/q-1");
    const res = await deleteHandler(req, { params: Promise.resolve({ id: "q-1" }) });
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });
});
