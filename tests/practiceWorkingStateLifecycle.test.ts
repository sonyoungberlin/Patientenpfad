import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    workflowSession: {
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    practiceCatalogEntry: {
      findFirst: jest.fn(),
      create: jest.fn(),
      aggregate: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock("@/lib/practiceProcesses/practiceDefinitionService", () => ({
  resolveDefinitionsForPublish: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
}));

jest.mock("@/lib/authz", () => ({
  canAccessWorkflowCases: jest.fn(() => true),
  requirePracticeCatalogAccess: jest.fn(async () => ({
    account: { id: "account-1" },
    error: null,
  })),
}));

import { prisma } from "@/lib/prisma";
import { resolveDefinitionsForPublish } from "@/lib/practiceProcesses/practiceDefinitionService";
import { ensurePracticeWorkingSession } from "@/lib/practiceCatalog/workingState";
import { publishToCatalog } from "@/lib/practiceCatalog/publish";
import { startRevision } from "@/lib/practiceCatalog/startRevision";
import { DELETE } from "@/app/api/workflow-cases/[id]/route";
import { getSessionAccount } from "@/lib/auth";

const pm = prisma as unknown as {
  workflowSession: { findFirst: jest.Mock; create: jest.Mock; delete: jest.Mock };
  practiceCatalogEntry: {
    findFirst: jest.Mock;
    create: jest.Mock;
    aggregate: jest.Mock;
    updateMany: jest.Mock;
  };
  $transaction: jest.Mock;
};
const resolveDefinitionsMock = resolveDefinitionsForPublish as jest.Mock;
const getSessionMock = getSessionAccount as jest.Mock;

const snapshot = {
  processKind: "practice-workflow" as const,
  snapshotVersion: 2 as const,
  caseProfileId: "case-a",
  caseProfileTitle: "Fall A",
  checkpoints: [{ checkpointId: "cp-a", checkpointTitle: "Checkpoint A" }],
};

function input(overrides: Partial<Parameters<typeof ensurePracticeWorkingSession>[0]> = {}) {
  return {
    accountId: "account-1",
    practiceId: "practice-1",
    caseProfileId: "case-a",
    title: "Fall A",
    snapshot,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  pm.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => unknown) => callback(prisma));
  pm.practiceCatalogEntry.aggregate.mockResolvedValue({ _max: { version: 1 } });
  pm.practiceCatalogEntry.create.mockResolvedValue({ id: "entry-2" });
  pm.workflowSession.create.mockResolvedValue({ id: "session-1" });
  pm.workflowSession.delete.mockResolvedValue({ id: "session-1" });
  resolveDefinitionsMock.mockResolvedValue([{
    checkpointId: "cp-a",
    checkpointTitle: "Checkpoint A",
    checkpointDescription: "Beschreibung",
    checkpointAnchors: [],
    selectedAnchorIds: [],
    implementation: "Umsetzen",
  }]);
  getSessionMock.mockResolvedValue({
    id: "account-1",
    is_approved: true,
    current_practice: { id: "practice-1" },
  });
});

