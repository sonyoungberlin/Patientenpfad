import { NextRequest } from "next/server";
import { POST as createInternal } from "@/app/api/questionnaire-kiosk/internal/route";
import { POST as submitInternal } from "@/app/api/questionnaire-kiosk/internal/[id]/route";

jest.mock("@/lib/questionnaireKiosk/auth", () => ({
  requireUnlockedQuestionnaireKioskDevice: jest.fn(),
  hasQuestionnaireKioskCapability: jest.fn(),
}));
jest.mock("@/lib/questionnaire/createSession", () => ({
  createQuestionnaireSession: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    patientQuestionnaireSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { createQuestionnaireSession } from "@/lib/questionnaire/createSession";
import { prisma } from "@/lib/prisma";
import {
  hasQuestionnaireKioskCapability,
  requireUnlockedQuestionnaireKioskDevice,
} from "@/lib/questionnaireKiosk/auth";

const guard = requireUnlockedQuestionnaireKioskDevice as jest.Mock;
const hasCapability = hasQuestionnaireKioskCapability as jest.Mock;
const createSession = createQuestionnaireSession as jest.Mock;
const db = prisma as unknown as {
  patientQuestionnaireSession: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};

const device = {
  deviceId: "device-1",
  practiceId: "practice-1",
  deviceName: "Empfang",
  capabilities: ["internal_documentation"],
};

function request(path: string, body: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("interne Kiosk-Dokumentation", () => {
  beforeEach(() => {
    guard.mockReset().mockResolvedValue({ device, error: null });
    hasCapability.mockReset().mockReturnValue(true);
    createSession.mockReset().mockResolvedValue({
      sessionId: "session-1",
      token: "",
      tokenLink: "http://localhost/questionnaire-kiosk/internal/session-1",
    });
    db.patientQuestionnaireSession.findUnique.mockReset();
    db.patientQuestionnaireSession.update.mockReset().mockResolvedValue({});
  });

  it("verlangt die interne Capability vor dem Erstellen", async () => {
    hasCapability.mockReturnValue(false);

    const response = await createInternal(request("/api/questionnaire-kiosk/internal", {
      workflow_id: "care_plan_v1",
      patient_reference: "PAT-1",
    }));

    expect(response.status).toBe(403);
    expect(createSession).not.toHaveBeenCalled();
  });

  it("erstellt care_plan_v1 ausschließlich als interne practice-owned Kiosk-Session", async () => {
    const response = await createInternal(request("/api/questionnaire-kiosk/internal", {
      workflow_id: "care_plan_v1",
      patient_reference: " PAT-1 ",
    }));

    expect(response.status).toBe(200);
    expect(createSession).toHaveBeenCalledWith(expect.objectContaining({
      patientReference: "PAT-1",
      ownerPracticeId: "practice-1",
      createdByKioskDeviceId: "device-1",
      source: "kiosk_direct",
      sessionKind: "internal_documentation",
      internalWorkflowId: "care_plan_v1",
    }));
    const input = createSession.mock.calls[0][0];
    expect(input).not.toHaveProperty("patientCopyReturnEmail");
    expect(input).not.toHaveProperty("practiceConfirmations");
  });

  it("weist eine Session eines anderen Kioskgeräts ab", async () => {
    db.patientQuestionnaireSession.findUnique.mockResolvedValue({
      status: "pending",
      session_kind: "internal_documentation",
      owner_practice_id: "practice-1",
      created_by_kiosk_device_id: "device-2",
      deduplicated_questions: [],
      frozen_blocks: [],
    });

    const response = await submitInternal(
      request("/api/questionnaire-kiosk/internal/session-1", { answers: { note: "Inhalt" } }),
      { params: Promise.resolve({ id: "session-1" }) },
    );

    expect(response.status).toBe(404);
    expect(db.patientQuestionnaireSession.update).not.toHaveBeenCalled();
  });

  it("schließt eine eigene interne Session mit validierten Antworten ab", async () => {
    db.patientQuestionnaireSession.findUnique.mockResolvedValue({
      status: "pending",
      session_kind: "internal_documentation",
      owner_practice_id: "practice-1",
      created_by_kiosk_device_id: "device-1",
      deduplicated_questions: [{ id: "note", type: "textarea" }],
      frozen_blocks: [{
        id: "CARE",
        title: "Versorgungsplan",
        questions: [{ id: "note", type: "textarea", label: "Notiz" }],
        conditionalRules: [],
      }],
    });

    const response = await submitInternal(
      request("/api/questionnaire-kiosk/internal/session-1", { answers: { note: "  Inhalt  " } }),
      { params: Promise.resolve({ id: "session-1" }) },
    );

    expect(response.status).toBe(200);
    expect(db.patientQuestionnaireSession.update).toHaveBeenCalledWith({
      where: { id: "session-1", status: "pending" },
      data: expect.objectContaining({
        answers: { note: "  Inhalt  " },
        status: "completed",
        submitted_at: expect.any(Date),
      }),
    });
  });
});