import { NextRequest, NextResponse } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    patientQuestionnaireSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/authz", () => ({
  requireOfficeQuestionnaireAccess: jest.fn(),
}));

jest.mock("@/lib/office/scope", () => ({
  getOfficeOwnershipFilter: jest.fn(() => ({ owner_practice_id: "practice-1" })),
}));

import { prisma } from "@/lib/prisma";
import { requireOfficeQuestionnaireAccess } from "@/lib/authz";
import { DELETE } from "@/app/api/office-cases/questionnaire/[id]/route";
import { POST as RESTORE } from "@/app/api/office-cases/questionnaire/[id]/restore/route";

const questionnaire = prisma.patientQuestionnaireSession as unknown as {
  findUnique: jest.Mock;
  update: jest.Mock;
  updateMany: jest.Mock;
};
const requireAccess = requireOfficeQuestionnaireAccess as jest.Mock;

const account = { id: "account-1", current_practice: { id: "practice-1" } };

function request(path: string, method: "DELETE" | "POST") {
  return new NextRequest(`http://localhost${path}`, { method });
}

beforeEach(() => {
  jest.clearAllMocks();
  requireAccess.mockResolvedValue({ account, error: null });
});

describe("office questionnaire lifecycle routes", () => {
  it("verschiebt Pending nicht in den Papierkorb", async () => {
    questionnaire.findUnique.mockResolvedValue({
      owner_account_id: "account-1",
      owner_practice_id: "practice-1",
      context: "office",
      status: "pending",
      submitted_at: null,
      deleted_at: null,
    });

    const response = await DELETE(
      request("/api/office-cases/questionnaire/q-1", "DELETE"),
      { params: Promise.resolve({ id: "q-1" }) },
    );

    expect(response.status).toBe(404);
    expect(questionnaire.update).not.toHaveBeenCalled();
  });

  it("verschiebt einen eingegangenen Fragebogen in den Papierkorb", async () => {
    questionnaire.findUnique.mockResolvedValue({
      owner_account_id: "account-1",
      owner_practice_id: "practice-1",
      context: "office",
      status: "completed",
      submitted_at: new Date(),
      deleted_at: null,
    });
    questionnaire.update.mockResolvedValue({});

    const response = await DELETE(
      request("/api/office-cases/questionnaire/q-1", "DELETE"),
      { params: Promise.resolve({ id: "q-1" }) },
    );

    expect(response.status).toBe(200);
    expect(questionnaire.update).toHaveBeenCalledWith({
      where: { id: "q-1" },
      data: { deleted_at: expect.any(Date) },
    });
  });

  it("stellt innerhalb von 48 Stunden wieder her", async () => {
    questionnaire.findUnique.mockResolvedValue({
      owner_account_id: "account-1",
      owner_practice_id: "practice-1",
      context: "office",
      status: "completed",
      deleted_at: new Date(Date.now() - 47 * 60 * 60 * 1000),
    });
    questionnaire.updateMany.mockResolvedValue({ count: 1 });

    const response = await RESTORE(
      request("/api/office-cases/questionnaire/q-1/restore", "POST"),
      { params: Promise.resolve({ id: "q-1" }) },
    );

    expect(response.status).toBe(200);
    expect(questionnaire.updateMany).toHaveBeenCalledWith({
      where: {
        id: "q-1",
        context: "office",
        status: "completed",
        deleted_at: { gt: expect.any(Date) },
      },
      data: { deleted_at: null },
    });
  });

  it("stellt nach Ablauf von 48 Stunden nicht wieder her", async () => {
    questionnaire.findUnique.mockResolvedValue({
      owner_account_id: "account-1",
      owner_practice_id: "practice-1",
      context: "office",
      status: "completed",
      deleted_at: new Date(Date.now() - 49 * 60 * 60 * 1000),
    });

    const response = await RESTORE(
      request("/api/office-cases/questionnaire/q-1/restore", "POST"),
      { params: Promise.resolve({ id: "q-1" }) },
    );

    expect(response.status).toBe(404);
    expect(questionnaire.updateMany).not.toHaveBeenCalled();
  });

  it("gibt den Auth-Fehler unverändert zurück", async () => {
    requireAccess.mockResolvedValue({
      account: null,
      error: NextResponse.json({ ok: false }, { status: 403 }),
    });

    const response = await RESTORE(
      request("/api/office-cases/questionnaire/q-1/restore", "POST"),
      { params: Promise.resolve({ id: "q-1" }) },
    );

    expect(response.status).toBe(403);
  });
});