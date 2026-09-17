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

  it("speichert den Snapshot nur für eine unzugeordnete Follow-up-Session", async () => {
    const snapshot = {
      submitter_name: "Erika Muster",
      birth_date: "1980-01-02",
      submitter_email: "erika@example.com",
      patient_relationship: "new_patient",
      request_intent: "digital_request",
      concern_text: "Bitte um Rückruf",
      requested_topics: ["AU"],
    };

    await createQuestionnaireSession({
      selectedBlockIds: ["IDENTITAET"],
      patientReference: null,
      allowUnassignedDigitalRequestFollowUp: true,
      patientLanguage: "de",
      ownerAccountId: "account-1",
      ownerPracticeId: "practice-1",
      source: "digital_request_follow_up",
      digitalRequestSnapshot: snapshot,
      origin: "http://localhost",
    });

    expect(create.mock.calls[0][0].data.digital_request_snapshot).toEqual(snapshot);
  });

  it("speichert keinen Snapshot mit vorhandener Patientenreferenz", async () => {
    await createQuestionnaireSession({
      selectedBlockIds: ["IDENTITAET"],
      patientReference: "12345",
      patientLanguage: "de",
      ownerAccountId: "account-1",
      ownerPracticeId: "practice-1",
      source: "digital_request_follow_up",
      digitalRequestSnapshot: {
        submitter_name: "Nicht speichern",
        birth_date: null,
        submitter_email: "not-used@example.com",
        patient_relationship: null,
        request_intent: null,
        concern_text: null,
        requested_topics: null,
      },
      origin: "http://localhost",
    });

    expect(create.mock.calls[0][0].data.digital_request_snapshot).toBeUndefined();
  });

  it("speichert außerhalb des DigitalRequest-Folgepfads keinen Snapshot", async () => {
    await createQuestionnaireSession({
      selectedBlockIds: ["IDENTITAET"],
      patientReference: "12345",
      patientLanguage: "de",
      ownerAccountId: "account-1",
      ownerPracticeId: "practice-1",
      source: "internal_link",
      digitalRequestSnapshot: {
        submitter_name: "Nicht speichern",
        birth_date: null,
        submitter_email: null,
        patient_relationship: null,
        request_intent: null,
        concern_text: null,
        requested_topics: null,
      },
      origin: "http://localhost",
    });

    expect(create.mock.calls[0][0].data.digital_request_snapshot).toBeUndefined();
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