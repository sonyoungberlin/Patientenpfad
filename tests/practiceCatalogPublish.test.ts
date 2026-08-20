/**
 * Unit-Tests für lib/practiceCatalog/publish.ts
 * Testet die publishToCatalog()-Funktion direkt ohne HTTP-Layer.
 */

import type { PracticeWorkflowSnapshot } from "@/lib/practiceProcesses/workflowSnapshot";

// ─── Prisma-Mock ─────────────────────────────────────────────────────────────

const mockWorkflowSession = {
  findFirst: jest.fn(),
};
const mockPracticeCatalogEntry = {
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  aggregate: jest.fn(),
  updateMany: jest.fn(),
  create: jest.fn(),
};
// $transaction führt den Callback mit dem Mock-Client aus
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

import { publishToCatalog } from "@/lib/practiceCatalog/publish";

// ─── Test-Fixtures ───────────────────────────────────────────────────────────

const PRACTICE_ID = "practice-abc";
const SESSION_ID = "session-123";
const ACCOUNT_ID = "account-xyz";

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
    {
      checkpointId: "cp-2",
      checkpointTitle: "Rezept vorhanden",
      selectedAnchorIds: [],
      decision: "OPTIONAL",
    },
  ],
};

const INCOMPLETE_SNAPSHOT: PracticeWorkflowSnapshot = {
  ...COMPLETED_SNAPSHOT,
  completedAt: undefined,
};

const UNDECIDED_SNAPSHOT: PracticeWorkflowSnapshot = {
  ...COMPLETED_SNAPSHOT,
  checkpoints: [
    {
      checkpointId: "cp-1",
      checkpointTitle: "Patient bekannt",
      selectedAnchorIds: [],
      // kein decision
    },
  ],
};

function makeInput(overrides?: Partial<Parameters<typeof publishToCatalog>[0]>) {
  return {
    sessionId: SESSION_ID,
    title: "Mein Praxisfall",
    practiceId: PRACTICE_ID,
    accountId: ACCOUNT_ID,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  // Standard: Session existiert, ist der Praxis zugeordnet
  mockWorkflowSession.findFirst.mockResolvedValue({
    id: SESSION_ID,
    process_snapshot: COMPLETED_SNAPSHOT,
    source_catalog_entry_id: null,
    owner_practice_id: PRACTICE_ID,
  });
  // Standard: Noch nicht publiziert
  mockPracticeCatalogEntry.findUnique.mockResolvedValue(null);
  // Standard: aggregate liefert version=null (erste Version)
  mockPracticeCatalogEntry.aggregate.mockResolvedValue({ _max: { version: null } });
  // Standard: create gibt neuen Eintrag zurück
  mockPracticeCatalogEntry.create.mockResolvedValue({ id: "catalog-entry-1" });
  mockPracticeCatalogEntry.updateMany.mockResolvedValue({ count: 0 });
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("publishToCatalog — Erstpublikation", () => {
  it("erstellt neuen Katalogeintrag mit version=1 und gibt ok:true zurück", async () => {
    const result = await publishToCatalog(makeInput());

    expect(result.ok).toBe(true);
    expect(result.id).toBe("catalog-entry-1");
    expect(result.alreadyPublished).toBeFalsy();

    const createCall = mockPracticeCatalogEntry.create.mock.calls[0][0] as {
      data: { version: number; is_current_version: boolean };
    };
    expect(createCall.data.version).toBe(1);
    expect(createCall.data.is_current_version).toBe(true);
  });

  it("updateMany wird bei version=1 NICHT aufgerufen", async () => {
    await publishToCatalog(makeInput());
    expect(mockPracticeCatalogEntry.updateMany).not.toHaveBeenCalled();
  });
});

describe("publishToCatalog — Idempotenz", () => {
  it("gibt alreadyPublished:true zurück, wenn Session bereits publiziert wurde", async () => {
    mockPracticeCatalogEntry.findUnique.mockResolvedValue({ id: "existing-entry" });

    const result = await publishToCatalog(makeInput());

    expect(result.ok).toBe(true);
    expect(result.id).toBe("existing-entry");
    expect(result.alreadyPublished).toBe(true);
    // create darf NICHT aufgerufen werden
    expect(mockPracticeCatalogEntry.create).not.toHaveBeenCalled();
  });
});

describe("publishToCatalog — Revision (neue Version)", () => {
  it("erstellt version=2, setzt alte is_current_version auf false", async () => {
    const PARENT_CATALOG_CASE_ID = "catalog-case-parent";

    mockWorkflowSession.findFirst.mockResolvedValue({
      id: SESSION_ID,
      process_snapshot: COMPLETED_SNAPSHOT,
      source_catalog_entry_id: "parent-entry-id",
      owner_practice_id: PRACTICE_ID,
    });
    mockPracticeCatalogEntry.findFirst.mockResolvedValue({
      catalog_case_id: PARENT_CATALOG_CASE_ID,
    });
    mockPracticeCatalogEntry.aggregate.mockResolvedValue({ _max: { version: 1 } });
    mockPracticeCatalogEntry.create.mockResolvedValue({ id: "catalog-entry-2" });

    const result = await publishToCatalog(makeInput());

    expect(result.ok).toBe(true);
    expect(result.id).toBe("catalog-entry-2");

    // updateMany muss is_current_version:false setzen
    expect(mockPracticeCatalogEntry.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          catalog_case_id: PARENT_CATALOG_CASE_ID,
          is_current_version: true,
        }),
        data: { is_current_version: false },
      }),
    );

    const createCall = mockPracticeCatalogEntry.create.mock.calls[0][0] as {
      data: { version: number; catalog_case_id: string };
    };
    expect(createCall.data.version).toBe(2);
    expect(createCall.data.catalog_case_id).toBe(PARENT_CATALOG_CASE_ID);
  });
});

