jest.mock("@/lib/prisma", () => ({
  prisma: { patientQuestionnaireSession: { create: jest.fn() } },
}));

import { prisma } from "@/lib/prisma";
import { createQuestionnaireSession } from "@/lib/questionnaire/createSession";

const create = prisma.patientQuestionnaireSession.create as jest.Mock;

describe("createQuestionnaireSession — DigitalRequest-Folgepfad", () => {
  beforeEach(() => {
    create.mockReset().mockResolvedValue({ id: "session-1" });
  });

  it("erlaubt null nur mit explizitem DigitalRequest-Folgepfad", async () => {
    await createQuestionnaireSession({
      selectedBlockIds: ["IDENTITAET"],
      patientReference: null,
      allowUnassignedDigitalRequestFollowUp: true,
      patientLanguage: "de",
      ownerAccountId: "account-1",
      ownerPracticeId: "practice-1",
      source: "digital_request_follow_up",
      origin: "http://localhost",
    });

    expect(create.mock.calls[0][0].data).toEqual(expect.objectContaining({
      owner_account_id: "account-1",
      owner_practice_id: "practice-1",
      patient_reference: null,
      source: "digital_request_follow_up",
      selected_block_ids: ["IDENTITAET"],
    }));
  });

  it("verbietet null für normale QuestionnaireSessions", async () => {
    await expect(createQuestionnaireSession({
      selectedBlockIds: ["IDENTITAET"],
      patientReference: null,
      patientLanguage: "de",
      ownerAccountId: "account-1",
      ownerPracticeId: "practice-1",
      origin: "http://localhost",
    })).rejects.toThrow("Patientenreferenz ist erforderlich");
    expect(create).not.toHaveBeenCalled();
  });

  it("verbietet die Ausnahme ohne den internen Herkunftswert", async () => {
    await expect(createQuestionnaireSession({
      selectedBlockIds: ["IDENTITAET"],
      patientReference: null,
      allowUnassignedDigitalRequestFollowUp: true,
      patientLanguage: "de",
      ownerAccountId: "account-1",
      ownerPracticeId: "practice-1",
      origin: "http://localhost",
    })).rejects.toThrow("Patientenreferenz ist erforderlich");
    expect(create).not.toHaveBeenCalled();
  });
});