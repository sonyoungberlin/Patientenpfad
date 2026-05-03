/**
 * Phase 3a: Tests für lib/authz.ts → requireWebsiteFormsAccess
 * und requireWebsiteFormsAccessFromCookies.
 *
 * Stellen sicher, dass das Feature-Gate `website_forms_enabled` greift und
 * dass es KEINEN Admin-Bypass gibt.
 */

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
  getSessionAccountFromCookies: jest.fn(),
}));

import { NextRequest } from "next/server";
import {
  requireWebsiteFormsAccess,
  requireWebsiteFormsAccessFromCookies,
} from "@/lib/authz";
import {
  getSessionAccount,
  getSessionAccountFromCookies,
} from "@/lib/auth";

const getSessionAccountMock = getSessionAccount as jest.Mock;
const getSessionAccountFromCookiesMock = getSessionAccountFromCookies as jest.Mock;

function makeRequest() {
  return new NextRequest("http://localhost/x");
}

function account(overrides: Record<string, unknown> = {}) {
  return {
    id: "acc-1",
    email: "praxis@example.com",
    is_approved: true,
    is_admin: false,
    inquiry_assistant_enabled: false,
    patient_communication_enabled: false,
    website_forms_enabled: true,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("requireWebsiteFormsAccess", () => {
  it("antwortet 401 ohne Session", async () => {
    getSessionAccountMock.mockResolvedValue(null);

    const result = await requireWebsiteFormsAccess(makeRequest());

    expect(result.account).toBeNull();
    expect(result.error?.status).toBe(401);
    const body = await result.error!.json();
    expect(body).toEqual({ ok: false, error: "Nicht angemeldet." });
  });

  it("antwortet 403 für nicht freigeschaltete Accounts", async () => {
    getSessionAccountMock.mockResolvedValue(account({ is_approved: false }));

    const result = await requireWebsiteFormsAccess(makeRequest());

    expect(result.account).toBeNull();
    expect(result.error?.status).toBe(403);
    const body = await result.error!.json();
    expect(body).toEqual({ ok: false, error: "Account nicht freigeschaltet." });
  });

  it("antwortet 403 wenn website_forms_enabled = false", async () => {
    getSessionAccountMock.mockResolvedValue(account({ website_forms_enabled: false }));

    const result = await requireWebsiteFormsAccess(makeRequest());

    expect(result.account).toBeNull();
    expect(result.error?.status).toBe(403);
    const body = await result.error!.json();
    expect(body).toEqual({
      ok: false,
      error: "Website-Formulare nicht freigeschaltet.",
    });
  });

  it("erlaubt Zugriff bei freigeschaltetem Account mit website_forms_enabled = true", async () => {
    const acc = account();
    getSessionAccountMock.mockResolvedValue(acc);

    const result = await requireWebsiteFormsAccess(makeRequest());

    expect(result.error).toBeNull();
    expect(result.account).toEqual(acc);
  });

  it("hat KEINEN Admin-Bypass: Admin ohne website_forms_enabled wird abgewiesen", async () => {
    getSessionAccountMock.mockResolvedValue(
      account({ is_admin: true, website_forms_enabled: false }),
    );

    const result = await requireWebsiteFormsAccess(makeRequest());

    expect(result.account).toBeNull();
    expect(result.error?.status).toBe(403);
    const body = await result.error!.json();
    expect(body).toEqual({
      ok: false,
      error: "Website-Formulare nicht freigeschaltet.",
    });
  });
});

describe("requireWebsiteFormsAccessFromCookies", () => {
  it("liefert null ohne Session", async () => {
    getSessionAccountFromCookiesMock.mockResolvedValue(null);

    const result = await requireWebsiteFormsAccessFromCookies();

    expect(result).toBeNull();
  });

  it("liefert null für nicht freigeschaltete Accounts", async () => {
    getSessionAccountFromCookiesMock.mockResolvedValue(
      account({ is_approved: false }),
    );

    expect(await requireWebsiteFormsAccessFromCookies()).toBeNull();
  });

  it("liefert null wenn website_forms_enabled = false", async () => {
    getSessionAccountFromCookiesMock.mockResolvedValue(
      account({ website_forms_enabled: false }),
    );

    expect(await requireWebsiteFormsAccessFromCookies()).toBeNull();
  });

  it("liefert null für Admin ohne website_forms_enabled (kein Admin-Bypass)", async () => {
    getSessionAccountFromCookiesMock.mockResolvedValue(
      account({ is_admin: true, website_forms_enabled: false }),
    );

    expect(await requireWebsiteFormsAccessFromCookies()).toBeNull();
  });

  it("liefert den Account wenn alle Bedingungen erfüllt sind", async () => {
    const acc = account();
    getSessionAccountFromCookiesMock.mockResolvedValue(acc);

    expect(await requireWebsiteFormsAccessFromCookies()).toEqual(acc);
  });
});
