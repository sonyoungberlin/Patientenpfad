/**
 * Phase 3b: Tests für lib/authz.ts → requireWebsiteFormsManagementAccess
 * und requireWebsiteFormsManagementAccessFromCookies.
 *
 * Stellt sicher, dass das **doppelte** Feature-Gate strikt greift
 * (`patient_communication_enabled` + `website_forms_enabled`), inklusive
 * "Kein Admin-Bypass".
 */

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
  getSessionAccountFromCookies: jest.fn(),
}));

import { NextRequest } from "next/server";
import {
  requireWebsiteFormsManagementAccess,
  requireWebsiteFormsManagementAccessFromCookies,
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
    patient_communication_enabled: true,
    website_forms_enabled: true,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("requireWebsiteFormsManagementAccess", () => {
  it("antwortet 401 ohne Session", async () => {
    getSessionAccountMock.mockResolvedValue(null);
    const r = await requireWebsiteFormsManagementAccess(makeRequest());
    expect(r.account).toBeNull();
    expect(r.error?.status).toBe(401);
  });

  it("antwortet 403 für nicht freigeschaltete Accounts", async () => {
    getSessionAccountMock.mockResolvedValue(account({ is_approved: false }));
    const r = await requireWebsiteFormsManagementAccess(makeRequest());
    expect(r.account).toBeNull();
    expect(r.error?.status).toBe(403);
    expect(await r.error!.json()).toEqual({
      ok: false,
      error: "Account nicht freigeschaltet.",
    });
  });

  it("antwortet 403 wenn patient_communication_enabled = false", async () => {
    getSessionAccountMock.mockResolvedValue(
      account({ patient_communication_enabled: false }),
    );
    const r = await requireWebsiteFormsManagementAccess(makeRequest());
    expect(r.account).toBeNull();
    expect(r.error?.status).toBe(403);
    expect(await r.error!.json()).toEqual({
      ok: false,
      error: "Patientenkommunikation nicht freigeschaltet.",
    });
  });

  it("antwortet 403 wenn website_forms_enabled = false", async () => {
    getSessionAccountMock.mockResolvedValue(
      account({ website_forms_enabled: false }),
    );
    const r = await requireWebsiteFormsManagementAccess(makeRequest());
    expect(r.account).toBeNull();
    expect(r.error?.status).toBe(403);
    expect(await r.error!.json()).toEqual({
      ok: false,
      error: "Website-Formulare nicht freigeschaltet.",
    });
  });

  it("erlaubt Zugriff wenn beide Flags + Approval gesetzt", async () => {
    const acc = account();
    getSessionAccountMock.mockResolvedValue(acc);
    const r = await requireWebsiteFormsManagementAccess(makeRequest());
    expect(r.error).toBeNull();
    expect(r.account).toEqual(acc);
  });

  it("KEIN Admin-Bypass: Admin ohne Flags wird abgewiesen", async () => {
    getSessionAccountMock.mockResolvedValue(
      account({
        is_admin: true,
        patient_communication_enabled: false,
        website_forms_enabled: false,
      }),
    );
    const r = await requireWebsiteFormsManagementAccess(makeRequest());
    expect(r.account).toBeNull();
    expect(r.error?.status).toBe(403);
  });

  it("KEIN Admin-Bypass: Admin mit nur einem Flag wird abgewiesen", async () => {
    getSessionAccountMock.mockResolvedValue(
      account({ is_admin: true, website_forms_enabled: false }),
    );
    const r = await requireWebsiteFormsManagementAccess(makeRequest());
    expect(r.account).toBeNull();
    expect(r.error?.status).toBe(403);
    expect(await r.error!.json()).toEqual({
      ok: false,
      error: "Website-Formulare nicht freigeschaltet.",
    });
  });
});

describe("requireWebsiteFormsManagementAccessFromCookies", () => {
  it("liefert null ohne Session", async () => {
    getSessionAccountFromCookiesMock.mockResolvedValue(null);
    expect(await requireWebsiteFormsManagementAccessFromCookies()).toBeNull();
  });

  it("liefert null bei is_approved = false", async () => {
    getSessionAccountFromCookiesMock.mockResolvedValue(
      account({ is_approved: false }),
    );
    expect(await requireWebsiteFormsManagementAccessFromCookies()).toBeNull();
  });

  it("liefert null bei patient_communication_enabled = false", async () => {
    getSessionAccountFromCookiesMock.mockResolvedValue(
      account({ patient_communication_enabled: false }),
    );
    expect(await requireWebsiteFormsManagementAccessFromCookies()).toBeNull();
  });

  it("liefert null bei website_forms_enabled = false", async () => {
    getSessionAccountFromCookiesMock.mockResolvedValue(
      account({ website_forms_enabled: false }),
    );
    expect(await requireWebsiteFormsManagementAccessFromCookies()).toBeNull();
  });

  it("liefert null für Admin ohne website_forms_enabled (kein Bypass)", async () => {
    getSessionAccountFromCookiesMock.mockResolvedValue(
      account({ is_admin: true, website_forms_enabled: false }),
    );
    expect(await requireWebsiteFormsManagementAccessFromCookies()).toBeNull();
  });

  it("liefert Account wenn alle Bedingungen erfüllt", async () => {
    const acc = account();
    getSessionAccountFromCookiesMock.mockResolvedValue(acc);
    expect(await requireWebsiteFormsManagementAccessFromCookies()).toEqual(acc);
  });
});
