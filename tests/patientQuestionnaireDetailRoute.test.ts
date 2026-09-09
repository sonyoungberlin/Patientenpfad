import { NextRequest } from "next/server";

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    patientQuestionnaireSession: {
      findFirst: jest.fn(),
    },
  },
}));

import { GET } from "@/app/api/questionnaire/[id]/route";
import { getSessionAccount } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const getSessionAccountMock = getSessionAccount as jest.Mock;
const findFirstMock = (
  prisma as unknown as { patientQuestionnaireSession: { findFirst: jest.Mock } }
).patientQuestionnaireSession.findFirst;

const account = {
  id: "account-a2",
  email: "user@example.test",
  is_approved: true,
  is_admin: false,
  inquiry_assistant_enabled: false,
  patient_communication_enabled: true,
  website_forms_enabled: true,
  current_practice: {
    id: "practice-a",
    is_approved: true,
    patient_communication_enabled: true,
    website_forms_enabled: true,
  },
  memberships: [{ practice_id: "practice-a", role: "USER" }],
};

const detailSession = {
  selected_block_ids: ["KONTAKT"],
  deduplicated_questions: [
    { id: "CONTACT_PHONE", text: "Telefon", type: "text", required: false },
  ],
  answers: { CONTACT_PHONE: "030 123456" },
  frozen_blocks: null,
  session_kind: "patient_communication",
  internal_workflow_id: null,
};

function request(id = "session-1") {
  return new NextRequest(`http://localhost/api/questionnaire/${id}`);
}

beforeEach(() => {
  getSessionAccountMock.mockReset();
  findFirstMock.mockReset();
});

it("liefert genau die aufbereiteten Details eines Fragebogens derselben Praxis", async () => {
  getSessionAccountMock.mockResolvedValue(account);
  findFirstMock.mockResolvedValue(detailSession);

  const response = await GET(request(), {
    params: Promise.resolve({ id: "session-1" }),
  });
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.ok).toBe(true);
  expect(body.detail.questions).toEqual(detailSession.deduplicated_questions);
  expect(body.detail.answers).toEqual(detailSession.answers);
  expect(body.detail).not.toHaveProperty("frozen_blocks");
  expect(body.detail).not.toHaveProperty("owner_practice_id");

  const query = findFirstMock.mock.calls[0][0];
  expect(query.where.AND).toEqual(expect.arrayContaining([
    { id: "session-1" },
    { owner_practice_id: "practice-a" },
    { context: "patient" },
    { status: "completed" },
  ]));
  expect(query.select).toEqual({
    selected_block_ids: true,
    deduplicated_questions: true,
    answers: true,
    frozen_blocks: true,
    session_kind: true,
    internal_workflow_id: true,
  });
});

it("gibt für einen fremden Fragebogen nur 404 zurück", async () => {
  getSessionAccountMock.mockResolvedValue(account);
  findFirstMock.mockResolvedValue(null);

  const response = await GET(request("foreign-session"), {
    params: Promise.resolve({ id: "foreign-session" }),
  });
  const body = await response.json();

  expect(response.status).toBe(404);
  expect(body).toEqual({ ok: false, error: "Fragebogen nicht gefunden." });
});

it("verweigert den Detailabruf ohne Anmeldung vor dem Datenbankzugriff", async () => {
  getSessionAccountMock.mockResolvedValue(null);

  const response = await GET(request(), {
    params: Promise.resolve({ id: "session-1" }),
  });

  expect(response.status).toBe(401);
  expect(findFirstMock).not.toHaveBeenCalled();
});
