import { NextRequest, NextResponse } from "next/server";

jest.mock("@/lib/authz", () => ({
  requireInternalDocumentationAccess: jest.fn(),
}));
jest.mock("@/lib/questionnaire/internalDocumentationService", () => ({
  createInternalDocumentationSession: jest.fn(),
  submitInternalDocumentationSession: jest.fn(),
  InternalDocumentationError: class InternalDocumentationError extends Error {
    constructor(message: string, readonly status: number) {
      super(message);
    }
  },
}));

import { requireInternalDocumentationAccess } from "@/lib/authz";
import {
  createInternalDocumentationSession,
  submitInternalDocumentationSession,
} from "@/lib/questionnaire/internalDocumentationService";
import { POST as createRoute } from "@/app/api/internal-documentation/route";
import { POST as submitRoute } from "@/app/api/internal-documentation/[id]/route";

const guard = requireInternalDocumentationAccess as jest.Mock;
const createSession = createInternalDocumentationSession as jest.Mock;
const submitSession = submitInternalDocumentationSession as jest.Mock;
const account = {
  id: "account-1",
  current_practice: { id: "practice-1" },
};

function request(path: string, body: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("practice internal documentation routes", () => {
  beforeEach(() => {
    guard.mockReset().mockResolvedValue({ account, error: null });
    createSession.mockReset().mockResolvedValue({ sessionId: "session-1" });
    submitSession.mockReset().mockResolvedValue(undefined);
  });

  it("leitet Account und aktive Praxis serverseitig an Create weiter", async () => {
    const response = await createRoute(request("/api/internal-documentation", {
      workflow_id: "care_plan_v1",
      patient_reference: "PAT-1",
      owner_practice_id: "practice-evil",
      source: "kiosk_direct",
    }));

    expect(response.status).toBe(200);
    expect(createSession).toHaveBeenCalledWith(expect.objectContaining({
      workflowId: "care_plan_v1",
      patientReference: "PAT-1",
      context: {
        kind: "practice",
        practiceId: "practice-1",
        accountId: "account-1",
      },
    }));
    await expect(response.json()).resolves.toMatchObject({
      link: "http://localhost/cases/internal-documentation/session-1",
    });
  });

  it("blockiert nicht eingeloggte oder unzulässige Accounts vor Create", async () => {
    guard.mockResolvedValue({
      account: null,
      error: NextResponse.json({ ok: false }, { status: 401 }),
    });
    const response = await createRoute(request("/api/internal-documentation", {}));
    expect(response.status).toBe(401);
    expect(createSession).not.toHaveBeenCalled();
  });

  it("delegiert Submit erneut mit aktiver Praxis", async () => {
    const response = await submitRoute(
      request("/api/internal-documentation/session-1", { answers: { note: "Inhalt" } }),
      { params: Promise.resolve({ id: "session-1" }) },
    );
    expect(response.status).toBe(200);
    expect(submitSession).toHaveBeenCalledWith({
      sessionId: "session-1",
      answers: { note: "Inhalt" },
      context: {
        kind: "practice",
        practiceId: "practice-1",
        accountId: "account-1",
      },
    });
  });
});