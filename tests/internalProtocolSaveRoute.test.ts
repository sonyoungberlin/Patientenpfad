/**
 * Tests für PATCH /api/workflow-cases/[id]/protocol/save
 * Fokus: InternalProtocol – Checkpoint-Merge und inheritedQuestionIds-Logik (Pfad I-B)
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    workflowSession: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
}));

import { PATCH } from "@/app/api/workflow-cases/[id]/protocol/save/route";
import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import {
  buildInitialInternalProtocolWorkflowSnapshot,
  buildTargetStateSnapshotFromCurrent,
  type InternalProtocolWorkflowSnapshot,
  type ProtocolWorkflowCheckpoint,
} from "@/lib/workflow/internalProtocol/workflowAdapter";

type PrismaMock = {
  workflowSession: {
    findFirst: jest.Mock;
    update: jest.Mock;
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

function makeCheckpointMergeRequest(id: string, checkpoints: unknown[]) {
  return new NextRequest(
    `http://localhost/api/workflow-cases/${id}/protocol/save`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkpoints }),
    },
  );
}

function makeSaveParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeSessionWithSnapshot(snapshot: InternalProtocolWorkflowSnapshot) {
  return { id: "sess-1", process_snapshot: snapshot };
}

/** Gibt den Snapshot-Wert aus dem letzten update-Aufruf zurück. */
function captureUpdatedSnapshot(): InternalProtocolWorkflowSnapshot {
  const call = pm.workflowSession.update.mock.calls[0][0] as {
    data: { process_snapshot: InternalProtocolWorkflowSnapshot };
  };
  return call.data.process_snapshot;
}

beforeEach(() => {
  pm.workflowSession.findFirst.mockReset();
  pm.workflowSession.update.mockReset();
  pm.workflowSession.create.mockReset();
  getSessionMock.mockReset();
  getSessionMock.mockResolvedValue(AUTHORIZED_ACCOUNT);
  pm.workflowSession.update.mockResolvedValue({});
});

