/**
 * Phase 3b: Tests für POST /api/website-forms/[id] (Update + Toggle).
 *
 * Prüft Eigentums-Schutz (404 bei fremder ID), Toggle-Pfad und Voll-Update.
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    practiceQuestionnaireForm: {
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
import { POST } from "@/app/api/website-forms/[id]/route";

type PrismaMock = {
  practiceQuestionnaireForm: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};
const pm = prisma as unknown as PrismaMock;
const getSessionAccountMock = getSessionAccount as jest.Mock;

const APPROVED = {
  id: "acc-1",
  email: "praxis@example.com",
  is_approved: true,
  is_admin: false,
  inquiry_assistant_enabled: false,
  patient_communication_enabled: true,
  website_forms_enabled: true,
  current_practice: {
    id: "p-1",
    slug: "p1",
    name: "P1",
    is_approved: true,
    inquiry_assistant_enabled: false,
    patient_communication_enabled: true,
    website_forms_enabled: true,
  },
  memberships: [{ practice_id: "p-1", role: "OWNER" }],
};

function jsonReq(body: unknown) {
  return new NextRequest("http://localhost/api/website-forms/form-1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function ctx(id = "form-1") {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  pm.practiceQuestionnaireForm.findUnique.mockReset();
  pm.practiceQuestionnaireForm.update.mockReset();
  getSessionAccountMock.mockReset();
});

describe("POST /api/website-forms/[id] — Auth + Eigentum", () => {
  it("401 ohne Session", async () => {
    getSessionAccountMock.mockResolvedValue(null);
    const res = await POST(jsonReq({ action: "toggle_active" }), ctx());
    expect(res.status).toBe(401);
  });

  it("403 ohne website_forms_enabled", async () => {
    getSessionAccountMock.mockResolvedValue({
      ...APPROVED,
      website_forms_enabled: false,
      current_practice: {
        ...APPROVED.current_practice,
        website_forms_enabled: false,
      },
    });
    const res = await POST(jsonReq({ action: "toggle_active" }), ctx());
    expect(res.status).toBe(403);
  });

  it("404 wenn Eintrag nicht existiert", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED);
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue(null);
    const res = await POST(jsonReq({ action: "toggle_active" }), ctx());
    expect(res.status).toBe(404);
  });

  it("404 wenn Eintrag fremdem Account gehört (kein 403, um IDs nicht zu enumerieren)", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED);
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue({
      id: "form-1",
      owner_account_id: "acc-OTHER",
      is_active: true,
    });
    const res = await POST(jsonReq({ action: "toggle_active" }), ctx());
    expect(res.status).toBe(404);
    expect(pm.practiceQuestionnaireForm.update).not.toHaveBeenCalled();
  });
});

describe("POST /api/website-forms/[id] — Toggle", () => {
  it("flippt is_active von true → false und antwortet 200", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED);
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue({
      id: "form-1",
      owner_account_id: "acc-1",
      owner_practice_id: "p-1",
      is_active: true,
    });
    pm.practiceQuestionnaireForm.update.mockResolvedValue({});
    const res = await POST(jsonReq({ action: "toggle_active" }), ctx());
    expect(res.status).toBe(200);
    const args = pm.practiceQuestionnaireForm.update.mock.calls[0][0];
    expect(args.where).toEqual({ id: "form-1" });
    expect(args.data).toEqual({ is_active: false });
  });

  it("flippt is_active von false → true", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED);
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue({
      id: "form-1",
      owner_account_id: "acc-1",
      owner_practice_id: "p-1",
      is_active: false,
    });
    pm.practiceQuestionnaireForm.update.mockResolvedValue({});
    await POST(jsonReq({ action: "toggle_active" }), ctx());
    const args = pm.practiceQuestionnaireForm.update.mock.calls[0][0];
    expect(args.data).toEqual({ is_active: true });
  });
});

describe("POST /api/website-forms/[id] — Voll-Update", () => {
  beforeEach(() => {
    getSessionAccountMock.mockResolvedValue(APPROVED);
    pm.practiceQuestionnaireForm.findUnique.mockResolvedValue({
      id: "form-1",
      owner_account_id: "acc-1",
      owner_practice_id: "p-1",
      is_active: true,
    });
  });

  it("aktualisiert alle Felder", async () => {
    pm.practiceQuestionnaireForm.update.mockResolvedValue({});
    const res = await POST(
      jsonReq({
        title: "Neuer Titel",
        slug: "neu-slug",
        intro_text: "Neuer Intro",
        selected_block_ids: ["REZEPT"],
        is_active: false,
      }),
      ctx(),
    );
    expect(res.status).toBe(200);
    const args = pm.practiceQuestionnaireForm.update.mock.calls[0][0];
    expect(args.data).toMatchObject({
      title: "Neuer Titel",
      slug: "neu-slug",
      intro_text: "Neuer Intro",
      is_active: false,
    });
    expect(args.data.selected_block_ids).toEqual(["REZEPT"]);
  });

  it("400 bei ungültigem Slug", async () => {
    const res = await POST(
      jsonReq({
        title: "T",
        slug: "BAD_SLUG",
        selected_block_ids: ["REZEPT"],
      }),
      ctx(),
    );
    expect(res.status).toBe(400);
    expect(pm.practiceQuestionnaireForm.update).not.toHaveBeenCalled();
  });

  it("409 bei Slug-Kollision (P2002)", async () => {
    const { Prisma } = await import("@prisma/client");
    pm.practiceQuestionnaireForm.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    const res = await POST(
      jsonReq({
        title: "T",
        slug: "abc-def",
        selected_block_ids: ["REZEPT"],
      }),
      ctx(),
    );
    expect(res.status).toBe(409);
  });
});
