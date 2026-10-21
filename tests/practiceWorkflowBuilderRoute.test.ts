import { NextRequest, NextResponse } from "next/server";

const mockFindFirst = jest.fn();
const mockGetSessionAccount = jest.fn();
const mockCanAccessWorkflowCases = jest.fn();
const mockRequirePracticeCatalogAccess = jest.fn();
const mockResolveBuilderCheckpoints = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    workflowSession: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: (...args: unknown[]) => mockGetSessionAccount(...args),
}));

jest.mock("@/lib/authz", () => ({
  canAccessWorkflowCases: (...args: unknown[]) => mockCanAccessWorkflowCases(...args),
  requirePracticeCatalogAccess: (...args: unknown[]) => mockRequirePracticeCatalogAccess(...args),
}));

jest.mock("@/lib/workflow/scope", () => ({
  getWorkflowOwnershipFilter: jest.fn(() => ({ owner_account_id: "account-1" })),
}));

jest.mock("@/lib/practiceProcesses/practiceWorkflowBuilder", () => ({
  resolvePracticeWorkflowBuilderCheckpoints: (...args: unknown[]) => mockResolveBuilderCheckpoints(...args),
}));

import { GET } from "@/app/api/workflow-cases/[id]/protocol/save/route";

const draftSnapshot = {
  processKind: "practice-workflow",
  snapshotVersion: 2,
  caseProfileId: "case-1",
  caseProfileTitle: "Fall",
  checkpoints: [
    { checkpointId: "workflow-cp-a", checkpointTitle: "Historischer Titel A" },
    { checkpointId: "workflow-cp-b", checkpointTitle: "Historischer Titel B" },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSessionAccount.mockResolvedValue({ id: "account-1", is_approved: true });
  mockCanAccessWorkflowCases.mockReturnValue(true);
  mockFindFirst.mockResolvedValue({
    id: "session-1",
    title: "Fall",
    process_snapshot: draftSnapshot,
  });
  mockRequirePracticeCatalogAccess.mockResolvedValue({
    account: { current_practice: { id: "practice-authorized" } },
    error: null,
  });
  mockResolveBuilderCheckpoints.mockResolvedValue([
    { checkpointId: "workflow-cp-a", title: "Aktuell A", orientationAnchors: [], definition: null },
    { checkpointId: "workflow-cp-b", title: "Aktuell B", orientationAnchors: [], definition: null },
  ]);
});

describe("GET workflow draft read", () => {
  it("liefert Builder-Metadaten nur nach Praxisautorisierung und nur für Checkpoints des Snapshots", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/workflow-cases/session-1/protocol/save"),
      { params: Promise.resolve({ id: "session-1" }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      builderCheckpoints: [
        { checkpointId: "workflow-cp-a", title: "Aktuell A" },
        { checkpointId: "workflow-cp-b", title: "Aktuell B" },
      ],
    });
    expect(mockResolveBuilderCheckpoints).toHaveBeenCalledWith(
      "practice-authorized",
      ["workflow-cp-a", "workflow-cp-b"],
    );
  });

  it("legt ohne autorisierten Praxiskontext keine Checkpoint-Definitionen offen", async () => {
    mockRequirePracticeCatalogAccess.mockResolvedValue({
      account: null,
      error: NextResponse.json({ ok: false, error: "Nicht autorisiert." }, { status: 403 }),
    });

    const response = await GET(
      new NextRequest("http://localhost/api/workflow-cases/session-1/protocol/save"),
      { params: Promise.resolve({ id: "session-1" }) },
    );

    expect(response.status).toBe(403);
    expect(mockResolveBuilderCheckpoints).not.toHaveBeenCalled();
  });
});
