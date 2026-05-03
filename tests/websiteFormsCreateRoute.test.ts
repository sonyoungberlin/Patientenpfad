/**
 * Phase 3b: Tests für POST /api/website-forms (Create).
 *
 * Prüft doppeltes Feature-Gate, Validierung, Eigentums-Zuordnung und
 * Slug-Kollision. Unterstützt JSON- und Form-encoded-Pfade.
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    practiceQuestionnaireForm: {
      create: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
  getSessionAccountFromCookies: jest.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import { POST } from "@/app/api/website-forms/route";

type PrismaMock = {
  practiceQuestionnaireForm: { create: jest.Mock };
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
};

function jsonReq(body: unknown) {
  return new NextRequest("http://localhost/api/website-forms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function formReq(fields: Record<string, string | string[]>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) {
    if (Array.isArray(v)) v.forEach((vv) => params.append(k, vv));
    else params.append(k, v);
  }
  return new NextRequest("http://localhost/api/website-forms", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
}

beforeEach(() => {
  pm.practiceQuestionnaireForm.create.mockReset();
  getSessionAccountMock.mockReset();
});

describe("POST /api/website-forms — Auth-Gate", () => {
  it("401 ohne Session", async () => {
    getSessionAccountMock.mockResolvedValue(null);
    const res = await POST(jsonReq({ title: "x", slug: "abc-def", selected_block_ids: ["REZEPT"] }));
    expect(res.status).toBe(401);
  });

  it("403 wenn nicht freigeschaltet", async () => {
    getSessionAccountMock.mockResolvedValue({ ...APPROVED, is_approved: false });
    const res = await POST(jsonReq({ title: "x", slug: "abc-def", selected_block_ids: ["REZEPT"] }));
    expect(res.status).toBe(403);
  });

  it("403 wenn patient_communication_enabled = false", async () => {
    getSessionAccountMock.mockResolvedValue({
      ...APPROVED,
      patient_communication_enabled: false,
    });
    const res = await POST(jsonReq({ title: "x", slug: "abc-def", selected_block_ids: ["REZEPT"] }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("Patientenkommunikation nicht freigeschaltet.");
  });

  it("403 wenn website_forms_enabled = false", async () => {
    getSessionAccountMock.mockResolvedValue({
      ...APPROVED,
      website_forms_enabled: false,
    });
    const res = await POST(jsonReq({ title: "x", slug: "abc-def", selected_block_ids: ["REZEPT"] }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("Website-Formulare nicht freigeschaltet.");
  });

  it("403 für Admin ohne Flags (kein Bypass)", async () => {
    getSessionAccountMock.mockResolvedValue({
      ...APPROVED,
      is_admin: true,
      website_forms_enabled: false,
    });
    const res = await POST(jsonReq({ title: "x", slug: "abc-def", selected_block_ids: ["REZEPT"] }));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/website-forms — Happy Path", () => {
  it("legt mit JSON an und liefert 201 mit id+slug", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED);
    pm.practiceQuestionnaireForm.create.mockResolvedValue({
      id: "form-1",
      slug: "praxis-mueller",
    });
    const res = await POST(
      jsonReq({
        title: "Mein Formular",
        slug: "praxis-mueller",
        intro_text: "Hallo",
        selected_block_ids: ["REZEPT"],
      }),
    );
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      ok: true,
      id: "form-1",
      slug: "praxis-mueller",
    });
    const args = pm.practiceQuestionnaireForm.create.mock.calls[0][0];
    expect(args.data.owner_account_id).toBe("acc-1");
    expect(args.data.title).toBe("Mein Formular");
    expect(args.data.slug).toBe("praxis-mueller");
    expect(args.data.intro_text).toBe("Hallo");
    expect(args.data.selected_block_ids).toEqual(["REZEPT"]);
    expect(args.data.is_active).toBe(true);
  });

  it("ignoriert owner_account_id aus dem Body und nutzt die Session-ID", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED);
    pm.practiceQuestionnaireForm.create.mockResolvedValue({
      id: "form-1",
      slug: "abc-def",
    });
    await POST(
      jsonReq({
        title: "T",
        slug: "abc-def",
        selected_block_ids: ["REZEPT"],
        owner_account_id: "acc-EVIL",
      } as Record<string, unknown>),
    );
    const args = pm.practiceQuestionnaireForm.create.mock.calls[0][0];
    expect(args.data.owner_account_id).toBe("acc-1");
  });

  it("Form-encoded: redirectet 303 nach /website-forms/[id]", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED);
    pm.practiceQuestionnaireForm.create.mockResolvedValue({
      id: "form-2",
      slug: "abc-def",
    });
    const res = await POST(
      formReq({
        title: "T",
        slug: "abc-def",
        selected_block_ids: ["REZEPT", "ARBEITSUNFAEHIGKEIT"],
        is_active: "true",
      }),
    );
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("/website-forms/form-2");
  });
});

describe("POST /api/website-forms — Validierung", () => {
  beforeEach(() => {
    getSessionAccountMock.mockResolvedValue(APPROVED);
  });

  it("400 bei ungültigem Slug", async () => {
    const res = await POST(
      jsonReq({ title: "T", slug: "Bad_Slug", selected_block_ids: ["REZEPT"] }),
    );
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.fieldErrors.slug).toBeTruthy();
  });

  it("400 bei reserviertem Slug", async () => {
    const res = await POST(
      jsonReq({ title: "T", slug: "admin", selected_block_ids: ["REZEPT"] }),
    );
    expect(res.status).toBe(400);
  });

  it("400 bei leerer Block-Auswahl", async () => {
    const res = await POST(
      jsonReq({ title: "T", slug: "abc-def", selected_block_ids: [] }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).fieldErrors.selected_block_ids).toBeTruthy();
  });

  it("400 bei fehlendem Titel", async () => {
    const res = await POST(
      jsonReq({ slug: "abc-def", selected_block_ids: ["REZEPT"] }),
    );
    expect(res.status).toBe(400);
  });

  it("400 bei ungültigem JSON", async () => {
    const req = new NextRequest("http://localhost/api/website-forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/website-forms — Slug-Kollision", () => {
  it("409 bei Prisma P2002", async () => {
    getSessionAccountMock.mockResolvedValue(APPROVED);
    const { Prisma } = await import("@prisma/client");
    pm.practiceQuestionnaireForm.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    const res = await POST(
      jsonReq({ title: "T", slug: "abc-def", selected_block_ids: ["REZEPT"] }),
    );
    expect(res.status).toBe(409);
    const j = await res.json();
    expect(j.fieldErrors.slug).toBe("Slug bereits vergeben.");
  });
});
