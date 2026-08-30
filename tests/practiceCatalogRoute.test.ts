/**
 * Integrations-Tests für die Practice-Catalog API-Routen.
 *
 * Abgedeckt:
 *   POST /api/practice-catalog/publish
 *   POST /api/practice-catalog/[id]/start-revision
 *   GET  /api/practice-catalog
 *   GET  /api/practice-catalog/[id]
 *   PATCH /api/practice-catalog/[id]/deactivate
 *   PATCH /api/practice-catalog/[id]/reactivate
 */

import { NextRequest } from "next/server";
import type { PracticeWorkflowSnapshot } from "@/lib/practiceProcesses/workflowSnapshot";

// ─── Prisma-Mock ─────────────────────────────────────────────────────────────

const mockWorkflowSession = {
  findFirst: jest.fn(),
  findUnique: jest.fn(),
  create: jest.fn(),
};
const mockPracticeCatalogEntry = {
  findFirst: jest.fn(),
  findUnique: jest.fn(),
  findMany: jest.fn(),
  aggregate: jest.fn(),
  updateMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};
const mockTransaction = jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
  fn({
    practiceCatalogEntry: mockPracticeCatalogEntry,
    workflowSession: mockWorkflowSession,
  }),
);

jest.mock("@/lib/prisma", () => ({
  prisma: {
    workflowSession: mockWorkflowSession,
    practiceCatalogEntry: mockPracticeCatalogEntry,
    $transaction: mockTransaction,
  },
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
}));

import { POST as publishRoute } from "@/app/api/practice-catalog/publish/route";
import { POST as startRevisionRoute } from "@/app/api/practice-catalog/[id]/start-revision/route";
import { GET as listRoute } from "@/app/api/practice-catalog/route";
import { GET as detailRoute } from "@/app/api/practice-catalog/[id]/route";
import { PATCH as deactivateRoute } from "@/app/api/practice-catalog/[id]/deactivate/route";
import { PATCH as reactivateRoute } from "@/app/api/practice-catalog/[id]/reactivate/route";
import { getSessionAccount } from "@/lib/auth";

// ─── Test-Fixtures ───────────────────────────────────────────────────────────

const PRACTICE_ID = "practice-abc";
const SESSION_ID = "sess-111";
const CATALOG_ENTRY_ID = "cat-entry-1";

const ACCOUNT_WITH_PRACTICE = {
  id: "acc-1",
  email: "test@example.com",
  is_approved: true,
  is_admin: false,
  arbeitsprozesse_enabled: true,
  current_practice: { id: PRACTICE_ID, name: "Testpraxis" },
};

const ACCOUNT_WITHOUT_PRACTICE = {
  ...ACCOUNT_WITH_PRACTICE,
  current_practice: null,
};

const COMPLETED_SNAPSHOT: PracticeWorkflowSnapshot = {
  processKind: "practice-workflow",
  caseProfileId: "rezeptanfrage",
  caseProfileTitle: "Rezeptanfrage",
  completedAt: "2026-08-20T10:00:00.000Z",
  checkpoints: [
    {
      checkpointId: "cp-1",
      checkpointTitle: "Patient bekannt",
      selectedAnchorIds: [],
      decision: "PFLICHT",
    },
  ],
};

const getSessionMock = getSessionAccount as jest.Mock;

function makeRequest(url: string, method: string, body?: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  jest.clearAllMocks();
  getSessionMock.mockResolvedValue(ACCOUNT_WITH_PRACTICE);
  mockWorkflowSession.findFirst.mockResolvedValue({
    id: SESSION_ID,
    process_snapshot: COMPLETED_SNAPSHOT,
    source_catalog_entry_id: null,
    owner_practice_id: PRACTICE_ID,
  });
  mockPracticeCatalogEntry.findUnique.mockResolvedValue(null);
  mockPracticeCatalogEntry.aggregate.mockResolvedValue({ _max: { version: null } });
  mockPracticeCatalogEntry.create.mockResolvedValue({ id: CATALOG_ENTRY_ID });
  mockPracticeCatalogEntry.updateMany.mockResolvedValue({ count: 0 });
});

// ─── POST /api/practice-catalog/publish ──────────────────────────────────────

