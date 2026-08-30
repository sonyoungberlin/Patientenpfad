import { NextRequest, NextResponse } from "next/server";

jest.mock("@/lib/authz", () => ({ requireAdmin: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    practice: { findUnique: jest.fn() },
    practiceLegalProfile: { upsert: jest.fn() },
    practiceLegalProfileAudit: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { PUT } from "@/app/api/admin/practices/[id]/legal-profile/route";

const requireAdminMock = requireAdmin as jest.Mock;
const pm = prisma as unknown as {
  practice: { findUnique: jest.Mock };
  practiceLegalProfile: { upsert: jest.Mock };
  practiceLegalProfileAudit: { create: jest.Mock };
  $transaction: jest.Mock;
};

const valid = {
  official_practice_name: "Hausarztpraxis Muster",
  contract_party_name: "Muster Medizin GmbH",
  representative_name: "Dr. Mina Muster",
  legal_form: "GmbH",
  street: "Musterstraße",
  house_number: "1",
  postal_code: "12345",
  city: "Musterstadt",
  country: "Deutschland",
  official_email: "praxis@example.test",
  phone: "+49 30 123456",
};

function request(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/admin/practices/p-1/legal-profile", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  pm.$transaction.mockResolvedValue([]);
  pm.practiceLegalProfile.upsert.mockReturnValue({ op: "profile" });
  pm.practiceLegalProfileAudit.create.mockReturnValue({ op: "audit" });
});

it.each(["OWNER", "ADMIN", "USER", "INBOX_ONLY"])(
  "%s kann das offizielle Profil nicht ändern",
  async () => {
    requireAdminMock.mockResolvedValue({
      account: null,
      error: NextResponse.json({ ok: false }, { status: 403 }),
    });
    const response = await PUT(request(valid), { params: Promise.resolve({ id: "p-1" }) });
    expect(response.status).toBe(403);
    expect(pm.practice.findUnique).not.toHaveBeenCalled();
  },
);

it("Plattform-Admin ändert nur die Praxis aus der Pfad-ID und auditiert Feldnamen", async () => {
  requireAdminMock.mockResolvedValue({ account: { id: "platform-admin" }, error: null });
  pm.practice.findUnique.mockResolvedValue({
    id: "p-1",
    legal_profile: { ...valid, official_practice_name: "Alter Name" },
  });

  const response = await PUT(request(valid), { params: Promise.resolve({ id: "p-1" }) });

  expect(response.status).toBe(200);
  expect(pm.practice.findUnique).toHaveBeenCalledWith(
    expect.objectContaining({ where: { id: "p-1" } }),
  );
  expect(pm.practiceLegalProfile.upsert).toHaveBeenCalledWith(
    expect.objectContaining({ where: { practice_id: "p-1" } }),
  );
  expect(pm.practiceLegalProfileAudit.create).toHaveBeenCalledWith({
    data: {
      practice_id: "p-1",
      changed_by_admin_account_id: "platform-admin",
      changed_fields: ["official_practice_name"],
    },
  });
});

it("verwirft eine manipulierte Praxis-ID aus dem Body", async () => {
  requireAdminMock.mockResolvedValue({ account: { id: "platform-admin" }, error: null });
  const response = await PUT(request({ ...valid, practice_id: "p-2" }), {
    params: Promise.resolve({ id: "p-1" }),
  });
  expect(response.status).toBe(400);
  expect(pm.practice.findUnique).not.toHaveBeenCalled();
});

it.each(["javascript:alert(1)", "ftp://praxis.example/impressum"]) (
  "weist externe Rechtslinks mit nicht erlaubtem Protokoll ab: %s",
  async (url) => {
    requireAdminMock.mockResolvedValue({ account: { id: "platform-admin" }, error: null });
    const response = await PUT(request({ ...valid, official_imprint_url: url }), {
      params: Promise.resolve({ id: "p-1" }),
    });
    expect(response.status).toBe(400);
    expect(pm.practice.findUnique).not.toHaveBeenCalled();
  },
);