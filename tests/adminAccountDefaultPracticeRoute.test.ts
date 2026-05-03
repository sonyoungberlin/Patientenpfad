/**
 * Tests für POST /api/admin/accounts/[id]/default-practice.
 *
 * Prüft Auth-Gate, Validierung, Account-Existenz, Membership-Pflicht beim
 * Setzen, JSON- und Form-Modus, sowie clear → null.
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    account: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    practiceMembership: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
  getSessionAccountFromCookies: jest.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import { POST } from "@/app/api/admin/accounts/[id]/default-practice/route";

type PrismaMock = {
  account: { findUnique: jest.Mock; update: jest.Mock };
  practiceMembership: { findUnique: jest.Mock };
};
const pm = prisma as unknown as PrismaMock;
const getSessionAccountMock = getSessionAccount as jest.Mock;

function adminAccount() {
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
  };
}

function jsonReq(id: string, body: unknown) {
  return new NextRequest(
    `http://localhost/api/admin/accounts/${id}/default-practice`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

function formReq(id: string, fields: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) params.append(k, v);
  return new NextRequest(
    `http://localhost/api/admin/accounts/${id}/default-practice`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    },
  );
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  jest.clearAllMocks();
});

describe("POST /api/admin/accounts/[id]/default-practice", () => {
  it("401 ohne Session", async () => {
    getSessionAccountMock.mockResolvedValue(null);
    const res = await POST(jsonReq("acc-1", { action: "clear" }), ctx("acc-1"));
    expect(res.status).toBe(401);
    expect(pm.account.update).not.toHaveBeenCalled();
  });

  it("403 wenn kein Admin", async () => {
    getSessionAccountMock.mockResolvedValue({
      ...adminAccount(),
      is_admin: false,
    });
    const res = await POST(jsonReq("acc-1", { action: "clear" }), ctx("acc-1"));
    expect(res.status).toBe(403);
    expect(pm.account.update).not.toHaveBeenCalled();
  });

  it("400 bei fehlender action (JSON)", async () => {
    getSessionAccountMock.mockResolvedValue(adminAccount());
    const res = await POST(jsonReq("acc-1", {}), ctx("acc-1"));
    expect(res.status).toBe(400);
    expect(pm.account.findUnique).not.toHaveBeenCalled();
  });

  it("400 bei action=set ohne practice_id", async () => {
    getSessionAccountMock.mockResolvedValue(adminAccount());
    const res = await POST(jsonReq("acc-1", { action: "set" }), ctx("acc-1"));
    expect(res.status).toBe(400);
    expect(pm.account.findUnique).not.toHaveBeenCalled();
  });

  it("404 wenn Account nicht existiert", async () => {
    getSessionAccountMock.mockResolvedValue(adminAccount());
    pm.account.findUnique.mockResolvedValue(null);
    const res = await POST(
      jsonReq("acc-x", { action: "set", practice_id: "p-1" }),
      ctx("acc-x"),
    );
    expect(res.status).toBe(404);
    expect(pm.practiceMembership.findUnique).not.toHaveBeenCalled();
    expect(pm.account.update).not.toHaveBeenCalled();
  });

  it("409 beim Setzen ohne Membership", async () => {
    getSessionAccountMock.mockResolvedValue(adminAccount());
    pm.account.findUnique.mockResolvedValue({
      id: "acc-1",
      email: "u@example.com",
    });
    pm.practiceMembership.findUnique.mockResolvedValue(null);
    const res = await POST(
      jsonReq("acc-1", { action: "set", practice_id: "p-foreign" }),
      ctx("acc-1"),
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/kein Mitglied/i);
    expect(pm.account.update).not.toHaveBeenCalled();
  });

  it("setzt default_practice_id wenn Membership existiert (JSON)", async () => {
    getSessionAccountMock.mockResolvedValue(adminAccount());
    pm.account.findUnique.mockResolvedValue({
      id: "acc-1",
      email: "u@example.com",
    });
    pm.practiceMembership.findUnique.mockResolvedValue({ id: "m-1" });
    pm.account.update.mockResolvedValue({});
    const res = await POST(
      jsonReq("acc-1", { action: "set", practice_id: "p-pilot" }),
      ctx("acc-1"),
    );
    expect(res.status).toBe(200);
    expect(pm.account.update).toHaveBeenCalledWith({
      where: { id: "acc-1" },
      data: { default_practice_id: "p-pilot" },
    });
    // Account-ID wird strikt aus URL übernommen, nicht aus Body.
    expect(pm.account.findUnique).toHaveBeenCalledWith({
      where: { id: "acc-1" },
      select: { id: true, email: true },
    });
  });

  it("clear setzt default_practice_id auf null", async () => {
    getSessionAccountMock.mockResolvedValue(adminAccount());
    pm.account.findUnique.mockResolvedValue({
      id: "acc-1",
      email: "u@example.com",
    });
    pm.account.update.mockResolvedValue({});
    const res = await POST(jsonReq("acc-1", { action: "clear" }), ctx("acc-1"));
    expect(res.status).toBe(200);
    expect(pm.practiceMembership.findUnique).not.toHaveBeenCalled();
    expect(pm.account.update).toHaveBeenCalledWith({
      where: { id: "acc-1" },
      data: { default_practice_id: null },
    });
  });

  it("Form-Modus: 303-Redirect mit ?defaultSet bei Erfolg", async () => {
    getSessionAccountMock.mockResolvedValue(adminAccount());
    pm.account.findUnique.mockResolvedValue({
      id: "acc-1",
      email: "u@example.com",
    });
    pm.practiceMembership.findUnique.mockResolvedValue({ id: "m-1" });
    pm.account.update.mockResolvedValue({});
    const res = await POST(
      formReq("acc-1", {
        action: "set",
        practice_id: "p-pilot",
        redirect_practice_id: "p-pilot",
      }),
      ctx("acc-1"),
    );
    expect(res.status).toBe(303);
    const loc = res.headers.get("location") ?? "";
    expect(loc).toContain("/admin/practices/p-pilot");
    expect(loc).toContain("defaultSet=u%40example.com");
  });

  it("Form-Modus: 303-Redirect mit ?defaultCleared bei clear", async () => {
    getSessionAccountMock.mockResolvedValue(adminAccount());
    pm.account.findUnique.mockResolvedValue({
      id: "acc-1",
      email: "u@example.com",
    });
    pm.account.update.mockResolvedValue({});
    const res = await POST(
      formReq("acc-1", {
        action: "clear",
        redirect_practice_id: "p-pilot",
      }),
      ctx("acc-1"),
    );
    expect(res.status).toBe(303);
    const loc = res.headers.get("location") ?? "";
    expect(loc).toContain("/admin/practices/p-pilot");
    expect(loc).toContain("defaultCleared=u%40example.com");
  });

  it("Form-Modus: 303-Redirect mit ?error bei fehlender Membership", async () => {
    getSessionAccountMock.mockResolvedValue(adminAccount());
    pm.account.findUnique.mockResolvedValue({
      id: "acc-1",
      email: "u@example.com",
    });
    pm.practiceMembership.findUnique.mockResolvedValue(null);
    const res = await POST(
      formReq("acc-1", {
        action: "set",
        practice_id: "p-foreign",
        redirect_practice_id: "p-foreign",
      }),
      ctx("acc-1"),
    );
    expect(res.status).toBe(303);
    const loc = res.headers.get("location") ?? "";
    expect(loc).toContain("/admin/practices/p-foreign");
    expect(loc).toContain("error=");
  });
});
