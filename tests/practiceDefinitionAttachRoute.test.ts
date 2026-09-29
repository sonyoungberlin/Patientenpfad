import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    workflowSession: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    practiceCheckpointDefinitionVersion: {
      findUnique: jest.fn(),
    },
    practiceCheckpointDefinition: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
}));

import { PATCH } from "@/app/api/workflow-cases/[id]/practice-definition/route";
import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import type { PracticeWorkflowSnapshot } from "@/lib/practiceProcesses/workflowSnapshot";

type PrismaMock = {
  workflowSession: { findFirst: jest.Mock; update: jest.Mock };
  practiceCheckpointDefinitionVersion: { findUnique: jest.Mock };
  practiceCheckpointDefinition: { findUnique: jest.Mock };
};

const pm = prisma as unknown as PrismaMock;
const getSessionMock = getSessionAccount as jest.Mock;

const ACCOUNT = {
  id: "account-1",
  email: "test@example.com",
  is_approved: true,
  is_admin: false,
  arbeitsprozesse_enabled: true,
  current_practice: { id: "practice-1", name: "Testpraxis" },
};

const VERSION_2 = {
  id: "version-2",
  definition_id: "definition-1",
  version: 2,
  checkpoint_id: "cp-1",
  template_snapshot: {
    checkpointId: "cp-1",
    title: "Patient bekannt",
    dimensions: [],
  },
  content: {
    schemaVersion: 1,
    statement: "Version 2",
    dimensions: [],
    criteria: [],
    expression: { kind: "ALL", operands: [] },
    requiredData: [],
    responsibility: {
      collectedBy: [],
      assessedBy: [],
      assessmentLocation: "",
      documentationLocation: "",
    },
  },
  released_at: new Date("2026-09-29T10:00:00.000Z"),
};

function makeSnapshot(): PracticeWorkflowSnapshot {
  return {
    processKind: "practice-workflow",
    caseProfileId: "profile-1",
    caseProfileTitle: "Pilotfall",
    checkpoints: [
      {
        checkpointId: "cp-1",
        checkpointTitle: "Patient bekannt",
        selectedAnchorIds: ["anchor-kept"],
        decision: "PFLICHT",
        umsetzung: "Bestehende Fallarbeit bleibt erhalten.",
      },
      {
        checkpointId: "cp-2",
        checkpointTitle: "Rezept vorhanden",
        selectedAnchorIds: ["other-anchor"],
        decision: "OPTIONAL",
        umsetzung: "Nicht überschreiben.",
      },
    ],
  };
}

function request(body: unknown) {
  return new NextRequest("http://localhost/api/workflow-cases/draft-1/practice-definition", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function params(id = "draft-1") {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  jest.clearAllMocks();
  getSessionMock.mockResolvedValue(ACCOUNT);
  pm.workflowSession.update.mockResolvedValue({});
  pm.practiceCheckpointDefinitionVersion.findUnique.mockResolvedValue(VERSION_2);
  pm.practiceCheckpointDefinition.findUnique.mockResolvedValue({ practice_id: "practice-1" });
});

describe("PATCH /api/workflow-cases/[id]/practice-definition", () => {
  it("übernimmt bewusst Version 2 und bewahrt alle übrigen Draft-Daten", async () => {
    const oldSnapshot = makeSnapshot();
    pm.workflowSession.findFirst.mockResolvedValue({ id: "draft-1", process_snapshot: oldSnapshot });

    const response = await PATCH(
      request({ checkpointId: "cp-1", versionId: "version-2" }),
      params(),
    );

    expect(response.status).toBe(200);
    const saved = pm.workflowSession.update.mock.calls[0][0].data.process_snapshot as PracticeWorkflowSnapshot;
    expect(saved.checkpoints[0]).toMatchObject({
      checkpointId: "cp-1",
      selectedAnchorIds: ["anchor-kept"],
      decision: "PFLICHT",
      umsetzung: "Bestehende Fallarbeit bleibt erhalten.",
      practiceDefinitionVersion: expect.objectContaining({ version: 2, versionId: "version-2" }),
    });
    expect(saved.checkpoints[1]).toEqual(oldSnapshot.checkpoints[1]);
    expect(oldSnapshot.checkpoints[0].practiceDefinitionVersion).toBeUndefined();
  });

  it("verhindert die Übernahme einer Definitionsversion aus einer anderen Praxis", async () => {
    pm.workflowSession.findFirst.mockResolvedValue({ id: "draft-1", process_snapshot: makeSnapshot() });
    pm.practiceCheckpointDefinition.findUnique.mockResolvedValue({ practice_id: "practice-other" });

    const response = await PATCH(
      request({ checkpointId: "cp-1", versionId: "version-2" }),
      params(),
    );

    expect(response.status).toBe(403);
    expect(pm.workflowSession.update).not.toHaveBeenCalled();
  });

  it("verhindert die Übernahme in einen bereits abgeschlossenen Snapshot", async () => {
    const snapshot = { ...makeSnapshot(), completedAt: "2026-09-29T11:00:00.000Z" };
    pm.workflowSession.findFirst.mockResolvedValue({ id: "draft-1", process_snapshot: snapshot });

    const response = await PATCH(
      request({ checkpointId: "cp-1", versionId: "version-2" }),
      params(),
    );

    expect(response.status).toBe(409);
    expect(pm.practiceCheckpointDefinitionVersion.findUnique).not.toHaveBeenCalled();
    expect(pm.workflowSession.update).not.toHaveBeenCalled();
  });

  it("verhindert eine Version für einen anderen Checkpoint", async () => {
    pm.workflowSession.findFirst.mockResolvedValue({ id: "draft-1", process_snapshot: makeSnapshot() });
    pm.practiceCheckpointDefinitionVersion.findUnique.mockResolvedValue({
      ...VERSION_2,
      checkpoint_id: "cp-other",
    });

    const response = await PATCH(
      request({ checkpointId: "cp-1", versionId: "version-2" }),
      params(),
    );

    expect(response.status).toBe(422);
    expect(pm.workflowSession.update).not.toHaveBeenCalled();
  });
});
