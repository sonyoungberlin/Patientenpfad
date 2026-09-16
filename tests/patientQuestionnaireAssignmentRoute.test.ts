import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    patientQuestionnaireSession: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/authz", () => ({
  requireQuestionnaireInboxAccess: jest.fn(),
}));

import { prisma } from "@/lib/prisma";
import { requireQuestionnaireInboxAccess } from "@/lib/authz";
import { PATCH } from "@/app/api/questionnaire/[id]/route";

type PrismaMock = {
  patientQuestionnaireSession: {
    findUnique: jest.Mock;
    updateMany: jest.Mock;
  };
};

const pm = prisma as unknown as PrismaMock;
const requireAccess = requireQuestionnaireInboxAccess as jest.Mock;

const PRACTICE_A = { id: "practice-a" };
const ACCOUNT_A = { id: "account-a", current_practice: PRACTICE_A };

function request(body: unknown) {
  return new NextRequest("http://localhost/api/questionnaire/session-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function websiteSession(overrides: Record<string, unknown> = {}) {
  return {
    owner_account_id: "account-a",
    owner_practice_id: "practice-a",
    source: "website",
    status: "completed",
    confirmed_at: new Date("2026-09-06T10:00:00Z"),
    deleted_at: null,
    context: "patient",
    patient_reference: null,
    created_by_kiosk_device_id: null,
    selected_block_ids: ["KONTAKT"],
    session_kind: "patient_communication",
    kiosk_handoff_status: null,
    ...overrides,
  };
}

function kioskCheckInSession(overrides: Record<string, unknown> = {}) {
  return websiteSession({
    owner_account_id: null,
    source: "kiosk_direct",
    confirmed_at: null,
    created_by_kiosk_device_id: "device-1",
    selected_block_ids: ["KONTAKT", "CHECK_IN"],
    kiosk_handoff_status: "waiting",
    ...overrides,
  });
}

beforeEach(() => {
  requireAccess.mockReset();
  requireAccess.mockResolvedValue({ account: ACCOUNT_A, error: null });
  pm.patientQuestionnaireSession.findUnique.mockReset();
  pm.patientQuestionnaireSession.updateMany.mockReset();
});

describe("PATCH /api/questionnaire/[id] – Website-Patientenzuordnung", () => {
  it("ordnet eine nicht zugeordnete Website-Submission zu und trimmt die Nummer", async () => {
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue(websiteSession());
    pm.patientQuestionnaireSession.updateMany.mockResolvedValue({ count: 1 });

    const response = await PATCH(request({ patient_reference: "  004711  " }), {
      params: Promise.resolve({ id: "session-1" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, patient_reference: "004711" });
    expect(pm.patientQuestionnaireSession.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: "session-1", patient_reference: null }),
      data: { patient_reference: "004711" },
    });
  });

  it("lehnt eine leere Patientennummer ab", async () => {
    const response = await PATCH(request({ patient_reference: "  " }), {
      params: Promise.resolve({ id: "session-1" }),
    });

    expect(response.status).toBe(400);
    expect(pm.patientQuestionnaireSession.findUnique).not.toHaveBeenCalled();
  });

  it.each(["47A11", "47-11"])("lehnt nicht numerische Patientennummer %s ab", async (patientReference) => {
    const response = await PATCH(request({ patient_reference: patientReference }), {
      params: Promise.resolve({ id: "session-1" }),
    });
    expect(response.status).toBe(400);
    expect(pm.patientQuestionnaireSession.findUnique).not.toHaveBeenCalled();
  });

  it.each([null, "nicht-objekt", ["nicht", "objekt"]])(
    "lehnt nicht-objektartigen JSON-Body %j mit 400 ab",
    async (body) => {
      const response = await PATCH(request(body), {
        params: Promise.resolve({ id: "session-1" }),
      });

      expect(response.status).toBe(400);
      expect(pm.patientQuestionnaireSession.findUnique).not.toHaveBeenCalled();
      expect(pm.patientQuestionnaireSession.updateMany).not.toHaveBeenCalled();
    },
  );

  it("überschreibt keine bereits zugeordnete Submission", async () => {
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue(
      websiteSession({ patient_reference: "4711" }),
    );

    const response = await PATCH(request({ patient_reference: "9999" }), {
      params: Promise.resolve({ id: "session-1" }),
    });

    expect(response.status).toBe(404);
    expect(pm.patientQuestionnaireSession.updateMany).not.toHaveBeenCalled();
  });

  it.each([
    ["internal_link", "patient", null, "completed"],
    ["website", "office", null, "completed"],
    ["website", "patient", null, "pending"],
    ["website", "patient", null, "completed"],
  ])("lehnt nicht passende Session (%s/%s/%s/%s) ab", async (source, context, confirmedAt, status) => {
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue(
      websiteSession({ source, context, confirmed_at: confirmedAt, status }),
    );

    const response = await PATCH(request({ patient_reference: "4711" }), {
      params: Promise.resolve({ id: "session-1" }),
    });

    expect(response.status).toBe(404);
    expect(pm.patientQuestionnaireSession.updateMany).not.toHaveBeenCalled();
  });

  it("lehnt eine Submission aus einer fremden Praxis ab", async () => {
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue(
      websiteSession({ owner_practice_id: "practice-b" }),
    );

    const response = await PATCH(request({ patient_reference: "4711" }), {
      params: Promise.resolve({ id: "session-1" }),
    });

    expect(response.status).toBe(404);
    expect(pm.patientQuestionnaireSession.updateMany).not.toHaveBeenCalled();
  });

  it("meldet einen parallelen Schreibkonflikt ohne Überschreiben", async () => {
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue(websiteSession());
    pm.patientQuestionnaireSession.updateMany.mockResolvedValue({ count: 0 });

    const response = await PATCH(request({ patient_reference: "4711" }), {
      params: Promise.resolve({ id: "session-1" }),
    });

    expect(response.status).toBe(409);
    expect((await response.json()).ok).toBe(false);
  });

  it("ordnet einen wartenden initialen Kiosk-Check-in zu", async () => {
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue(kioskCheckInSession());
    pm.patientQuestionnaireSession.updateMany.mockResolvedValue({ count: 1 });

    const response = await PATCH(request({ patient_reference: "004711" }), {
      params: Promise.resolve({ id: "session-1" }),
    });

    expect(response.status).toBe(200);
    expect(pm.patientQuestionnaireSession.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        OR: expect.arrayContaining([
          expect.objectContaining({ kiosk_handoff_status: "waiting" }),
        ]),
      }),
      data: { patient_reference: "004711" },
    }));
  });

  it("ordnet keine beliebige Kiosk-Session zu", async () => {
    pm.patientQuestionnaireSession.findUnique.mockResolvedValue(kioskCheckInSession({
      selected_block_ids: ["KONTAKT"],
    }));

    const response = await PATCH(request({ patient_reference: "004711" }), {
      params: Promise.resolve({ id: "session-1" }),
    });

    expect(response.status).toBe(404);
    expect(pm.patientQuestionnaireSession.updateMany).not.toHaveBeenCalled();
  });
});
