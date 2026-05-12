/**
 * Tests für POST /api/admin/practices/[id] (Flag-Toggle).
 *
 * Prüft Auth-Gate (nur Plattform-Admin), Whitelist von Flags,
 * Boolean-Wert-Validierung, Practice-Existenz (P2025 → 404), und dass
 * tatsächlich nur auf `Practice` (nicht auf `Account`) geschrieben wird.
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    practice: {
      update: jest.fn(),
    },
    account: {
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
  getSessionAccountFromCookies: jest.fn(),
}));

jest.mock("@/lib/adminActions", () => ({
  deletePracticeById: jest.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import { deletePracticeById } from "@/lib/adminActions";
import { POST } from "@/app/api/admin/practices/[id]/route";

type PrismaMock = {
  practice: { update: jest.Mock };
  account: { update: jest.Mock };
};
const pm = prisma as unknown as PrismaMock;
const getSessionAccountMock = getSessionAccount as jest.Mock;
const deletePracticeByIdMock = deletePracticeById as jest.Mock;

function adminAccount(over: Partial<{ is_admin: boolean }> = {}) {
  return {
    id: "acc-admin",
    email: "admin@example.com",
    is_approved: true,
    is_admin: true,
    inquiry_assistant_enabled: false,
    patient_communication_enabled: false,
    website_forms_enabled: false,
    current_practice: null,
    memberships: [],
    ...over,
  };
}

function jsonReq(id: string, body: unknown) {
  return new NextRequest(`http://localhost/api/admin/practices/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function formReq(id: string, fields: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) params.append(k, v);
  return new NextRequest(`http://localhost/api/admin/practices/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  pm.practice.update.mockReset();
  pm.account.update.mockReset();
  getSessionAccountMock.mockReset();
  deletePracticeByIdMock.mockReset();
});

describe("POST /api/admin/practices/[id] — Auth-Gate", () => {
  it("401 ohne Session", async () => {
    getSessionAccountMock.mockResolvedValue(null);
    const res = await POST(
      jsonReq("p-1", { flag: "is_approved", value: true }),
      ctx("p-1"),
    );
    expect(res.status).toBe(401);
    expect(pm.practice.update).not.toHaveBeenCalled();
  });

  it("403 wenn is_admin = false", async () => {
    getSessionAccountMock.mockResolvedValue(
      adminAccount({ is_admin: false }),
    );
    const res = await POST(
      jsonReq("p-1", { flag: "is_approved", value: true }),
      ctx("p-1"),
    );
    expect(res.status).toBe(403);
    expect(pm.practice.update).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/practices/[id] — Validierung", () => {
  beforeEach(() => {
    getSessionAccountMock.mockResolvedValue(adminAccount());
  });

  it("400 bei unbekanntem Flag", async () => {
    const res = await POST(
      jsonReq("p-1", { flag: "is_admin", value: true }),
      ctx("p-1"),
    );
    expect(res.status).toBe(400);
    expect(pm.practice.update).not.toHaveBeenCalled();
  });

  it("400 bei fehlendem Flag", async () => {
    const res = await POST(jsonReq("p-1", { value: true }), ctx("p-1"));
    expect(res.status).toBe(400);
  });

  it("400 bei ungültigem Wert", async () => {
    const res = await POST(
      jsonReq("p-1", { flag: "is_approved", value: "yes" }),
      ctx("p-1"),
    );
    expect(res.status).toBe(400);
    expect(pm.practice.update).not.toHaveBeenCalled();
  });

  it("400 bei ungültigem JSON", async () => {
    const req = new NextRequest("http://localhost/api/admin/practices/p-1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not-json",
    });
    const res = await POST(req, ctx("p-1"));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/admin/practices/[id] — Happy Path", () => {
  beforeEach(() => {
    getSessionAccountMock.mockResolvedValue(adminAccount());
    pm.practice.update.mockResolvedValue({
      id: "p-1",
      is_approved: true,
      inquiry_assistant_enabled: false,
      patient_communication_enabled: false,
      website_forms_enabled: false,
    });
  });

  it.each([
    "is_approved",
    "inquiry_assistant_enabled",
    "patient_communication_enabled",
    "website_forms_enabled",
  ])("schreibt nur auf Practice für Flag %s", async (flag) => {
    const res = await POST(jsonReq("p-1", { flag, value: true }), ctx("p-1"));
    expect(res.status).toBe(200);
    const args = pm.practice.update.mock.calls[0][0];
    expect(args.where).toEqual({ id: "p-1" });
    expect(args.data).toEqual({ [flag]: true });
    // Bewusst keine Account-Spiegelung — Account-Spalten sind Legacy.
    expect(pm.account.update).not.toHaveBeenCalled();
  });

  it("akzeptiert value=false", async () => {
    const res = await POST(
      jsonReq("p-1", { flag: "is_approved", value: false }),
      ctx("p-1"),
    );
    expect(res.status).toBe(200);
    const args = pm.practice.update.mock.calls[0][0];
    expect(args.data).toEqual({ is_approved: false });
  });

  it('akzeptiert string "true" / "false" (Form-Pfad)', async () => {
    const res = await POST(
      formReq("p-1", { flag: "is_approved", value: "false" }),
      ctx("p-1"),
    );
    expect(res.status).toBe(303);
    const args = pm.practice.update.mock.calls[0][0];
    expect(args.data).toEqual({ is_approved: false });
  });

  it("Form-encoded: 303-Redirect mit ?toggled=<flag>", async () => {
    const res = await POST(
      formReq("p-1", { flag: "website_forms_enabled", value: "true" }),
      ctx("p-1"),
    );
    expect(res.status).toBe(303);
    const loc = res.headers.get("location") ?? "";
    expect(loc).toContain("/admin/practices/p-1");
    expect(loc).toContain("toggled=website_forms_enabled");
  });
});

describe("POST /api/admin/practices/[id] — Fehler", () => {
  beforeEach(() => {
    getSessionAccountMock.mockResolvedValue(adminAccount());
  });

  it("404 bei unbekannter Practice (P2025)", async () => {
    const { Prisma } = await import("@prisma/client");
    pm.practice.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Not found", {
        code: "P2025",
        clientVersion: "test",
      }),
    );
    const res = await POST(
      jsonReq("p-missing", { flag: "is_approved", value: true }),
      ctx("p-missing"),
    );
    expect(res.status).toBe(404);
  });

  it("Form-Pfad: 303-Redirect mit ?error=… bei P2025", async () => {
    const { Prisma } = await import("@prisma/client");
    pm.practice.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Not found", {
        code: "P2025",
        clientVersion: "test",
      }),
    );
    const res = await POST(
      formReq("p-missing", { flag: "is_approved", value: "true" }),
      ctx("p-missing"),
    );
    expect(res.status).toBe(303);
    const loc = res.headers.get("location") ?? "";
    expect(loc).toContain("/admin/practices/p-missing");
    expect(loc).toContain("error=");
  });
});

describe("POST /api/admin/practices/[id] — delete_practice", () => {
  it("403 wenn kein Admin", async () => {
    getSessionAccountMock.mockResolvedValue(adminAccount({ is_admin: false }));
    const res = await POST(
      jsonReq("p-1", { action: "delete_practice", confirmName: "Praxis Eins" }),
      ctx("p-1"),
    );
    expect(res.status).toBe(403);
    expect(deletePracticeByIdMock).not.toHaveBeenCalled();
  });

  it("400 bei falschem confirmName", async () => {
    getSessionAccountMock.mockResolvedValue(adminAccount());
    deletePracticeByIdMock.mockResolvedValue({
      ok: false,
      deleted: false,
      status: 400,
      code: "confirm_name_mismatch",
      error: "Bitte den Praxisnamen exakt bestätigen.",
    });
    const res = await POST(
      jsonReq("p-1", { action: "delete_practice", confirmName: "falsch" }),
      ctx("p-1"),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("confirm_name_mismatch");
  });

  it("404 bei unbekannter Practice", async () => {
    getSessionAccountMock.mockResolvedValue(adminAccount());
    deletePracticeByIdMock.mockResolvedValue({
      ok: false,
      deleted: false,
      status: 404,
      code: "practice_not_found",
      error: "Practice nicht gefunden.",
    });
    const res = await POST(
      jsonReq("p-missing", { action: "delete_practice", confirmName: "Praxis" }),
      ctx("p-missing"),
    );
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.code).toBe("practice_not_found");
  });

  it("409 mit Blockern wenn nicht leer", async () => {
    getSessionAccountMock.mockResolvedValue(adminAccount());
    deletePracticeByIdMock.mockResolvedValue({
      ok: false,
      deleted: false,
      status: 409,
      code: "practice_not_empty",
      error: "Praxis kann nicht gelöscht werden, solange noch Daten vorhanden sind.",
      blockers: [{ model: "CaseSession", count: 2, reason: "not_empty" }],
    });
    const res = await POST(
      jsonReq("p-1", { action: "delete_practice", confirmName: "Praxis Eins" }),
      ctx("p-1"),
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("practice_not_empty");
    expect(json.blockers).toHaveLength(1);
  });

  it("200 wenn leer und gelöscht", async () => {
    getSessionAccountMock.mockResolvedValue(adminAccount());
    deletePracticeByIdMock.mockResolvedValue({
      ok: true,
      deleted: true,
      status: 200,
      code: "practice_deleted",
      practiceId: "p-1",
      name: "Praxis Eins",
    });
    const res = await POST(
      jsonReq("p-1", { action: "delete_practice", confirmName: "Praxis Eins" }),
      ctx("p-1"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.code).toBe("practice_deleted");
    expect(deletePracticeByIdMock).toHaveBeenCalledWith("p-1", "Praxis Eins");
  });
});
