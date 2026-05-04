/**
 * Tests für GET/PUT /api/practice/signature.
 *
 * Prüft Auth-Gate (OWNER/ADMIN/USER lesen, nur OWNER/ADMIN schreiben,
 * kein Plattform-Admin-Bypass), 300-Zeichen-Trim, Body-Validierung sowie
 * dass die `practice_id` strikt aus der Session genommen wird.
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    practice: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
  getSessionAccountFromCookies: jest.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import { GET, PUT } from "@/app/api/practice/signature/route";

type PrismaMock = {
  practice: { findUnique: jest.Mock; update: jest.Mock };
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

function makeAccount(role: "OWNER" | "ADMIN" | "USER" | "NONE", opts?: { isAdmin?: boolean }) {
  return {
    id: "acc-self",
    email: "self@example.com",
    is_approved: true,
    is_admin: opts?.isAdmin ?? false,
    inquiry_assistant_enabled: false,
    patient_communication_enabled: true,
    website_forms_enabled: true,
    current_practice: role === "NONE" ? null : PRACTICE,
    memberships:
      role === "NONE" ? [] : [{ practice_id: "p-1", role }],
  };
}

function getReq() {
  return new NextRequest("http://localhost/api/practice/signature", {
    method: "GET",
  });
}

function putReq(body: unknown) {
  return new NextRequest("http://localhost/api/practice/signature", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  pm.practice.findUnique.mockReset();
  pm.practice.update.mockReset();
  getSessionAccountMock.mockReset();
});

describe("GET /api/practice/signature", () => {
  it("401 wenn nicht eingeloggt", async () => {
    getSessionAccountMock.mockResolvedValue(null);
    const res = await GET(getReq());
    expect(res.status).toBe(401);
  });

  it("liefert Signatur für USER der Practice", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount("USER"));
    pm.practice.findUnique.mockResolvedValue({
      message_signature: "Mit freundlichen Grüßen",
    });
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ ok: true, signature: "Mit freundlichen Grüßen" });
    expect(pm.practice.findUnique).toHaveBeenCalledWith({
      where: { id: "p-1" },
      select: { message_signature: true },
    });
  });

  it("liefert leere Signatur wenn keine gespeichert", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount("ADMIN"));
    pm.practice.findUnique.mockResolvedValue({ message_signature: null });
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ ok: true, signature: "" });
  });

  it("403 wenn Account keine Practice hat (kein is_admin-Bypass)", async () => {
    getSessionAccountMock.mockResolvedValue(
      makeAccount("NONE", { isAdmin: true }),
    );
    const res = await GET(getReq());
    expect(res.status).toBe(403);
    expect(pm.practice.findUnique).not.toHaveBeenCalled();
  });
});

describe("PUT /api/practice/signature", () => {
  it("401 wenn nicht eingeloggt", async () => {
    getSessionAccountMock.mockResolvedValue(null);
    const res = await PUT(putReq({ signature: "Hallo" }));
    expect(res.status).toBe(401);
    expect(pm.practice.update).not.toHaveBeenCalled();
  });

  it("403 wenn USER (nur OWNER/ADMIN dürfen schreiben)", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount("USER"));
    const res = await PUT(putReq({ signature: "Hallo" }));
    expect(res.status).toBe(403);
    expect(pm.practice.update).not.toHaveBeenCalled();
  });

  it("403 für Plattform-Admin ohne Membership (kein is_admin-Bypass)", async () => {
    getSessionAccountMock.mockResolvedValue(
      makeAccount("NONE", { isAdmin: true }),
    );
    const res = await PUT(putReq({ signature: "Hallo" }));
    expect(res.status).toBe(403);
    expect(pm.practice.update).not.toHaveBeenCalled();
  });

  it("speichert für OWNER", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount("OWNER"));
    pm.practice.update.mockResolvedValue({});
    const res = await PUT(putReq({ signature: "Sig OWNER" }));
    expect(res.status).toBe(200);
    expect(pm.practice.update).toHaveBeenCalledWith({
      where: { id: "p-1" },
      data: { message_signature: "Sig OWNER" },
    });
  });

  it("speichert für ADMIN und schneidet auf 300 Zeichen", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount("ADMIN"));
    pm.practice.update.mockResolvedValue({});
    const long = "x".repeat(500);
    const res = await PUT(putReq({ signature: long }));
    expect(res.status).toBe(200);
    expect(pm.practice.update).toHaveBeenCalledTimes(1);
    const call = pm.practice.update.mock.calls[0][0];
    expect(call.data.message_signature.length).toBe(300);
  });

  it("speichert NULL wenn leerer String übergeben wird", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount("ADMIN"));
    pm.practice.update.mockResolvedValue({});
    const res = await PUT(putReq({ signature: "" }));
    expect(res.status).toBe(200);
    const call = pm.practice.update.mock.calls[0][0];
    expect(call.data.message_signature).toBeNull();
  });

  it("400 bei ungültigem Body", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount("OWNER"));
    const res = await PUT(putReq({ foo: "bar" }));
    expect(res.status).toBe(400);
    expect(pm.practice.update).not.toHaveBeenCalled();
  });

  it("ignoriert practice_id aus dem Body — nimmt strikt aus Session", async () => {
    getSessionAccountMock.mockResolvedValue(makeAccount("ADMIN"));
    pm.practice.update.mockResolvedValue({});
    const res = await PUT(
      putReq({
        signature: "Hallo",
        // Versuch, eine andere Practice zu treffen — muss ignoriert werden.
        practice_id: "p-other",
      }),
    );
    expect(res.status).toBe(200);
    const call = pm.practice.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: "p-1" });
  });
});
