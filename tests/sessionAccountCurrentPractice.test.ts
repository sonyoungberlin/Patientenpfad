/**
 * P2: getSessionAccount lädt zusätzlich `current_practice` und
 * `memberships` aus PracticeMembership / Practice und spiegelt die
 * Practice-Flags auf das Top-Level. Bei fehlender Membership greifen
 * weiterhin die Account-Flags (Fallback, identisch zu Verhalten vor P2).
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    session: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { getSessionAccount, SESSION_COOKIE } from "@/lib/auth";
import { PracticeRole } from "@prisma/client";

const pm = prisma as unknown as {
  session: { findUnique: jest.Mock; delete: jest.Mock };
};

function reqWithCookie() {
  return new NextRequest("http://localhost/x", {
    headers: { Cookie: `${SESSION_COOKIE}=t` },
  });
}

const baseAccount = {
  id: "acc-1",
  email: "owner@example.com",
  is_approved: true,
  is_admin: false,
  inquiry_assistant_enabled: true,
  patient_communication_enabled: true,
  website_forms_enabled: true,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getSessionAccount: current_practice", () => {
  it("setzt current_practice aus OWNER-Membership; Top-Level-Flags spiegeln Practice", async () => {
    pm.session.findUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() + 60_000),
      account: {
        ...baseAccount,
        memberships: [
          {
            practice_id: "p-1",
            role: PracticeRole.OWNER,
            created_at: new Date("2025-01-01"),
            practice: {
              id: "p-1",
              slug: "owner-practice",
              name: "Owner Practice",
              is_approved: false, // weicht bewusst vom Account-Flag ab
              inquiry_assistant_enabled: false,
              patient_communication_enabled: false,
              website_forms_enabled: false,
            },
          },
        ],
      },
    });

    const acc = await getSessionAccount(reqWithCookie());
    expect(acc).not.toBeNull();
    expect(acc!.current_practice).toEqual({
      id: "p-1",
      slug: "owner-practice",
      name: "Owner Practice",
      is_approved: false,
      inquiry_assistant_enabled: false,
      patient_communication_enabled: false,
      website_forms_enabled: false,
    });
    // Top-Level-Spiegelung — Practice gewinnt über Account
    expect(acc!.is_approved).toBe(false);
    expect(acc!.inquiry_assistant_enabled).toBe(false);
    expect(acc!.patient_communication_enabled).toBe(false);
    expect(acc!.website_forms_enabled).toBe(false);
    // is_admin bleibt Account-Eigenschaft
    expect(acc!.is_admin).toBe(false);
    expect(acc!.memberships).toEqual([
      { practice_id: "p-1", role: PracticeRole.OWNER },
    ]);
  });

  it("Fallback: ohne Membership bleiben die Account-Flags erhalten", async () => {
    pm.session.findUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() + 60_000),
      account: { ...baseAccount, memberships: [] },
    });

    const acc = await getSessionAccount(reqWithCookie());
    expect(acc!.current_practice).toBeNull();
    expect(acc!.is_approved).toBe(true);
    expect(acc!.inquiry_assistant_enabled).toBe(true);
    expect(acc!.patient_communication_enabled).toBe(true);
    expect(acc!.website_forms_enabled).toBe(true);
    expect(acc!.memberships).toEqual([]);
  });

  it("Fallback: fehlt das memberships-Feld komplett (Test-Doubles), greifen Account-Flags", async () => {
    pm.session.findUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() + 60_000),
      account: { ...baseAccount },
    });

    const acc = await getSessionAccount(reqWithCookie());
    expect(acc!.current_practice).toBeNull();
    expect(acc!.is_approved).toBe(true);
    expect(acc!.memberships).toEqual([]);
  });

  it("bei mehreren Memberships wird OWNER bevorzugt", async () => {
    pm.session.findUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() + 60_000),
      account: {
        ...baseAccount,
        memberships: [
          {
            practice_id: "p-user",
            role: PracticeRole.USER,
            created_at: new Date("2024-01-01"),
            practice: {
              id: "p-user",
              slug: "user-practice",
              name: "User Practice",
              is_approved: true,
              inquiry_assistant_enabled: true,
              patient_communication_enabled: true,
              website_forms_enabled: true,
            },
          },
          {
            practice_id: "p-owner",
            role: PracticeRole.OWNER,
            created_at: new Date("2025-06-01"),
            practice: {
              id: "p-owner",
              slug: "owner-practice",
              name: "Owner Practice",
              is_approved: true,
              inquiry_assistant_enabled: true,
              patient_communication_enabled: true,
              website_forms_enabled: false,
            },
          },
        ],
      },
    });

    const acc = await getSessionAccount(reqWithCookie());
    expect(acc!.current_practice?.id).toBe("p-owner");
    expect(acc!.website_forms_enabled).toBe(false); // aus OWNER-Practice
    expect(acc!.memberships).toHaveLength(2);
  });

  it("ohne OWNER-Membership wird die älteste Membership gewählt", async () => {
    pm.session.findUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() + 60_000),
      account: {
        ...baseAccount,
        memberships: [
          {
            practice_id: "p-new",
            role: PracticeRole.ADMIN,
            created_at: new Date("2025-06-01"),
            practice: {
              id: "p-new",
              slug: "new",
              name: "New",
              is_approved: true,
              inquiry_assistant_enabled: true,
              patient_communication_enabled: true,
              website_forms_enabled: true,
            },
          },
          {
            practice_id: "p-old",
            role: PracticeRole.USER,
            created_at: new Date("2024-01-01"),
            practice: {
              id: "p-old",
              slug: "old",
              name: "Old",
              is_approved: true,
              inquiry_assistant_enabled: true,
              patient_communication_enabled: true,
              website_forms_enabled: true,
            },
          },
        ],
      },
    });

    const acc = await getSessionAccount(reqWithCookie());
    expect(acc!.current_practice?.id).toBe("p-old");
  });

  it("Option C: default_practice_id gewinnt vor OWNER", async () => {
    pm.session.findUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() + 60_000),
      account: {
        ...baseAccount,
        default_practice_id: "p-pilot",
        memberships: [
          {
            practice_id: "p-owner",
            role: PracticeRole.OWNER,
            created_at: new Date("2024-01-01"),
            practice: {
              id: "p-owner",
              slug: "owner",
              name: "Owner",
              is_approved: true,
              inquiry_assistant_enabled: true,
              patient_communication_enabled: true,
              website_forms_enabled: true,
            },
          },
          {
            practice_id: "p-pilot",
            role: PracticeRole.USER,
            created_at: new Date("2025-06-01"),
            practice: {
              id: "p-pilot",
              slug: "pilot",
              name: "Pilot",
              is_approved: true,
              inquiry_assistant_enabled: false,
              patient_communication_enabled: false,
              website_forms_enabled: false,
            },
          },
        ],
      },
    });

    const acc = await getSessionAccount(reqWithCookie());
    expect(acc!.current_practice?.id).toBe("p-pilot");
    expect(acc!.inquiry_assistant_enabled).toBe(false);
  });

  it("Option C: default_practice_id gewinnt vor ältester Membership", async () => {
    pm.session.findUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() + 60_000),
      account: {
        ...baseAccount,
        default_practice_id: "p-new",
        memberships: [
          {
            practice_id: "p-old",
            role: PracticeRole.USER,
            created_at: new Date("2024-01-01"),
            practice: {
              id: "p-old",
              slug: "old",
              name: "Old",
              is_approved: true,
              inquiry_assistant_enabled: true,
              patient_communication_enabled: true,
              website_forms_enabled: true,
            },
          },
          {
            practice_id: "p-new",
            role: PracticeRole.USER,
            created_at: new Date("2025-06-01"),
            practice: {
              id: "p-new",
              slug: "new",
              name: "New",
              is_approved: true,
              inquiry_assistant_enabled: true,
              patient_communication_enabled: true,
              website_forms_enabled: true,
            },
          },
        ],
      },
    });

    const acc = await getSessionAccount(reqWithCookie());
    expect(acc!.current_practice?.id).toBe("p-new");
  });

  it("Option C: ungültiger default_practice_id wird ignoriert → OWNER greift", async () => {
    pm.session.findUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() + 60_000),
      account: {
        ...baseAccount,
        default_practice_id: "p-ghost", // keine passende Membership
        memberships: [
          {
            practice_id: "p-owner",
            role: PracticeRole.OWNER,
            created_at: new Date("2024-01-01"),
            practice: {
              id: "p-owner",
              slug: "owner",
              name: "Owner",
              is_approved: true,
              inquiry_assistant_enabled: true,
              patient_communication_enabled: true,
              website_forms_enabled: true,
            },
          },
          {
            practice_id: "p-user",
            role: PracticeRole.USER,
            created_at: new Date("2025-06-01"),
            practice: {
              id: "p-user",
              slug: "user",
              name: "User",
              is_approved: true,
              inquiry_assistant_enabled: true,
              patient_communication_enabled: true,
              website_forms_enabled: true,
            },
          },
        ],
      },
    });

    const acc = await getSessionAccount(reqWithCookie());
    expect(acc!.current_practice?.id).toBe("p-owner");
  });

  it("Option C: ungültiger default ohne OWNER → älteste greift", async () => {
    pm.session.findUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() + 60_000),
      account: {
        ...baseAccount,
        default_practice_id: "p-ghost",
        memberships: [
          {
            practice_id: "p-new",
            role: PracticeRole.ADMIN,
            created_at: new Date("2025-06-01"),
            practice: {
              id: "p-new",
              slug: "new",
              name: "New",
              is_approved: true,
              inquiry_assistant_enabled: true,
              patient_communication_enabled: true,
              website_forms_enabled: true,
            },
          },
          {
            practice_id: "p-old",
            role: PracticeRole.USER,
            created_at: new Date("2024-01-01"),
            practice: {
              id: "p-old",
              slug: "old",
              name: "Old",
              is_approved: true,
              inquiry_assistant_enabled: true,
              patient_communication_enabled: true,
              website_forms_enabled: true,
            },
          },
        ],
      },
    });

    const acc = await getSessionAccount(reqWithCookie());
    expect(acc!.current_practice?.id).toBe("p-old");
  });

  it("abgelaufene Session liefert null und löscht den Token (Regression)", async () => {
    pm.session.findUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() - 1000),
      account: { ...baseAccount, memberships: [] },
    });
    pm.session.delete.mockResolvedValue({});

    const acc = await getSessionAccount(reqWithCookie());
    expect(acc).toBeNull();
    expect(pm.session.delete).toHaveBeenCalled();
  });

  it("ohne Cookie liefert null ohne DB-Aufruf", async () => {
    const acc = await getSessionAccount(
      new NextRequest("http://localhost/x"),
    );
    expect(acc).toBeNull();
    expect(pm.session.findUnique).not.toHaveBeenCalled();
  });
});