describe("PATCH save — Checkpoint-Merge (Pfad I-B)", () => {
  it("entfernt inheritedQuestionIds-Eintrag bei geänderter Antwort", async () => {
    const baseSnapshot = buildInitialInternalProtocolWorkflowSnapshot();
    const firstCp = baseSnapshot.checkpoints[0];
    const firstQId = Object.keys(firstCp.answers)[0];

    // Baue TARGET_STATE-Snapshot mit inheritedQuestionIds
    const targetSnapshot = buildTargetStateSnapshotFromCurrent(baseSnapshot, "src-1");

    // Simuliere dass der Checkpoint eine bekannte Antwort hatte
    const snapshotWithInherited: InternalProtocolWorkflowSnapshot = {
      ...targetSnapshot,
      checkpoints: targetSnapshot.checkpoints.map((cp) =>
        cp.id !== firstCp.id
          ? cp
          : { ...cp, answers: { ...cp.answers, [firstQId]: "ja" } },
      ),
      inheritedQuestionIds: [firstQId],
    };

    pm.workflowSession.findFirst.mockResolvedValue(
      makeSessionWithSnapshot(snapshotWithInherited),
    );

    // Sende geänderte Antwort
    const updatedCp: ProtocolWorkflowCheckpoint = {
      ...snapshotWithInherited.checkpoints[0],
      answers: { ...snapshotWithInherited.checkpoints[0].answers, [firstQId]: "nein" },
    };

    const res = await PATCH(
      makeCheckpointMergeRequest("sess-1", [updatedCp]),
      makeSaveParams("sess-1"),
    );

    expect(res.status).toBe(200);
    const saved = captureUpdatedSnapshot();
    expect(saved.inheritedQuestionIds).not.toContain(firstQId);
  });

  it("behält inheritedQuestionIds-Eintrag bei identischer Antwort", async () => {
    const baseSnapshot = buildInitialInternalProtocolWorkflowSnapshot();
    const firstCp = baseSnapshot.checkpoints[0];
    const firstQId = Object.keys(firstCp.answers)[0];

    const targetSnapshot = buildTargetStateSnapshotFromCurrent(baseSnapshot, "src-1");
    const snapshotWithInherited: InternalProtocolWorkflowSnapshot = {
      ...targetSnapshot,
      checkpoints: targetSnapshot.checkpoints.map((cp) =>
        cp.id !== firstCp.id
          ? cp
          : { ...cp, answers: { ...cp.answers, [firstQId]: "ja" } },
      ),
      inheritedQuestionIds: [firstQId],
    };

    pm.workflowSession.findFirst.mockResolvedValue(
      makeSessionWithSnapshot(snapshotWithInherited),
    );

    // Gleiche Antwort wie bereits in der Session
    const sameCp: ProtocolWorkflowCheckpoint = {
      ...snapshotWithInherited.checkpoints[0],
      answers: { ...snapshotWithInherited.checkpoints[0].answers, [firstQId]: "ja" },
    };

    const res = await PATCH(
      makeCheckpointMergeRequest("sess-1", [sameCp]),
      makeSaveParams("sess-1"),
    );

    expect(res.status).toBe(200);
    const saved = captureUpdatedSnapshot();
    expect(saved.inheritedQuestionIds).toContain(firstQId);
  });

  it("behandelt Array-Antworten korrekt bei inheritedQuestionIds", async () => {
    const baseSnapshot = buildInitialInternalProtocolWorkflowSnapshot();
    const firstCp = baseSnapshot.checkpoints[0];
    const firstQId = Object.keys(firstCp.answers)[0];

    const targetSnapshot = buildTargetStateSnapshotFromCurrent(baseSnapshot, "src-1");
    const snapshotWithArray: InternalProtocolWorkflowSnapshot = {
      ...targetSnapshot,
      checkpoints: targetSnapshot.checkpoints.map((cp) =>
        cp.id !== firstCp.id
          ? cp
          : { ...cp, answers: { ...cp.answers, [firstQId]: ["opt-a", "opt-b"] } },
      ),
      inheritedQuestionIds: [firstQId],
    };

    pm.workflowSession.findFirst.mockResolvedValue(
      makeSessionWithSnapshot(snapshotWithArray),
    );

    // Geänderte Array-Antwort → soll entfernt werden
    const changedCp: ProtocolWorkflowCheckpoint = {
      ...snapshotWithArray.checkpoints[0],
      answers: { ...snapshotWithArray.checkpoints[0].answers, [firstQId]: ["opt-a"] },
    };

    const res = await PATCH(
      makeCheckpointMergeRequest("sess-1", [changedCp]),
      makeSaveParams("sess-1"),
    );

    expect(res.status).toBe(200);
    const saved = captureUpdatedSnapshot();
    expect(saved.inheritedQuestionIds).not.toContain(firstQId);
  });

  it("bewahrt Session ohne inheritedQuestionIds unverändert", async () => {
    const snapshot = buildInitialInternalProtocolWorkflowSnapshot();
    // Keine inheritedQuestionIds

    pm.workflowSession.findFirst.mockResolvedValue(
      makeSessionWithSnapshot(snapshot),
    );

    const cp = snapshot.checkpoints[0];
    const firstQId = Object.keys(cp.answers)[0];
    const updatedCp: ProtocolWorkflowCheckpoint = {
      ...cp,
      answers: { ...cp.answers, [firstQId]: "nein" },
    };

    const res = await PATCH(
      makeCheckpointMergeRequest("sess-1", [updatedCp]),
      makeSaveParams("sess-1"),
    );

    expect(res.status).toBe(200);
    const saved = captureUpdatedSnapshot();
    expect(saved.inheritedQuestionIds).toBeUndefined();
  });

  it("erhält CURRENT_STATE-Metadaten nach Checkpoint-Merge", async () => {
    const snapshot = buildInitialInternalProtocolWorkflowSnapshot("CURRENT_STATE");

    pm.workflowSession.findFirst.mockResolvedValue(
      makeSessionWithSnapshot(snapshot),
    );

    const cp = snapshot.checkpoints[0];
    const updatedCp: ProtocolWorkflowCheckpoint = {
      ...cp,
      answers: { ...cp.answers },
    };

    const res = await PATCH(
      makeCheckpointMergeRequest("sess-1", [updatedCp]),
      makeSaveParams("sess-1"),
    );

    expect(res.status).toBe(200);
    const saved = captureUpdatedSnapshot();
    expect(saved.processKind).toBe("internal-protocol");
    expect(saved.topicId).toBe("patienten-ohne-termin");
    expect(saved.processMode).toBe("CURRENT_STATE");
  });

  it("erhält TARGET_STATE-Metadaten (sourceWorkflowSessionId) nach Checkpoint-Merge", async () => {
    const baseSnapshot = buildInitialInternalProtocolWorkflowSnapshot("CURRENT_STATE");
    const targetSnapshot = buildTargetStateSnapshotFromCurrent(baseSnapshot, "source-session-42");

    pm.workflowSession.findFirst.mockResolvedValue(
      makeSessionWithSnapshot(targetSnapshot),
    );

    const cp = targetSnapshot.checkpoints[0];
    const updatedCp: ProtocolWorkflowCheckpoint = {
      ...cp,
      answers: { ...cp.answers },
    };

    const res = await PATCH(
      makeCheckpointMergeRequest("sess-1", [updatedCp]),
      makeSaveParams("sess-1"),
    );

    expect(res.status).toBe(200);
    const saved = captureUpdatedSnapshot();
    expect(saved.processMode).toBe("TARGET_STATE");
    expect(saved.sourceWorkflowSessionId).toBe("source-session-42");
  });
});


