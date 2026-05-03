/**
 * P2: requirePracticeRole — Rolle wird aus account.memberships gelesen,
 * Quelle der Rolle ist PracticeMembership. Kein Plattform-Admin-Bypass.
 *
 * Phase P2 hat noch keine produktiven Aufrufer; Verhalten wird hier rein
 * über den Helper getestet.
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    session: { findUnique: jest.fn(), delete: jest.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  requirePracticeRole,
  requirePracticeRoleFromCookies,
} from "@/lib/authz";
import { SESSION_COOKIE } from "@/lib/auth";
import { PracticeRole } from "@prisma/client";

const pm = prisma as unknown as {
  session: { findUnique: jest.Mock; delete: jest.Mock };
};

beforeEach(() => {
  jest.clearAllMocks();
});

const sessionWith = (
  role: PracticeRole | null,
  opts?: { isAdmin?: boolean; practiceId?: string },
) => ({
  expiresAt: new Date(Date.now() + 60_000),
  account: {
    id: "acc-1",
    email: "x@y.de",
    is_approved: true,
    is_admin: opts?.isAdmin ?? false,
    inquiry_assistant_enabled: true,
    patient_communication_enabled: true,
    website_forms_enabled: true,
    memberships:
      role === null
        ? []
        : [
            {
              practice_id: opts?.practiceId ?? "p-1",
              role,
              created_at: new Date("2025-01-01"),
              practice: {
                id: opts?.practiceId ?? "p-1",
                slug: "p1",
                name: "P1",
                is_approved: true,
                inquiry_assistant_enabled: true,
                patient_communication_enabled: true,
                website_forms_enabled: true,
              },
            },
          ],
  },
});

function reqWithCookie() {
  return new NextRequest("http://localhost/x", {
    headers: { Cookie: `${SESSION_COOKIE}=t` },
  });
}

describe("requirePracticeRole", () => {
  it("401 ohne Login", async () => {
    const res = await requirePracticeRole(
      new NextRequest("http://localhost/x"),
      [PracticeRole.OWNER],
    );
    expect(res.error?.status).toBe(401);
    expect(await res.error!.json()).toEqual({
      ok: false,
      error: "Nicht angemeldet.",
    });
  });

  it("403 'Kein Praxiszugriff.' ohne Membership", async () => {
    pm.session.findUnique.mockResolvedValue(sessionWith(null));
    const res = await requirePracticeRole(reqWithCookie(), [
      PracticeRole.OWNER,
    ]);
    expect(res.error?.status).toBe(403);
    expect(await res.error!.json()).toEqual({
      ok: false,
      error: "Kein Praxiszugriff.",
    });
  });

  it("403 'Kein Praxiszugriff.' wenn explizite practiceId nicht zur Membership passt", async () => {
    pm.session.findUnique.mockResolvedValue(
      sessionWith(PracticeRole.OWNER, { practiceId: "p-1" }),
    );
    const res = await requirePracticeRole(
      reqWithCookie(),
      [PracticeRole.OWNER],
      { practiceId: "p-foreign" },
    );
    expect(res.error?.status).toBe(403);
    expect((await res.error!.json()).error).toBe("Kein Praxiszugriff.");
  });

  it("403 'Rolle nicht ausreichend.' wenn Rolle nicht in allowedRoles", async () => {
    pm.session.findUnique.mockResolvedValue(sessionWith(PracticeRole.USER));
    const res = await requirePracticeRole(reqWithCookie(), [
      PracticeRole.OWNER,
      PracticeRole.ADMIN,
    ]);
    expect(res.error?.status).toBe(403);
    expect(await res.error!.json()).toEqual({
      ok: false,
      error: "Rolle nicht ausreichend.",
    });
  });

  it("200 für OWNER, wenn OWNER erlaubt ist", async () => {
    pm.session.findUnique.mockResolvedValue(sessionWith(PracticeRole.OWNER));
    const res = await requirePracticeRole(reqWithCookie(), [
      PracticeRole.OWNER,
    ]);
    expect(res.error).toBeNull();
    expect(res.account?.id).toBe("acc-1");
  });

  it("200 für USER, wenn USER erlaubt ist", async () => {
    pm.session.findUnique.mockResolvedValue(sessionWith(PracticeRole.USER));
    const res = await requirePracticeRole(reqWithCookie(), [
      PracticeRole.USER,
      PracticeRole.ADMIN,
      PracticeRole.OWNER,
    ]);
    expect(res.error).toBeNull();
  });

  it("kein Plattform-Admin-Bypass: is_admin ohne Membership ⇒ 403", async () => {
    pm.session.findUnique.mockResolvedValue(
      sessionWith(null, { isAdmin: true }),
    );
    const res = await requirePracticeRole(reqWithCookie(), [
      PracticeRole.OWNER,
      PracticeRole.ADMIN,
      PracticeRole.USER,
    ]);
    expect(res.error?.status).toBe(403);
    expect((await res.error!.json()).error).toBe("Kein Praxiszugriff.");
  });

  it("kein Plattform-Admin-Bypass: is_admin mit USER-Rolle ⇒ 403, wenn nur OWNER erlaubt", async () => {
    pm.session.findUnique.mockResolvedValue(
      sessionWith(PracticeRole.USER, { isAdmin: true }),
    );
    const res = await requirePracticeRole(reqWithCookie(), [
      PracticeRole.OWNER,
    ]);
    expect(res.error?.status).toBe(403);
    expect((await res.error!.json()).error).toBe("Rolle nicht ausreichend.");
  });
});

// ---------------------------------------------------------------------------
// FromCookies-Variante (Server Components)
// ---------------------------------------------------------------------------

jest.mock("next/headers", () => ({
  cookies: jest.fn(async () => ({
    get: (name: string) =>
      name === SESSION_COOKIE ? { value: "t" } : undefined,
  })),
}));

describe("requirePracticeRoleFromCookies", () => {
  it("null ohne Membership", async () => {
    pm.session.findUnique.mockResolvedValue(sessionWith(null));
    const acc = await requirePracticeRoleFromCookies([PracticeRole.OWNER]);
    expect(acc).toBeNull();
  });

  it("Account-Objekt für passende Rolle", async () => {
    pm.session.findUnique.mockResolvedValue(sessionWith(PracticeRole.OWNER));
    const acc = await requirePracticeRoleFromCookies([PracticeRole.OWNER]);
    expect(acc?.id).toBe("acc-1");
  });

  it("kein Admin-Bypass auch via Cookies", async () => {
    pm.session.findUnique.mockResolvedValue(
      sessionWith(PracticeRole.USER, { isAdmin: true }),
    );
    const acc = await requirePracticeRoleFromCookies([PracticeRole.OWNER]);
    expect(acc).toBeNull();
  });
});
