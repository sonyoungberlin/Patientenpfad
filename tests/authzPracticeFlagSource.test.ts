/**
 * P2: Quelle der Wahrheit für die Feature-Flags der `require*`-Helper ist
 * `current_practice` (gespiegelt durch `resolveAccount`); Account-Flags sind
 * nur noch Fallback. Dieser Test verifiziert das Ende-zu-Ende über das
 * Session-Cookie und die DB-Mocks.
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    session: { findUnique: jest.fn(), delete: jest.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  requireApprovedAccount,
  requirePatientCommunicationAccess,
  requireWebsiteFormsAccess,
  requireWebsiteFormsManagementAccess,
} from "@/lib/authz";
import { SESSION_COOKIE } from "@/lib/auth";
import { PracticeRole } from "@prisma/client";

const pm = prisma as unknown as {
  session: { findUnique: jest.Mock; delete: jest.Mock };
};

beforeEach(() => jest.clearAllMocks());

function reqWithCookie() {
  return new NextRequest("http://localhost/x", {
    headers: { Cookie: `${SESSION_COOKIE}=t` },
  });
}

function sessionWithPractice(practice: {
  is_approved: boolean;
  inquiry_assistant_enabled: boolean;
  patient_communication_enabled: boolean;
  website_forms_enabled: boolean;
}) {
  return {
    expiresAt: new Date(Date.now() + 60_000),
    account: {
      id: "acc-1",
      email: "x@y.de",
      // Account-Flags ALLE true → würden vor P2 stets durchgehen.
      is_approved: true,
      is_admin: false,
      inquiry_assistant_enabled: true,
      patient_communication_enabled: true,
      website_forms_enabled: true,
      memberships: [
        {
          practice_id: "p-1",
          role: PracticeRole.OWNER,
          created_at: new Date("2025-01-01"),
          practice: {
            id: "p-1",
            slug: "p1",
            name: "P1",
            ...practice,
          },
        },
      ],
    },
  };
}

describe("require*-Helper lesen Flags aus current_practice", () => {
  it("requireApprovedAccount: 403, wenn Practice nicht freigeschaltet (auch wenn Account-Flag true)", async () => {
    pm.session.findUnique.mockResolvedValue(
      sessionWithPractice({
        is_approved: false,
        inquiry_assistant_enabled: true,
        patient_communication_enabled: true,
        website_forms_enabled: true,
      }),
    );
    const res = await requireApprovedAccount(reqWithCookie());
    expect(res.error?.status).toBe(403);
    expect((await res.error!.json()).error).toBe(
      "Account nicht freigeschaltet.",
    );
  });

  it("requireApprovedAccount: ok, wenn Practice freigeschaltet", async () => {
    pm.session.findUnique.mockResolvedValue(
      sessionWithPractice({
        is_approved: true,
        inquiry_assistant_enabled: true,
        patient_communication_enabled: true,
        website_forms_enabled: true,
      }),
    );
    const res = await requireApprovedAccount(reqWithCookie());
    expect(res.error).toBeNull();
    // Top-Level-Spiegelung greift
    expect(res.account?.is_approved).toBe(true);
  });

  it("requirePatientCommunicationAccess: 403, wenn Practice-Flag aus", async () => {
    pm.session.findUnique.mockResolvedValue(
      sessionWithPractice({
        is_approved: true,
        inquiry_assistant_enabled: true,
        patient_communication_enabled: false,
        website_forms_enabled: true,
      }),
    );
    const res = await requirePatientCommunicationAccess(reqWithCookie());
    expect(res.error?.status).toBe(403);
    expect((await res.error!.json()).error).toBe(
      "Patientenkommunikation nicht freigeschaltet.",
    );
  });

  it("requireWebsiteFormsAccess: 403, wenn Practice-Flag aus", async () => {
    pm.session.findUnique.mockResolvedValue(
      sessionWithPractice({
        is_approved: true,
        inquiry_assistant_enabled: true,
        patient_communication_enabled: true,
        website_forms_enabled: false,
      }),
    );
    const res = await requireWebsiteFormsAccess(reqWithCookie());
    expect(res.error?.status).toBe(403);
    expect((await res.error!.json()).error).toBe(
      "Website-Formulare nicht freigeschaltet.",
    );
  });

  it("requireWebsiteFormsManagementAccess: ok, wenn beide Practice-Flags an", async () => {
    pm.session.findUnique.mockResolvedValue(
      sessionWithPractice({
        is_approved: true,
        inquiry_assistant_enabled: true,
        patient_communication_enabled: true,
        website_forms_enabled: true,
      }),
    );
    const res = await requireWebsiteFormsManagementAccess(reqWithCookie());
    expect(res.error).toBeNull();
  });

  it("Fallback: ohne Membership (Test-Double) gelten weiter die Account-Flags", async () => {
    pm.session.findUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() + 60_000),
      account: {
        id: "acc-1",
        email: "x@y.de",
        is_approved: true,
        is_admin: false,
        inquiry_assistant_enabled: true,
        patient_communication_enabled: true,
        website_forms_enabled: true,
        // memberships absichtlich nicht gesetzt
      },
    });
    const res = await requireApprovedAccount(reqWithCookie());
    expect(res.error).toBeNull();
    expect(res.account?.current_practice).toBeNull();
  });
});