describe("publishToCatalog — Snapshot eingefroren", () => {
  it("speichert den exakten completedAt-Snapshot (unverändert eingefroren)", async () => {
    await publishToCatalog(makeInput());
    const createCall = mockPracticeCatalogEntry.create.mock.calls[0][0] as {
      data: { snapshot: typeof COMPLETED_SNAPSHOT };
    };
    expect(createCall.data.snapshot).toEqual(COMPLETED_SNAPSHOT);
    expect(createCall.data.snapshot.completedAt).toBe(COMPLETED_SNAPSHOT.completedAt);
  });

  it("löscht keine alte Version — updateMany setzt nur is_current_version=false", async () => {
    const PARENT_ID = "catalog-case-for-delete-check";
    mockWorkflowSession.findFirst.mockResolvedValue({
      id: SESSION_ID,
      process_snapshot: COMPLETED_SNAPSHOT,
      source_catalog_entry_id: "parent-entry",
      owner_practice_id: PRACTICE_ID,
    });
    mockPracticeCatalogEntry.findFirst.mockResolvedValue({ catalog_case_id: PARENT_ID });
    mockPracticeCatalogEntry.aggregate.mockResolvedValue({ _max: { version: 1 } });
    mockPracticeCatalogEntry.create.mockResolvedValue({ id: "entry-v2" });

    await publishToCatalog(makeInput());

    // updateMany darf aufgerufen werden, aber kein delete
    expect(mockPracticeCatalogEntry.updateMany).toHaveBeenCalled();
    const anyDelete = Object.keys(mockPracticeCatalogEntry).includes("delete");
    expect(anyDelete).toBe(false);
  });
});

describe("publishToCatalog — Validierungsfehler", () => {
  it("gibt 404 zurück wenn Session nicht gefunden oder falsche Praxis", async () => {
    mockWorkflowSession.findFirst.mockResolvedValue(null);

    await expect(publishToCatalog(makeInput())).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("gibt 400 zurück wenn Snapshot kein PracticeWorkflowSnapshot ist", async () => {
    mockWorkflowSession.findFirst.mockResolvedValue({
      id: SESSION_ID,
      process_snapshot: { processKind: "internal-protocol" },
      source_catalog_entry_id: null,
    });

    await expect(publishToCatalog(makeInput())).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("gibt 400 zurück wenn completedAt fehlt", async () => {
    mockWorkflowSession.findFirst.mockResolvedValue({
      id: SESSION_ID,
      process_snapshot: INCOMPLETE_SNAPSHOT,
      source_catalog_entry_id: null,
    });

    await expect(publishToCatalog(makeInput())).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("gibt 400 zurück wenn nicht alle Checkpoints entschieden sind", async () => {
    mockWorkflowSession.findFirst.mockResolvedValue({
      id: SESSION_ID,
      process_snapshot: UNDECIDED_SNAPSHOT,
      source_catalog_entry_id: null,
    });

    await expect(publishToCatalog(makeInput())).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});
