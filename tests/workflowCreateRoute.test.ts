/**
 * Tests für POST /api/workflow-cases/create
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    workflowSession: {
      create: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
}));

import { POST } from "@/app/api/workflow-cases/create/route";
import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import { WORKFLOW_TOPIC_AU } from "@/lib/workflow/processCatalog";

type PrismaMock = { workflowSession: { create: jest.Mock } };
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

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/workflow-cases/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  pm.workflowSession.create.mockReset();
  getSessionMock.mockReset();
});

describe("POST /api/workflow-cases/create — Auth", () => {
  it("401 ohne Session", async () => {
    getSessionMock.mockResolvedValue(null);
    const res = await POST(
      makeRequest({ topicId: WORKFLOW_TOPIC_AU, role: "MFA" }),
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(pm.workflowSession.create).not.toHaveBeenCalled();
  });

  it("403 wenn Account nicht freigeschaltet (is_approved=false)", async () => {
    getSessionMock.mockResolvedValue({ ...AUTHORIZED_ACCOUNT, is_approved: false });
    const res = await POST(
      makeRequest({ topicId: WORKFLOW_TOPIC_AU, role: "MFA" }),
    );
    expect(res.status).toBe(403);
    expect(pm.workflowSession.create).not.toHaveBeenCalled();
  });

  it("403 wenn Arbeitsprozesse nicht freigeschaltet und kein Admin", async () => {
    getSessionMock.mockResolvedValue({
      ...AUTHORIZED_ACCOUNT,
      arbeitsprozesse_enabled: false,
      is_admin: false,
    });
    const res = await POST(
      makeRequest({ topicId: WORKFLOW_TOPIC_AU, role: "MFA" }),
    );
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("nicht freigeschaltet");
    expect(pm.workflowSession.create).not.toHaveBeenCalled();
  });

  it("Admin-Bypass: is_admin=true erlaubt Zugriff ohne arbeitsprozesse_enabled", async () => {
    getSessionMock.mockResolvedValue({
      ...AUTHORIZED_ACCOUNT,
      arbeitsprozesse_enabled: false,
      is_admin: true,
    });
    pm.workflowSession.create.mockResolvedValue({ id: "sess-admin" });
    const res = await POST(
      makeRequest({ topicId: WORKFLOW_TOPIC_AU, role: "MFA" }),
    );
    expect(res.status).toBe(201);
  });
});

describe("POST /api/workflow-cases/create — Validierung", () => {
  beforeEach(() => {
    getSessionMock.mockResolvedValue(AUTHORIZED_ACCOUNT);
  });

  it("400 bei ungültiger topicId", async () => {
    const res = await POST(
      makeRequest({ topicId: "unbekanntes-thema", role: "MFA" }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("topicId");
  });

  it("400 bei fehlender topicId", async () => {
    const res = await POST(makeRequest({ role: "MFA" }));
    expect(res.status).toBe(400);
  });

  it("400 bei ungültiger Rolle", async () => {
    const res = await POST(
      makeRequest({ topicId: WORKFLOW_TOPIC_AU, role: "PFLEGE" }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Rolle");
  });

  it("400 bei fehlender Rolle", async () => {
    const res = await POST(makeRequest({ topicId: WORKFLOW_TOPIC_AU }));
    expect(res.status).toBe(400);
  });

  it("400 bei ungültigem JSON", async () => {
    const req = new NextRequest(
      "http://localhost/api/workflow-cases/create",
      { method: "POST", body: "{not-json", headers: { "Content-Type": "application/json" } },
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/workflow-cases/create — Erstellen", () => {
  beforeEach(() => {
    getSessionMock.mockResolvedValue(AUTHORIZED_ACCOUNT);
    pm.workflowSession.create.mockResolvedValue({ id: "sess-new" });
  });

  it("201 für MFA mit AU-Musterprozess", async () => {
    const res = await POST(
      makeRequest({ topicId: WORKFLOW_TOPIC_AU, role: "MFA" }),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.id).toBe("sess-new");
  });

  it("201 für ARZT mit AU-Musterprozess", async () => {
    const res = await POST(
      makeRequest({ topicId: WORKFLOW_TOPIC_AU, role: "ARZT" }),
    );
    expect(res.status).toBe(201);
  });

  it("Snapshot enthält topicId, role und processPoints", async () => {
    await POST(
      makeRequest({ topicId: WORKFLOW_TOPIC_AU, role: "MFA", title: "Meine Sitzung" }),
    );
    const createArg = pm.workflowSession.create.mock.calls[0][0];
    const snapshot = createArg.data.process_snapshot;
    expect(snapshot.topicId).toBe(WORKFLOW_TOPIC_AU);
    expect(snapshot.role).toBe("MFA");
    expect(Array.isArray(snapshot.processPoints)).toBe(true);
    expect(snapshot.processPoints.length).toBeGreaterThan(0);
  });

  it("alle Prozesspunkte starten mit status UNKLAR", async () => {
    await POST(makeRequest({ topicId: WORKFLOW_TOPIC_AU, role: "MFA" }));
    const snapshot =
      pm.workflowSession.create.mock.calls[0][0].data.process_snapshot;
    for (const p of snapshot.processPoints) {
      expect(p.status).toBe("UNKLAR");
    }
  });

  it("optionaler Titel wird gespeichert", async () => {
    await POST(
      makeRequest({ topicId: WORKFLOW_TOPIC_AU, role: "MFA", title: "Test" }),
    );
    expect(pm.workflowSession.create.mock.calls[0][0].data.title).toBe("Test");
  });

  it("fehlender Titel wird als null gespeichert", async () => {
    await POST(makeRequest({ topicId: WORKFLOW_TOPIC_AU, role: "MFA" }));
    expect(pm.workflowSession.create.mock.calls[0][0].data.title).toBeNull();
  });

  it("owner_account_id wird aus Session gesetzt", async () => {
    await POST(makeRequest({ topicId: WORKFLOW_TOPIC_AU, role: "MFA" }));
    const data = pm.workflowSession.create.mock.calls[0][0].data;
    expect(data.owner_account_id).toBe("acc-1");
  });
});
