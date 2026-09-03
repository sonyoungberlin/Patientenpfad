/**
 * @jest-environment node
 *
 * Tests für den direkten Office-Bewerbungsfragebogen – API-Ansprache.
 */

import { NextRequest } from "next/server";

const createQuestionnaireSessionMock = jest.fn();

jest.mock("@/lib/authz", () => ({
  requireOfficeQuestionnaireAccess: jest.fn().mockResolvedValue({
    account: { id: "account-1" },
    error: null,
  }),
}));

jest.mock("@/lib/questionnaire/practiceScope", () => ({
  getCreateOwnershipData: jest.fn().mockReturnValue({
    owner_account_id: "account-1",
    owner_practice_id: "practice-1",
  }),
}));

jest.mock("@/lib/questionnaire/createSession", () => ({
  createQuestionnaireSession: (...args: unknown[]) =>
    createQuestionnaireSessionMock(...args),
}));

jest.mock("@/lib/prisma", () => ({ prisma: {} }));

import { POST } from "@/app/api/office-cases/questionnaire/route";

const SESSION_RESULT = {
  sessionId: "session-1",
  token: "token-1",
  tokenLink: "https://example.test/q/token-1",
};

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("https://example.test/api/office-cases/questionnaire", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function postWithSalutation(salutation?: unknown) {
  const body: Record<string, unknown> = {
    selected_block_ids: ["BEWERBER_KONTAKT"],
    recipient_reference: "Anna Müller",
  };
  if (salutation !== undefined) body.salutation = salutation;
  return POST(makeRequest(body));
}

beforeEach(() => {
  createQuestionnaireSessionMock.mockReset();
  createQuestionnaireSessionMock.mockResolvedValue(SESSION_RESULT);
});

describe("POST /api/office-cases/questionnaire – salutation", () => {
  it.each([
    ["du", "du"],
    ["sie", "sie"],
    [undefined, "sie"],
    ["ungueltig", "sie"],
  ])("speichert %p als %p in der Session", async (input, expected) => {
    const response = await postWithSalutation(input);

    expect(response.status).toBe(200);
    expect(createQuestionnaireSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        context: "office",
        salutation: expected,
      }),
    );
  });
});