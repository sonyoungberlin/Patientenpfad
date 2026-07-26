/**
 * Tests für PATCH /api/workflow-cases/[id]/m3/update
 *
 * Regressionstest: Beim Aktualisieren eines M3-Checkpoint-Status dürfen
 * bestehende Snapshot-Felder (insbesondere m2_answers) nicht verloren gehen.
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    workflowSession: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
}));

import { PATCH } from "@/app/api/workflow-cases/[id]/m3/update/route";
import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import { WORKFLOW_TOPIC_AU } from "@/lib/workflow/processCatalog";

type PrismaMock = {
  workflowSession: { findFirst: jest.Mock; update: jest.Mock };
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

// Snapshot mit m2_answers und weiteren Feldern
const SNAPSHOT_WITH_M2_ANSWERS = {
  topicId: WORKFLOW_TOPIC_AU,
  role: "MFA",
  processPoints: [],
  m3Checkpoints: [
    {
      id: "WF-C01",
      title: "Formale Angaben",
      status: "UNKLAR",
      m2_answers: { "M2-01": "YES", "M2-02": "NO" },
    },
    {
      id: "WF-C02",
      title: "Entscheidungsgrundlage",
      status: "UNKLAR",
      m2_answers: { "M2-01": "UNCLEAR" },
    },
    {
      id: "WF-C03",
      title: "Verlauf und Kontext",
      status: "ERKENNBAR",
      m2_answers: {},
    },
  ],
};

function makeRequest(sessionId: string, body: unknown) {
  return new NextRequest(
    `http://localhost/api/workflow-cases/${sessionId}/m3/update`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  pm.workflowSession.findFirst.mockReset();
  pm.workflowSession.update.mockReset();
  getSessionMock.mockReset();
  getSessionMock.mockResolvedValue(AUTHORIZED_ACCOUNT);
  pm.workflowSession.findFirst.mockResolvedValue({
    id: "sess-1",
    process_snapshot: SNAPSHOT_WITH_M2_ANSWERS,
    internal_saved_at: new Date("2026-01-01"),
  });
  pm.workflowSession.update.mockResolvedValue({ id: "sess-1" });
});

// ---------------------------------------------------------------------------
// Auth-Tests
// ---------------------------------------------------------------------------

describe("PATCH /api/workflow-cases/[id]/m3/update — Auth", () => {
  it("401 ohne Session", async () => {
    getSessionMock.mockResolvedValue(null);
    const res = await PATCH(
      makeRequest("sess-1", { m3Checkpoints: [{ id: "WF-C01", status: "ERKENNBAR" }] }),
      ctx("sess-1"),
    );
    expect(res.status).toBe(401);
    expect(pm.workflowSession.update).not.toHaveBeenCalled();
  });

  it("403 wenn Account nicht freigeschaltet (is_approved=false)", async () => {
    getSessionMock.mockResolvedValue({ ...AUTHORIZED_ACCOUNT, is_approved: false });
    const res = await PATCH(
      makeRequest("sess-1", { m3Checkpoints: [{ id: "WF-C01", status: "ERKENNBAR" }] }),
      ctx("sess-1"),
    );
    expect(res.status).toBe(403);
    expect(pm.workflowSession.update).not.toHaveBeenCalled();
  });

  it("403 wenn Arbeitsprozesse nicht freigeschaltet", async () => {
    getSessionMock.mockResolvedValue({
      ...AUTHORIZED_ACCOUNT,
      arbeitsprozesse_enabled: false,
      is_admin: false,
    });
    const res = await PATCH(
      makeRequest("sess-1", { m3Checkpoints: [{ id: "WF-C01", status: "ERKENNBAR" }] }),
      ctx("sess-1"),
    );
    expect(res.status).toBe(403);
    expect(pm.workflowSession.update).not.toHaveBeenCalled();
  });

  it("404 wenn Sitzung nicht gefunden", async () => {
    pm.workflowSession.findFirst.mockResolvedValue(null);
    const res = await PATCH(
      makeRequest("unbekannt", { m3Checkpoints: [{ id: "WF-C01", status: "ERKENNBAR" }] }),
      ctx("unbekannt"),
    );
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Validierungstests
// ---------------------------------------------------------------------------

describe("PATCH /api/workflow-cases/[id]/m3/update — Validierung", () => {
  it("400 bei ungültigem JSON", async () => {
    const req = new NextRequest(
      "http://localhost/api/workflow-cases/sess-1/m3/update",
      { method: "PATCH", body: "{not-json", headers: { "Content-Type": "application/json" } },
    );
    const res = await PATCH(req, ctx("sess-1"));
    expect(res.status).toBe(400);
  });

  it("400 wenn m3Checkpoints fehlt", async () => {
    const res = await PATCH(makeRequest("sess-1", {}), ctx("sess-1"));
    expect(res.status).toBe(400);
  });

  it("400 wenn m3Checkpoints kein Array ist", async () => {
    const res = await PATCH(
      makeRequest("sess-1", { m3Checkpoints: "nicht-array" }),
      ctx("sess-1"),
    );
    expect(res.status).toBe(400);
  });

  it("400 wenn kein einziges Element einen gültigen Status hat", async () => {
    const res = await PATCH(
      makeRequest("sess-1", {
        m3Checkpoints: [
          { id: "WF-C01", status: "UNGUELTIG" },
          { id: 42, status: "ERKENNBAR" },
        ],
      }),
      ctx("sess-1"),
    );
    expect(res.status).toBe(400);
    const json = await res.json() as { ok: boolean; error?: string };
    expect(json.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Kern-Regressionstest: Datenverlust verhindern
// ---------------------------------------------------------------------------

describe("PATCH /api/workflow-cases/[id]/m3/update — Datenerhalt (Regressionstest)", () => {
  it("m2_answers des aktualisierten Checkpoints bleiben vollständig erhalten", async () => {
    const res = await PATCH(
      makeRequest("sess-1", {
        m3Checkpoints: [{ id: "WF-C01", status: "ERKENNBAR" }],
      }),
      ctx("sess-1"),
    );

    expect(res.status).toBe(200);
    const updateArg = pm.workflowSession.update.mock.calls[0][0] as {
      data: { process_snapshot: { m3Checkpoints: Array<{ id: string; title: string; status: string; m2_answers?: Record<string, string> }> } };
    };
    const saved = updateArg.data.process_snapshot.m3Checkpoints;

    const wfC01 = saved.find((c) => c.id === "WF-C01");
    expect(wfC01).toBeDefined();
    expect(wfC01!.status).toBe("ERKENNBAR");
    // Regression: m2_answers muss erhalten bleiben
    expect(wfC01!.m2_answers).toEqual({ "M2-01": "YES", "M2-02": "NO" });
    expect(wfC01!.title).toBe("Formale Angaben");
  });

  it("m2_answers des NICHT aktualisierten Checkpoints bleiben ebenfalls erhalten", async () => {
    const res = await PATCH(
      makeRequest("sess-1", {
        m3Checkpoints: [{ id: "WF-C01", status: "ERKENNBAR" }],
      }),
      ctx("sess-1"),
    );

    expect(res.status).toBe(200);
    const updateArg = pm.workflowSession.update.mock.calls[0][0] as {
      data: { process_snapshot: { m3Checkpoints: Array<{ id: string; status: string; m2_answers?: Record<string, string> }> } };
    };
    const saved = updateArg.data.process_snapshot.m3Checkpoints;

    const wfC02 = saved.find((c) => c.id === "WF-C02");
    expect(wfC02).toBeDefined();
    expect(wfC02!.status).toBe("UNKLAR");
    // Regression: m2_answers des nicht betroffenen Checkpoints muss erhalten bleiben
    expect(wfC02!.m2_answers).toEqual({ "M2-01": "UNCLEAR" });
  });

  it("nicht aktualisierte Checkpoints bleiben vollständig unverändert", async () => {
    const res = await PATCH(
      makeRequest("sess-1", {
        m3Checkpoints: [{ id: "WF-C01", status: "NICHT_ERFASST" }],
      }),
      ctx("sess-1"),
    );

    expect(res.status).toBe(200);
    const updateArg = pm.workflowSession.update.mock.calls[0][0] as {
      data: { process_snapshot: { m3Checkpoints: Array<{ id: string; status: string; title: string }> } };
    };
    const saved = updateArg.data.process_snapshot.m3Checkpoints;

    // WF-C02 und WF-C03 wurden nicht gesendet bzw. nicht aktualisiert
    const wfC03 = saved.find((c) => c.id === "WF-C03");
    expect(wfC03).toBeDefined();
    expect(wfC03!.status).toBe("ERKENNBAR"); // ursprünglicher Status unverändert
    expect(wfC03!.title).toBe("Verlauf und Kontext");
  });

  it("mehrere Checkpoints können gleichzeitig aktualisiert werden", async () => {
    const res = await PATCH(
      makeRequest("sess-1", {
        m3Checkpoints: [
          { id: "WF-C01", status: "ERKENNBAR" },
          { id: "WF-C02", status: "NICHT_ERFASST" },
        ],
      }),
      ctx("sess-1"),
    );

    expect(res.status).toBe(200);
    const updateArg = pm.workflowSession.update.mock.calls[0][0] as {
      data: { process_snapshot: { m3Checkpoints: Array<{ id: string; status: string }> } };
    };
    const saved = updateArg.data.process_snapshot.m3Checkpoints;

    expect(saved.find((c) => c.id === "WF-C01")!.status).toBe("ERKENNBAR");
    expect(saved.find((c) => c.id === "WF-C02")!.status).toBe("NICHT_ERFASST");
    expect(saved.find((c) => c.id === "WF-C03")!.status).toBe("ERKENNBAR"); // unverändert
  });

  it("unbekannte Checkpoint-IDs werden nicht als neue Checkpoints eingeschleust", async () => {
    // Sende eine gültige bekannte ID + eine unbekannte ID
    await PATCH(
      makeRequest("sess-1", {
        m3Checkpoints: [
          { id: "WF-C01", status: "ERKENNBAR" },
          { id: "UNBEKANNT-999", status: "ERKENNBAR" },
        ],
      }),
      ctx("sess-1"),
    );

    const updateArg = pm.workflowSession.update.mock.calls[0][0] as {
      data: { process_snapshot: { m3Checkpoints: Array<{ id: string }> } };
    };
    const saved = updateArg.data.process_snapshot.m3Checkpoints;

    // Unbekannte ID darf nicht im Ergebnis erscheinen
    const unknown = saved.find((c) => c.id === "UNBEKANNT-999");
    expect(unknown).toBeUndefined();

    // Vorhandene Checkpoints bleiben erhalten (3 ursprüngliche)
    expect(saved.length).toBe(3);
  });

  it("Snapshot-Felder außerhalb von m3Checkpoints bleiben unverändert", async () => {
    const res = await PATCH(
      makeRequest("sess-1", {
        m3Checkpoints: [{ id: "WF-C01", status: "ERKENNBAR" }],
      }),
      ctx("sess-1"),
    );

    expect(res.status).toBe(200);
    const updateArg = pm.workflowSession.update.mock.calls[0][0] as {
      data: { process_snapshot: { topicId: string; role: string; processPoints: unknown[] } };
    };
    const savedSnapshot = updateArg.data.process_snapshot;

    expect(savedSnapshot.topicId).toBe(WORKFLOW_TOPIC_AU);
    expect(savedSnapshot.role).toBe("MFA");
    expect(Array.isArray(savedSnapshot.processPoints)).toBe(true);
  });
});
