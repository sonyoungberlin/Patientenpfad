/**
 * Tests für den Hard-Delete-Flow leerer Practices.
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    practice: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    patientQuestionnaireSession: {
      count: jest.fn(),
    },
    inquirySession: {
      count: jest.fn(),
    },
    caseSession: {
      count: jest.fn(),
    },
    officeCaseSession: {
      count: jest.fn(),
    },
    practiceQuestionnaireForm: {
      count: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { deletePracticeById, type DeletePracticeFailure } from "@/lib/adminActions";

type PrismaMock = {
  practice: {
    findUnique: jest.Mock;
    delete: jest.Mock;
  };
  patientQuestionnaireSession: { count: jest.Mock };
  inquirySession: { count: jest.Mock };
  caseSession: { count: jest.Mock };
  officeCaseSession: { count: jest.Mock };
  practiceQuestionnaireForm: { count: jest.Mock };
};

const pm = prisma as unknown as PrismaMock;

function asFailure(result: unknown): DeletePracticeFailure {
  return result as DeletePracticeFailure;
}

function mockEmptyPractice(name = "Praxis Eins") {
  pm.practice.findUnique.mockResolvedValue({ id: "p-1", name });
  pm.patientQuestionnaireSession.count.mockResolvedValue(0);
  pm.inquirySession.count.mockResolvedValue(0);
  pm.caseSession.count.mockResolvedValue(0);
  pm.officeCaseSession.count.mockResolvedValue(0);
  pm.practiceQuestionnaireForm.count.mockResolvedValue(0);
  pm.practice.delete.mockResolvedValue({});
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("deletePracticeById", () => {
  it("löscht leere Practice", async () => {
    mockEmptyPractice();

    const result = await deletePracticeById("p-1", "Praxis Eins");

    expect(result.ok).toBe(true);
    expect(result.deleted).toBe(true);
    expect(pm.practice.delete).toHaveBeenCalledWith({ where: { id: "p-1" } });
  });

  it("blockiert bei Fragebögen", async () => {
    mockEmptyPractice();
    pm.patientQuestionnaireSession.count.mockResolvedValue(2);

    const result = await deletePracticeById("p-1", "Praxis Eins");

    expect(result.ok).toBe(false);
    expect(result.status).toBe(409);
    expect(result.code).toBe("practice_not_empty");
    expect(asFailure(result).blockers?.some((b) => b.model === "PatientQuestionnaireSession")).toBe(true);
  });

  it("blockiert bei Website-Formularen", async () => {
    mockEmptyPractice();
    pm.practiceQuestionnaireForm.count.mockResolvedValue(1);

    const result = await deletePracticeById("p-1", "Praxis Eins");

    expect(result.ok).toBe(false);
    expect(asFailure(result).blockers?.some((b) => b.model === "PracticeQuestionnaireForm")).toBe(true);
  });

  it("blockiert bei Cases", async () => {
    mockEmptyPractice();
    pm.caseSession.count.mockResolvedValue(3);

    const result = await deletePracticeById("p-1", "Praxis Eins");

    expect(result.ok).toBe(false);
    expect(asFailure(result).blockers?.some((b) => b.model === "CaseSession")).toBe(true);
  });

  it("blockiert bei Inquiries", async () => {
    mockEmptyPractice();
    pm.inquirySession.count.mockResolvedValue(4);

    const result = await deletePracticeById("p-1", "Praxis Eins");

    expect(result.ok).toBe(false);
    expect(asFailure(result).blockers?.some((b) => b.model === "InquirySession")).toBe(true);
  });

  it("blockiert bei Office-Cases", async () => {
    mockEmptyPractice();
    pm.officeCaseSession.count.mockResolvedValue(5);

    const result = await deletePracticeById("p-1", "Praxis Eins");

    expect(result.ok).toBe(false);
    expect(asFailure(result).blockers?.some((b) => b.model === "OfficeCaseSession")).toBe(true);
  });

  it("blockiert bei falschem confirmName", async () => {
    mockEmptyPractice("Praxis Eins");

    const result = await deletePracticeById("p-1", "Praxis Zwei");

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.code).toBe("confirm_name_mismatch");
    expect(pm.practice.delete).not.toHaveBeenCalled();
  });

  it("404 bei unbekannter Practice", async () => {
    pm.practice.findUnique.mockResolvedValue(null);

    const result = await deletePracticeById("p-missing", "Praxis");

    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
    expect(result.code).toBe("practice_not_found");
  });
});