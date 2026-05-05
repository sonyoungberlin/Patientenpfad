/**
 * Tests für DELETE /api/questionnaire/[id]
 *
 * Prüft:
 * - 401 ohne Session
 * - 403 wenn nicht freigeschaltet
 * - 404 bei nicht existierender Session
 * - 404 bei fremdem Account
 * - 404 bei bereits soft-gelöschter Session
 * - 200 und Soft Delete (`deleted_at` wird gesetzt) für Owner
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
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

type PrismaMock = {
  session: { findUnique: jest.Mock; delete: jest.Mock };
  patientQuestionnaireSession: {
    findUnique: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
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
      deleted_at: null,
    });
    const req = requestWithCookie("http://localhost/api/questionnaire/q-1");
    const res = await deleteHandler(req, { params: Promise.resolve({ id: "q-1" }) });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("404 wenn Session bereits soft-gelöscht ist (kein erneutes Update)", async () => {
    mockSession(true, "acc-owner");
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-owner",
      deleted_at: new Date("2026-05-01T10:00:00Z"),
    });
    const req = requestWithCookie("http://localhost/api/questionnaire/q-deleted");
    const res = await deleteHandler(req, {
      params: Promise.resolve({ id: "q-deleted" }),
    });
    expect(res.status).toBe(404);
    expect(pm.patientQuestionnaireSession.update).not.toHaveBeenCalled();
    expect(pm.patientQuestionnaireSession.delete).not.toHaveBeenCalled();
  });

  it("200 und Soft Delete (setzt deleted_at) für completed Session", async () => {
    mockSession(true, "acc-owner");
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-owner",
      deleted_at: null,
    });
    pm.patientQuestionnaireSession.update.mockResolvedValue({});
    const req = requestWithCookie("http://localhost/api/questionnaire/q-completed");
    const res = await deleteHandler(req, { params: Promise.resolve({ id: "q-completed" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    // Hard-Delete darf nicht passieren — Daten müssen erhalten bleiben.
    expect(pm.patientQuestionnaireSession.delete).not.toHaveBeenCalled();
    expect(pm.patientQuestionnaireSession.update).toHaveBeenCalledTimes(1);
    const call = pm.patientQuestionnaireSession.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: "q-completed" });
    expect(call.data.deleted_at).toBeInstanceOf(Date);
    // Es darf keine andere Spalte stillschweigend mitgeschrieben werden
    // (z. B. answers, status), damit eine spätere Wiederherstellung trivial
    // bleibt.
    expect(Object.keys(call.data)).toEqual(["deleted_at"]);
  });

  it("200 und Soft Delete für pending Session", async () => {
    mockSession(true, "acc-owner");
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-owner",
      deleted_at: null,
    });
    pm.patientQuestionnaireSession.update.mockResolvedValue({});
    const req = requestWithCookie("http://localhost/api/questionnaire/q-pending");
    const res = await deleteHandler(req, { params: Promise.resolve({ id: "q-pending" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(pm.patientQuestionnaireSession.delete).not.toHaveBeenCalled();
    expect(pm.patientQuestionnaireSession.update).toHaveBeenCalledWith({
      where: { id: "q-pending" },
      data: { deleted_at: expect.any(Date) },
    });
  });

  it("500 bei Datenbankfehler", async () => {
    mockSession(true, "acc-owner");
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-owner",
      deleted_at: null,
    });
    pm.patientQuestionnaireSession.update.mockRejectedValue(new Error("DB error"));
    const req = requestWithCookie("http://localhost/api/questionnaire/q-1");
    const res = await deleteHandler(req, { params: Promise.resolve({ id: "q-1" }) });
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });
});
