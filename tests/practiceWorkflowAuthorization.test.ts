import { NextRequest, NextResponse } from "next/server";

const redirectMock = jest.fn((url: string) => {
  throw new Error(`__REDIRECT__:${url}`);
});
const currentRole = { value: "USER" as "OWNER" | "ADMIN" | "USER" };
const getSessionAccountMock = jest.fn();
const getSessionAccountFromCookiesMock = jest.fn();
const requirePracticeCatalogAccessMock = jest.fn();
const requirePracticeCatalogAccessFromCookiesMock = jest.fn();
const ensurePracticeWorkingSessionMock = jest.fn();
const listCaseProfilesMock = jest.fn();
const getCaseProfileMock = jest.fn();
const getCheckpointMock = jest.fn();
const getWorkflowOwnershipFilterMock = jest.fn(() => ({ owner_practice_id: "practice-1" }));
const requirePracticeIdMock = jest.fn(() => "practice-1");
const publishToCatalogMock = jest.fn();
const startRevisionMock = jest.fn();
const getPracticeCheckpointDefinitionMock = jest.fn();
const upsertPracticeCheckpointDefinitionMock = jest.fn();

jest.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: (...args: unknown[]) => getSessionAccountMock(...args),
  getSessionAccountFromCookies: (...args: unknown[]) => getSessionAccountFromCookiesMock(...args),
}));

