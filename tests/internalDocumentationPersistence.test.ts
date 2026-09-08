jest.mock("@/lib/prisma", () => ({
  prisma: {
    patientQuestionnaireSession: { create: jest.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { createQuestionnaireSession } from "@/lib/questionnaire/createSession";

const create = prisma.patientQuestionnaireSession.create as jest.Mock;

describe("internal documentation persistence", () => {
  beforeEach(() => {
    create.mockReset().mockResolvedValue({ id: "session-1" });
  });

  it("erzeugt keine öffentliche Token- oder Patient-Copy-Freigabe", async () => {
    const result = await createQuestionnaireSession({
      selectedBlockIds: [],
      patientReference: "PAT-1",
      patientLanguage: "de",
      ownerAccountId: "account-1",
      ownerPracticeId: "practice-1",
      source: "practice_direct",
      sessionKind: "internal_documentation",
      internalWorkflowId: "care_plan_v1",
      origin: "https://example.test",
    });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        token: null,
        token_expires_at: null,
        patient_copy_return_email: null,
        source: "practice_direct",
        session_kind: "internal_documentation",
        internal_workflow_id: "care_plan_v1",
      }),
    }));
    expect(result.token).toBe("");
    expect(result.tokenLink).not.toContain("/q/");
  });
});