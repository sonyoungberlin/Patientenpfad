/** Tests für den 30-Tage-Lifecycle und den praxisbezogenen Hard Delete. */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    practice: { findUnique: jest.fn(), delete: jest.fn() },
    patientQuestionnaireSession: { deleteMany: jest.fn() },
    inquirySession: { deleteMany: jest.fn() },
    caseSession: { deleteMany: jest.fn() },
    officeCaseSession: { deleteMany: jest.fn() },
    workflowSession: { deleteMany: jest.fn() },
    practiceQuestionnaireForm: { deleteMany: jest.fn() },
    digitalRequest: { deleteMany: jest.fn() },
    practiceCatalogEntry: { deleteMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import { deletePracticeById } from "@/lib/adminActions";

const pm = prisma as unknown as {
  practice: { findUnique: jest.Mock; delete: jest.Mock };
  patientQuestionnaireSession: { deleteMany: jest.Mock };
  inquirySession: { deleteMany: jest.Mock };
  caseSession: { deleteMany: jest.Mock };
  officeCaseSession: { deleteMany: jest.Mock };
  workflowSession: { deleteMany: jest.Mock };
  practiceQuestionnaireForm: { deleteMany: jest.Mock };
  digitalRequest: { deleteMany: jest.Mock };
  practiceCatalogEntry: { deleteMany: jest.Mock };
  $transaction: jest.Mock;
};

function mockDeletablePractice() {
  pm.practice.findUnique.mockResolvedValue({
    id: "p-1",
    name: "Praxis Eins",
    disabled_at: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
  });
  pm.$transaction.mockImplementation((callback: (tx: typeof pm) => unknown) => callback(pm));
  pm.practice.delete.mockResolvedValue({});
}

beforeEach(() => jest.clearAllMocks());

describe("deletePracticeById", () => {
  it("löscht praxisbezogene Daten und nur die Practice in einer Transaktion", async () => {
    mockDeletablePractice();
    const result = await deletePracticeById("p-1", "Praxis Eins");
    expect(result).toMatchObject({ ok: true, deleted: true });
    expect(pm.digitalRequest.deleteMany).toHaveBeenCalledWith({ where: { owner_practice_id: "p-1" } });
    expect(pm.practiceCatalogEntry.deleteMany).toHaveBeenCalledWith({ where: { practice_id: "p-1" } });
    expect(pm.practice.delete).toHaveBeenCalledWith({ where: { id: "p-1" } });
  });

  it("blockiert vor Ablauf der 30-Tage-Frist", async () => {
    pm.practice.findUnique.mockResolvedValue({
      id: "p-1",
      name: "Praxis Eins",
      disabled_at: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
    });
    const result = await deletePracticeById("p-1", "Praxis Eins");
    expect(result).toMatchObject({ ok: false, code: "practice_not_deletable", status: 409 });
    expect(pm.practice.delete).not.toHaveBeenCalled();
  });

  it("verlangt Deaktivierung vor einem Hard Delete", async () => {
    pm.practice.findUnique.mockResolvedValue({ id: "p-1", name: "Praxis Eins", disabled_at: null });
    const result = await deletePracticeById("p-1", "Praxis Eins");
    expect(result).toMatchObject({ ok: false, code: "practice_not_deletable", status: 409 });
  });

  it("lehnt falsche Namensbestätigung ab", async () => {
    mockDeletablePractice();
    const result = await deletePracticeById("p-1", "Andere Praxis");
    expect(result).toMatchObject({ ok: false, code: "confirm_name_mismatch", status: 400 });
    expect(pm.practice.delete).not.toHaveBeenCalled();
  });

  it("liefert 404 für unbekannte Praxis", async () => {
    pm.practice.findUnique.mockResolvedValue(null);
    const result = await deletePracticeById("p-missing", "Praxis");
    expect(result).toMatchObject({ ok: false, code: "practice_not_found", status: 404 });
  });
});
