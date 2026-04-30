import { NextRequest } from "next/server";
import { DELETE as deleteHandler, GET as getHandler } from "@/app/api/inquiries/[id]/route";
import { SESSION_COOKIE } from "@/lib/auth";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    session: {
      findUnique: jest.fn(),
    },
    inquirySession: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

type PrismaMock = {
  session: { findUnique: jest.Mock };
  inquirySession: { findUnique: jest.Mock; delete: jest.Mock };
};

const pm = prisma as unknown as PrismaMock;

function requestWithCookie(url: string) {
  return new NextRequest(url, {
    method: "DELETE",
    headers: { Cookie: `${SESSION_COOKIE}=good-token` },
  });
}

function mockSessionAccount(
  is_approved: boolean,
  inquiry_assistant_enabled = true,
  accountId = "acc-owner",
) {
  pm.session.findUnique.mockResolvedValue({
    token: "good-token",
    expiresAt: new Date(Date.now() + 100_000),
    account: {
      id: accountId,
      email: "owner@example.com",
      is_approved,
      inquiry_assistant_enabled,
      is_admin: false,
    },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("DELETE /api/inquiries/[id]", () => {
  it("401 ohne Session", async () => {
    pm.session.findUnique.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/inquiries/sess-1", {
      method: "DELETE",
    });
    const res = await deleteHandler(req, { params: Promise.resolve({ id: "sess-1" }) });
    expect(res.status).toBe(401);
  });

  it("403 wenn Account nicht freigeschaltet", async () => {
    mockSessionAccount(false);
    const req = requestWithCookie("http://localhost/api/inquiries/sess-1");
    const res = await deleteHandler(req, { params: Promise.resolve({ id: "sess-1" }) });
    expect(res.status).toBe(403);
  });

  it("403 wenn inquiry_assistant_enabled=false und kein Admin", async () => {
    mockSessionAccount(true, false);
    const req = requestWithCookie("http://localhost/api/inquiries/sess-1");
    const res = await deleteHandler(req, { params: Promise.resolve({ id: "sess-1" }) });
    expect(res.status).toBe(403);
  });

  it("404 wenn Session nicht existiert", async () => {
    mockSessionAccount(true);
    pm.inquirySession.findUnique.mockResolvedValue(null);
    const req = requestWithCookie("http://localhost/api/inquiries/sess-1");
    const res = await deleteHandler(req, { params: Promise.resolve({ id: "sess-1" }) });
    expect(res.status).toBe(404);
  });

  it("404 wenn Session einem anderen Account gehört", async () => {
    mockSessionAccount(true, true, "acc-owner");
    pm.inquirySession.findUnique.mockResolvedValue({ id: "sess-1", owner_account_id: "acc-other" });
    const req = requestWithCookie("http://localhost/api/inquiries/sess-1");
    const res = await deleteHandler(req, { params: Promise.resolve({ id: "sess-1" }) });
    expect(res.status).toBe(404);
  });

  it("200 und löscht die Session", async () => {
    mockSessionAccount(true, true, "acc-owner");
    pm.inquirySession.findUnique.mockResolvedValue({
      id: "sess-1",
      owner_account_id: "acc-owner",
    });
    pm.inquirySession.delete.mockResolvedValue({});
    const req = requestWithCookie("http://localhost/api/inquiries/sess-1");
    const res = await deleteHandler(req, { params: Promise.resolve({ id: "sess-1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(pm.inquirySession.delete).toHaveBeenCalledWith({
      where: { id: "sess-1" },
    });
  });

  it("gelöschte Session erscheint nicht mehr in GET", async () => {
    // GET gibt 404 wenn Session nicht gefunden (simuliert gelöschten Zustand)
    mockSessionAccount(true, true, "acc-owner");
    pm.inquirySession.findUnique.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/inquiries/sess-1", {
      method: "GET",
      headers: { Cookie: `${SESSION_COOKIE}=good-token` },
    });
    const res = await getHandler(req, { params: Promise.resolve({ id: "sess-1" }) });
    expect(res.status).toBe(404);
  });

  it("Öffnen bestehender Sessions funktioniert unverändert", async () => {
    mockSessionAccount(true, true, "acc-owner");
    const existingSession = {
      id: "sess-existing",
      owner_account_id: "acc-owner",
      status: "DRAFT",
      selected_inquiry_ids: ["AU"],
      checkpoint_statuses: {},
      action_statuses: {},
      generated_output: null,
      confirmed_at: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    };
    pm.inquirySession.findUnique.mockResolvedValue(existingSession);
    const req = new NextRequest("http://localhost/api/inquiries/sess-existing", {
      method: "GET",
      headers: { Cookie: `${SESSION_COOKIE}=good-token` },
    });
    const res = await getHandler(req, { params: Promise.resolve({ id: "sess-existing" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.session.id).toBe("sess-existing");
  });
});
