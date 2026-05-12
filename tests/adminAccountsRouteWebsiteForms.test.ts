/**
 * Phase 3a: Tests für die neuen Actions
 *   - enable_website_forms
 *   - disable_website_forms
 * an POST /api/admin/accounts (JSON + form-encoded).
 *
 * Stellt zudem sicher, dass GET /api/admin/accounts das Feld
 * `website_forms_enabled` mit ausliefert.
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    session: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    account: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/adminActions", () => ({
  approveAccount: jest.fn(),
  revokeAccount: jest.fn(),
  enableInquiryAssistant: jest.fn(),
  disableInquiryAssistant: jest.fn(),
  enablePatientCommunication: jest.fn(),
  disablePatientCommunication: jest.fn(),
  enableWebsiteForms: jest.fn(),
  disableWebsiteForms: jest.fn(),
  deleteAccount: jest.fn(),
}));

import { prisma } from "@/lib/prisma";
import {
  enableWebsiteForms,
  disableWebsiteForms,
} from "@/lib/adminActions";
import {
  GET as getHandler,
  POST as postHandler,
} from "@/app/api/admin/accounts/route";
import { SESSION_COOKIE } from "@/lib/auth";

type PrismaMock = {
  session: { findUnique: jest.Mock; delete: jest.Mock };
  account: { findMany: jest.Mock };
};

const pm = prisma as unknown as PrismaMock;
const mockEnable = enableWebsiteForms as jest.Mock;
const mockDisable = disableWebsiteForms as jest.Mock;

function adminRequest(
  url: string,
  opts?: { method?: string; body?: string; headers?: Record<string, string> },
) {
  return new NextRequest(url, {
    method: opts?.method,
    body: opts?.body,
    headers: { ...(opts?.headers ?? {}), Cookie: `${SESSION_COOKIE}=good-token` },
  });
}

function mockAdminSession(is_admin = true) {
  pm.session.findUnique.mockResolvedValue({
    token: "good-token",
    expiresAt: new Date(Date.now() + 100_000),
    account: {
      id: "acc-admin",
      email: "admin@example.com",
      is_approved: true,
      is_admin,
    },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/admin/accounts (Phase 3a)", () => {
  it("selektiert website_forms_enabled mit", async () => {
    mockAdminSession(true);
    pm.account.findMany.mockResolvedValue([]);

    await getHandler(adminRequest("http://localhost/api/admin/accounts"));

    expect(pm.account.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          website_forms_enabled: true,
        }),
      }),
    );
  });
});

describe("POST /api/admin/accounts → enable_website_forms (JSON)", () => {
  it("ruft enableWebsiteForms auf und antwortet 200", async () => {
    mockAdminSession(true);
    mockEnable.mockResolvedValue({ ok: true, message: "Website-Formulare aktiviert" });

    const res = await postHandler(
      adminRequest("http://localhost/api/admin/accounts", {
        method: "POST",
        body: JSON.stringify({
          email: "praxis@example.com",
          action: "enable_website_forms",
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(res.status).toBe(200);
    expect(mockEnable).toHaveBeenCalledWith("praxis@example.com");
    expect(mockDisable).not.toHaveBeenCalled();
  });

  it("liefert 404 wenn Account nicht existiert", async () => {
    mockAdminSession(true);
    mockEnable.mockResolvedValue({ ok: false, message: "Kein Account ..." });

    const res = await postHandler(
      adminRequest("http://localhost/api/admin/accounts", {
        method: "POST",
        body: JSON.stringify({
          email: "nope@example.com",
          action: "enable_website_forms",
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(res.status).toBe(404);
  });
});

describe("POST /api/admin/accounts → disable_website_forms (JSON)", () => {
  it("ruft disableWebsiteForms auf", async () => {
    mockAdminSession(true);
    mockDisable.mockResolvedValue({ ok: true, message: "Website-Formulare deaktiviert" });

    const res = await postHandler(
      adminRequest("http://localhost/api/admin/accounts", {
        method: "POST",
        body: JSON.stringify({
          email: "praxis@example.com",
          action: "disable_website_forms",
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(res.status).toBe(200);
    expect(mockDisable).toHaveBeenCalledWith("praxis@example.com");
    expect(mockEnable).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/accounts → enable_website_forms (form-encoded)", () => {
  it("redirectet 303 zurück auf /admin/accounts", async () => {
    mockAdminSession(true);
    mockEnable.mockResolvedValue({ ok: true, message: "Website-Formulare aktiviert" });

    const form = new URLSearchParams({
      email: "praxis@example.com",
      action: "enable_website_forms",
    }).toString();

    const res = await postHandler(
      adminRequest("http://localhost/api/admin/accounts", {
        method: "POST",
        body: form,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }),
    );

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://localhost/admin/accounts");
    expect(mockEnable).toHaveBeenCalledWith("praxis@example.com");
  });
});

describe("POST /api/admin/accounts → unbekannte Action bleibt 400", () => {
  it("400 bei action = 'foo'", async () => {
    mockAdminSession(true);

    const res = await postHandler(
      adminRequest("http://localhost/api/admin/accounts", {
        method: "POST",
        body: JSON.stringify({ email: "x@example.com", action: "foo" }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(res.status).toBe(400);
    expect(mockEnable).not.toHaveBeenCalled();
    expect(mockDisable).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/accounts → enable_website_forms ohne Admin", () => {
  it("403 wenn is_admin = false", async () => {
    mockAdminSession(false);

    const res = await postHandler(
      adminRequest("http://localhost/api/admin/accounts", {
        method: "POST",
        body: JSON.stringify({
          email: "praxis@example.com",
          action: "enable_website_forms",
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(res.status).toBe(403);
    expect(mockEnable).not.toHaveBeenCalled();
  });
});
