import { NextRequest } from "next/server";

jest.mock("@/lib/practice/publicIdentity", () => ({ getPublicPracticeIdentityBySlug: jest.fn() }));
jest.mock("@/lib/questionnaire/createSession", () => ({ createQuestionnaireSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({ prisma: { $transaction: jest.fn() } }));

import { POST } from "@/app/public-check-in/start/[practiceSlug]/route";
import { getPublicPracticeIdentityBySlug } from "@/lib/practice/publicIdentity";
import { createQuestionnaireSession } from "@/lib/questionnaire/createSession";
import { prisma } from "@/lib/prisma";

const practiceLookup = getPublicPracticeIdentityBySlug as jest.Mock;
const createSession = createQuestionnaireSession as jest.Mock;
const transaction = prisma.$transaction as jest.Mock;
const handoffCreate = jest.fn();

function request(origin = "http://localhost") {
  return new NextRequest("http://localhost/public-check-in/start/praxis-a", {
    method: "POST",
    headers: { origin, "content-type": "application/x-www-form-urlencoded" },
    body: "website=",
  });
}

describe("POST public check-in start", () => {
  beforeEach(() => {
    practiceLookup.mockReset().mockResolvedValue({
      id: "practice-1", is_approved: true, disabled_at: null, patient_communication_enabled: true,
    });
    createSession.mockReset().mockResolvedValue({
      sessionId: "parent-1", token: "questionnaire-token", tokenLink: "http://localhost/q/questionnaire-token",
    });
    handoffCreate.mockReset().mockResolvedValue({});
    transaction.mockReset().mockImplementation(async (callback) => callback({
      patientQuestionnaireSession: { create: jest.fn() }, publicQuestionnaireHandoff: { create: handoffCreate },
    }));
  });

  it("erzeugt Parent und Hash atomar und setzt nur das HttpOnly-Cookie", async () => {
    const response = await POST(request(), { params: Promise.resolve({ practiceSlug: "praxis-a" }) });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/q/questionnaire-token");
    expect(createSession).toHaveBeenCalledWith(expect.objectContaining({
      selectedBlockIds: ["KONTAKT", "CHECK_IN"], patientReference: null,
      allowUnassignedPublicCheckIn: true, ownerPracticeId: "practice-1",
      source: "public_check_in", databaseClient: expect.any(Object),
    }));
    const handoffData = handoffCreate.mock.calls[0][0].data;
    expect(handoffData.parent_session_id).toBe("parent-1");
    expect(handoffData.secret_hash).toMatch(/^[a-f0-9]{64}$/);
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("pp_public_check_in_parent-1=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=strict");
    expect(JSON.stringify(await response.text())).not.toContain(handoffData.secret_hash);
  });

  it("weist Cross-Origin und inaktive Praxen neutral ab", async () => {
    expect((await POST(request("https://evil.test"), { params: Promise.resolve({ practiceSlug: "praxis-a" }) })).status).toBe(404);
    practiceLookup.mockResolvedValue({ id: "practice-1", is_approved: false, disabled_at: null, patient_communication_enabled: true });
    expect((await POST(request(), { params: Promise.resolve({ practiceSlug: "praxis-a" }) })).status).toBe(404);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("propagiert einen Handoff-Fehler aus derselben Transaktion ohne Response", async () => {
    handoffCreate.mockRejectedValue(new Error("db failure"));
    await expect(POST(request(), { params: Promise.resolve({ practiceSlug: "praxis-a" }) }))
      .rejects.toThrow("db failure");
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});