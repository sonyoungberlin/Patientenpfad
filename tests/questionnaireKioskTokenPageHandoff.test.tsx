import { renderToStaticMarkup } from "react-dom/server";

const formPropsMock = jest.fn();
const redirectMock = jest.fn((url: string) => { throw new Error(`__REDIRECT__:${url}`); });

jest.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: { patientQuestionnaireSession: { findUnique: jest.fn() } },
}));
jest.mock("@/app/q/[token]/QuestionnaireFormClient", () => ({
  QuestionnaireFormClient: (props: Record<string, unknown>) => {
    formPropsMock(props);
    return <div data-questionnaire-form />;
  },
}));
jest.mock("@/components/practice/PublicPracticeFooter", () => ({
  PublicPracticeFooter: () => null,
}));

import QuestionnairePage from "@/app/q/[token]/page";
import { prisma } from "@/lib/prisma";

const findUnique = prisma.patientQuestionnaireSession.findUnique as jest.Mock;
const baseSession = {
  id: "session-1",
  token_expires_at: new Date(Date.now() + 60_000),
  status: "pending",
  patient_reference: null,
  source: "kiosk_direct",
  kiosk_handoff_status: "waiting",
  inquiry_session_id: null,
  deduplicated_questions: [],
  frozen_conditional_rules: null,
  frozen_blocks: null,
  patient_language: "de",
  deleted_at: null,
  context: "patient",
  salutation: null,
  owner_practice: null,
};

describe("Kiosk questionnaire token page handoff", () => {
  beforeEach(() => {
    findUnique.mockReset();
    formPropsMock.mockClear();
    redirectMock.mockClear();
  });

  it("übergibt dem initialen Check-in den stabilen Waiting-Pfad", async () => {
    findUnique.mockResolvedValue(baseSession);
    renderToStaticMarkup(await QuestionnairePage({
      params: Promise.resolve({ token: "check-in-token" }),
    }));
    expect(formPropsMock).toHaveBeenCalledWith(expect.objectContaining({
      patientReference: null,
      kioskHandoffPath: "/questionnaire-kiosk/check-in/session-1/waiting",
    }));
  });

  it("rendert die Folge-Session patientenzugeordnet ohne erneuten Handoff-Pfad", async () => {
    findUnique.mockResolvedValue({
      ...baseSession,
      id: "follow-up-1",
      patient_reference: "004711",
      kiosk_handoff_status: null,
    });
    renderToStaticMarkup(await QuestionnairePage({
      params: Promise.resolve({ token: "follow-up-token" }),
    }));
    expect(formPropsMock).toHaveBeenCalledWith(expect.objectContaining({
      patientReference: "004711",
      kioskHandoffPath: undefined,
    }));
  });

  it("leitet einen bereits abgeschlossenen Check-in bei Reload auf Waiting zurück", async () => {
    findUnique.mockResolvedValue({ ...baseSession, status: "completed" });
    await expect(QuestionnairePage({
      params: Promise.resolve({ token: "check-in-token" }),
    })).rejects.toThrow("__REDIRECT__:/questionnaire-kiosk/check-in/session-1/waiting");
  });
});