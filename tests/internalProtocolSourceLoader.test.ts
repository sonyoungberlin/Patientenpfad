/**
 * Tests für loadSourceSnapshot – serverseitige Ownership-Prüfung.
 *
 * Prüft vier Fälle:
 *  1. Gültige Ursprungssession derselben Praxis → Snapshot
 *  2. Fremde Ursprungssession (Prisma liefert null) → null
 *  3. Nicht vorhandene Session → null
 *  4. Ursprungssession mit falscher Prozess-ID → null
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    workflowSession: {
      findFirst: jest.fn(),
    },
  },
}));

import { loadSourceSnapshot } from "@/lib/workflow/internalProtocol/sourceLoader";
import { prisma } from "@/lib/prisma";
import { buildInitialInternalProtocolWorkflowSnapshot } from "@/lib/workflow/internalProtocol/workflowAdapter";

type PrismaMock = { workflowSession: { findFirst: jest.Mock } };
const pm = prisma as unknown as PrismaMock;

const SAME_PRACTICE_ACCOUNT = {
  id: "acc-1",
  current_practice: { id: "practice-1" } as { id: string },
};

beforeEach(() => pm.workflowSession.findFirst.mockReset());

// ---------------------------------------------------------------------------
// Fall 1: Gültige Ursprungssession derselben Praxis
// ---------------------------------------------------------------------------

describe("Fall 1: Gültige Ursprungssession", () => {
  it("gibt den Snapshot zurück wenn findFirst eine gültige Session liefert", async () => {
    const snapshot = buildInitialInternalProtocolWorkflowSnapshot("CURRENT_STATE");
    pm.workflowSession.findFirst.mockResolvedValue({ process_snapshot: snapshot });

    const result = await loadSourceSnapshot("session-1", SAME_PRACTICE_ACCOUNT);

    expect(result).not.toBeNull();
    expect(result?.processKind).toBe("internal-protocol");
  });

  it("sendet Prisma-Query mit Ownership-Filter der Praxis", async () => {
    const snapshot = buildInitialInternalProtocolWorkflowSnapshot("CURRENT_STATE");
    pm.workflowSession.findFirst.mockResolvedValue({ process_snapshot: snapshot });

    await loadSourceSnapshot("session-1", SAME_PRACTICE_ACCOUNT);

    expect(pm.workflowSession.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "session-1",
          owner_practice_id: "practice-1",
        }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// Fall 2: Fremde Ursprungssession (Prisma liefert null durch Ownership-Filter)
// ---------------------------------------------------------------------------

describe("Fall 2: Fremde Ursprungssession", () => {
  it("gibt null zurück wenn findFirst null liefert (fremde Praxis)", async () => {
    pm.workflowSession.findFirst.mockResolvedValue(null);

    const result = await loadSourceSnapshot("foreign-session", SAME_PRACTICE_ACCOUNT);

    expect(result).toBeNull();
  });

  it("gibt null zurück für konto-basierte Ownership wenn Praxis nicht übereinstimmt", async () => {
    const accountWithoutPractice = { id: "acc-own", current_practice: null };
    pm.workflowSession.findFirst.mockResolvedValue(null);

    const result = await loadSourceSnapshot("other-account-session", accountWithoutPractice);

    expect(result).toBeNull();
    expect(pm.workflowSession.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          owner_account_id: "acc-own",
        }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// Fall 3: Nicht vorhandene Session
// ---------------------------------------------------------------------------

describe("Fall 3: Nicht vorhandene Session", () => {
  it("gibt null zurück wenn findFirst null liefert (Session nicht vorhanden)", async () => {
    pm.workflowSession.findFirst.mockResolvedValue(null);

    const result = await loadSourceSnapshot("nonexistent-id", SAME_PRACTICE_ACCOUNT);

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Fall 4: Snapshot mit falscher Prozess-ID
// ---------------------------------------------------------------------------

describe("Fall 4: Snapshot mit falscher Prozess-ID", () => {
  it("gibt null zurück wenn der Snapshot kein InternalProtocol-Format hat", async () => {
    const wrongSnapshot = { processKind: "some-other-kind", data: "something" };
    pm.workflowSession.findFirst.mockResolvedValue({ process_snapshot: wrongSnapshot });

    const result = await loadSourceSnapshot("wrong-type-session", SAME_PRACTICE_ACCOUNT);

    expect(result).toBeNull();
  });

  it("gibt null zurück wenn der Snapshot null ist", async () => {
    pm.workflowSession.findFirst.mockResolvedValue({ process_snapshot: null });

    const result = await loadSourceSnapshot("null-snapshot-session", SAME_PRACTICE_ACCOUNT);

    expect(result).toBeNull();
  });

  it("gibt null zurück wenn process_snapshot eine topic-id hat die kein InternalProtocol-topicId ist", async () => {
    const wrongSnapshot = {
      processKind: "internal-protocol",
      topicId: "anderer-prozess",  // nicht 'patienten-ohne-termin'
      checkpoints: [],
    };
    pm.workflowSession.findFirst.mockResolvedValue({ process_snapshot: wrongSnapshot });

    const result = await loadSourceSnapshot("wrong-topic-session", SAME_PRACTICE_ACCOUNT);

    expect(result).toBeNull();
  });
});
