/**
 * Tests für POST /api/anfrage/[slug] (Submit-Route).
 *
 * Nach Umstellung auf Practice.slug-Lookup:
 *   - Slug-Cascade: unbekannter Slug → 404.
 *   - Practice.is_approved=false → 404.
 *   - Practice.patient_communication_enabled=false → 404.
 *   - Practice ohne OWNER-Membership → 404.
 *   - Erfolgreicher Submit: DigitalRequest wird mit owner_practice_id
 *     und owner_account_id (OWNER der Practice) angelegt.
 *   - practice_form_id ist NULL (kein Bezug zu einem Formular).
 *   - Erfolgreicher Submit: 303-Redirect auf /anfrage/[slug]/eingegangen.
 *   - Ungültige E-Mail → 400.
 *   - Honeypot ausgelöst → 303 (keine DB-Schreibung).
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/websiteForms/submitRateLimit", () => ({
  IP_SLUG_RATE_LIMIT: { windowMs: 60000, max: 100 },
  EMAIL_HASH_RATE_LIMIT: { windowMs: 60000, max: 100 },
  createRateLimiter: () => ({ check: () => ({ allowed: true }) }),
  getClientIp: () => "1.2.3.4",
}));

jest.mock("@/lib/websiteForms/emailHash", () => ({
  hashSubmitterEmail: () => "hashed-email",
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    practice: {
      findUnique: jest.fn(),
    },
    digitalRequest: {
      create: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/anfrage/[slug]/route";

type PrismaMock = {
  practice: { findUnique: jest.Mock };
  digitalRequest: { create: jest.Mock };
};
const pm = prisma as unknown as PrismaMock;

function activePractice(slug = "meine-praxis") {
  return {
    id: "p-1",
    is_approved: true,
    patient_communication_enabled: true,
    memberships: [{ account_id: "acc-owner" }],
  };
}

function makeJsonReq(slug: string, body: Record<string, unknown>) {
  return new NextRequest(`http://localhost/api/anfrage/${slug}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function validBody(over: Record<string, unknown> = {}) {
  return {
    submitter_name: "Max Mustermann",
    email: "max@example.com",
    company_website: "", // honeypot leer
    ...over,
  };
}

const CTX = (slug: string) => ({
  params: Promise.resolve({ slug }),
});

beforeEach(() => {
  pm.practice.findUnique.mockReset();
  pm.digitalRequest.create.mockReset();
  pm.digitalRequest.create.mockResolvedValue({ id: "dr-new" });
});

describe("POST /api/anfrage/[slug]", () => {
  it("gibt 404 zurück wenn keine Practice mit diesem Slug existiert", async () => {
    pm.practice.findUnique.mockResolvedValue(null);
    const res = await POST(makeJsonReq("unbekannt", validBody()), CTX("unbekannt"));
    expect(res.status).toBe(404);
    expect(pm.digitalRequest.create).not.toHaveBeenCalled();
  });

  it("gibt 404 zurück wenn Practice.is_approved=false", async () => {
    pm.practice.findUnique.mockResolvedValue({
      ...activePractice(),
      is_approved: false,
    });
    const res = await POST(makeJsonReq("praxis-1", validBody()), CTX("praxis-1"));
    expect(res.status).toBe(404);
  });

  it("gibt 404 zurück wenn patient_communication_enabled=false", async () => {
    pm.practice.findUnique.mockResolvedValue({
      ...activePractice(),
      patient_communication_enabled: false,
    });
    const res = await POST(makeJsonReq("praxis-1", validBody()), CTX("praxis-1"));
    expect(res.status).toBe(404);
  });

  it("gibt 404 zurück wenn Practice keine OWNER-Membership hat", async () => {
    pm.practice.findUnique.mockResolvedValue({
      ...activePractice(),
      memberships: [],
    });
    const res = await POST(makeJsonReq("praxis-1", validBody()), CTX("praxis-1"));
    expect(res.status).toBe(404);
  });

  it("legt DigitalRequest mit owner_practice_id und owner_account_id an", async () => {
    pm.practice.findUnique.mockResolvedValue(activePractice());
    const res = await POST(makeJsonReq("meine-praxis", validBody()), CTX("meine-praxis"));
    expect(res.status).toBe(303);
    expect(pm.digitalRequest.create).toHaveBeenCalledTimes(1);
    const data = pm.digitalRequest.create.mock.calls[0][0].data;
    expect(data.owner_practice_id).toBe("p-1");
    expect(data.owner_account_id).toBe("acc-owner");
  });

  it("practice_form_id ist NULL (kein Bezug zu einem Formular)", async () => {
    pm.practice.findUnique.mockResolvedValue(activePractice());
    await POST(makeJsonReq("meine-praxis", validBody()), CTX("meine-praxis"));
    const data = pm.digitalRequest.create.mock.calls[0][0].data;
    expect(data.practice_form_id).toBeUndefined();
  });

  it("303-Redirect auf /anfrage/[slug]/eingegangen nach Erfolg", async () => {
    pm.practice.findUnique.mockResolvedValue(activePractice());
    const res = await POST(makeJsonReq("meine-praxis", validBody()), CTX("meine-praxis"));
    expect(res.status).toBe(303);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/anfrage/meine-praxis/eingegangen");
  });

  it("gibt 400 zurück bei ungültiger E-Mail", async () => {
    pm.practice.findUnique.mockResolvedValue(activePractice());
    const res = await POST(
      makeJsonReq("meine-praxis", validBody({ email: "kein-at" })),
      CTX("meine-praxis"),
    );
    expect(res.status).toBe(400);
    expect(pm.digitalRequest.create).not.toHaveBeenCalled();
  });

  it("gibt 303 zurück bei Honeypot-Auslösung (keine DB-Schreibung)", async () => {
    pm.practice.findUnique.mockResolvedValue(activePractice());
    const res = await POST(
      makeJsonReq("meine-praxis", validBody({ company_website: "spam" })),
      CTX("meine-praxis"),
    );
    expect(res.status).toBe(303);
    expect(pm.digitalRequest.create).not.toHaveBeenCalled();
  });

  it("sucht nach Practice.slug, nicht nach PracticeQuestionnaireForm.slug", async () => {
    pm.practice.findUnique.mockResolvedValue(null);
    await POST(makeJsonReq("neupatient-form", validBody()), CTX("neupatient-form"));
    expect(pm.practice.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: "neupatient-form" } }),
    );
  });
});