describe("POST /api/practice-catalog/publish", () => {
  it("gibt 401 zurück wenn kein Account", async () => {
    getSessionMock.mockResolvedValue(null);
    const res = await publishRoute(
      makeRequest("/api/practice-catalog/publish", "POST", {
        sessionId: SESSION_ID,
        title: "Test",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("gibt 403 zurück ohne Praxiskontext", async () => {
    getSessionMock.mockResolvedValue(ACCOUNT_WITHOUT_PRACTICE);
    const res = await publishRoute(
      makeRequest("/api/practice-catalog/publish", "POST", {
        sessionId: SESSION_ID,
        title: "Test",
      }),
    );
    expect(res.status).toBe(403);
  });

  it("gibt 400 zurück wenn sessionId fehlt", async () => {
    const res = await publishRoute(
      makeRequest("/api/practice-catalog/publish", "POST", { title: "Test" }),
    );
    expect(res.status).toBe(400);
  });

  it("gibt 400 zurück wenn Titel fehlt", async () => {
    const res = await publishRoute(
      makeRequest("/api/practice-catalog/publish", "POST", {
        sessionId: SESSION_ID,
        title: "",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("gibt 201 + id zurück bei Erstpublikation", async () => {
    const res = await publishRoute(
      makeRequest("/api/practice-catalog/publish", "POST", {
        sessionId: SESSION_ID,
        title: "Rezeptanfrage",
      }),
    );
    expect(res.status).toBe(201);
    const data = await res.json() as { ok: boolean; id: string };
    expect(data.ok).toBe(true);
    expect(data.id).toBe(CATALOG_ENTRY_ID);
  });

  it("gibt 200 + alreadyPublished:true zurück wenn bereits publiziert", async () => {
    mockPracticeCatalogEntry.findUnique.mockResolvedValue({ id: "existing-1" });
    const res = await publishRoute(
      makeRequest("/api/practice-catalog/publish", "POST", {
        sessionId: SESSION_ID,
        title: "Rezeptanfrage",
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json() as { ok: boolean; alreadyPublished: boolean };
    expect(data.alreadyPublished).toBe(true);
  });

  it("gibt 404 zurück wenn Session nicht existiert oder falsche Praxis", async () => {
    mockWorkflowSession.findFirst.mockResolvedValue(null);
    const res = await publishRoute(
      makeRequest("/api/practice-catalog/publish", "POST", {
        sessionId: SESSION_ID,
        title: "Test",
      }),
    );
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/practice-catalog/[id]/start-revision ──────────────────────────

describe("POST /api/practice-catalog/[id]/start-revision", () => {
  beforeEach(() => {
    mockPracticeCatalogEntry.findFirst.mockResolvedValue({
      id: CATALOG_ENTRY_ID,
      practice_id: PRACTICE_ID,
      title: "Rezeptanfrage",
      snapshot: COMPLETED_SNAPSHOT,
    });
    mockWorkflowSession.findUnique.mockResolvedValue(null);
    mockWorkflowSession.create.mockResolvedValue({ id: "new-draft-session" });
  });

  it("erstellt neue Draft-Session und gibt ok:true + sessionId zurück", async () => {
    const res = await startRevisionRoute(
      makeRequest(`/api/practice-catalog/${CATALOG_ENTRY_ID}/start-revision`, "POST"),
      makeParams(CATALOG_ENTRY_ID),
    );
    expect(res.status).toBe(201);
    const data = await res.json() as { ok: boolean; sessionId: string };
    expect(data.ok).toBe(true);
    expect(data.sessionId).toBe("new-draft-session");
  });

  it("neue Session hat source_catalog_entry_id gesetzt", async () => {
    await startRevisionRoute(
      makeRequest(`/api/practice-catalog/${CATALOG_ENTRY_ID}/start-revision`, "POST"),
      makeParams(CATALOG_ENTRY_ID),
    );
    const createCall = mockWorkflowSession.create.mock.calls[0][0] as {
      data: { source_catalog_entry_id: string };
    };
    expect(createCall.data.source_catalog_entry_id).toBe(CATALOG_ENTRY_ID);
  });

  it("neue Session-Snapshot hat kein completedAt", async () => {
    await startRevisionRoute(
      makeRequest(`/api/practice-catalog/${CATALOG_ENTRY_ID}/start-revision`, "POST"),
      makeParams(CATALOG_ENTRY_ID),
    );
    const createCall = mockWorkflowSession.create.mock.calls[0][0] as {
      data: { process_snapshot: PracticeWorkflowSnapshot };
    };
    expect(createCall.data.process_snapshot.completedAt).toBeUndefined();
  });

  it("gibt 200 + alreadyStarted:true zurück wenn Revision bereits existiert", async () => {
    mockWorkflowSession.findUnique.mockResolvedValue({ id: "existing-draft" });

    const res = await startRevisionRoute(
      makeRequest(`/api/practice-catalog/${CATALOG_ENTRY_ID}/start-revision`, "POST"),
      makeParams(CATALOG_ENTRY_ID),
    );
    expect(res.status).toBe(200);
    const data = await res.json() as { ok: boolean; sessionId: string; alreadyStarted: boolean };
    expect(data.alreadyStarted).toBe(true);
    expect(data.sessionId).toBe("existing-draft");
    expect(mockWorkflowSession.create).not.toHaveBeenCalled();
  });

  it("gibt 404 zurück wenn Katalogeintrag nicht gefunden", async () => {
    mockPracticeCatalogEntry.findFirst.mockResolvedValue(null);

    const res = await startRevisionRoute(
      makeRequest(`/api/practice-catalog/${CATALOG_ENTRY_ID}/start-revision`, "POST"),
      makeParams(CATALOG_ENTRY_ID),
    );
    expect(res.status).toBe(404);
  });

  it("gibt 403 zurück ohne Praxiskontext", async () => {
    getSessionMock.mockResolvedValue(ACCOUNT_WITHOUT_PRACTICE);
    const res = await startRevisionRoute(
      makeRequest(`/api/practice-catalog/${CATALOG_ENTRY_ID}/start-revision`, "POST"),
      makeParams(CATALOG_ENTRY_ID),
    );
    expect(res.status).toBe(403);
  });
});

// ─── GET /api/practice-catalog ────────────────────────────────────────────────

describe("GET /api/practice-catalog", () => {
  it("gibt leere Liste zurück ohne Praxiskontext", async () => {
    getSessionMock.mockResolvedValue(ACCOUNT_WITHOUT_PRACTICE);
    const res = await listRoute(makeRequest("/api/practice-catalog", "GET"));
    expect(res.status).toBe(200);
    const data = await res.json() as { ok: boolean; entries: unknown[] };
    expect(data.entries).toHaveLength(0);
  });

  it("gibt Katalogeinträge der Praxis zurück", async () => {
    mockPracticeCatalogEntry.findMany.mockResolvedValue([
      { id: "e1", title: "Rezeptanfrage", practice_id: PRACTICE_ID },
    ]);
    const res = await listRoute(makeRequest("/api/practice-catalog", "GET"));
    expect(res.status).toBe(200);
    const data = await res.json() as { ok: boolean; entries: unknown[] };
    expect(data.entries).toHaveLength(1);
  });

  it("filtert nur auf eigene Praxis-ID", async () => {
    mockPracticeCatalogEntry.findMany.mockResolvedValue([]);
    await listRoute(makeRequest("/api/practice-catalog", "GET"));
    const findManyCall = mockPracticeCatalogEntry.findMany.mock.calls[0][0] as {
      where: { practice_id: string; is_catalog_active: boolean };
    };
    expect(findManyCall.where.practice_id).toBe(PRACTICE_ID);
  });

  it("deaktivierter Entry fehlt — Liste filtert nur is_catalog_active:true", async () => {
    mockPracticeCatalogEntry.findMany.mockResolvedValue([]);
    await listRoute(makeRequest("/api/practice-catalog", "GET"));
    const call = mockPracticeCatalogEntry.findMany.mock.calls[0][0] as {
      where: { is_catalog_active: boolean };
    };
    expect(call.where.is_catalog_active).toBe(true);
  });

  it("LibraryCaseProfile und klinische Sessions erscheinen nicht — Liste fragt nur practiceCatalogEntry", async () => {
    mockPracticeCatalogEntry.findMany.mockResolvedValue([]);
    await listRoute(makeRequest("/api/practice-catalog", "GET"));
    // Nur practiceCatalogEntry.findMany darf aufgerufen worden sein
    expect(mockPracticeCatalogEntry.findMany).toHaveBeenCalledTimes(1);
    expect(mockWorkflowSession.findFirst).not.toHaveBeenCalled();
    expect((mockWorkflowSession as { findMany?: unknown }).findMany).toBeUndefined();
  });
});

// ─── GET /api/practice-catalog/[id] ──────────────────────────────────────────

describe("GET /api/practice-catalog/[id]", () => {
  it("gibt Katalogeintrag zurück", async () => {
    mockPracticeCatalogEntry.findFirst.mockResolvedValue({
      id: CATALOG_ENTRY_ID,
      title: "Rezeptanfrage",
      snapshot: COMPLETED_SNAPSHOT,
      practice_id: PRACTICE_ID,
    });
    const res = await detailRoute(
      makeRequest(`/api/practice-catalog/${CATALOG_ENTRY_ID}`, "GET"),
      makeParams(CATALOG_ENTRY_ID),
    );
    expect(res.status).toBe(200);
    const data = await res.json() as { ok: boolean; entry: { id: string } };
    expect(data.entry.id).toBe(CATALOG_ENTRY_ID);
  });

  it("gibt 404 zurück wenn nicht gefunden", async () => {
    mockPracticeCatalogEntry.findFirst.mockResolvedValue(null);
    const res = await detailRoute(
      makeRequest(`/api/practice-catalog/${CATALOG_ENTRY_ID}`, "GET"),
      makeParams(CATALOG_ENTRY_ID),
    );
    expect(res.status).toBe(404);
  });

  it("gibt 403 zurück ohne Praxiskontext", async () => {
    getSessionMock.mockResolvedValue(ACCOUNT_WITHOUT_PRACTICE);
    const res = await detailRoute(
      makeRequest(`/api/practice-catalog/${CATALOG_ENTRY_ID}`, "GET"),
      makeParams(CATALOG_ENTRY_ID),
    );
    expect(res.status).toBe(403);
  });
});

// ─── PATCH /api/practice-catalog/[id]/deactivate ─────────────────────────────

describe("PATCH /api/practice-catalog/[id]/deactivate", () => {
  beforeEach(() => {
    mockPracticeCatalogEntry.findFirst.mockResolvedValue({ id: CATALOG_ENTRY_ID });
    mockPracticeCatalogEntry.update.mockResolvedValue({});
  });

  it("setzt is_catalog_active auf false", async () => {
    const res = await deactivateRoute(
      makeRequest(`/api/practice-catalog/${CATALOG_ENTRY_ID}/deactivate`, "PATCH"),
      makeParams(CATALOG_ENTRY_ID),
    );
    expect(res.status).toBe(200);
    const data = await res.json() as { ok: boolean };
    expect(data.ok).toBe(true);

    const updateCall = mockPracticeCatalogEntry.update.mock.calls[0][0] as {
      data: { is_catalog_active: boolean };
    };
    expect(updateCall.data.is_catalog_active).toBe(false);
  });

  it("gibt 404 zurück wenn Eintrag nicht gefunden", async () => {
    mockPracticeCatalogEntry.findFirst.mockResolvedValue(null);
    const res = await deactivateRoute(
      makeRequest(`/api/practice-catalog/${CATALOG_ENTRY_ID}/deactivate`, "PATCH"),
      makeParams(CATALOG_ENTRY_ID),
    );
    expect(res.status).toBe(404);
  });
});

// ─── PATCH /api/practice-catalog/[id]/reactivate ─────────────────────────────

describe("PATCH /api/practice-catalog/[id]/reactivate", () => {
  beforeEach(() => {
    mockPracticeCatalogEntry.findFirst.mockResolvedValue({ id: CATALOG_ENTRY_ID });
    mockPracticeCatalogEntry.update.mockResolvedValue({});
  });

  it("setzt is_catalog_active auf true", async () => {
    const res = await reactivateRoute(
      makeRequest(`/api/practice-catalog/${CATALOG_ENTRY_ID}/reactivate`, "PATCH"),
      makeParams(CATALOG_ENTRY_ID),
    );
    expect(res.status).toBe(200);
    const updateCall = mockPracticeCatalogEntry.update.mock.calls[0][0] as {
      data: { is_catalog_active: boolean };
    };
    expect(updateCall.data.is_catalog_active).toBe(true);
  });

  it("gibt 404 zurück wenn Eintrag nicht gefunden", async () => {
    mockPracticeCatalogEntry.findFirst.mockResolvedValue(null);
    const res = await reactivateRoute(
      makeRequest(`/api/practice-catalog/${CATALOG_ENTRY_ID}/reactivate`, "PATCH"),
      makeParams(CATALOG_ENTRY_ID),
    );
    expect(res.status).toBe(404);
  });
});
