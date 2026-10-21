import type { PracticeCaseChainDefinition } from "@/lib/practiceChains/types";

const mockPracticeCaseChain = {
  findMany: jest.fn(),
  findFirst: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
};
const mockPracticeCaseChainEntryApproval = {
  findMany: jest.fn(),
  findFirst: jest.fn(),
  upsert: jest.fn(),
  updateMany: jest.fn(),
};
const mockPracticeCaseChainConnectionApproval = {
  findMany: jest.fn(),
  findFirst: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
};
const mockPracticeCaseChainApprovalEvent = { create: jest.fn() };
const mockPracticeCatalogEntry = { findMany: jest.fn() };
const mockPracticeCheckpointDefinition = { findMany: jest.fn(), findUnique: jest.fn() };
const mockRequirePracticeCatalogAccess = jest.fn();
const mockGetCheckpointFromLib = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    practiceCaseChain: mockPracticeCaseChain,
    practiceCaseChainEntryApproval: mockPracticeCaseChainEntryApproval,
    practiceCaseChainConnectionApproval: mockPracticeCaseChainConnectionApproval,
    practiceCaseChainApprovalEvent: mockPracticeCaseChainApprovalEvent,
    practiceCatalogEntry: mockPracticeCatalogEntry,
    practiceCheckpointDefinition: mockPracticeCheckpointDefinition,
    $transaction: jest.fn(async (callback: (tx: unknown) => unknown) => callback({
      practiceCaseChainEntryApproval: mockPracticeCaseChainEntryApproval,
      practiceCaseChainConnectionApproval: mockPracticeCaseChainConnectionApproval,
      practiceCaseChainApprovalEvent: mockPracticeCaseChainApprovalEvent,
    })),
  },
}));

jest.mock("@/lib/authz", () => ({
  ...jest.requireActual("@/lib/authz"),
  requirePracticeCatalogAccess: mockRequirePracticeCatalogAccess,
}));

jest.mock("@/lib/auth", () => ({ getSessionAccount: jest.fn() }));

jest.mock("@/lib/practiceProcesses/checkpointLibrary", () => ({
  getCheckpointFromLib: (...args: unknown[]) => mockGetCheckpointFromLib(...args),
  listCheckpointsFromLib: jest.fn(),
}));

import { approvePracticeChainConnection, approvePracticeChainEntry, createPracticeChain, createPracticeChainRevision, deactivatePracticeChain, getApprovedPracticeChainContinuation, getPracticeChain, getReadyPracticeChainRunner, revokePracticeChainConnection, revokePracticeChainEntry, updatePracticeChain } from "@/lib/practiceChains/service";
import { validateChainDefinition } from "@/lib/practiceChains/validate";
import { continueRunner, createRunnerState, followRunnerTarget, getRunnerContinuationStatus, goBackRunner } from "@/lib/practiceChains/runner";
import type { RunnerChain } from "@/lib/practiceChains/runner";
import { discoverPracticeChainSegments, findAttachmentCandidates, getSegmentTerminalCatalogEntryIds } from "@/lib/practiceChains/discovery";
import { GET as getChains } from "@/app/api/practice-chains/route";
import { PATCH as patchChain } from "@/app/api/practice-chains/[id]/route";
import { POST as reviseChain } from "@/app/api/practice-chains/[id]/revision/route";
import { GET as getRunner } from "@/app/api/practice-chains/[id]/runner/route";
import { PATCH as deactivateChain } from "@/app/api/practice-chains/[id]/deactivate/route";
import { DELETE as deleteApproval } from "@/app/api/practice-chains/[id]/approvals/route";
import { getSessionAccount } from "@/lib/auth";
import { NextRequest } from "next/server";

const PRACTICE_ID = "practice-1";
const OTHER_PRACTICE_ID = "practice-2";
const ENTRY_V1 = "entry-v1";
const ENTRY_V2 = "entry-v2";
const account = {
  id: "account-1",
  email: "owner@example.com",
  is_approved: true,
  is_admin: false,
  arbeitsprozesse_enabled: true,
  current_practice: { id: PRACTICE_ID, name: "Praxis" },
  memberships: [{ practice_id: PRACTICE_ID, role: "OWNER" }],
};

const emptyDefinition: PracticeCaseChainDefinition = { startStepId: null, steps: [], transitions: [] };
const completeDefinition: PracticeCaseChainDefinition = {
  startStepId: "step-1",
  steps: [
    { id: "step-1", catalogEntryId: ENTRY_V1 },
    { id: "step-2", catalogEntryId: ENTRY_V2 },
  ],
  transitions: [
    { id: "transition-1", fromStepId: "step-1", kind: "QUESTION", question: {
      prompt: "Welche Antwort gilt in dieser Praxis?",
      answers: [
        { id: "answer-1", label: "Weiter", targetStepId: "step-2" },
        { id: "answer-2", label: "Ende", targetStepId: null },
      ],
    }},
    { id: "transition-2", fromStepId: "step-2", kind: "QUESTION", question: {
      prompt: "Soll die Kette hier enden?",
      answers: [{ id: "answer-3", label: "Kette endet", targetStepId: null }],
    }},
  ],
};
const publishedSnapshot = {
  processKind: "practice-workflow",
  snapshotVersion: 2,
  caseProfileId: "profile-1",
  caseProfileTitle: "Profil",
  checkpoints: [],
  completedAt: "2026-09-29T12:00:00.000Z",
};

function row(overrides?: Record<string, unknown>) {
  return {
    id: "chain-1",
    practice_id: PRACTICE_ID,
    name: "Meine Kette",
    status: "DRAFT",
    version: 1,
    source_chain_id: null,
    definition: emptyDefinition,
    created_at: new Date("2026-09-01"),
    updated_at: new Date("2026-09-01"),
    ...overrides,
  };
}

function request(url: string, method = "GET", body?: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  (getSessionAccount as jest.Mock).mockResolvedValue(account);
  mockRequirePracticeCatalogAccess.mockResolvedValue({ account, error: null });
  mockPracticeCatalogEntry.findMany.mockResolvedValue([{ id: ENTRY_V1, snapshot: publishedSnapshot }, { id: ENTRY_V2, snapshot: publishedSnapshot }]);
  mockPracticeCaseChain.findFirst.mockResolvedValue(row());
  mockPracticeCaseChain.findMany.mockResolvedValue([]);
  mockPracticeCaseChain.create.mockResolvedValue(row());
  mockPracticeCaseChain.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => row(data));
  mockPracticeCaseChain.updateMany.mockResolvedValue({ count: 1 });
  mockPracticeCaseChainEntryApproval.findMany.mockResolvedValue([]);
  mockPracticeCaseChainEntryApproval.findFirst.mockResolvedValue(null);
  mockPracticeCaseChainEntryApproval.upsert.mockResolvedValue({ id: "entry-approval" });
  mockPracticeCaseChainEntryApproval.updateMany.mockResolvedValue({ count: 1 });
  mockPracticeCaseChainConnectionApproval.findMany.mockResolvedValue([]);
  mockPracticeCaseChainConnectionApproval.findFirst.mockResolvedValue(null);
  mockPracticeCaseChainConnectionApproval.create.mockResolvedValue({ id: "connection-approval" });
  mockPracticeCaseChainConnectionApproval.update.mockResolvedValue({ id: "connection-approval" });
  mockPracticeCaseChainConnectionApproval.updateMany.mockResolvedValue({ count: 1 });
  mockPracticeCaseChainApprovalEvent.create.mockResolvedValue({ id: "approval-event" });
});

