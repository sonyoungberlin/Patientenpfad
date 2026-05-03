/**
 * Phase P4a: Rollen-Gate für die Website-Forms-Verwaltung.
 *
 * Stellt sicher, dass:
 *   - OWNER und ADMIN der aktuellen Practice die API nutzen dürfen.
 *   - USER der aktuellen Practice mit 403 'Rolle nicht ausreichend.'
 *     geblockt wird – auch wenn die Feature-Flags freigeschaltet sind.
 *   - kein Plattform-Admin-Bypass greift (admin ohne Membership → 403).
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    practiceQuestionnaireForm: {
      create: jest.fn(),
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
import { POST as CreatePOST } from "@/app/api/website-forms/route";
import { POST as UpdatePOST } from "@/app/api/website-forms/[id]/route";

type PrismaMock = {
  practiceQuestionnaireForm: {
    create: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};
const pm = prisma as unknown as PrismaMock;
const getAcc = getSessionAccount as jest.Mock;

const PRACTICE = {
  id: "p-1",
  slug: "p1",
  name: "P1",
  is_approved: true,
  inquiry_assistant_enabled: false,
  patient_communication_enabled: true,
  website_forms_enabled: true,
};

function makeAccount(role: "OWNER" | "ADMIN" | "USER") {
  return {
    id: "acc-1",
    email: "x@example.com",
    is_approved: true,
    is_admin: false,
    inquiry_assistant_enabled: false,
    patient_communication_enabled: true,
    website_forms_enabled: true,
    current_practice: PRACTICE,
    memberships: [{ practice_id: "p-1", role }],
  };
}

const ADMIN_NO_MEMBERSHIP = {
  ...makeAccount("OWNER"),
  is_admin: true,
  current_practice: PRACTICE,
  memberships: [],
};

function jsonReq(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  pm.practiceQuestionnaireForm.create.mockReset();
  pm.practiceQuestionnaireForm.findUnique.mockReset();
  pm.practiceQuestionnaireForm.update.mockReset();
  getAcc.mockReset();
});

describe("P4a: POST /api/website-forms — Rollen-Gate", () => {
  const validBody = {
    title: "T",
    slug: "abc-def",
    selected_block_ids: ["REZEPT"],
  };

  it("OWNER → 201 (legt an)", async () => {
    getAcc.mockResolvedValue(makeAccount("OWNER"));
    pm.practiceQuestionnaireForm.create.mockResolvedValue({
      id: "form-1",
      slug: "abc-def",
    });
    const res = await CreatePOST(
      jsonReq("http://localhost/api/website-forms", validBody),
    );
    expect(res.status).toBe(201);
  });

  it("ADMIN → 201 (legt an)", async () => {
    getAcc.mockResolvedValue(makeAccount("ADMIN"));
    pm.practiceQuestionnaireForm.create.mockResolvedValue({
      id: "form-2",
      slug: "abc-def",
    });
    const res = await CreatePOST(
      jsonReq("http://localhost/api/website-forms", validBody),
    );
    expect(res.status).toBe(201);
  });

  it("USER → 403 'Rolle nicht ausreichend.', Create wird nicht aufgerufen", async () => {
    getAcc.mockResolvedValue(makeAccount("USER"));
    const res = await CreatePOST(
      jsonReq("http://localhost/api/website-forms", validBody),
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("Rolle nicht ausreichend.");
    expect(pm.practiceQuestionnaireForm.create).not.toHaveBeenCalled();
  });

  it("Plattform-Admin ohne Membership → 403 (kein Bypass)", async () => {
    getAcc.mockResolvedValue(ADMIN_NO_MEMBERSHIP);
    const res = await CreatePOST(
      jsonReq("http://localhost/api/website-forms", validBody),
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("Kein Praxiszugriff.");
    expect(pm.practiceQuestionnaireForm.create).not.toHaveBeenCalled();
  });
});

describe("P4a: POST /api/website-forms/[id] — Rollen-Gate", () => {
  const ctx = { params: Promise.resolve({ id: "form-1" }) };

  it("OWNER → 200 (toggle)", async () => {
    getAcc.mockResolvedValue(makeAccount("OWNER"));
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue({
      id: "form-1",
      owner_account_id: "acc-1",
      owner_practice_id: "p-1",
      is_active: true,
    });
    pm.practiceQuestionnaireForm.update.mockResolvedValue({});
    const res = await UpdatePOST(
      jsonReq("http://localhost/api/website-forms/form-1", {
        action: "toggle_active",
      }),
      ctx,
    );
    expect(res.status).toBe(200);
  });

  it("ADMIN → 200 (toggle)", async () => {
    getAcc.mockResolvedValue(makeAccount("ADMIN"));
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue({
      id: "form-1",
      owner_account_id: "acc-other",
      owner_practice_id: "p-1",
      is_active: false,
    });
    pm.practiceQuestionnaireForm.update.mockResolvedValue({});
    const res = await UpdatePOST(
      jsonReq("http://localhost/api/website-forms/form-1", {
        action: "toggle_active",
      }),
      { params: Promise.resolve({ id: "form-1" }) },
    );
    expect(res.status).toBe(200);
  });

  it("USER → 403 'Rolle nicht ausreichend.', Update wird nicht aufgerufen", async () => {
    getAcc.mockResolvedValue(makeAccount("USER"));
    const res = await UpdatePOST(
      jsonReq("http://localhost/api/website-forms/form-1", {
        action: "toggle_active",
      }),
      { params: Promise.resolve({ id: "form-1" }) },
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("Rolle nicht ausreichend.");
    expect(pm.practiceQuestionnaireForm.findUnique).not.toHaveBeenCalled();
    expect(pm.practiceQuestionnaireForm.update).not.toHaveBeenCalled();
  });
});
