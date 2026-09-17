import { NextRequest } from "next/server";

jest.mock("@/lib/questionnaire/publicHandoffAuth", () => ({ resolvePublicHandoff: jest.fn() }));
jest.mock("@/lib/prisma", () => ({ prisma: { patientQuestionnaireSession: { findUnique: jest.fn() } } }));

import { GET as statusGET } from "@/app/public-check-in/[id]/status/route";
import { GET as continueGET } from "@/app/public-check-in/[id]/continue/route";
import { resolvePublicHandoff } from "@/lib/questionnaire/publicHandoffAuth";
import { prisma } from "@/lib/prisma";

const resolve = resolvePublicHandoff as jest.Mock;
const findSession = prisma.patientQuestionnaireSession.findUnique as jest.Mock;
const context = { params: Promise.resolve({ id: "parent-1" }) };
const parent = { owner_practice_id: "practice-1", patient_reference: "4711" };

describe("public check-in delivery", () => {
  beforeEach(() => { resolve.mockReset(); findSession.mockReset(); });

  it.each(["waiting", "closed", "questionnaire_ready"])("pollt nur den Zustand %s", async (state) => {
    resolve.mockResolvedValue({
      status: state,
      follow_up_session_id: state === "questionnaire_ready" ? "child-1" : null,
      parent_session: parent,
    });
    const response = await statusGET(new NextRequest("http://localhost/public-check-in/parent-1/status"), context);
    const body = await response.json();
    expect(body).toEqual({ state });
    expect(JSON.stringify(body)).not.toContain("/q/");
  });

  it("behandelt questionnaire_ready ohne Child neutral als unavailable", async () => {
    resolve.mockResolvedValue({ status: "questionnaire_ready", follow_up_session_id: null, parent_session: parent });
    const response = await statusGET(new NextRequest("http://localhost/public-check-in/parent-1/status"), context);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ state: "unavailable" });
  });

  it("antwortet bei fehlender Capability neutral", async () => {
    resolve.mockResolvedValue(null);
    const response = await statusGET(new NextRequest("http://localhost/public-check-in/parent-1/status"), context);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ state: "unavailable" });
  });

  it("redirectet erst nach erneuter Capability- und Child-Prüfung", async () => {
    resolve.mockResolvedValue({ status: "questionnaire_ready", follow_up_session_id: "child-1", parent_session: parent });
    findSession.mockResolvedValue({
      token: "child-secret", token_expires_at: new Date(Date.now() + 60_000), status: "pending",
      deleted_at: null, owner_practice_id: "practice-1", patient_reference: "4711",
      context: "patient", session_kind: "patient_communication", created_by_kiosk_device_id: null,
      owner_account_id: null, source: "public_check_in",
    });
    const response = await continueGET(new NextRequest("http://localhost/public-check-in/parent-1/continue"), context);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/q/child-secret");
  });

  it.each([
    ["completed", null, "practice-1", new Date(Date.now() + 60_000)],
    ["pending", new Date(), "practice-1", new Date(Date.now() + 60_000)],
    ["pending", null, "practice-2", new Date(Date.now() + 60_000)],
    ["pending", null, "practice-1", new Date(Date.now() - 60_000)],
  ])("verweigert unbrauchbare Children", async (status, deletedAt, practiceId, expiresAt) => {
    resolve.mockResolvedValue({ status: "questionnaire_ready", follow_up_session_id: "child-1", parent_session: parent });
    findSession.mockResolvedValue({
      token: "child-secret", token_expires_at: expiresAt, status, deleted_at: deletedAt,
      owner_practice_id: practiceId, patient_reference: "4711", context: "patient",
      session_kind: "patient_communication", created_by_kiosk_device_id: null,
      owner_account_id: null, source: "public_check_in",
    });
    expect((await continueGET(new NextRequest("http://localhost/public-check-in/parent-1/continue"), context)).status).toBe(404);
  });
});