describe("PracticeCaseChain service", () => {
  it("legt einen leeren Draft an, ohne Reihenfolge oder Antworten vorzugeben", async () => {
    const result = await createPracticeChain({ practiceId: PRACTICE_ID, name: "Neue Kette" });
    expect(result.status).toBe("DRAFT");
    expect(result.definition).toEqual(emptyDefinition);
    expect(mockPracticeCaseChain.create.mock.calls[0][0].data.definition).toEqual(emptyDefinition);
  });

  it("speichert einen unvollständigen Draft und kann ihn wieder öffnen", async () => {
    const result = await updatePracticeChain({ id: "chain-1", practiceId: PRACTICE_ID, name: "Offene Kette", status: "DRAFT", definition: emptyDefinition });
    expect(result.status).toBe("DRAFT");
    expect(await getPracticeChain("chain-1", PRACTICE_ID)).not.toBeNull();
  });

  it("verweigert Katalogversionen einer anderen Praxis", async () => {
    mockPracticeCatalogEntry.findMany.mockResolvedValue([]);
    await expect(updatePracticeChain({ id: "chain-1", practiceId: PRACTICE_ID, name: "Fremd", status: "DRAFT", definition: {
      ...emptyDefinition,
      steps: [{ id: "step-1", catalogEntryId: "foreign-entry" }],
    }})).rejects.toMatchObject({ statusCode: 400 });
  });

  it("hält konkrete Katalogversionen in der Definition fest", async () => {
    await updatePracticeChain({ id: "chain-1", practiceId: PRACTICE_ID, name: "Versionierte Kette", status: "DRAFT", definition: completeDefinition });
    const data = mockPracticeCaseChain.update.mock.calls[0][0].data;
    expect(data.definition.steps.map((step: { catalogEntryId: string }) => step.catalogEntryId)).toEqual([ENTRY_V1, ENTRY_V2]);
  });

  it("verweigert READY bei offenen Stellen und erlaubt READY mit expliziten Zielen", async () => {
    await expect(updatePracticeChain({ id: "chain-1", practiceId: PRACTICE_ID, name: "Noch offen", status: "READY", definition: emptyDefinition })).rejects.toMatchObject({ statusCode: 400 });
    await expect(updatePracticeChain({ id: "chain-1", practiceId: PRACTICE_ID, name: "Bereit", status: "READY", definition: completeDefinition })).resolves.toMatchObject({ status: "READY" });
  });

  it("schützt READY vor direkter Änderung", async () => {
    mockPracticeCaseChain.findFirst
      .mockResolvedValueOnce(row({ status: "READY" }))
      .mockResolvedValueOnce(row({ status: "READY" }));
    await expect(updatePracticeChain({ id: "chain-1", practiceId: PRACTICE_ID, name: "Änderung", status: "READY", definition: completeDefinition })).rejects.toMatchObject({ statusCode: 409 });
    expect(mockPracticeCaseChain.update).not.toHaveBeenCalled();
  });

  it("schützt deaktivierte Ketten vor direkter Änderung oder neuer Revision", async () => {
    mockPracticeCaseChain.findFirst
      .mockResolvedValueOnce(row({ status: "DEACTIVATED" }))
      .mockResolvedValueOnce(row({ status: "DEACTIVATED" }));

    await expect(updatePracticeChain({ id: "chain-1", practiceId: PRACTICE_ID, name: "Wieder aktiv", status: "READY", definition: completeDefinition }))
      .rejects.toMatchObject({ statusCode: 409 });
    expect(mockPracticeCaseChain.update).not.toHaveBeenCalled();
    expect(mockPracticeCatalogEntry.findMany).not.toHaveBeenCalled();

    mockPracticeCaseChain.findFirst.mockResolvedValue(row({ status: "DEACTIVATED" }));
    await expect(createPracticeChainRevision("chain-1", PRACTICE_ID)).rejects.toMatchObject({ statusCode: 400 });
    expect(mockPracticeCaseChain.create).not.toHaveBeenCalled();
  });

  it("erstellt aus READY eine nachvollziehbare Draft-Version", async () => {
    mockPracticeCaseChain.findFirst.mockResolvedValue(row({ status: "READY", version: 3, definition: completeDefinition }));
    mockPracticeCaseChain.create.mockResolvedValue(row({ status: "DRAFT", version: 4, source_chain_id: "chain-1", definition: completeDefinition }));
    const result = await createPracticeChainRevision("chain-1", PRACTICE_ID);
    expect(result.status).toBe("DRAFT");
    expect(result.version).toBe(4);
    expect(result.source_chain_id).toBe("chain-1");
    expect(mockPracticeCaseChain.create.mock.calls[0][0].data).toEqual(expect.objectContaining({ version: 4, source_chain_id: "chain-1" }));
  });

  it("deaktiviert ausschließlich eine READY-Kette per Status-Update und erhält Version und Pins", async () => {
    mockPracticeCaseChain.findFirst.mockResolvedValue(row({ status: "DEACTIVATED", version: 3, definition: completeDefinition }));

    const result = await deactivatePracticeChain("chain-1", PRACTICE_ID);

    expect(result).toMatchObject({ status: "DEACTIVATED", version: 3, definition: completeDefinition });
    expect(mockPracticeCaseChain.updateMany).toHaveBeenCalledWith({
      where: { id: "chain-1", practice_id: PRACTICE_ID, status: "READY" },
      data: { status: "DEACTIVATED" },
    });
    expect(mockPracticeCaseChain.update).not.toHaveBeenCalled();
    expect(mockPracticeCaseChain.create).not.toHaveBeenCalled();
    expect(mockPracticeCatalogEntry.findMany).not.toHaveBeenCalled();
    expect(mockPracticeCheckpointDefinition.findMany).not.toHaveBeenCalled();
    expect(mockPracticeCheckpointDefinition.findUnique).not.toHaveBeenCalled();
    expect(mockPracticeCaseChainEntryApproval.updateMany).not.toHaveBeenCalled();
    expect(mockPracticeCaseChainConnectionApproval.updateMany).not.toHaveBeenCalled();
    expect(mockPracticeCaseChainApprovalEvent.create).not.toHaveBeenCalled();
  });

  it("behandelt wiederholtes Deaktivieren idempotent und lehnt andere Zustände ab", async () => {
    mockPracticeCaseChain.updateMany.mockResolvedValue({ count: 0 });
    mockPracticeCaseChain.findFirst
      .mockResolvedValueOnce(row({ status: "DEACTIVATED" }))
      .mockResolvedValueOnce(row({ status: "DRAFT" }))
      .mockResolvedValueOnce(null);

    await expect(deactivatePracticeChain("chain-1", PRACTICE_ID)).resolves.toMatchObject({ status: "DEACTIVATED" });
    await expect(deactivatePracticeChain("chain-1", PRACTICE_ID)).rejects.toMatchObject({ statusCode: 409 });
    await expect(deactivatePracticeChain("missing", PRACTICE_ID)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("erlaubt einen Einstieg ab Schritt 2 erst nach expliziter Freigabe", async () => {
    mockPracticeCaseChain.findFirst.mockResolvedValue(row({ status: "READY", definition: completeDefinition }));
    expect(await getReadyPracticeChainRunner("chain-1", PRACTICE_ID, "step-2")).toBeNull();

    await approvePracticeChainEntry({ practiceId: PRACTICE_ID, chainId: "chain-1", stepId: "step-2", actorAccountId: "account-1" });
    expect(mockPracticeCaseChainEntryApproval.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { practice_id_chain_id_step_id: { practice_id: PRACTICE_ID, chain_id: "chain-1", step_id: "step-2" } },
    }));

    mockPracticeCaseChainEntryApproval.findFirst.mockResolvedValue({ id: "entry-approval" });
    mockPracticeCatalogEntry.findMany.mockResolvedValue([{ id: ENTRY_V1, snapshot: publishedSnapshot }, { id: ENTRY_V2, snapshot: publishedSnapshot }]);
    await expect(getReadyPracticeChainRunner("chain-1", PRACTICE_ID, "step-2")).resolves.toMatchObject({ startStepId: "step-2" });
  });

  it("speichert Anschlüsse nur für ausdrückliche Enden und konkrete Kettenversionen", async () => {
    mockPracticeCaseChain.findFirst
      .mockResolvedValueOnce(row({ id: "source", status: "READY", definition: completeDefinition }))
      .mockResolvedValueOnce(row({ id: "target", status: "READY", definition: completeDefinition }));
    await expect(approvePracticeChainConnection({ practiceId: PRACTICE_ID, sourceChainId: "source", sourceStepId: "step-1", sourceExitId: "answer-3", targetChainId: "target", targetStepId: "step-2", actorAccountId: "account-1" })).rejects.toMatchObject({ statusCode: 400 });

    mockPracticeCaseChain.findFirst
      .mockResolvedValueOnce(row({ id: "source", status: "READY", definition: completeDefinition }))
      .mockResolvedValueOnce(row({ id: "target", status: "READY", definition: completeDefinition }));
    await approvePracticeChainConnection({ practiceId: PRACTICE_ID, sourceChainId: "source", sourceStepId: "step-2", sourceExitId: "answer-3", targetChainId: "target", targetStepId: "step-2", actorAccountId: "account-1" });
    expect(mockPracticeCaseChainConnectionApproval.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ source_chain_id: "source", source_step_id: "step-2", target_chain_id: "target", target_step_id: "step-2" }),
    }));
    expect(mockPracticeCaseChainApprovalEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ approval_kind: "CONNECTION", action: "SELECT", selection_version: 1 }),
    }));

    mockPracticeCaseChainConnectionApproval.findFirst.mockResolvedValue({ id: "connection-approval", selection_version: 1 });
    mockPracticeCaseChain.findFirst.mockResolvedValue(row({ status: "READY", definition: completeDefinition }));
    await approvePracticeChainConnection({ practiceId: PRACTICE_ID, sourceChainId: "source", sourceStepId: "step-2", sourceExitId: "answer-3", targetChainId: "target-2", targetStepId: "step-2", expectedSelectionVersion: 1, actorAccountId: "account-1" });
    expect(mockPracticeCaseChainConnectionApproval.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "connection-approval", selection_version: 1 }),
      data: expect.objectContaining({ target_chain_id: "target-2", target_step_id: "step-2", selection_version: { increment: 1 } }),
    }));

    await expect(revokePracticeChainConnection({ practiceId: PRACTICE_ID, sourceChainId: "source", sourceStepId: "step-2", sourceExitId: "answer-3", actorAccountId: "account-1" })).resolves.toBeDefined();
    expect(mockPracticeCaseChainConnectionApproval.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "connection-approval", revoked_at: null }),
    }));
    expect(mockPracticeCaseChainApprovalEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ approval_kind: "CONNECTION", action: "REVOKE" }),
    }));
  });

  it("verweigert einen Auswahlwechsel mit veralteter Auswahlversion", async () => {
    mockPracticeCaseChain.findFirst
      .mockResolvedValueOnce(row({ id: "source", status: "READY", definition: completeDefinition }))
      .mockResolvedValueOnce(row({ id: "target", status: "READY", definition: completeDefinition }));
    mockPracticeCaseChainConnectionApproval.findFirst.mockResolvedValue({ id: "current", selection_version: 2 });
    mockPracticeCaseChainConnectionApproval.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(approvePracticeChainConnection({
      practiceId: PRACTICE_ID, sourceChainId: "source", sourceStepId: "step-2", sourceExitId: "answer-3", targetChainId: "target", targetStepId: "step-2", expectedSelectionVersion: 2, actorAccountId: "account-1",
    })).rejects.toMatchObject({ statusCode: 409 });
    expect(mockPracticeCaseChainConnectionApproval.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ selection_version: 2 }),
    }));
  });

  it("führt Auswahl, Widerruf und Reaktivierung mit neuer Version und Ereignis aus", async () => {
    mockPracticeCaseChain.findFirst.mockResolvedValue(row({ id: "source", status: "READY", definition: completeDefinition }));
    mockPracticeCaseChainConnectionApproval.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "connection-approval", selection_version: 1, revoked_at: null })
      .mockResolvedValueOnce({ id: "connection-approval", selection_version: 2, revoked_at: new Date("2026-09-26") });

    await approvePracticeChainConnection({ practiceId: PRACTICE_ID, sourceChainId: "source", sourceStepId: "step-2", sourceExitId: "answer-3", targetChainId: "target-a", targetStepId: "step-2", actorAccountId: "account-1" });
    await revokePracticeChainConnection({ practiceId: PRACTICE_ID, sourceChainId: "source", sourceStepId: "step-2", sourceExitId: "answer-3", expectedSelectionVersion: 1, actorAccountId: "account-1" });
    await approvePracticeChainConnection({ practiceId: PRACTICE_ID, sourceChainId: "source", sourceStepId: "step-2", sourceExitId: "answer-3", targetChainId: "target-b", targetStepId: "step-2", actorAccountId: "account-1" });

    expect(mockPracticeCaseChainConnectionApproval.updateMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: { id: "connection-approval", revoked_at: null, selection_version: 1 },
      data: expect.objectContaining({ revoked_at: expect.any(Date), selection_version: { increment: 1 } }),
    }));
    expect(mockPracticeCaseChainConnectionApproval.updateMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: { id: "connection-approval", selection_version: 2, revoked_at: { not: null } },
      data: expect.objectContaining({ target_chain_id: "target-b", revoked_at: null, selection_version: { increment: 1 } }),
    }));
    expect(mockPracticeCaseChainApprovalEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "SELECT", selection_version: 3, target_chain_id: "target-b" }) }));
  });

  it("lässt bei zwei konkurrierenden Reaktivierungen nur eine gewinnen", async () => {
    mockPracticeCaseChain.findFirst.mockResolvedValue(row({ id: "source", status: "READY", definition: completeDefinition }));
    mockPracticeCaseChainConnectionApproval.findFirst.mockResolvedValue({ id: "connection-approval", selection_version: 4, revoked_at: new Date("2026-09-26") });
    mockPracticeCaseChainConnectionApproval.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const input = { practiceId: PRACTICE_ID, sourceChainId: "source", sourceStepId: "step-2", sourceExitId: "answer-3", targetChainId: "target", targetStepId: "step-2", actorAccountId: "account-1" };

    await expect(Promise.all([approvePracticeChainConnection(input), approvePracticeChainConnection(input)])).rejects.toMatchObject({ statusCode: 409 });
    expect(mockPracticeCaseChainConnectionApproval.updateMany).toHaveBeenCalledTimes(2);
    expect(mockPracticeCaseChainApprovalEvent.create).toHaveBeenCalledTimes(1);
  });

  it("verlangt bei einer bestehenden aktiven Auswahl die erwartete Version", async () => {
    mockPracticeCaseChain.findFirst.mockResolvedValue(row({ id: "source", status: "READY", definition: completeDefinition }));
    mockPracticeCaseChainConnectionApproval.findFirst.mockResolvedValue({ id: "connection-approval", selection_version: 2, revoked_at: null });

    await expect(approvePracticeChainConnection({
      practiceId: PRACTICE_ID, sourceChainId: "source", sourceStepId: "step-2", sourceExitId: "answer-3", targetChainId: "target", targetStepId: "step-2", actorAccountId: "account-1",
    })).rejects.toMatchObject({ statusCode: 409 });
    expect(mockPracticeCaseChainConnectionApproval.updateMany).not.toHaveBeenCalled();
  });

  it("gibt einen Widerrufskonflikt der DELETE-Route als sichtbaren HTTP-409-Fehler aus", async () => {
    mockPracticeCaseChainConnectionApproval.findFirst.mockResolvedValue({ id: "connection-approval", selection_version: 4, revoked_at: null });
    mockPracticeCaseChainConnectionApproval.updateMany.mockResolvedValue({ count: 0 });

    const response = await deleteApproval(request("/api/practice-chains/source/approvals", "DELETE", {
      kind: "CONNECTION", sourceStepId: "step-2", sourceExitId: "answer-3", expectedSelectionVersion: 3,
    }), { params: Promise.resolve({ id: "source" }) });
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({ ok: false, error: expect.stringContaining("geändert") }));
  });

  it("gibt auch einen ENTRY-Widerrufskonflikt als sichtbaren HTTP-409-Fehler aus", async () => {
    mockPracticeCaseChainEntryApproval.updateMany.mockResolvedValue({ count: 0 });

    const response = await deleteApproval(request("/api/practice-chains/source/approvals", "DELETE", {
      kind: "ENTRY", stepId: "step-2", expectedApprovalVersion: 3,
    }), { params: Promise.resolve({ id: "source" }) });
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({ ok: false, error: expect.stringContaining("geändert") }));
  });

  it("lässt bei zwei Wechseln derselben Ausgangsversion nur einen gewinnen", async () => {
    mockPracticeCaseChain.findFirst
      .mockResolvedValue(row({ id: "source", status: "READY", definition: completeDefinition }));
    mockPracticeCaseChain.findFirst
      .mockResolvedValueOnce(row({ id: "source", status: "READY", definition: completeDefinition }))
      .mockResolvedValueOnce(row({ id: "target", status: "READY", definition: completeDefinition }));
    const current = { id: "current", selection_version: 1 };
    mockPracticeCaseChainConnectionApproval.findFirst.mockReturnValue(Promise.resolve(current));
    mockPracticeCaseChainConnectionApproval.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const input = { practiceId: PRACTICE_ID, sourceChainId: "source", sourceStepId: "step-2", sourceExitId: "answer-3", targetChainId: "target", targetStepId: "step-2", expectedSelectionVersion: 1, actorAccountId: "account-1" };
    await expect(Promise.all([approvePracticeChainConnection(input), approvePracticeChainConnection(input)])).rejects.toMatchObject({ statusCode: 409 });
    expect(mockPracticeCaseChainConnectionApproval.updateMany).toHaveBeenCalledTimes(2);
    expect(mockPracticeCaseChainApprovalEvent.create).toHaveBeenCalledTimes(1);
  });

  it("meldet eine konkurrierende Erstanlage als verständlichen Konflikt", async () => {
    mockPracticeCaseChain.findFirst
      .mockResolvedValueOnce(row({ id: "source", status: "READY", definition: completeDefinition }))
      .mockResolvedValueOnce(row({ id: "target", status: "READY", definition: completeDefinition }));
    mockPracticeCaseChainConnectionApproval.create.mockRejectedValueOnce({ code: "P2002" });
    await expect(approvePracticeChainConnection({
      practiceId: PRACTICE_ID, sourceChainId: "source", sourceStepId: "step-2", sourceExitId: "answer-3", targetChainId: "target", targetStepId: "step-2", actorAccountId: "account-1",
    })).rejects.toMatchObject({ statusCode: 409 });
  });

  it("verweigert eine gleichzeitige Änderung oder einen Widerruf mit veralteter Version", async () => {
    mockPracticeCaseChain.findFirst
      .mockResolvedValueOnce(row({ id: "source", status: "READY", definition: completeDefinition }))
      .mockResolvedValueOnce(row({ id: "target", status: "READY", definition: completeDefinition }));
    mockPracticeCaseChainConnectionApproval.findFirst.mockResolvedValue({ id: "current", selection_version: 4 });
    mockPracticeCaseChainConnectionApproval.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(revokePracticeChainConnection({
      practiceId: PRACTICE_ID, sourceChainId: "source", sourceStepId: "step-2", sourceExitId: "answer-3", expectedSelectionVersion: 3, actorAccountId: "account-1",
    })).rejects.toMatchObject({ statusCode: 409 });
    expect(mockPracticeCaseChainConnectionApproval.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ selection_version: 3, revoked_at: null }),
    }));
  });

  it("verweigert unterschiedliche konkrete CatalogEntry-IDs trotz gleichem Titel", async () => {
    mockPracticeCaseChain.findFirst
      .mockResolvedValueOnce(row({ id: "source", status: "READY", definition: completeDefinition }))
      .mockResolvedValueOnce(row({ id: "target", status: "READY", definition: completeDefinition }));
    await expect(approvePracticeChainConnection({
      practiceId: PRACTICE_ID, sourceChainId: "source", sourceStepId: "step-2", sourceExitId: "answer-3", targetChainId: "target", targetStepId: "step-1", actorAccountId: "account-1",
    })).rejects.toMatchObject({ statusCode: 400 });
    expect(mockPracticeCaseChainConnectionApproval.create).not.toHaveBeenCalled();
  });

  it("liefert nach dem Ende von A genau den aktiv ausgewählten Anschluss für B", async () => {
    const chainA = row({ id: "chain-a", status: "READY", name: "Akutanfrage", version: 1, definition: completeDefinition });
    const chainB = row({ id: "chain-b", status: "READY", name: "Facharztbericht Rezeptanfrage", version: 2, definition: completeDefinition });
    mockPracticeCaseChain.findFirst.mockResolvedValue(chainA);
    mockPracticeCaseChainConnectionApproval.findMany.mockResolvedValue([{ source_step_id: "step-2", source_exit_id: "answer-3", target_chain_id: "chain-b", target_step_id: "step-2" }]);
    mockPracticeCaseChain.findMany.mockResolvedValue([chainB]);
    mockPracticeCatalogEntry.findMany.mockResolvedValue([{ id: ENTRY_V1, title: "Akutanfrage", snapshot: publishedSnapshot }, { id: ENTRY_V2, title: "Facharztbericht", snapshot: publishedSnapshot }]);
    const runner = await getReadyPracticeChainRunner("chain-a", PRACTICE_ID);
    expect(runner?.connections).toEqual([{ sourceStepId: "step-2", sourceExitId: "answer-3", targetChainId: "chain-b", targetStepId: "step-2", targetName: "Facharztbericht Rezeptanfrage", targetVersion: 2, targetTitle: "Facharztbericht" }]);
    expect(followRunnerTarget(createRunnerState("step-2"), null).finished).toBe(true);
  });

  it("setzt einen Anschluss im selben Lauf fort, dedupliziert den gemeinsamen Fall und erlaubt Zurück", () => {
    const target: RunnerChain = {
      id: "chain-b",
      name: "Facharztbericht Rezeptanfrage",
      version: 2,
      startStepId: "b-step-1",
      steps: [
        { id: "b-step-1", catalogEntryId: ENTRY_V2, title: "Facharztbericht", description: null, standards: [] },
        { id: "b-step-2", catalogEntryId: ENTRY_V1, title: "Rezeptanfrage", description: null, standards: [] },
      ],
      transitions: [{ id: "b-transition", fromStepId: "b-step-1", kind: "DIRECT", targetStepId: "b-step-2" }],
      connections: [],
    };
    const atEndOfA = followRunnerTarget(followRunnerTarget(createRunnerState("a-step-1"), "a-step-2"), null);
    const inB = continueRunner(atEndOfA, target, ENTRY_V2, ENTRY_V2);
    expect(inB).toMatchObject({ currentStepId: "b-step-1", finished: false, history: ["a-step-1"] });
    const atBNext = followRunnerTarget(inB, "b-step-2");
    expect(atBNext.history).toEqual(["a-step-1", "b-step-1"]);
    expect(goBackRunner(atBNext)).toMatchObject({ currentStepId: "b-step-1", history: ["a-step-1"] });
    expect(goBackRunner(inB)).toMatchObject({ currentStepId: "a-step-1", history: [] });
    const sameTitleDifferentVersion: RunnerChain = { ...target, steps: [{ ...target.steps[0], catalogEntryId: ENTRY_V1, title: "Facharztbericht" }, ...target.steps.slice(1)] };
    expect(continueRunner(atEndOfA, sameTitleDifferentVersion, ENTRY_V1, ENTRY_V2).history).toEqual(["a-step-1", "a-step-2"]);
  });

  it("behält den begonnenen B-Kontext nach Widerruf oder Auswahlwechsel eingefroren bei", async () => {
    const chainB = row({ id: "chain-b", status: "READY", definition: completeDefinition });
    mockPracticeCaseChainConnectionApproval.findFirst.mockResolvedValueOnce({
      id: "old-selection", source_chain_id: "chain-a", source_step_id: "step-2", target_chain_id: "chain-b", target_step_id: "step-2", selection_version: 1, revoked_at: null,
    });
    mockPracticeCaseChain.findFirst.mockResolvedValue(chainB);
    mockPracticeCatalogEntry.findMany.mockResolvedValue([{ id: ENTRY_V1, snapshot: publishedSnapshot }, { id: ENTRY_V2, snapshot: publishedSnapshot }]);
    const startedB = await getApprovedPracticeChainContinuation({
      practiceId: PRACTICE_ID, sourceChainId: "chain-a", sourceStepId: "step-2", sourceExitId: "answer-3", targetChainId: "chain-b", targetStepId: "step-2",
    });
    expect(startedB?.startStepId).toBe("step-2");

    mockPracticeCaseChainConnectionApproval.findFirst.mockResolvedValue(null);
    await expect(getApprovedPracticeChainContinuation({
      practiceId: PRACTICE_ID, sourceChainId: "chain-a", sourceStepId: "step-2", sourceExitId: "answer-3", targetChainId: "chain-b", targetStepId: "step-2",
    })).resolves.toBeNull();
    expect(startedB?.startStepId).toBe("step-2");
  });

  it("lädt bei zwei Endantworten keinen Anschluss mit leerer oder falscher Exit-ID", async () => {
    const approval = { id: "approval", source_chain_id: "chain-a", source_step_id: "step-2", source_exit_id: "end-a", target_chain_id: "chain-b", target_step_id: "step-2", selection_version: 1, revoked_at: null };
    mockPracticeCaseChainConnectionApproval.findFirst.mockResolvedValue(approval);
    await expect(getApprovedPracticeChainContinuation({
      practiceId: PRACTICE_ID, sourceChainId: "chain-a", sourceStepId: "step-2", sourceExitId: "", targetChainId: "chain-b", targetStepId: "step-2",
    })).resolves.toBeNull();
    mockPracticeCaseChainConnectionApproval.findFirst.mockResolvedValue(null);
    await expect(getApprovedPracticeChainContinuation({
      practiceId: PRACTICE_ID, sourceChainId: "chain-a", sourceStepId: "step-2", sourceExitId: "end-b", targetChainId: "chain-b", targetStepId: "step-2",
    })).resolves.toBeNull();
  });

  it("verweigert die Fortsetzung nach Widerruf oder bei einer anderen konkreten Zielversion", async () => {
    mockPracticeCaseChainConnectionApproval.findFirst.mockResolvedValue(null);
    await expect(getApprovedPracticeChainContinuation({
      practiceId: PRACTICE_ID, sourceChainId: "source", sourceStepId: "step-2", sourceExitId: "answer-3", targetChainId: "target-v2", targetStepId: "step-2",
    })).resolves.toBeNull();
    expect(mockPracticeCaseChain.findFirst).not.toHaveBeenCalled();
  });
});

