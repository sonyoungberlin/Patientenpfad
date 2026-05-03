/**
 * Phase P4b: Tests für POST /api/practice/members.
 *
 * Prüft Auth-Gate (OWNER/ADMIN, kein USER, kein Plattform-Admin-Bypass),
 * Validierung (E-Mail, Rolle, OWNER explizit blockiert), Account-Existenz-
 * Lookup, Self-Add, P2002 → 409, sowie practice_id strikt aus Session.
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    account: {
      findUnique: jest.fn(),
    },
    practiceMembership: {
      create: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
  getSessionAccountFromCookies: jest.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import { POST } from "@/app/api/practice/members/route";

type PrismaMock = {
  account: { findUnique: jest.Mock };
  practiceMembership: { create: jest.Mock };
};
const pm = prisma as unknown as PrismaMock;
const getSessionAccountMock = getSessionAccount as jest.Mock;

const PRACTICE = {
  id: "p-1",
  slug: "p1",
  name: "P1",
  is_approved: true,
  inquiry_assistant_enabled: false,
  patient_communication_enabled: true,
  website_forms_enabled: true,
};

function makeAccount(role: "OWNER" | "ADMIN" | "USER" | "NONE") {
  return {
    id: "acc-self",
    email: "self@example.com",
    is_approved: true,
    is_admin: false,
    inquiry_assistant_enabled: false,
    patient_communication_enabled: true,
    website_forms_enabled: true,
    current_practice: role === "NONE" ? null : PRACTICE,
    memberships:
      role === "NONE" ? [] : [{ practice_id: "p-1", role }],
  };
}

function jsonReq(body: unknown) {
  return new NextRequest("http://localhost/api/practice/members", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function formReq(fields: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) params.append(k, v);
  return new NextRequest("http://localhost/api/practice/members", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
}

beforeEach(() => {
  pm.account.findUnique.mockReset();
  pm.practiceMembership.create.mockReset();
  getSessionAccountMock.mockReset();
});

describe("POST /api/practice/members — Auth-Gate", () => {
  it("401 ohne Session", async () => {
    getSessionAccountMock.mockResolvedValue(null);
    const res = await POST(
      jsonReq({ email: "x@y.de", role: "USER" }),
    );
    expect(res.status).toBe(401);
    expect(pm.account.findUnique).not.toHaveBeenCalled();
    expect(pm.practiceMembership.create).not.toHaveBeenCalled();
  });

  it("403 für USER (Rolle nicht ausreichend)", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount("USER"));
    const res = await POST(
      jsonReq({ email: "x@y.de", role: "USER" }),
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("Rolle nicht ausreichend.");
    expect(pm.account.findUnique).not.toHaveBeenCalled();
    expect(pm.practiceMembership.create).not.toHaveBeenCalled();
  });

  it("403 für Plattform-Admin ohne Membership (kein Bypass)", async () => {
    getSessionAccountMock.mockResolvedValue({
      ...makeAccount("NONE"),
      is_admin: true,
    });
    const res = await POST(
      jsonReq({ email: "x@y.de", role: "USER" }),
    );
    expect(res.status).toBe(403);
    expect(pm.practiceMembership.create).not.toHaveBeenCalled();
  });
});

describe("POST /api/practice/members — Validierung", () => {
  beforeEach(() => {
    getSessionAccountMock.mockResolvedValue(makeAccount("OWNER"));
  });

  it("400 bei ungültiger E-Mail", async () => {
    const res = await POST(
      jsonReq({ email: "not-an-email", role: "USER" }),
    );
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.fieldErrors.email).toBeTruthy();
    expect(pm.account.findUnique).not.toHaveBeenCalled();
    expect(pm.practiceMembership.create).not.toHaveBeenCalled();
  });

  it("400 wenn Rolle OWNER (auch für OWNER-Aufrufer)", async () => {
    const res = await POST(
      jsonReq({ email: "neu@example.com", role: "OWNER" }),
    );
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.fieldErrors.role).toBe(
      "OWNER kann in dieser Phase nicht vergeben werden.",
    );
    expect(pm.account.findUnique).not.toHaveBeenCalled();
    expect(pm.practiceMembership.create).not.toHaveBeenCalled();
  });

  it("400 wenn Rolle OWNER (auch für ADMIN-Aufrufer)", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount("ADMIN"));
    const res = await POST(
      jsonReq({ email: "neu@example.com", role: "OWNER" }),
    );
    expect(res.status).toBe(400);
    expect(pm.practiceMembership.create).not.toHaveBeenCalled();
  });

  it("400 bei unbekannter Rolle", async () => {
    const res = await POST(
      jsonReq({ email: "neu@example.com", role: "BANANA" }),
    );
    expect(res.status).toBe(400);
    expect(pm.practiceMembership.create).not.toHaveBeenCalled();
  });

  it("400 bei ungültigem JSON", async () => {
    const req = new NextRequest("http://localhost/api/practice/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(pm.practiceMembership.create).not.toHaveBeenCalled();
  });
});

describe("POST /api/practice/members — Account-Lookup", () => {
  beforeEach(() => {
    getSessionAccountMock.mockResolvedValue(makeAccount("OWNER"));
  });

  it("404 wenn kein Account zur E-Mail existiert (kein Account-Create)", async () => {
    pm.account.findUnique.mockResolvedValue(null);
    const res = await POST(
      jsonReq({ email: "unknown@example.com", role: "USER" }),
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe(
      "Kein Account mit dieser E-Mail vorhanden.",
    );
    expect(pm.practiceMembership.create).not.toHaveBeenCalled();
  });

  it("409 bei Self-Add", async () => {
    pm.account.findUnique.mockResolvedValue({
      id: "acc-self",
      email: "self@example.com",
    });
    const res = await POST(
      jsonReq({ email: "self@example.com", role: "USER" }),
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(
      "Du bist bereits Mitglied dieser Praxis.",
    );
    expect(pm.practiceMembership.create).not.toHaveBeenCalled();
  });
});

describe("POST /api/practice/members — Happy Path", () => {
  beforeEach(() => {
    pm.account.findUnique.mockResolvedValue({
      id: "acc-2",
      email: "neu@example.com",
    });
    pm.practiceMembership.create.mockResolvedValue({
      id: "m-1",
      account_id: "acc-2",
      role: "USER",
    });
  });

  it("OWNER fügt USER hinzu (JSON, 201)", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount("OWNER"));
    const res = await POST(
      jsonReq({ email: "neu@example.com", role: "USER" }),
    );
    expect(res.status).toBe(201);
    const j = await res.json();
    expect(j).toEqual({
      ok: true,
      membership: {
        id: "m-1",
        account_id: "acc-2",
        email: "neu@example.com",
        role: "USER",
      },
    });
    const args = pm.practiceMembership.create.mock.calls[0][0];
    expect(args.data).toEqual({
      account_id: "acc-2",
      practice_id: "p-1",
      role: "USER",
    });
  });

  it("ADMIN fügt USER hinzu (JSON, 201)", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount("ADMIN"));
    const res = await POST(
      jsonReq({ email: "neu@example.com", role: "USER" }),
    );
    expect(res.status).toBe(201);
    expect(pm.practiceMembership.create).toHaveBeenCalledTimes(1);
  });

  it("OWNER fügt ADMIN hinzu (JSON, 201)", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount("OWNER"));
    pm.practiceMembership.create.mockResolvedValue({
      id: "m-2",
      account_id: "acc-2",
      role: "ADMIN",
    });
    const res = await POST(
      jsonReq({ email: "neu@example.com", role: "ADMIN" }),
    );
    expect(res.status).toBe(201);
    const args = pm.practiceMembership.create.mock.calls[0][0];
    expect(args.data.role).toBe("ADMIN");
  });

  it("ADMIN fügt ADMIN hinzu (JSON, 201)", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount("ADMIN"));
    pm.practiceMembership.create.mockResolvedValue({
      id: "m-3",
      account_id: "acc-2",
      role: "ADMIN",
    });
    const res = await POST(
      jsonReq({ email: "neu@example.com", role: "ADMIN" }),
    );
    expect(res.status).toBe(201);
  });

  it("ignoriert practice_id aus Body und nutzt practice_id aus Session", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount("OWNER"));
    await POST(
      jsonReq({
        email: "neu@example.com",
        role: "USER",
        practice_id: "p-EVIL",
        practiceId: "p-EVIL",
      } as Record<string, unknown>),
    );
    const args = pm.practiceMembership.create.mock.calls[0][0];
    expect(args.data.practice_id).toBe("p-1");
  });

  it("normalisiert E-Mail vor Lookup (lowercase + trim)", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount("OWNER"));
    await POST(
      jsonReq({ email: "  NEU@Example.COM ", role: "USER" }),
    );
    expect(pm.account.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "neu@example.com" } }),
    );
  });

  it("Form-encoded: 303-Redirect mit ?added=<email>", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount("OWNER"));
    const res = await POST(
      formReq({ email: "neu@example.com", role: "USER" }),
    );
    expect(res.status).toBe(303);
    const loc = res.headers.get("location") ?? "";
    expect(loc).toContain("/practice/members");
    expect(loc).toContain("added=neu");
  });
});

describe("POST /api/practice/members — Konflikte", () => {
  it("409 bei Prisma P2002 (bereits Mitglied)", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount("OWNER"));
    pm.account.findUnique.mockResolvedValue({
      id: "acc-2",
      email: "neu@example.com",
    });
    const { Prisma } = await import("@prisma/client");
    pm.practiceMembership.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    const res = await POST(
      jsonReq({ email: "neu@example.com", role: "USER" }),
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(
      "Account ist bereits Mitglied dieser Praxis.",
    );
  });

  it("Form-encoded Fehler: 303-Redirect mit ?error=…", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount("OWNER"));
    pm.account.findUnique.mockResolvedValue(null);
    const res = await POST(
      formReq({ email: "unknown@example.com", role: "USER" }),
    );
    expect(res.status).toBe(303);
    const loc = res.headers.get("location") ?? "";
    expect(loc).toContain("/practice/members");
    expect(loc).toContain("error=");
  });

  it("Form-encoded Validierungsfehler: 303 ohne Prisma-Aufruf", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount("OWNER"));
    const res = await POST(
      formReq({ email: "not-an-email", role: "USER" }),
    );
    expect(res.status).toBe(303);
    expect(pm.account.findUnique).not.toHaveBeenCalled();
    expect(pm.practiceMembership.create).not.toHaveBeenCalled();
  });
});
