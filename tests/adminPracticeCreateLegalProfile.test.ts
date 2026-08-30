import { NextRequest, NextResponse } from "next/server";

jest.mock("@/lib/authz", () => ({ requireAdmin: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    account: { findUnique: jest.fn() },
    practice: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  },
}));

import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/admin/practices/route";

const requireAdminMock = requireAdmin as jest.Mock;
const pm = prisma as unknown as {
  account: { findUnique: jest.Mock };
  practice: { findFirst: jest.Mock };
  $transaction: jest.Mock;
};

const body = {
  display_name: "Praxis am Markt",
  owner_email: "owner@example.test",
  official_practice_name: "Hausarztpraxis am Markt",
  contract_party_name: "Medizin am Markt GmbH",
  street: "Marktstraße",
  house_number: "1",
  postal_code: "12345",
  city: "Musterstadt",
  country: "Deutschland",
  official_email: "kontakt@example.test",
  phone: "030 123456",
};

function request() {
  return new NextRequest("http://localhost/api/admin/practices", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

it("weist Nicht-Plattform-Admins vor jedem DB-Zugriff ab", async () => {
  requireAdminMock.mockResolvedValue({
    account: null,
    error: NextResponse.json({ ok: false }, { status: 403 }),
  });
  const response = await POST(request());
  expect(response.status).toBe(403);
  expect(pm.account.findUnique).not.toHaveBeenCalled();
});

it("legt Praxis, offizielles Profil, OWNER und Audit in einer Transaktion an", async () => {
  requireAdminMock.mockResolvedValue({ account: { id: "platform-admin" }, error: null });
  pm.account.findUnique.mockResolvedValue({ id: "owner-account" });
  pm.practice.findFirst.mockResolvedValue(null);
  const tx = {
    practice: {
      create: jest.fn().mockResolvedValue({
        id: "practice-1",
        name: "Praxis am Markt",
        public_slug: "praxis-am-markt",
      }),
    },
    practiceLegalProfileAudit: { create: jest.fn().mockResolvedValue({}) },
  };
  pm.$transaction.mockImplementation((callback: (arg: typeof tx) => unknown) => callback(tx));

  const response = await POST(request());
  expect(response.status).toBe(201);
  expect(tx.practice.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        is_approved: false,
        public_slug: "praxis-am-markt",
        legal_profile: { create: expect.objectContaining({ official_practice_name: "Hausarztpraxis am Markt" }) },
        memberships: { create: { account_id: "owner-account", role: "OWNER" } },
      }),
    }),
  );
  expect(tx.practiceLegalProfileAudit.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        practice_id: "practice-1",
        changed_by_admin_account_id: "platform-admin",
      }),
    }),
  );
});