describe("PracticeCaseChain authorization", () => {
  it("liest nur die aktuelle Praxis", async () => {
    mockPracticeCaseChain.findMany.mockResolvedValue([]);
    const { status } = await getChains(request("/api/practice-chains"));
    expect(status).toBe(200);
    expect(mockPracticeCaseChain.findMany.mock.calls[0][0].where).toEqual({ practice_id: PRACTICE_ID });
  });

  it("verweigert USER den direkten Zugriff", async () => {
    (getSessionAccount as jest.Mock).mockResolvedValue({ ...account, memberships: [{ practice_id: PRACTICE_ID, role: "USER" }] });
    mockRequirePracticeCatalogAccess.mockResolvedValueOnce({ account: null, error: new Response(null, { status: 403 }) });
    const response = await getChains(request("/api/practice-chains"));
    expect(response.status).toBe(403);
  });

  it("verweigert das Schreiben einer fremden Kette", async () => {
    mockPracticeCaseChain.findFirst.mockResolvedValue(null);
    const response = await patchChain(request("/api/practice-chains/foreign", "PATCH", { name: "X", status: "DRAFT", definition: emptyDefinition }), { params: Promise.resolve({ id: "foreign" }) });
    expect(response.status).toBe(404);
  });

  it("schützt auch den Revisionspfad per Praxis-Scope", async () => {
    mockPracticeCaseChain.findFirst.mockResolvedValue(null);
    const response = await reviseChain(request("/api/practice-chains/foreign/revision", "POST"), { params: Promise.resolve({ id: "foreign" }) });
    expect(response.status).toBe(404);
  });

  it.each(["OWNER", "ADMIN"] as const)("erlaubt %s die Deaktivierung einer READY-Kette", async (role) => {
    const manager = { ...account, memberships: [{ practice_id: PRACTICE_ID, role }] };
    mockRequirePracticeCatalogAccess.mockResolvedValueOnce({ account: manager, error: null });
    mockPracticeCaseChain.findFirst.mockResolvedValue(row({ status: "DEACTIVATED", version: 4, definition: completeDefinition }));

    const response = await deactivateChain(
      request("/api/practice-chains/chain-1/deactivate", "PATCH"),
      { params: Promise.resolve({ id: "chain-1" }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, chain: { status: "DEACTIVATED", version: 4, definition: completeDefinition } });
    expect(mockPracticeCaseChain.updateMany).toHaveBeenCalledWith({
      where: { id: "chain-1", practice_id: PRACTICE_ID, status: "READY" },
      data: { status: "DEACTIVATED" },
    });
  });

  it("verweigert USERn die Deaktivierungsaktion", async () => {
    mockRequirePracticeCatalogAccess.mockResolvedValueOnce({ account: null, error: new Response(null, { status: 403 }) });

    const response = await deactivateChain(
      request("/api/practice-chains/chain-1/deactivate", "PATCH"),
      { params: Promise.resolve({ id: "chain-1" }) },
    );

    expect(response.status).toBe(403);
    expect(mockPracticeCaseChain.updateMany).not.toHaveBeenCalled();
  });

  it("erlaubt USER den READY-Runner, aber keine Entwürfe oder fremde Ketten", async () => {
    (getSessionAccount as jest.Mock).mockResolvedValue({ ...account, memberships: [{ practice_id: PRACTICE_ID, role: "USER" }] });
    mockPracticeCaseChain.findFirst.mockResolvedValue(row({ status: "READY", definition: completeDefinition }));
    const readyResponse = await getRunner(request("/api/practice-chains/chain-1/runner"), { params: Promise.resolve({ id: "chain-1" }) });
    expect(readyResponse.status).toBe(200);

    mockPracticeCaseChain.findFirst.mockResolvedValue(row({ status: "DRAFT" }));
    const draftResponse = await getRunner(request("/api/practice-chains/chain-1/runner"), { params: Promise.resolve({ id: "chain-1" }) });
    expect(draftResponse.status).toBe(404);

    mockPracticeCaseChain.findFirst.mockResolvedValue(row({ status: "DEACTIVATED" }));
    const deactivatedResponse = await getRunner(request("/api/practice-chains/chain-1/runner"), { params: Promise.resolve({ id: "chain-1" }) });
    expect(deactivatedResponse.status).toBe(404);

    mockPracticeCaseChain.findFirst.mockResolvedValue(null);
    const foreignResponse = await getRunner(request("/api/practice-chains/foreign/runner"), { params: Promise.resolve({ id: "foreign" }) });
    expect(foreignResponse.status).toBe(404);
  });
});

describe("PracticeCaseChain validation", () => {
  it("fordert keine Standardantworten an, aber prüft READY-Ziele", () => {
    const issues = validateChainDefinition(completeDefinition, new Set([ENTRY_V1, ENTRY_V2]));
    expect(issues).toEqual([]);
    const invalid = validateChainDefinition({ ...completeDefinition, startStepId: "missing" }, new Set([ENTRY_V1, ENTRY_V2]));
    expect(invalid.some((issue) => issue.path === "startStepId")).toBe(true);
  });

  it("verhindert mehrere oder gemischte Übergänge pro Ausgangsschritt", () => {
    const definition = { ...completeDefinition, transitions: [
      ...completeDefinition.transitions,
      { id: "transition-duplicate", fromStepId: "step-1", kind: "DIRECT" as const, targetStepId: "step-2" },
    ] };
    expect(validateChainDefinition(definition, new Set([ENTRY_V1, ENTRY_V2])).some((issue) => issue.path === "transitions.2.fromStepId" && issue.message.includes("nur ein Übergang"))).toBe(true);
  });

  it("verlangt eindeutige Antwortbezeichnungen und zeigt offene Antworten als Fehler", () => {
    const definition = { ...completeDefinition, transitions: [{
      id: "transition-1", fromStepId: "step-1", kind: "QUESTION" as const, question: {
        prompt: "Praxisfrage", answers: [
          { id: "answer-1", label: "Gleich", targetStepId: "step-2" },
          { id: "answer-2", label: " gleich ", targetStepId: null },
        ],
      },
    }, completeDefinition.transitions[1]] };
    const issues = validateChainDefinition(definition, new Set([ENTRY_V1, ENTRY_V2]));
    expect(issues.some((issue) => issue.message.includes("eindeutig"))).toBe(true);
  });

  it("meldet offene Antwortziele gezielt und erlaubt Fall oder bewusstes Ende", () => {
    const openAnswer = {
      ...completeDefinition,
      transitions: [{
        id: "transition-1", fromStepId: "step-1", kind: "QUESTION" as const, question: {
          prompt: "Praxisfrage", answers: [{ id: "answer-1", label: "Weiter" }],
        },
      }],
    };
    const openIssues = validateChainDefinition(openAnswer, new Set([ENTRY_V1, ENTRY_V2]));
    expect(openIssues).toContainEqual({
      path: "transitions.0.question.answers.0.targetStepId",
      message: "Wählen Sie für diese Antwort einen Zielfall oder das Ende der Kette",
    });

    const caseTarget = { ...openAnswer, transitions: [{ ...openAnswer.transitions[0], question: { prompt: "Praxisfrage", answers: [{ id: "answer-1", label: "Weiter", targetStepId: "step-2" }] } }] };
    const chainEnd = { ...openAnswer, transitions: [{ ...openAnswer.transitions[0], question: { prompt: "Praxisfrage", answers: [{ id: "answer-1", label: "Ende", targetStepId: null }] } }] };
    expect(validateChainDefinition(caseTarget, new Set([ENTRY_V1, ENTRY_V2])).some((issue) => issue.path.endsWith("targetStepId"))).toBe(false);
    expect(validateChainDefinition(chainEnd, new Set([ENTRY_V1, ENTRY_V2])).some((issue) => issue.path.endsWith("targetStepId"))).toBe(false);
  });

  it("weist unerreichbare Schritte und Zyklen ohne Abschluss zurück, erlaubt aber einen explizit endenden Rücksprung", () => {
    const unreachable = validateChainDefinition({ ...completeDefinition, steps: [...completeDefinition.steps, { id: "step-3", catalogEntryId: ENTRY_V1 }] }, new Set([ENTRY_V1, ENTRY_V2]));
    expect(unreachable.some((issue) => issue.message.includes("nicht erreichbar"))).toBe(true);

    const endlessCycle = validateChainDefinition({
      ...completeDefinition,
      transitions: [
        { id: "a", fromStepId: "step-1", kind: "DIRECT", targetStepId: "step-2" },
        { id: "b", fromStepId: "step-2", kind: "DIRECT", targetStepId: "step-1" },
      ],
    }, new Set([ENTRY_V1, ENTRY_V2]));
    expect(endlessCycle.some((issue) => issue.message.includes("kein vollständig definierter Weg"))).toBe(true);

    const explicitReturn = validateChainDefinition({
      ...completeDefinition,
      transitions: [
        { id: "a", fromStepId: "step-1", kind: "DIRECT", targetStepId: "step-2" },
        { id: "b", fromStepId: "step-2", kind: "QUESTION", question: { prompt: "Praxisfrage", answers: [
          { id: "back", label: "Zurück", targetStepId: "step-1" },
          { id: "end", label: "Kette endet", targetStepId: null },
        ] } },
      ],
    }, new Set([ENTRY_V1, ENTRY_V2]));
    expect(explicitReturn.filter((issue) => issue.message.includes("kein vollständig definierter Weg"))).toHaveLength(0);
  });

  it("erlaubt ein direktes Ende ohne künstliche Praxisfrage", () => {
    const directEnd = {
      ...completeDefinition,
      transitions: [
        { id: "a", fromStepId: "step-1", kind: "DIRECT" as const, targetStepId: "step-2" },
        { id: "b", fromStepId: "step-2", kind: "DIRECT" as const, targetStepId: null },
      ],
    };
    expect(validateChainDefinition(directEnd, new Set([ENTRY_V1, ENTRY_V2]))).toEqual([]);
  });

  it("verlangt Ausgang und Ziel bei einem neuen direkten Übergang", () => {
    const incompleteTransition = {
      ...completeDefinition,
      transitions: [{ id: "new", fromStepId: "", kind: "DIRECT" as const }],
    };
    const issues = validateChainDefinition(incompleteTransition, new Set([ENTRY_V1, ENTRY_V2]));
    expect(issues.some((issue) => issue.path === "transitions.0.fromStepId")).toBe(true);
    expect(issues.some((issue) => issue.path === "transitions.0.targetStepId")).toBe(true);
  });

  it("unterscheidet bewusstes Fallziel und bewusstes Kettenende", () => {
    const caseTarget = {
      ...completeDefinition,
      transitions: [{ id: "new", fromStepId: "step-1", kind: "DIRECT" as const, targetStepId: "step-2" }],
    };
    const chainEnd = {
      ...completeDefinition,
      transitions: [{ id: "new", fromStepId: "step-1", kind: "DIRECT" as const, targetStepId: null }],
    };
    expect(validateChainDefinition(caseTarget, new Set([ENTRY_V1, ENTRY_V2])).some((issue) => issue.path === "transitions.0.targetStepId")).toBe(false);
    expect(validateChainDefinition(chainEnd, new Set([ENTRY_V1, ENTRY_V2])).some((issue) => issue.path === "transitions.0.targetStepId")).toBe(false);
  });

  it("führt zwei konkrete Katalogversionen über direkten Abschluss und Praxisantwort in den Runner", async () => {
    const directThenQuestion = {
      ...completeDefinition,
      steps: [
        { id: "step-1", catalogEntryId: ENTRY_V1 },
        { id: "step-2", catalogEntryId: ENTRY_V2 },
      ],
      transitions: [
        { id: "direct", fromStepId: "step-1", kind: "DIRECT" as const, targetStepId: "step-2" },
        { id: "question", fromStepId: "step-2", kind: "QUESTION" as const, question: {
          prompt: "Wie entscheidet diese Praxis?",
          answers: [{ id: "end", label: "Praxis beendet den Lauf", targetStepId: null }],
        } },
      ],
    };
    mockPracticeCaseChain.update.mockResolvedValue(row({ status: "READY", definition: directThenQuestion }));
    await expect(updatePracticeChain({ id: "chain-1", practiceId: PRACTICE_ID, name: "Pilotkette", status: "READY", definition: directThenQuestion })).resolves.toMatchObject({ status: "READY" });
    mockPracticeCaseChain.findFirst.mockResolvedValue(row({ status: "READY", definition: directThenQuestion }));
    mockPracticeCatalogEntry.findMany.mockResolvedValue([
      { id: ENTRY_V1, title: "Praxisfall Version 1", description: null, snapshot: publishedSnapshot },
      { id: ENTRY_V2, title: "Praxisfall Version 2", description: null, snapshot: publishedSnapshot },
    ]);
    const runner = await getReadyPracticeChainRunner("chain-1", PRACTICE_ID);
    expect(runner?.steps.map((step) => step.title)).toEqual(["Praxisfall Version 1", "Praxisfall Version 2"]);
    expect(runner?.transitions).toEqual(directThenQuestion.transitions);
    expect(runner?.transitions[1].question?.answers[0].targetStepId).toBeNull();
  });
});

describe("PracticeCaseChain runner", () => {
  it("liefert eingefrorene Anchor-Texte und Umsetzungen aus den gepinnten Snapshot-Versionen", async () => {
    const snapshot = (anchorText: string, implementation: string) => ({
      ...publishedSnapshot,
      checkpoints: [
        {
          checkpointId: "patient-bekannt",
          checkpointTitle: "Patient bekannt",
          decision: "PFLICHT",
          definition: {
            checkpointId: "patient-bekannt",
            checkpointTitle: "Patient bekannt",
            checkpointAnchors: [
              { id: "anchor-a", text: anchorText },
              { id: "patient-bekannt-a2", text: "Eingefrorener Text für a2" },
              { id: "anchor-unused", text: "Nicht ausgewählt" },
            ],
            selectedAnchorIds: ["anchor-a", "patient-bekannt-a2"],
            implementation,
          },
        },
        {
          checkpointId: "rueckruf",
          checkpointTitle: "Rückruf",
          decision: "OPTIONAL",
          definition: {
            checkpointId: "rueckruf",
            checkpointTitle: "Rückruf",
            checkpointAnchors: [{ id: "anchor-c", text: "Rückrufnummer prüfen" }],
            selectedAnchorIds: ["anchor-c"],
            implementation: "Zusätzliche Umsetzung separat",
          },
        },
      ],
    });
    const chainDefinition = (entryId: string, stepId: string) => ({
      startStepId: stepId,
      steps: [{ id: stepId, catalogEntryId: entryId }],
      transitions: [],
    });
    const entries = new Map([
      [ENTRY_V1, { id: ENTRY_V1, title: "Fall v1", description: null, snapshot: snapshot("Name ist erfasst", "") }],
      [ENTRY_V2, { id: ENTRY_V2, title: "Fall v2", description: null, snapshot: snapshot("Name wurde aktualisiert", "Zusätzlich Rückrufnummer abgleichen") }],
    ]);
    mockPracticeCaseChain.findFirst.mockImplementation(async ({ where }: { where: { id: string } }) =>
      row({ id: where.id, status: "READY", definition: chainDefinition(where.id === "chain-v1" ? ENTRY_V1 : ENTRY_V2, where.id === "chain-v1" ? "step-v1" : "step-v2") }),
    );
    mockPracticeCatalogEntry.findMany.mockImplementation(async ({ where }: { where: { id: { in: string[] } } }) =>
      where.id.in.flatMap((id) => entries.has(id) ? [entries.get(id)] : []),
    );
    mockGetCheckpointFromLib.mockClear();
    mockGetCheckpointFromLib.mockResolvedValue({
      id: "patient-bekannt",
      orientationAnchors: [{ id: "patient-bekannt-a1", text: "Live-Anker nach Entfernung" }],
    });

    const versionOne = await getReadyPracticeChainRunner("chain-v1", PRACTICE_ID);
    const versionTwo = await getReadyPracticeChainRunner("chain-v2", PRACTICE_ID);

    expect(versionOne?.steps[0].standards).toEqual([
      {
        title: "Patient bekannt",
        selectedAnchors: ["Name ist erfasst", "Eingefrorener Text für a2"],
        implementation: null,
        missingAnchorCount: 0,
      },
      {
        title: "Rückruf",
        selectedAnchors: ["Rückrufnummer prüfen"],
        implementation: "Zusätzliche Umsetzung separat",
        missingAnchorCount: 0,
      },
    ]);
    expect(versionTwo?.steps[0].standards[0].selectedAnchors).toEqual([
      "Name wurde aktualisiert",
      "Eingefrorener Text für a2",
    ]);
    expect(versionTwo?.steps[0].standards[0].implementation).toBe("Zusätzlich Rückrufnummer abgleichen");
    expect(versionOne?.steps[0].standards[0].selectedAnchors).toContain("Name ist erfasst");
    expect(versionOne?.steps[0].standards[0].selectedAnchors).not.toContain("Name wurde aktualisiert");
    expect(mockPracticeCheckpointDefinition.findMany).not.toHaveBeenCalled();
    expect(mockPracticeCheckpointDefinition.findUnique).not.toHaveBeenCalled();
    expect(mockGetCheckpointFromLib).not.toHaveBeenCalled();
    expect(mockPracticeCatalogEntry.findMany.mock.calls.every(([args]) => args.select?.snapshot === true)).toBe(true);
  });

  it("navigiert direkte Übergänge, zwei Antwortzweige, Ende und erlaubten Rücksprung ohne Vorauswahl", () => {
    const artificialChain = {
      direct: { fromStepId: "step-1", targetStepId: "step-2" },
      answers: [
        { label: "Weiter", targetStepId: "step-3" },
        { label: "Ende", targetStepId: null },
      ],
      returnTarget: "step-1",
    };
    const state = createRunnerState("step-1");
    expect(artificialChain.answers).toHaveLength(2);
    const afterDirect = followRunnerTarget(state, artificialChain.direct.targetStepId);
    expect(afterDirect.currentStepId).toBe("step-2");
    expect(afterDirect.history).toEqual(["step-1"]);
    const afterBack = goBackRunner(afterDirect);
    expect(afterBack.currentStepId).toBe("step-1");
    expect(afterBack.history).toEqual([]);
    expect(followRunnerTarget(afterBack, artificialChain.answers[1].targetStepId).finished).toBe(true);
    expect(followRunnerTarget(afterBack, artificialChain.returnTarget).currentStepId).toBe("step-1");
  });

  it("stoppt verständlich bei einem fehlenden Ziel statt den Lauf zu beenden", () => {
    const state = createRunnerState("step-1");
    const blocked = followRunnerTarget(state, undefined);
    expect(blocked).toEqual({
      currentStepId: "step-1",
      history: [],
      finished: false,
      error: "Dieser Übergang ist unvollständig und kann im Lauf nicht fortgesetzt werden.",
    });
    expect(followRunnerTarget(blocked, null)).toEqual(blocked);
  });

  it("setzt beim Start keine Antwort und speichert keinen Lauf", () => {
    const state = createRunnerState("step-1");
    expect(state).toEqual({ currentStepId: "step-1", history: [], finished: false, error: null });
  });

  it("markiert A nach A → B → A als besucht, verbietet den Rücksprung aber nicht pauschal", () => {
    expect(getRunnerContinuationStatus(["chain-a", "chain-b"], "chain-a", 2)).toEqual({ alreadyVisited: true, limited: false });
    expect(getRunnerContinuationStatus(["chain-a"], "chain-b", 32).limited).toBe(true);
    const afterA = followRunnerTarget(createRunnerState("a-end"), null);
    const targetB: RunnerChain = { id: "chain-b", name: "B", version: 1, startStepId: "b-start", steps: [{ id: "b-start", catalogEntryId: "entry-b", title: "B", description: null, standards: [] }], transitions: [], connections: [] };
    const targetA: RunnerChain = { id: "chain-a", name: "A", version: 1, startStepId: "a-start", steps: [{ id: "a-start", catalogEntryId: "entry-a", title: "A", description: null, standards: [] }], transitions: [], connections: [] };
    const afterB = continueRunner(afterA, targetB);
    const afterBEnd = followRunnerTarget(afterB, null);
    expect(continueRunner(afterBEnd, targetA).currentStepId).toBe("a-start");
    expect(goBackRunner(afterBEnd).currentStepId).toBe("b-start");
  });
});

describe("PracticeCaseChain discovery", () => {
  it("behält einen gemischten End-/Weiter-Zweig als getrennte konkrete Pfade", () => {
    const chain = {
      id: "mixed", name: "Gemischt", version: 1,
      definition: {
        startStepId: "step-1",
        steps: [{ id: "step-1", catalogEntryId: "entry-1" }, { id: "step-2", catalogEntryId: "entry-2" }],
        transitions: [
          { id: "t1", fromStepId: "step-1", kind: "QUESTION" as const, question: { prompt: "Route", answers: [
            { id: "end", label: "Ende", targetStepId: null },
            { id: "continue", label: "Weiter", targetStepId: "step-2" },
          ] } },
          { id: "t2", fromStepId: "step-2", kind: "DIRECT" as const, targetStepId: null },
        ],
      },
      entryTitles: new Map([["entry-1", "Fall 1"], ["entry-2", "Fall 2"]]),
    };
    const segment = discoverPracticeChainSegments(chain).find((candidate) => candidate.startStepId === "step-1")!;
    expect(segment.paths.map((path) => path.map((step) => step.stepId))).toEqual([["step-1"], ["step-1", "step-2"]]);
    expect(segment.pathExitIds).toEqual(["end", "t2"]);
  });

  it("unterscheidet zwei verschiedene End-Antworten am selben Fall", () => {
    const chain = {
      id: "two-ends", name: "Zwei Enden", version: 1,
      definition: { startStepId: "step-1", steps: [{ id: "step-1", catalogEntryId: "entry-1" }], transitions: [
        { id: "question", fromStepId: "step-1", kind: "QUESTION" as const, question: { prompt: "Ende", answers: [
          { id: "end-a", label: "Ende A", targetStepId: null },
          { id: "end-b", label: "Ende B", targetStepId: null },
        ] } },
      ] },
      entryTitles: new Map([["entry-1", "Fall 1"]]),
    };
    const segment = discoverPracticeChainSegments(chain)[0];
    expect(segment.paths).toHaveLength(2);
    expect(segment.pathExitIds).toEqual(["end-a", "end-b"]);
  });

  it("setzt A über B bis C fort und behält den aktuellen Kettenkontext", () => {
    const chain = (id: string, stepId: string): RunnerChain => ({
      id, name: id, version: 1, startStepId: stepId,
      steps: [{ id: stepId, catalogEntryId: `entry-${id}`, title: id, description: null, standards: [] }],
      transitions: [], connections: [],
    });
    const afterA = followRunnerTarget(createRunnerState("a"), null);
    const afterB = continueRunner(afterA, chain("B", "b"));
    const afterBEnd = followRunnerTarget(afterB, null);
    const inC = continueRunner(afterBEnd, chain("C", "c"));
    expect(inC).toMatchObject({ currentStepId: "c", finished: false, history: ["a", "b"] });
  });

  it("findet suffixartige Teilstrecken über konkrete Versionen und bleibt bei Verzweigungen eindeutig", () => {
    const chain = {
      id: "chain-1", name: "Neutral", version: 1,
      definition: {
        startStepId: "step-1",
        steps: [
          { id: "step-1", catalogEntryId: "entry-1" },
          { id: "step-2", catalogEntryId: "entry-2" },
          { id: "step-3", catalogEntryId: "entry-3" },
          { id: "step-4", catalogEntryId: "entry-4" },
        ],
        transitions: [
          { id: "t1", fromStepId: "step-1", kind: "DIRECT" as const, targetStepId: "step-2" },
          { id: "t2", fromStepId: "step-2", kind: "QUESTION" as const, question: { prompt: "Welche Route?", answers: [
            { id: "a1", label: "Drei", targetStepId: "step-3" },
            { id: "a2", label: "Vier", targetStepId: "step-4" },
          ] } },
          { id: "t3", fromStepId: "step-3", kind: "DIRECT" as const, targetStepId: null },
          { id: "t4", fromStepId: "step-4", kind: "DIRECT" as const, targetStepId: null },
        ],
      },
      entryTitles: new Map([["entry-1", "Fall 1"], ["entry-2", "Fall 2"], ["entry-3", "Fall 3"], ["entry-4", "Fall 4"]]),
    };
    const segments = discoverPracticeChainSegments(chain);
    const fromTwo = segments.find((segment) => segment.start.catalogEntryId === "entry-2");
    expect(fromTwo?.paths.map((path) => path.map((step) => step.catalogEntryId))).toEqual([["entry-2", "entry-3"], ["entry-2", "entry-4"]]);
    expect(getSegmentTerminalCatalogEntryIds([fromTwo!])).toEqual(new Set(["entry-3", "entry-4"]));
    expect(findAttachmentCandidates(segments, new Set(["entry-3"]), "other-chain")).toEqual([segments.find((segment) => segment.start.catalogEntryId === "entry-3")]);
    expect(findAttachmentCandidates(segments, new Set(["entry-2"]), "other-chain")).toEqual([fromTwo]);
    expect(findAttachmentCandidates(segments, new Set(["entry-2"]), "chain-1")).toEqual([]);
  });

  it("unterscheidet gleiche Titel über Katalogversions-IDs", () => {
    const chain = {
      id: "chain-2", name: "Neutral", version: 2,
      definition: { startStepId: "step-1", steps: [{ id: "step-1", catalogEntryId: "entry-v2" }], transitions: [] },
      entryTitles: new Map([["entry-v2", "Gleicher Titel"]]),
    };
    const segment = discoverPracticeChainSegments(chain)[0];
    expect(segment.start.catalogEntryId).toBe("entry-v2");
    expect(findAttachmentCandidates([segment], new Set(["entry-v1"]))).toEqual([]);
  });
});