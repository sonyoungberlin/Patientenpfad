/**
 * Tests für den Hard-Delete-Pfad von Admin-Accounts.
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    account: {
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
    practiceQuestionnaireForm: {
      count: jest.fn(),
    },
    officeCaseSession: {
      count: jest.fn(),
    },
    practiceMembership: {
      count: jest.fn(),
    },
  },
}));

import { PracticeRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { deleteAccount, type DeleteAccountFailure } from "@/lib/adminActions";

type PrismaMock = {
  account: {
    findUnique: jest.Mock;
    delete: jest.Mock;
  };
  patientQuestionnaireSession: { count: jest.Mock };
  inquirySession: { count: jest.Mock };
  caseSession: { count: jest.Mock };
  practiceQuestionnaireForm: { count: jest.Mock };
  officeCaseSession: { count: jest.Mock };
  practiceMembership: { count: jest.Mock };
};

const pm = prisma as unknown as PrismaMock;

function asFailure(result: unknown): DeleteAccountFailure {
  return result as DeleteAccountFailure;
}

beforeEach(() => {
  jest.clearAllMocks();
  pm.account.delete.mockResolvedValue({});
});

function mockEmptyAccount() {
  pm.account.findUnique.mockResolvedValue({
    id: "acc-target",
    email: "empty@example.com",
    memberships: [],
  });
  pm.patientQuestionnaireSession.count.mockResolvedValue(0);
  pm.inquirySession.count.mockResolvedValue(0);
  pm.caseSession.count.mockResolvedValue(0);
  pm.practiceQuestionnaireForm.count.mockResolvedValue(0);
  pm.officeCaseSession.count.mockResolvedValue(0);
  pm.practiceMembership.count.mockResolvedValue(0);
}

describe("deleteAccount", () => {
  it("löscht einen leeren Account", async () => {
    mockEmptyAccount();

    const result = await deleteAccount("empty@example.com", "admin-id");

    expect(result.ok).toBe(true);
    expect(result.deleted).toBe(true);
    expect(pm.account.delete).toHaveBeenCalledWith({ where: { id: "acc-target" } });
  });

  it("blockiert Fragebögen", async () => {
    mockEmptyAccount();
    pm.patientQuestionnaireSession.count.mockResolvedValue(2);

    const result = await deleteAccount("empty@example.com", "admin-id");

    expect(result.ok).toBe(false);
    expect(result.status).toBe(409);
    expect(result.code).toBe("account_not_empty");
    expect(asFailure(result).blockers?.some((blocker) => blocker.model === "PatientQuestionnaireSession")).toBe(true);
    expect(pm.account.delete).not.toHaveBeenCalled();
  });

  it("blockiert Website-Formulare", async () => {
    mockEmptyAccount();
    pm.practiceQuestionnaireForm.count.mockResolvedValue(1);

    const result = await deleteAccount("empty@example.com", "admin-id");

    expect(result.ok).toBe(false);
    expect(asFailure(result).blockers?.some((blocker) => blocker.model === "PracticeQuestionnaireForm")).toBe(true);
  });

  it("blockiert Cases, Inquiries und Office-Cases", async () => {
    mockEmptyAccount();
    pm.inquirySession.count.mockResolvedValue(3);
    pm.caseSession.count.mockResolvedValue(4);
    pm.officeCaseSession.count.mockResolvedValue(5);

    const result = await deleteAccount("empty@example.com", "admin-id");

    expect(result.ok).toBe(false);
    const failure = asFailure(result);
    expect(failure.blockers?.some((blocker) => blocker.model === "InquirySession" && blocker.count === 3)).toBe(true);
    expect(failure.blockers?.some((blocker) => blocker.model === "CaseSession" && blocker.count === 4)).toBe(true);
    expect(failure.blockers?.some((blocker) => blocker.model === "OfficeCaseSession" && blocker.count === 5)).toBe(true);
  });

  it("blockiert den letzten OWNER einer Practice", async () => {
    pm.account.findUnique.mockResolvedValue({
      id: "acc-target",
      email: "owner@example.com",
      memberships: [{ practice_id: "practice-1" }],
    });
    pm.patientQuestionnaireSession.count.mockResolvedValue(0);
    pm.inquirySession.count.mockResolvedValue(0);
    pm.caseSession.count.mockResolvedValue(0);
    pm.practiceQuestionnaireForm.count.mockResolvedValue(0);
    pm.officeCaseSession.count.mockResolvedValue(0);
    pm.practiceMembership.count.mockResolvedValue(0);

    const result = await deleteAccount("owner@example.com", "admin-id");

    expect(result.ok).toBe(false);
    expect(result.code).toBe("practice_would_be_orphaned");
    expect(asFailure(result).blockers?.some((blocker) => blocker.reason === "would_orphan_practice")).toBe(true);
  });

  it("blockiert Self-Delete", async () => {
    mockEmptyAccount();

    const result = await deleteAccount("empty@example.com", "acc-target");

    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(result.code).toBe("self_delete_blocked");
    expect(pm.account.delete).not.toHaveBeenCalled();
  });

  it("liefert 404 für unbekannte Accounts", async () => {
    pm.account.findUnique.mockResolvedValue(null);

    const result = await deleteAccount("missing@example.com", "admin-id");

    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
    expect(result.code).toBe("account_not_found");
  });

  it("blockiert bei gemischten Blockern", async () => {
    pm.account.findUnique.mockResolvedValue({
      id: "acc-target",
      email: "mixed@example.com",
      memberships: [{ practice_id: "practice-1" }],
    });
    pm.patientQuestionnaireSession.count.mockResolvedValue(1);
    pm.practiceQuestionnaireForm.count.mockResolvedValue(2);
    pm.inquirySession.count.mockResolvedValue(0);
    pm.caseSession.count.mockResolvedValue(0);
    pm.officeCaseSession.count.mockResolvedValue(0);
    pm.practiceMembership.count.mockResolvedValue(0);

    const result = await deleteAccount("mixed@example.com", "admin-id");

    expect(result.ok).toBe(false);
    expect(asFailure(result).blockers).toHaveLength(3);
  });
});