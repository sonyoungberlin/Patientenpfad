import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: { practice: { findUnique: jest.fn(), update: jest.fn() } },
}));
jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
  getSessionAccountFromCookies: jest.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import { PUT } from "@/app/api/practice/inquiry-settings/route";

const practiceMock = prisma.practice as unknown as {
  update: jest.Mock;
  findUnique: jest.Mock;
};
const getSessionAccountMock = getSessionAccount as jest.Mock;

function account(role: "OWNER" | "ADMIN" | "USER" | "INBOX_ONLY") {
  return {
    id: "account-1",
    email: "test@example.com",
    is_approved: true,
    is_admin: false,
    patient_communication_enabled: true,
    current_practice: { id: "practice-1" },
    memberships: [{ practice_id: "practice-1", role }],
  };
}

function request() {
  return new NextRequest("http://localhost/api/practice/inquiry-settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      questionnaireConfirmationText1: "  Erklärung 1  ",
      questionnaireConfirmationText2: "",
      questionnaireConfirmationText3: "Erklärung 3",
    }),
  });
}

describe("PUT /api/practice/inquiry-settings – Confirmations", () => {
  beforeEach(() => {
    practiceMock.update.mockReset().mockResolvedValue({});
    getSessionAccountMock.mockReset();
  });

  it.each(["OWNER", "ADMIN"] as const)("%s kann alle Slots speichern", async (role) => {
    getSessionAccountMock.mockResolvedValue(account(role));
    const response = await PUT(request());
    expect(response.status).toBe(200);
    expect(practiceMock.update).toHaveBeenCalledWith({
      where: { id: "practice-1" },
      data: {
        questionnaire_confirmation_text_1: "Erklärung 1",
        questionnaire_confirmation_text_2: null,
        questionnaire_confirmation_text_3: "Erklärung 3",
      },
    });
  });

  it.each(["USER", "INBOX_ONLY"] as const)("%s darf Slots nicht speichern", async (role) => {
    getSessionAccountMock.mockResolvedValue(account(role));
    const response = await PUT(request());
    expect(response.status).toBe(403);
    expect(practiceMock.update).not.toHaveBeenCalled();
  });
});