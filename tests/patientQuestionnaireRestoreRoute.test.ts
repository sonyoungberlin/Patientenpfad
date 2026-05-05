/**
 * Tests für POST /api/questionnaire/[id]/restore
 *
 * Prüft:
 * - 401 ohne Session
 * - 403 wenn Account nicht freigeschaltet
 * - 404 wenn Session nicht existiert
 * - 404 bei fremdem Account
 * - 404 wenn Session NICHT soft-gelöscht ist (Restore ist no-op)
 * - 200 + Restore (`deleted_at` zurück auf null) für eigene, soft-gelöschte
 * - kein anderes Feld wird beim Restore mitgeschrieben
 * - 500 bei DB-Fehler
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    session: {
      findUnique: jest.fn(),
    },
    patientQuestionnaireSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { POST as restoreHandler } from "@/app/api/questionnaire/[id]/restore/route";
import { SESSION_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type PrismaMock = {
  session: { findUnique: jest.Mock };
  patientQuestionnaireSession: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};

const pm = prisma as unknown as PrismaMock;

function requestWithCookie(url: string) {
  return new NextRequest(url, {
    method: "POST",
    headers: { Cookie: `${SESSION_COOKIE}=good-token` },
  });
}

function mockSession(
  is_approved: boolean,
  accountId = "acc-owner",
  patient_communication_enabled = true,
) {
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

describe("POST /api/questionnaire/[id]/restore", () => {
  it("401 ohne Session-Cookie", async () => {
    const req = new NextRequest("http://localhost/api/questionnaire/q-1/restore", {
      method: "POST",
    });
    const res = await restoreHandler(req, { params: Promise.resolve({ id: "q-1" }) });
    expect(res.status).toBe(401);
    expect(pm.patientQuestionnaireSession.update).not.toHaveBeenCalled();
  });

  it("403 wenn Account nicht freigeschaltet", async () => {
    mockSession(false);
    const req = requestWithCookie("http://localhost/api/questionnaire/q-1/restore");
    const res = await restoreHandler(req, { params: Promise.resolve({ id: "q-1" }) });
    expect(res.status).toBe(403);
    expect(pm.patientQuestionnaireSession.update).not.toHaveBeenCalled();
  });

  it("404 wenn Fragebogen nicht existiert", async () => {
    mockSession(true);
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue(null);
    const req = requestWithCookie("http://localhost/api/questionnaire/q-1/restore");
    const res = await restoreHandler(req, { params: Promise.resolve({ id: "q-1" }) });
    expect(res.status).toBe(404);
    expect(pm.patientQuestionnaireSession.update).not.toHaveBeenCalled();
  });

  it("404 bei fremdem Account (auch wenn soft-gelöscht)", async () => {
    mockSession(true, "acc-owner");
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-other",
      deleted_at: new Date("2026-05-01T10:00:00Z"),
    });
    const req = requestWithCookie("http://localhost/api/questionnaire/q-1/restore");
    const res = await restoreHandler(req, { params: Promise.resolve({ id: "q-1" }) });
    expect(res.status).toBe(404);
    expect(pm.patientQuestionnaireSession.update).not.toHaveBeenCalled();
  });

  it("404 wenn Session NICHT soft-gelöscht ist", async () => {
    mockSession(true, "acc-owner");
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-owner",
      deleted_at: null,
    });
    const req = requestWithCookie("http://localhost/api/questionnaire/q-active/restore");
    const res = await restoreHandler(req, {
      params: Promise.resolve({ id: "q-active" }),
    });
    expect(res.status).toBe(404);
    expect(pm.patientQuestionnaireSession.update).not.toHaveBeenCalled();
  });

  it("200 + Restore (setzt deleted_at zurück auf null) für Owner", async () => {
    mockSession(true, "acc-owner");
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-owner",
      deleted_at: new Date("2026-05-01T10:00:00Z"),
    });
    pm.patientQuestionnaireSession.update.mockResolvedValue({});
    const req = requestWithCookie("http://localhost/api/questionnaire/q-deleted/restore");
    const res = await restoreHandler(req, {
      params: Promise.resolve({ id: "q-deleted" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(pm.patientQuestionnaireSession.update).toHaveBeenCalledTimes(1);
    const call = pm.patientQuestionnaireSession.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: "q-deleted" });
    expect(call.data).toEqual({ deleted_at: null });
    // Es darf KEIN anderes Feld stillschweigend mitgeschrieben werden.
    expect(Object.keys(call.data)).toEqual(["deleted_at"]);
  });

  it("500 bei Datenbankfehler im Update", async () => {
    mockSession(true, "acc-owner");
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-owner",
      deleted_at: new Date("2026-05-01T10:00:00Z"),
    });
    pm.patientQuestionnaireSession.update.mockRejectedValue(new Error("DB error"));
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const req = requestWithCookie("http://localhost/api/questionnaire/q-1/restore");
    const res = await restoreHandler(req, { params: Promise.resolve({ id: "q-1" }) });
    expect(res.status).toBe(500);
    errSpy.mockRestore();
  });
});
