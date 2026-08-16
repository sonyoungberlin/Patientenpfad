/**
 * Tests für PATCH /api/workflow-cases/[id]/protocol/save
 * Fokus: Voller Snapshot-Überschrieb (PracticeWorkflowSnapshot, Pfad P)
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
import type { PracticeWorkflowSnapshot } from "@/lib/practiceProcesses/workflowSnapshot";

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

const VALID_SNAPSHOT: PracticeWorkflowSnapshot = {
  processKind: "practice-workflow",
  caseProfileId: "rezeptanfrage-ohne-arzt",
  caseProfileTitle: "Rezeptanfrage ohne Arzt",
  checkpoints: [
    {
      checkpointId: "patient-bekannt",
      checkpointTitle: "Patient bekannt",
      selectedAnchorIds: [],
      decision: "PFLICHT",
    },
  ],
};

function makeSaveRequest(id: string, body: unknown) {
  return new NextRequest(
    `http://localhost/api/workflow-cases/${id}/protocol/save`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

function makeSaveParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  pm.workflowSession.findFirst.mockReset();
  pm.workflowSession.update.mockReset();
  pm.workflowSession.create.mockReset();
  getSessionMock.mockReset();
  getSessionMock.mockResolvedValue(AUTHORIZED_ACCOUNT);
  pm.workflowSession.update.mockResolvedValue({});
});

describe("PATCH save — voller Snapshot-Überschrieb (PracticeWorkflow)", () => {
  it("speichert validen PracticeWorkflowSnapshot und gibt ok:true zurück", async () => {
    pm.workflowSession.findFirst.mockResolvedValue({
      id: "sess-1",
      process_snapshot: VALID_SNAPSHOT,
    });

    const res = await PATCH(
      makeSaveRequest("sess-1", { snapshot: VALID_SNAPSHOT, title: "Mein Praxisfall" }),
      makeSaveParams("sess-1"),
    );
    expect(res.status).toBe(200);
    const data = await res.json() as { ok: boolean };
    expect(data.ok).toBe(true);

    const updateCall = pm.workflowSession.update.mock.calls[0][0] as {
      where: { id: string };
      data: { title: string; process_snapshot: unknown };
    };
    expect(updateCall.where.id).toBe("sess-1");
    expect(updateCall.data.title).toBe("Mein Praxisfall");
    expect((updateCall.data.process_snapshot as PracticeWorkflowSnapshot).processKind).toBe("practice-workflow");
  });

  it("gibt 400 zurück wenn Snapshot fehlt", async () => {
    pm.workflowSession.findFirst.mockResolvedValue({
      id: "sess-1",
      process_snapshot: VALID_SNAPSHOT,
    });

    const res = await PATCH(
      makeSaveRequest("sess-1", { title: "Kein Snapshot" }),
      makeSaveParams("sess-1"),
    );
    expect(res.status).toBe(400);
  });

  it("gibt 400 zurück wenn Titel fehlt", async () => {
    pm.workflowSession.findFirst.mockResolvedValue({
      id: "sess-1",
      process_snapshot: VALID_SNAPSHOT,
    });

    const res = await PATCH(
      makeSaveRequest("sess-1", { snapshot: VALID_SNAPSHOT }),
      makeSaveParams("sess-1"),
    );
    expect(res.status).toBe(400);
  });

  it("gibt 404 zurück wenn Session nicht existiert", async () => {
    pm.workflowSession.findFirst.mockResolvedValue(null);

    const res = await PATCH(
      makeSaveRequest("nonexistent", { snapshot: VALID_SNAPSHOT, title: "Test" }),
      makeSaveParams("nonexistent"),
    );
    expect(res.status).toBe(404);
  });

  it("gibt 401 zurück wenn nicht angemeldet", async () => {
    getSessionMock.mockResolvedValue(null);

    const res = await PATCH(
      makeSaveRequest("sess-1", { snapshot: VALID_SNAPSHOT, title: "Test" }),
      makeSaveParams("sess-1"),
    );
    expect(res.status).toBe(401);
  });
});