describe("practice working-state lifecycle", () => {
  it("1. erzeugt bei aktiver Praxis und unbekanntem Fall genau eine Session", async () => {
    pm.workflowSession.findFirst.mockResolvedValue(null);

    const result = await ensurePracticeWorkingSession(input());

    expect(result).toEqual({ id: "session-1", alreadyExists: false });
    expect(pm.workflowSession.create).toHaveBeenCalledTimes(1);
    expect(pm.workflowSession.create.mock.calls[0][0].data).toMatchObject({
      owner_practice_id: "practice-1",
      case_profile_id: "case-a",
    });
  });

  it("2. verwendet beim erneuten Start dieselbe Session", async () => {
    pm.workflowSession.findFirst.mockResolvedValue({ id: "session-existing" });

    const result = await ensurePracticeWorkingSession(input());

    expect(result).toEqual({ id: "session-existing", alreadyExists: true });
    expect(pm.workflowSession.create).not.toHaveBeenCalled();
  });

  it("3. behandelt einen konkurrierenden Start als bereits vorhandene Session", async () => {
    pm.workflowSession.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "session-concurrent" });
    pm.workflowSession.create.mockRejectedValue(new Error("Unique constraint failed"));

    const result = await ensurePracticeWorkingSession(input());

    expect(result).toEqual({ id: "session-concurrent", alreadyExists: true });
  });

  it("4. erlaubt denselben Fall in einer anderen Praxis", async () => {
    pm.workflowSession.findFirst.mockResolvedValue(null);

    await ensurePracticeWorkingSession(input({ practiceId: "practice-2" }));

    expect(pm.workflowSession.create.mock.calls[0][0].data.owner_practice_id).toBe("practice-2");
  });

  it("5. erlaubt einen anderen Fall in derselben Praxis", async () => {
    pm.workflowSession.findFirst.mockResolvedValue(null);

    await ensurePracticeWorkingSession(input({ caseProfileId: "case-b" }));

    expect(pm.workflowSession.create.mock.calls[0][0].data.case_profile_id).toBe("case-b");
  });

  it("6. lehnt den Working State ohne aktive Praxis vor dem Create ab", async () => {
    await expect(ensurePracticeWorkingSession(input({ practiceId: "" }))).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(pm.workflowSession.create).not.toHaveBeenCalled();
  });

  it("7. startet eine Revision ohne Praxis nicht und erzeugt keine Session", async () => {
    pm.practiceCatalogEntry.findFirst.mockResolvedValue(null);

    await expect(startRevision({ entryId: "entry-1", practiceId: "", accountId: "account-1" })).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(pm.workflowSession.create).not.toHaveBeenCalled();
  });

  it("8. erzeugt beim Publish den Katalogeintrag und löscht die Working Session", async () => {
    pm.practiceCatalogEntry.findFirst.mockResolvedValueOnce(null);
    resolveDefinitionsMock.mockResolvedValueOnce([{
      checkpointId: "cp-a",
      checkpointTitle: "Aktueller DB-Titel",
      checkpointDescription: "Beschreibung",
      checkpointAnchors: [],
      selectedAnchorIds: [],
      implementation: "Umsetzen",
    }]);
    pm.workflowSession.findFirst.mockResolvedValue({
      id: "session-1",
      owner_practice_id: "practice-1",
      process_snapshot: { ...snapshot, checkpoints: [{ ...snapshot.checkpoints[0], decision: "PFLICHT" }] },
      source_catalog_entry_id: null,
    });

    const result = await publishToCatalog({
      sessionId: "session-1",
      title: "Fall A",
      practiceId: "practice-1",
      accountId: "account-1",
    });

    expect(result).toEqual({ ok: true, id: "entry-2" });
    expect(pm.practiceCatalogEntry.create).toHaveBeenCalledTimes(1);
    expect(pm.practiceCatalogEntry.create.mock.calls[0][0].data.snapshot.checkpoints[0].checkpointTitle)
      .toBe("Aktueller DB-Titel");
    expect(pm.workflowSession.delete).toHaveBeenCalledWith({ where: { id: "session-1" } });
  });

  it("blockiert Publish solange eine Praxisdefinition eine stale Anchor-ID enthält", async () => {
    pm.practiceCatalogEntry.findFirst.mockResolvedValue(null);
    pm.workflowSession.findFirst.mockResolvedValue({
      id: "session-1",
      owner_practice_id: "practice-1",
      process_snapshot: {
        ...snapshot,
        checkpoints: [{ ...snapshot.checkpoints[0], decision: "PFLICHT" }],
      },
      source_catalog_entry_id: null,
    });
    resolveDefinitionsMock.mockRejectedValueOnce(
      Object.assign(new Error("Praxisdefinition ist stale"), { statusCode: 422 }),
    );

    await expect(publishToCatalog({
      sessionId: "session-1",
      title: "Fall A",
      practiceId: "practice-1",
      accountId: "account-1",
    })).rejects.toMatchObject({ statusCode: 422 });
    expect(pm.practiceCatalogEntry.create).not.toHaveBeenCalled();
    expect(pm.workflowSession.delete).not.toHaveBeenCalled();
  });

  it("9. liefert beim Publish-Retry den bestehenden Eintrag ohne Duplikat", async () => {
    pm.practiceCatalogEntry.findFirst.mockResolvedValue({ id: "entry-existing" });

    const result = await publishToCatalog({
      sessionId: "session-1",
      title: "Fall A",
      practiceId: "practice-1",
      accountId: "account-1",
    });

    expect(result).toEqual({ ok: true, id: "entry-existing", alreadyPublished: true });
    expect(pm.workflowSession.findFirst).not.toHaveBeenCalled();
    expect(pm.practiceCatalogEntry.create).not.toHaveBeenCalled();
  });

  it("10. Verwerfen löscht nur die Working Session", async () => {
    pm.workflowSession.findFirst.mockResolvedValue({
      id: "session-1",
      case_profile_id: "case-a",
      process_snapshot: snapshot,
    });

    const result = await DELETE(new NextRequest("http://localhost/api/workflow-cases/session-1"), {
      params: Promise.resolve({ id: "session-1" }),
    });

    expect(result.status).toBe(200);
    expect(pm.workflowSession.delete).toHaveBeenCalledWith({ where: { id: "session-1" } });
    expect(pm.practiceCatalogEntry.create).not.toHaveBeenCalled();
  });

  it("11. erlaubt nach dem Verwerfen wieder eine neue Session", async () => {
    pm.workflowSession.findFirst.mockResolvedValue(null);

    const result = await ensurePracticeWorkingSession(input());

    expect(result.alreadyExists).toBe(false);
    expect(pm.workflowSession.create).toHaveBeenCalledTimes(1);
  });

  it("12. erlaubt nach Publish wieder einen neuen Working State", async () => {
    pm.workflowSession.findFirst.mockResolvedValue(null);

    const result = await ensurePracticeWorkingSession(input());

    expect(result.alreadyExists).toBe(false);
    expect(pm.workflowSession.create).toHaveBeenCalledTimes(1);
  });
});