jest.mock("@/lib/authz", () => ({
  canAccessWorkflowCases: jest.fn(() => true),
  requirePracticeCatalogAccess: requirePracticeCatalogAccessMock,
  requirePracticeCatalogAccessFromCookies: requirePracticeCatalogAccessFromCookiesMock,
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    workflowSession: {
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock("@/lib/workflow/scope", () => ({
  getWorkflowOwnershipFilter: getWorkflowOwnershipFilterMock,
}));

jest.mock("@/lib/practiceCatalog/scope", () => ({
  requirePracticeId: requirePracticeIdMock,
  getCatalogOwnershipFilter: jest.fn(() => ({ practice_id: "practice-1" })),
}));

jest.mock("@/lib/practiceCatalog/publish", () => ({
  publishToCatalog: publishToCatalogMock,
}));

jest.mock("@/lib/practiceCatalog/startRevision", () => ({
  startRevision: startRevisionMock,
}));

jest.mock("@/lib/practiceProcesses", () => ({
  ...jest.requireActual("@/lib/practiceProcesses"),
  getPracticeCheckpointDefinition: getPracticeCheckpointDefinitionMock,
  upsertPracticeCheckpointDefinition: upsertPracticeCheckpointDefinitionMock,
}));

jest.mock("@/lib/practiceCatalog/workingState", () => ({
  ensurePracticeWorkingSession: (...args: unknown[]) => ensurePracticeWorkingSessionMock(...args),
}));

jest.mock("@/lib/practiceProcesses/caseProfileLibrary", () => ({
  listCaseProfilesFromLib: (...args: unknown[]) => listCaseProfilesMock(...args),
  getCaseProfileFromLib: (...args: unknown[]) => getCaseProfileMock(...args),
}));

jest.mock("@/lib/practiceProcesses/checkpointLibrary", () => ({
  getCheckpointFromLib: (...args: unknown[]) => getCheckpointMock(...args),
}));

jest.mock("@/lib/practiceProcesses/workflowSnapshot", () => {
  const actual = jest.requireActual("@/lib/practiceProcesses/workflowSnapshot") as typeof import("@/lib/practiceProcesses/workflowSnapshot");
  return {
    ...actual,
    buildInitialPracticeWorkflowSnapshot: jest.fn(() => practiceDraft),
  };
});

jest.mock("@/app/workflow-cases/internal-protocol/new/InternalProtocolNewClient", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/app/workflow-cases/internal-protocol/draft/m2/DraftM2Client", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/app/workflow-cases/internal-protocol/draft/m3/DraftM3Client", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/app/workflow-cases/internal-protocol/draft/m4/PracticeWorkflowM4Client", () => ({
  __esModule: true,
  default: () => null,
}));

import { prisma } from "@/lib/prisma";
import PracticeWorkflowNewPage from "@/app/workflow-cases/internal-protocol/new/page";
import DraftM2Page from "@/app/workflow-cases/internal-protocol/draft/m2/page";
import DraftM3Page from "@/app/workflow-cases/internal-protocol/draft/m3/page";
import DraftM4Page from "@/app/workflow-cases/internal-protocol/draft/m4/page";
import { POST as startPracticeWorkflow } from "@/app/api/workflow-cases/internal-protocol/start/route";
import { POST as createPracticeWorkflow } from "@/app/api/workflow-cases/internal-protocol/create/route";
import { GET as saveGet, PATCH as savePatch } from "@/app/api/workflow-cases/[id]/protocol/save/route";
import { DELETE as deleteWorkflowSession } from "@/app/api/workflow-cases/[id]/route";
import { POST as publishPracticeWorkflow } from "@/app/api/practice-catalog/publish/route";
import { POST as startPracticeRevision } from "@/app/api/practice-catalog/[id]/start-revision/route";
import { PUT as updateCheckpointDefinition } from "@/app/api/practice-checkpoint-definitions/[checkpointId]/route";

const pm = prisma as unknown as {
  workflowSession: {
    findFirst: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
};

const practiceDraft = {
  processKind: "practice-workflow" as const,
  snapshotVersion: 2 as const,
  caseProfileId: "case-a",
  caseProfileTitle: "Fall A",
  checkpoints: [{ checkpointId: "cp-a", checkpointTitle: "Checkpoint A" }],
};

const internalProtocolSnapshot = {
  processKind: "internal-protocol" as const,
  topicId: "patienten-ohne-termin" as const,
  checkpoints: [{ id: "cp-1", title: "Abschnitt", status: "OPEN" as const, answers: {} }],
};

function account() {
  return {
    id: "account-1",
    is_approved: true,
    is_admin: false,
    arbeitsprozesse_enabled: true,
    current_practice: { id: "practice-1" },
    memberships: [{ practice_id: "practice-1", role: currentRole.value }],
  };
}

function catalogAccess() {
  if (currentRole.value === "USER") {
    return {
      account: null,
      error: NextResponse.json({ ok: false, error: "Rolle nicht ausreichend." }, { status: 403 }),
    };
  }
  return { account: account(), error: null };
}

function request(url: string, method = "GET", body?: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    ...(body === undefined ? {} : {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  });
}

async function expectRedirect(page: () => Promise<unknown>, target: string) {
  await expect(page()).rejects.toThrow(`__REDIRECT__:${target}`);
}

beforeEach(() => {
  jest.clearAllMocks();
  currentRole.value = "USER";
  getSessionAccountMock.mockResolvedValue(account());
  getSessionAccountFromCookiesMock.mockResolvedValue(account());
  requirePracticeCatalogAccessMock.mockImplementation(async () => catalogAccess());
  requirePracticeCatalogAccessFromCookiesMock.mockImplementation(async () => (
    currentRole.value === "USER" ? null : account()
  ));
  listCaseProfilesMock.mockResolvedValue([]);
  getCaseProfileMock.mockResolvedValue({ id: "case-a", title: "Fall A", checkpointRefs: [] });
  getCheckpointMock.mockResolvedValue(undefined);
  ensurePracticeWorkingSessionMock.mockResolvedValue({ id: "session-1", alreadyExists: false });
  publishToCatalogMock.mockResolvedValue({ ok: true, id: "entry-1" });
  startRevisionMock.mockResolvedValue({ sessionId: "session-2", alreadyStarted: false });
  getPracticeCheckpointDefinitionMock.mockResolvedValue(null);
  upsertPracticeCheckpointDefinitionMock.mockResolvedValue({ id: "definition-1" });
  pm.workflowSession.findFirst.mockResolvedValue({
    id: "session-1",
    title: "Session",
    process_snapshot: practiceDraft,
    case_profile_id: "case-a",
  });
  pm.workflowSession.update.mockResolvedValue({});
  pm.workflowSession.delete.mockResolvedValue({});
});

describe("Practice-Workflow-Builder Pages", () => {
  it.each([
    ["OWNER", PracticeWorkflowNewPage],
    ["OWNER", DraftM2Page],
    ["OWNER", DraftM3Page],
    ["OWNER", DraftM4Page],
    ["ADMIN", PracticeWorkflowNewPage],
    ["ADMIN", DraftM2Page],
    ["ADMIN", DraftM3Page],
    ["ADMIN", DraftM4Page],
  ] as const)("%s darf die Builder-Page öffnen", async (role, page) => {
    currentRole.value = role;
    getSessionAccountFromCookiesMock.mockResolvedValue(account());
    await expect(page()).resolves.toBeDefined();
  });

  it.each([
    ["new", PracticeWorkflowNewPage],
    ["m2", DraftM2Page],
    ["m3", DraftM3Page],
    ["m4", DraftM4Page],
  ] as const)("USER wird auf %s blockiert", async (_name, page) => {
    await expectRedirect(page, "/dashboard");
  });
});

describe("Practice-Workflow-Builder APIs", () => {
  it.each(["OWNER", "ADMIN"] as const)("%s darf Practice-Start und Create ausführen", async (role) => {
    currentRole.value = role;
    const start = await startPracticeWorkflow(request("/api/workflow-cases/internal-protocol/start", "POST", { caseProfileId: "case-a" }));
    const create = await createPracticeWorkflow(request("/api/workflow-cases/internal-protocol/create", "POST", { title: "Fall A", snapshot: practiceDraft }));
    expect(start.status).toBe(200);
    expect(create.status).toBe(200);
    expect(ensurePracticeWorkingSessionMock).toHaveBeenCalled();
  });

  it("USER darf Practice-Start und Create nicht ausführen", async () => {
    const start = await startPracticeWorkflow(request("/api/workflow-cases/internal-protocol/start", "POST", { caseProfileId: "case-a" }));
    const create = await createPracticeWorkflow(request("/api/workflow-cases/internal-protocol/create", "POST", { title: "Fall A", snapshot: practiceDraft }));
    expect(start.status).toBe(403);
    expect(create.status).toBe(403);
    expect(ensurePracticeWorkingSessionMock).not.toHaveBeenCalled();
  });

  it("USER bleibt für Publish, Revision und Checkpoint-Definition PUT gesperrt", async () => {
    const publish = await publishPracticeWorkflow(request("/api/practice-catalog/publish", "POST", { sessionId: "session-1", title: "Fall A" }));
    const revision = await startPracticeRevision(request("/api/practice-catalog/entry-1/start-revision", "POST"), { params: Promise.resolve({ id: "entry-1" }) });
    const definition = await updateCheckpointDefinition(request("/api/practice-checkpoint-definitions/cp-a", "PUT", { selectedAnchorIds: [], implementation: "Standard" }), { params: Promise.resolve({ checkpointId: "cp-a" }) });
    expect(publish.status).toBe(403);
    expect(revision.status).toBe(403);
    expect(definition.status).toBe(403);
    expect(publishToCatalogMock).not.toHaveBeenCalled();
    expect(startRevisionMock).not.toHaveBeenCalled();
    expect(upsertPracticeCheckpointDefinitionMock).not.toHaveBeenCalled();
  });
});

describe("Gemischte Save-/Delete-APIs", () => {
  it("blockiert USER bei Practice-Draft GET/PATCH/DELETE", async () => {
    const getResponse = await saveGet(request("/api/workflow-cases/session-1/protocol/save"), { params: Promise.resolve({ id: "session-1" }) });
    const patchResponse = await savePatch(request("/api/workflow-cases/session-1/protocol/save", "PATCH", { snapshot: practiceDraft, title: "Fall A" }), { params: Promise.resolve({ id: "session-1" }) });
    const deleteResponse = await deleteWorkflowSession(request("/api/workflow-cases/session-1", "DELETE"), { params: Promise.resolve({ id: "session-1" }) });
    expect(getResponse.status).toBe(403);
    expect(patchResponse.status).toBe(403);
    expect(deleteResponse.status).toBe(403);
    expect(pm.workflowSession.update).not.toHaveBeenCalled();
    expect(pm.workflowSession.delete).not.toHaveBeenCalled();
  });

  it.each(["OWNER", "ADMIN"] as const)("%s darf Practice-Draft speichern und löschen", async (role) => {
    currentRole.value = role;
    const patchResponse = await savePatch(request("/api/workflow-cases/session-1/protocol/save", "PATCH", { snapshot: practiceDraft, title: "Fall A" }), { params: Promise.resolve({ id: "session-1" }) });
    const deleteResponse = await deleteWorkflowSession(request("/api/workflow-cases/session-1", "DELETE"), { params: Promise.resolve({ id: "session-1" }) });
    expect(patchResponse.status).toBe(200);
    expect(deleteResponse.status).toBe(200);
  });

  it("lässt USER den älteren InternalProtocol-Snapshot speichern und löschen", async () => {
    pm.workflowSession.findFirst.mockResolvedValue({
      id: "session-1",
      title: "Protocol",
      process_snapshot: internalProtocolSnapshot,
      case_profile_id: null,
    });
    const patchResponse = await savePatch(request("/api/workflow-cases/session-1/protocol/save", "PATCH", {
      checkpoints: internalProtocolSnapshot.checkpoints,
    }), { params: Promise.resolve({ id: "session-1" }) });
    const deleteResponse = await deleteWorkflowSession(request("/api/workflow-cases/session-1", "DELETE"), { params: Promise.resolve({ id: "session-1" }) });
    expect(patchResponse.status).toBe(200);
    expect(deleteResponse.status).toBe(200);
    expect(pm.workflowSession.update).toHaveBeenCalled();
    expect(pm.workflowSession.delete).toHaveBeenCalled();
  });
});
