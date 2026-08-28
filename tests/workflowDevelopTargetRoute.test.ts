/**
 * Tests für POST /api/workflow-cases/[id]/protocol/develop-target
 *
 * Abdeckung:
 * - Auth: 401 ohne Session, 403 ohne Freischaltung
 * - 404 wenn Session nicht gefunden
 * - 400 wenn STANDARD_PROCESS-Snapshot übergeben wird
 * - 400 wenn TARGET_STATE als Quelle angegeben wird
 * - 200 bei gültigem CURRENT_STATE-Snapshot
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    workflowSession: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
}));

import { POST } from "@/app/api/workflow-cases/[id]/protocol/develop-target/route";
import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import {
  buildInitialInternalProtocolWorkflowSnapshot,
} from "@/lib/workflow/internalProtocol/workflowAdapter";

type PrismaMock = {
  workflowSession: {
    findFirst: jest.Mock;
    create: jest.Mock;
  };
};
const pm = prisma as unknown as PrismaMock;
const getSessionMock = getSessionAccount as jest.Mock;

const AUTHORIZED_ACCOUNT = {
  id: "acc-1",
  email: "test@example.com",
  is_approved: true,
  is_admin: false,
  arbeitsprozesse_enabled: true,
  current_practice: null,
};

function makeRequest(id = "sess-1") {
  return new NextRequest(
    `http://localhost/api/workflow-cases/${id}/protocol/develop-target`,
    { method: "POST" },
  );
}

function makeParams(id = "sess-1") {
  return { params: Promise.resolve({ id }) };
}

const CURRENT_STATE_SNAPSHOT = buildInitialInternalProtocolWorkflowSnapshot("CURRENT_STATE");
const TARGET_STATE_SNAPSHOT = buildInitialInternalProtocolWorkflowSnapshot("TARGET_STATE");
const STANDARD_PROCESS_SNAPSHOT = {
  topicId: "au-musterprozess",
  role: "MFA",
  processPoints: [],
};

beforeEach(() => {
  pm.workflowSession.findFirst.mockReset();
  pm.workflowSession.create.mockReset();
  getSessionMock.mockReset();
});

// ---------------------------------------------------------------------------
// Auth-Tests
// ---------------------------------------------------------------------------

describe("POST develop-target — Auth", () => {
  it("401 ohne Session", async () => {
    getSessionMock.mockResolvedValue(null);
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("403 wenn Account nicht freigeschaltet (is_approved=false)", async () => {
    getSessionMock.mockResolvedValue({ ...AUTHORIZED_ACCOUNT, is_approved: false });
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(403);
    expect(pm.workflowSession.findFirst).not.toHaveBeenCalled();
  });

  it("403 wenn Arbeitsprozesse nicht freigeschaltet und kein Admin", async () => {
    getSessionMock.mockResolvedValue({
      ...AUTHORIZED_ACCOUNT,
      arbeitsprozesse_enabled: false,
      is_admin: false,
    });
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(403);
  });

  it("Admin-Bypass: is_admin=true erlaubt Zugriff ohne arbeitsprozesse_enabled", async () => {
    getSessionMock.mockResolvedValue({
      ...AUTHORIZED_ACCOUNT,
      arbeitsprozesse_enabled: false,
      is_admin: true,
    });
    pm.workflowSession.findFirst.mockResolvedValue({
      id: "sess-1",
      process_snapshot: CURRENT_STATE_SNAPSHOT,
    });
    pm.workflowSession.create.mockResolvedValue({ id: "sess-new" });

    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Validierungstests
// ---------------------------------------------------------------------------

describe("POST develop-target — Validierung", () => {
  beforeEach(() => {
    getSessionMock.mockResolvedValue(AUTHORIZED_ACCOUNT);
  });

  it("404 wenn Session nicht gefunden", async () => {
    pm.workflowSession.findFirst.mockResolvedValue(null);
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("400 wenn Snapshot ein STANDARD_PROCESS-Snapshot ist", async () => {
    pm.workflowSession.findFirst.mockResolvedValue({
      id: "sess-1",
      process_snapshot: STANDARD_PROCESS_SNAPSHOT,
    });
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toContain("PRACTICE_PROCESS");
  });

  it("400 für unbekannte Prozess-ID (nicht im Katalog)", async () => {
    pm.workflowSession.findFirst.mockResolvedValue({
      id: "sess-1",
      process_snapshot: { topicId: "unbekannter-prozess", processKind: "internal-protocol" },
    });
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toContain("Prozesskatalog");
  });

  it("400 wenn Snapshot kein topicId enthält", async () => {
    pm.workflowSession.findFirst.mockResolvedValue({
      id: "sess-1",
      process_snapshot: { role: "MFA", processPoints: [] },
    });
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("400 wenn Ausgangssession bereits TARGET_STATE ist", async () => {
    pm.workflowSession.findFirst.mockResolvedValue({
      id: "sess-1",
      process_snapshot: TARGET_STATE_SNAPSHOT,
    });
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toContain("CURRENT_STATE");
  });
});

// ---------------------------------------------------------------------------
// Erfolgsfall
// ---------------------------------------------------------------------------

describe("POST develop-target — Erstellen", () => {
  beforeEach(() => {
    getSessionMock.mockResolvedValue(AUTHORIZED_ACCOUNT);
    pm.workflowSession.findFirst.mockResolvedValue({
      id: "sess-src",
      process_snapshot: CURRENT_STATE_SNAPSHOT,
    });
    pm.workflowSession.create.mockResolvedValue({ id: "sess-target" });
  });

  it("200 mit neuer Session-ID bei gültigem CURRENT_STATE-Snapshot", async () => {
    const res = await POST(makeRequest("sess-src"), makeParams("sess-src"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.id).toBe("sess-target");
  });

  it("neuer Snapshot hat processMode TARGET_STATE und sourceWorkflowSessionId", async () => {
    await POST(makeRequest("sess-src"), makeParams("sess-src"));
    const createCall = pm.workflowSession.create.mock.calls[0][0];
    const newSnapshot = createCall.data.process_snapshot;
    expect(newSnapshot.processMode).toBe("TARGET_STATE");
    expect(newSnapshot.sourceWorkflowSessionId).toBe("sess-src");
  });

  it("neuer Snapshot enthält inheritedQuestionIds statt inheritedAnswers", async () => {
    const sourceWithAnswers = buildInitialInternalProtocolWorkflowSnapshot("CURRENT_STATE");
    sourceWithAnswers.checkpoints[0].answers["POT-Q-C01-01"] = ["POT-Q-C01-01-A"];
    sourceWithAnswers.checkpoints[0].answers["POT-Q-C01-02"] = "YES";
    pm.workflowSession.findFirst.mockResolvedValue({
      id: "sess-src",
      process_snapshot: sourceWithAnswers,
    });

    await POST(makeRequest("sess-src"), makeParams("sess-src"));
    const createCall = pm.workflowSession.create.mock.calls[0][0];
    const newSnapshot = createCall.data.process_snapshot;

    // Neue Sessions nutzen inheritedQuestionIds
    expect(Array.isArray(newSnapshot.inheritedQuestionIds)).toBe(true);
    expect(newSnapshot.inheritedQuestionIds).toContain("POT-Q-C01-01");
    expect(newSnapshot.inheritedQuestionIds).toContain("POT-Q-C01-02");
    // Kein veraltetes inheritedAnswers-Objekt
    expect(newSnapshot.inheritedAnswers).toBeUndefined();
  });

  it("neuer Snapshot enthält keine clarificationJudgements", async () => {
    const sourceWithJudgements = buildInitialInternalProtocolWorkflowSnapshot("CURRENT_STATE");
    sourceWithJudgements.checkpoints[0].clarificationJudgement = "SUFFICIENTLY_CLARIFIED";
    pm.workflowSession.findFirst.mockResolvedValue({
      id: "sess-src",
      process_snapshot: sourceWithJudgements,
    });

    await POST(makeRequest("sess-src"), makeParams("sess-src"));
    const createCall = pm.workflowSession.create.mock.calls[0][0];
    const newSnapshot = createCall.data.process_snapshot;
    for (const cp of newSnapshot.checkpoints) {
      expect(cp.clarificationJudgement).toBeUndefined();
    }
  });
});
