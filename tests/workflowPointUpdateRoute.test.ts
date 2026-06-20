/**
 * Tests für PATCH /api/workflow-cases/[id]/point/update
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

import { PATCH } from "@/app/api/workflow-cases/[id]/point/update/route";
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

const VALID_SNAPSHOT = {
  topicId: WORKFLOW_TOPIC_AU,
  role: "MFA",
  processPoints: [
    { id: "AU-P01", title: "Patientenkontakt", status: "UNKLAR" },
    { id: "AU-P02", title: "ICD-10-Code", status: "UNKLAR" },
    { id: "AU-P03", title: "Zeitraum AU", status: "ERKENNBAR" },
  ],
};

function makeRequest(sessionId: string, body: unknown) {
  return new NextRequest(
    `http://localhost/api/workflow-cases/${sessionId}/point/update`,
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
});

describe("PATCH /api/workflow-cases/[id]/point/update — Auth", () => {
  it("401 ohne Session", async () => {
    getSessionMock.mockResolvedValue(null);
    const res = await PATCH(
      makeRequest("sess-1", { pointId: "AU-P01", status: "ERKENNBAR" }),
      ctx("sess-1"),
    );
    expect(res.status).toBe(401);
    expect(pm.workflowSession.findFirst).not.toHaveBeenCalled();
  });

  it("403 wenn Account nicht freigeschaltet", async () => {
    getSessionMock.mockResolvedValue({ ...AUTHORIZED_ACCOUNT, is_approved: false });
    const res = await PATCH(
      makeRequest("sess-1", { pointId: "AU-P01", status: "ERKENNBAR" }),
      ctx("sess-1"),
    );
    expect(res.status).toBe(403);
  });

  it("403 wenn Arbeitsprozesse nicht freigeschaltet", async () => {
    getSessionMock.mockResolvedValue({
      ...AUTHORIZED_ACCOUNT,
      arbeitsprozesse_enabled: false,
      is_admin: false,
    });
    const res = await PATCH(
      makeRequest("sess-1", { pointId: "AU-P01", status: "ERKENNBAR" }),
      ctx("sess-1"),
    );
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/workflow-cases/[id]/point/update — Session-Suche", () => {
  beforeEach(() => {
    getSessionMock.mockResolvedValue(AUTHORIZED_ACCOUNT);
  });

  it("404 wenn Sitzung nicht gefunden", async () => {
    pm.workflowSession.findFirst.mockResolvedValue(null);
    const res = await PATCH(
      makeRequest("sess-missing", { pointId: "AU-P01", status: "ERKENNBAR" }),
      ctx("sess-missing"),
    );
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain("nicht gefunden");
  });

  it("500 bei ungültigem Snapshot in DB", async () => {
    pm.workflowSession.findFirst.mockResolvedValue({
      id: "sess-1",
      process_snapshot: { broken: true }, // kein topicId, keine processPoints
      internal_saved_at: null,
    });
    const res = await PATCH(
      makeRequest("sess-1", { pointId: "AU-P01", status: "ERKENNBAR" }),
      ctx("sess-1"),
    );
    expect(res.status).toBe(500);
  });

  it("sucht Sitzung nach owner_account_id wenn keine Practice vorhanden", async () => {
    pm.workflowSession.findFirst.mockResolvedValue({
      id: "sess-1",
      process_snapshot: VALID_SNAPSHOT,
      internal_saved_at: null,
    });
    pm.workflowSession.update.mockResolvedValue({});

    await PATCH(
      makeRequest("sess-1", { pointId: "AU-P01", status: "ERKENNBAR" }),
      ctx("sess-1"),
    );

    expect(pm.workflowSession.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ owner_account_id: "acc-1" }),
      }),
    );
  });
});

describe("PATCH /api/workflow-cases/[id]/point/update — Validierung", () => {
  beforeEach(() => {
    getSessionMock.mockResolvedValue(AUTHORIZED_ACCOUNT);
    pm.workflowSession.findFirst.mockResolvedValue({
      id: "sess-1",
      process_snapshot: VALID_SNAPSHOT,
      internal_saved_at: null,
    });
  });

  it("400 bei ungültigem Status", async () => {
    const res = await PATCH(
      makeRequest("sess-1", { pointId: "AU-P01", status: "INVALID" }),
      ctx("sess-1"),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Status");
  });

  it("404 wenn pointId nicht im Snapshot existiert", async () => {
    const res = await PATCH(
      makeRequest("sess-1", { pointId: "AU-P99", status: "ERKENNBAR" }),
      ctx("sess-1"),
    );
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/workflow-cases/[id]/point/update — Aktualisierung", () => {
  beforeEach(() => {
    getSessionMock.mockResolvedValue(AUTHORIZED_ACCOUNT);
    pm.workflowSession.findFirst.mockResolvedValue({
      id: "sess-1",
      process_snapshot: VALID_SNAPSHOT,
      internal_saved_at: null,
    });
    pm.workflowSession.update.mockResolvedValue({});
  });

  it("200 bei gültigem Prozesspunkt-Update", async () => {
    const res = await PATCH(
      makeRequest("sess-1", { pointId: "AU-P01", status: "ERKENNBAR" }),
      ctx("sess-1"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("aktualisiert Status des angegebenen Prozesspunkts", async () => {
    await PATCH(
      makeRequest("sess-1", { pointId: "AU-P01", status: "NICHT_ERFASST" }),
      ctx("sess-1"),
    );
    const updateArg = pm.workflowSession.update.mock.calls[0][0];
    const updatedPoints = updateArg.data.process_snapshot.processPoints;
    const p01 = updatedPoints.find(
      (p: { id: string }) => p.id === "AU-P01",
    );
    expect(p01?.status).toBe("NICHT_ERFASST");
  });

  it("lässt andere Prozesspunkte unverändert", async () => {
    await PATCH(
      makeRequest("sess-1", { pointId: "AU-P01", status: "ERKENNBAR" }),
      ctx("sess-1"),
    );
    const updatedPoints =
      pm.workflowSession.update.mock.calls[0][0].data.process_snapshot
        .processPoints;
    const p02 = updatedPoints.find(
      (p: { id: string }) => p.id === "AU-P02",
    );
    expect(p02?.status).toBe("UNKLAR");
  });

  it("speichert optionale Punkt-Notiz", async () => {
    await PATCH(
      makeRequest("sess-1", {
        pointId: "AU-P01",
        status: "ERKENNBAR",
        note: "Hinweis",
      }),
      ctx("sess-1"),
    );
    const updatedPoints =
      pm.workflowSession.update.mock.calls[0][0].data.process_snapshot
        .processPoints;
    const p01 = updatedPoints.find(
      (p: { id: string }) => p.id === "AU-P01",
    );
    expect(p01?.note).toBe("Hinweis");
  });

  it("200 bei Session-Notiz-Update (ohne pointId)", async () => {
    const res = await PATCH(
      makeRequest("sess-1", { sessionNote: "Gesamtnotiz" }),
      ctx("sess-1"),
    );
    expect(res.status).toBe(200);
    const updateArg = pm.workflowSession.update.mock.calls[0][0];
    expect(updateArg.data.process_snapshot.sessionNote).toBe("Gesamtnotiz");
  });

  it("leere Session-Notiz wird als undefined gespeichert", async () => {
    await PATCH(
      makeRequest("sess-1", { sessionNote: "   " }),
      ctx("sess-1"),
    );
    const updateArg = pm.workflowSession.update.mock.calls[0][0];
    expect(updateArg.data.process_snapshot.sessionNote).toBeUndefined();
  });

  it("setzt internal_saved_at beim ersten Speichern", async () => {
    await PATCH(
      makeRequest("sess-1", { pointId: "AU-P01", status: "ERKENNBAR" }),
      ctx("sess-1"),
    );
    const updateArg = pm.workflowSession.update.mock.calls[0][0];
    expect(updateArg.data.internal_saved_at).toBeInstanceOf(Date);
  });

  it("behält vorhandenes internal_saved_at bei", async () => {
    const existing = new Date("2026-01-15");
    pm.workflowSession.findFirst.mockResolvedValue({
      id: "sess-1",
      process_snapshot: VALID_SNAPSHOT,
      internal_saved_at: existing,
    });
    await PATCH(
      makeRequest("sess-1", { pointId: "AU-P01", status: "ERKENNBAR" }),
      ctx("sess-1"),
    );
    const updateArg = pm.workflowSession.update.mock.calls[0][0];
    expect(updateArg.data.internal_saved_at).toEqual(existing);
  });
});
