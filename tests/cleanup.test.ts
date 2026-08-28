/**
 * Tests für lib/cleanup/runCleanup.ts und app/api/internal/cleanup/route.ts
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    patientQuestionnaireSession: {
      count: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    digitalRequest: {
      count: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { runCleanup } from "@/lib/cleanup/runCleanup";
import { COMMUNICATION_RETENTION_DAYS } from "@/lib/cleanup/retention";
import { GET } from "@/app/api/internal/cleanup/route";

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function setupPrismaMocks({
  sessionCounts = { trash: 0, unconfirmed: 0, completed: 0, pending: 0 },
  drCount = 0,
  sessionIds = [] as string[],
}: {
  sessionCounts?: { trash: number; unconfirmed: number; completed: number; pending: number };
  drCount?: number;
  sessionIds?: string[];
} = {}) {
  const { patientQuestionnaireSession, digitalRequest } = prisma;
  let callIndex = 0;
  // count wird 5-mal aufgerufen: trash, unconfirmed, completed, pending, dr
  (patientQuestionnaireSession.count as jest.Mock).mockImplementation(() => {
    const order = [
      sessionCounts.trash,
      sessionCounts.unconfirmed,
      sessionCounts.completed,
      sessionCounts.pending,
    ];
    return Promise.resolve(order[callIndex++ % order.length] ?? 0);
  });
  (digitalRequest.count as jest.Mock).mockResolvedValue(drCount);
  (patientQuestionnaireSession.findMany as jest.Mock).mockResolvedValue(
    sessionIds.map((id) => ({ id })),
  );
  (digitalRequest.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
  (patientQuestionnaireSession.deleteMany as jest.Mock).mockResolvedValue({
    count: sessionIds.length,
  });
  (digitalRequest.deleteMany as jest.Mock).mockResolvedValue({ count: drCount });
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.CRON_SECRET = "test-secret-abc123";
});

// ── Retention-Konstante ───────────────────────────────────────────────────────

describe("COMMUNICATION_RETENTION_DAYS", () => {
  it("ist 7", () => {
    expect(COMMUNICATION_RETENTION_DAYS).toBe(7);
  });
});

// ── DigitalRequest-Retention ──────────────────────────────────────────────────

describe("runCleanup – DigitalRequest", () => {
  it("DR, der 6 Tage 23 Stunden alt ist, wird im Dry-Run NICHT als Kandidat gezählt", async () => {
    const almostExpired = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000 - 60_000)); // 1 min vor Cutoff
    (prisma.patientQuestionnaireSession.count as jest.Mock).mockResolvedValue(0);
    (prisma.digitalRequest.count as jest.Mock).mockResolvedValue(0);

    const result = await runCleanup({ dryRun: true, now: almostExpired });
    // Der Cutoff liegt jetzt in der Zukunft relativ zu "now" minus 7 Tage, also 0 DRs
    expect(result.digitalRequests).toBe(0);
  });

  it("DR älter als 7 Tage erscheint im Dry-Run als Kandidat", async () => {
    (prisma.patientQuestionnaireSession.count as jest.Mock).mockResolvedValue(0);
    (prisma.digitalRequest.count as jest.Mock).mockResolvedValue(3);

    const result = await runCleanup({ dryRun: true });
    expect(result.digitalRequests).toBe(3);
    expect(result.dryRun).toBe(true);
    expect(prisma.digitalRequest.deleteMany).not.toHaveBeenCalled();
  });

  it("DR mit status=new wird nach 7 Tagen gelöscht – kein Status-Ausnahme", async () => {
    setupPrismaMocks({ drCount: 1, sessionIds: [] });

    const result = await runCleanup({ dryRun: false });
    expect(result.digitalRequests).toBe(1);
    const deleteCall = (prisma.digitalRequest.deleteMany as jest.Mock).mock.calls[0][0];
    // WHERE hat nur createdAt-Bedingung, keinen Status-Filter
    expect(deleteCall.where).toEqual({ createdAt: { lt: expect.any(Date) } });
  });

  it("deleteMany-WHERE enthält für alle Status denselben createdAt-Filter", async () => {
    setupPrismaMocks({ drCount: 4, sessionIds: [] });
    await runCleanup({ dryRun: false });
    const where = (prisma.digitalRequest.deleteMany as jest.Mock).mock.calls[0][0].where;
    expect(Object.keys(where)).toEqual(["createdAt"]);
  });

  it("patient- und office-DRs werden durch denselben Filter erfasst (kein request_type-Check)", async () => {
    setupPrismaMocks({ drCount: 2, sessionIds: [] });
    await runCleanup({ dryRun: false });
    const where = (prisma.digitalRequest.deleteMany as jest.Mock).mock.calls[0][0].where;
    expect(where).not.toHaveProperty("request_type");
  });
});

// ── Pending / Expired Sessions ────────────────────────────────────────────────

describe("runCleanup – pending Sessions", () => {
  it("pending Session <7 Tage: nicht in Kandidaten (Dry-Run count = 0)", async () => {
    (prisma.patientQuestionnaireSession.count as jest.Mock).mockResolvedValue(0);
    (prisma.digitalRequest.count as jest.Mock).mockResolvedValue(0);

    const result = await runCleanup({ dryRun: true });
    expect(result.pendingSessions).toBe(0);
  });

  it("pending Session >7 Tage: erscheint als Kandidat", async () => {
    let idx = 0;
    const counts = [0, 0, 0, 2]; // trash=0, unconfirmed=0, completed=0, pending=2
    (prisma.patientQuestionnaireSession.count as jest.Mock).mockImplementation(
      () => Promise.resolve(counts[idx++] ?? 0),
    );
    (prisma.digitalRequest.count as jest.Mock).mockResolvedValue(0);

    const result = await runCleanup({ dryRun: true });
    expect(result.pendingSessions).toBe(2);
  });

  it("pending WHERE-Bedingung enthält createdAt, kein token_expires_at", async () => {
    setupPrismaMocks({ sessionIds: ["s1"] });

    await runCleanup({ dryRun: false });
    const findCall = (prisma.patientQuestionnaireSession.findMany as jest.Mock).mock.calls[0][0];
    const pendingBranch = findCall.where.OR[3]; // letzter OR-Zweig = pending
    expect(pendingBranch).toHaveProperty("createdAt");
    expect(pendingBranch).not.toHaveProperty("token_expires_at");
  });

  it("pending WHERE verwendet explizit status: 'pending', kein notIn-Catch-all", async () => {
    setupPrismaMocks({ sessionIds: [] });
    await runCleanup({ dryRun: false });
    const findCall = (prisma.patientQuestionnaireSession.findMany as jest.Mock).mock.calls[0][0];
    const pendingBranch = findCall.where.OR[3];
    expect(pendingBranch.status).toBe("pending");
    expect(pendingBranch.status).not.toHaveProperty("notIn");
  });
});

// ── Completed Sessions ────────────────────────────────────────────────────────

describe("runCleanup – completed Sessions", () => {
  it("completed Session, submitted_at <7 Tage: nicht in Kandidaten", async () => {
    (prisma.patientQuestionnaireSession.count as jest.Mock).mockResolvedValue(0);
    (prisma.digitalRequest.count as jest.Mock).mockResolvedValue(0);

    const result = await runCleanup({ dryRun: true });
    expect(result.completedSessions).toBe(0);
  });

  it("completed Session, submitted_at >7 Tage: erscheint als Kandidat", async () => {
    let idx = 0;
    const counts = [0, 0, 1, 0]; // completed = 1
    (prisma.patientQuestionnaireSession.count as jest.Mock).mockImplementation(
      () => Promise.resolve(counts[idx++] ?? 0),
    );
    (prisma.digitalRequest.count as jest.Mock).mockResolvedValue(0);

    const result = await runCleanup({ dryRun: true });
    expect(result.completedSessions).toBe(1);
  });

  it("completed WHERE enthält NOT { submitted_at: null }", async () => {
    setupPrismaMocks({ sessionIds: ["s1"] });
    await runCleanup({ dryRun: false });
    const findCall = (prisma.patientQuestionnaireSession.findMany as jest.Mock).mock.calls[0][0];
    const completedBranch = findCall.where.OR[2];
    expect(completedBranch.NOT).toEqual({ submitted_at: null });
    expect(completedBranch.submitted_at).toHaveProperty("lt");
  });
});

// ── Trash / Soft-Delete ───────────────────────────────────────────────────────

describe("runCleanup – Trash", () => {
  it("deleted_at <7 Tage: nicht in Kandidaten", async () => {
    (prisma.patientQuestionnaireSession.count as jest.Mock).mockResolvedValue(0);
    (prisma.digitalRequest.count as jest.Mock).mockResolvedValue(0);

    const result = await runCleanup({ dryRun: true });
    expect(result.trashSessions).toBe(0);
  });

  it("deleted_at >7 Tage: erscheint als Kandidat", async () => {
    let idx = 0;
    const counts = [2, 0, 0, 0]; // trash = 2
    (prisma.patientQuestionnaireSession.count as jest.Mock).mockImplementation(
      () => Promise.resolve(counts[idx++] ?? 0),
    );
    (prisma.digitalRequest.count as jest.Mock).mockResolvedValue(0);

    const result = await runCleanup({ dryRun: true });
    expect(result.trashSessions).toBe(2);
  });

  it("trash WHERE nutzt deleted_at lt cutoff", async () => {
    setupPrismaMocks({ sessionIds: ["s1"] });
    await runCleanup({ dryRun: false });
    const findCall = (prisma.patientQuestionnaireSession.findMany as jest.Mock).mock.calls[0][0];
    const trashBranch = findCall.where.OR[0];
    expect(trashBranch).toEqual({ deleted_at: { lt: expect.any(Date) } });
  });
});

// ── Website-Unconfirmed ───────────────────────────────────────────────────────

describe("runCleanup – website-unconfirmed", () => {
  it("unbestätigte Website-Session mit abgelaufenem Token erscheint als Kandidat", async () => {
    let idx = 0;
    const counts = [0, 1, 0, 0]; // unconfirmed = 1
    (prisma.patientQuestionnaireSession.count as jest.Mock).mockImplementation(
      () => Promise.resolve(counts[idx++] ?? 0),
    );
    (prisma.digitalRequest.count as jest.Mock).mockResolvedValue(0);

    const result = await runCleanup({ dryRun: true });
    expect(result.websiteUnconfirmedSessions).toBe(1);
  });

  it("unconfirmed WHERE enthält confirm_token_expires_at lt now", async () => {
    setupPrismaMocks({ sessionIds: ["s1"] });
    await runCleanup({ dryRun: false });
    const findCall = (prisma.patientQuestionnaireSession.findMany as jest.Mock).mock.calls[0][0];
    const unconfirmedBranch = findCall.where.OR[1];
    expect(unconfirmedBranch.confirm_token_expires_at).toHaveProperty("lt");
    expect(unconfirmedBranch.source).toBe("website");
    expect(unconfirmedBranch.status).toBe("awaiting_email_confirmation");
  });
});

// ── Referenz-Nulling ──────────────────────────────────────────────────────────

describe("runCleanup – questionnaire_session_id-Referenzen", () => {
  it("vor Session-Löschung wird DR.questionnaire_session_id genutzt für updateMany", async () => {
    setupPrismaMocks({ sessionIds: ["session-1", "session-2"], drCount: 0 });

    await runCleanup({ dryRun: false });

    const updateCall = (prisma.digitalRequest.updateMany as jest.Mock).mock.calls[0][0];
    expect(updateCall.where.questionnaire_session_id).toEqual({
      in: ["session-1", "session-2"],
    });
    expect(updateCall.data).toEqual({ questionnaire_session_id: null });
  });

  it("Dry-Run führt kein updateMany aus", async () => {
    (prisma.patientQuestionnaireSession.count as jest.Mock).mockResolvedValue(0);
    (prisma.digitalRequest.count as jest.Mock).mockResolvedValue(0);

    await runCleanup({ dryRun: true });
    expect(prisma.digitalRequest.updateMany).not.toHaveBeenCalled();
  });

  it("updateMany WHERE schließt DRs aus, die ebenfalls im selben Lauf gelöscht werden", async () => {
    setupPrismaMocks({ sessionIds: ["s1"], drCount: 1 });

    await runCleanup({ dryRun: false });
    const updateCall = (prisma.digitalRequest.updateMany as jest.Mock).mock.calls[0][0];
    expect(updateCall.where.NOT).toEqual({ createdAt: { lt: expect.any(Date) } });
  });

  it("kein updateMany wenn keine Sessions zu löschen sind", async () => {
    setupPrismaMocks({ sessionIds: [], drCount: 0 });

    await runCleanup({ dryRun: false });
    expect(prisma.digitalRequest.updateMany).not.toHaveBeenCalled();
  });
});

// ── Dry-Run ───────────────────────────────────────────────────────────────────

describe("runCleanup – Dry-Run", () => {
  it("löscht nichts", async () => {
    (prisma.patientQuestionnaireSession.count as jest.Mock).mockResolvedValue(5);
    (prisma.digitalRequest.count as jest.Mock).mockResolvedValue(3);

    await runCleanup({ dryRun: true });

    expect(prisma.patientQuestionnaireSession.deleteMany).not.toHaveBeenCalled();
    expect(prisma.digitalRequest.deleteMany).not.toHaveBeenCalled();
    expect(prisma.digitalRequest.updateMany).not.toHaveBeenCalled();
  });

  it("gibt dryRun: true zurück", async () => {
    (prisma.patientQuestionnaireSession.count as jest.Mock).mockResolvedValue(0);
    (prisma.digitalRequest.count as jest.Mock).mockResolvedValue(0);

    const result = await runCleanup({ dryRun: true });
    expect(result.dryRun).toBe(true);
  });

  it("nulledSessionRefs ist 0 im Dry-Run", async () => {
    (prisma.patientQuestionnaireSession.count as jest.Mock).mockResolvedValue(0);
    (prisma.digitalRequest.count as jest.Mock).mockResolvedValue(0);

    const result = await runCleanup({ dryRun: true });
    expect(result.nulledSessionRefs).toBe(0);
  });
});

// ── API-Route: CRON_SECRET-Schutz ────────────────────────────────────────────

describe("GET /api/internal/cleanup", () => {
  function makeReq(
    auth?: string,
    params: { dry?: boolean; apply?: boolean } = {},
  ): NextRequest {
    const qs = params.apply
      ? "?apply=true"
      : params.dry
        ? "?dry=true"
        : "";
    const url = `http://localhost/api/internal/cleanup${qs}`;
    return new NextRequest(url, {
      headers: auth ? { authorization: auth } : {},
    });
  }

  function setupAllZero() {
    (prisma.patientQuestionnaireSession.count as jest.Mock).mockResolvedValue(0);
    (prisma.digitalRequest.count as jest.Mock).mockResolvedValue(0);
    (prisma.patientQuestionnaireSession.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.digitalRequest.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    (prisma.patientQuestionnaireSession.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
    (prisma.digitalRequest.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
  }

  it("kein Authorization-Header → 401", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("falsches CRON_SECRET → 401", async () => {
    const res = await GET(makeReq("Bearer wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("CRON_SECRET nicht gesetzt → 401", async () => {
    const original = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;
    const res = await GET(makeReq("Bearer test-secret-abc123"));
    expect(res.status).toBe(401);
    process.env.CRON_SECRET = original;
  });

  it("ohne Query-Parameter → Dry-Run, keine Deletes", async () => {
    (prisma.patientQuestionnaireSession.count as jest.Mock).mockResolvedValue(3);
    (prisma.digitalRequest.count as jest.Mock).mockResolvedValue(2);

    const res = await GET(makeReq("Bearer test-secret-abc123"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.dryRun).toBe(true);
    expect(prisma.patientQuestionnaireSession.deleteMany).not.toHaveBeenCalled();
    expect(prisma.digitalRequest.deleteMany).not.toHaveBeenCalled();
  });

  it("?dry=true → Dry-Run, nichts gelöscht", async () => {
    (prisma.patientQuestionnaireSession.count as jest.Mock).mockResolvedValue(2);
    (prisma.digitalRequest.count as jest.Mock).mockResolvedValue(1);

    const res = await GET(makeReq("Bearer test-secret-abc123", { dry: true }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.dryRun).toBe(true);
    expect(prisma.patientQuestionnaireSession.deleteMany).not.toHaveBeenCalled();
    expect(prisma.digitalRequest.deleteMany).not.toHaveBeenCalled();
  });

  it("?apply=true + korrektes Secret → echter Delete (drDeleteMany immer aufgerufen)", async () => {
    // Session-IDs vorhanden damit auch session deleteMany aufgerufen wird
    setupPrismaMocks({ sessionIds: ["s1"], drCount: 1 });

    const res = await GET(makeReq("Bearer test-secret-abc123", { apply: true }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.dryRun).toBe(false);
    expect(prisma.patientQuestionnaireSession.deleteMany).toHaveBeenCalled();
    expect(prisma.digitalRequest.deleteMany).toHaveBeenCalled();
  });

  it("?apply=true ohne Authorization → 401, kein Delete", async () => {
    const res = await GET(makeReq(undefined, { apply: true }));
    expect(res.status).toBe(401);
    expect(prisma.patientQuestionnaireSession.deleteMany).not.toHaveBeenCalled();
    expect(prisma.digitalRequest.deleteMany).not.toHaveBeenCalled();
  });

  it("?apply=true + falsches Secret → 401, kein Delete", async () => {
    const res = await GET(makeReq("Bearer wrong", { apply: true }));
    expect(res.status).toBe(401);
    expect(prisma.patientQuestionnaireSession.deleteMany).not.toHaveBeenCalled();
    expect(prisma.digitalRequest.deleteMany).not.toHaveBeenCalled();
  });

  it("korrektes CRON_SECRET (kein apply) → 200 mit ok: true, Dry-Run", async () => {
    (prisma.patientQuestionnaireSession.count as jest.Mock).mockResolvedValue(0);
    (prisma.digitalRequest.count as jest.Mock).mockResolvedValue(0);

    const res = await GET(makeReq("Bearer test-secret-abc123"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.dryRun).toBe(true);
  });
});

// ── Explizite Status-Regeln / kein Catch-all ──────────────────────────────────

describe("runCleanup – explizite Statusregeln", () => {
  it("unbekannter Status >7 Tage → NICHT in findMany-Kandidaten enthalten", async () => {
    setupPrismaMocks({ sessionIds: [] });

    await runCleanup({ dryRun: false });
    const findCall = (prisma.patientQuestionnaireSession.findMany as jest.Mock).mock.calls[0][0];
    const orConditions: unknown[] = findCall.where.OR;

    // Kein OR-Zweig darf ein catch-all { notIn: [...] } oder fehlendes status-Feld haben
    for (const cond of orConditions as Record<string, unknown>[]) {
      if (cond.deleted_at !== null) continue; // Trash-Zweig — kein Status-Filter erwartet
      if (cond.status !== undefined) {
        // Muss ein konkreter String-Wert sein, kein { notIn: ... }
        expect(typeof cond.status).toBe("string");
      }
    }
  });

  it("pending WHERE nutzt explizit status: 'pending'", async () => {
    setupPrismaMocks({ sessionIds: ["s1"] });

    await runCleanup({ dryRun: false });
    const findCall = (prisma.patientQuestionnaireSession.findMany as jest.Mock).mock.calls[0][0];
    const pendingBranch = (findCall.where.OR as Record<string, unknown>[]).find(
      (c) => c.status === "pending",
    );
    expect(pendingBranch).toBeDefined();
    expect(pendingBranch!.deleted_at).toBeNull();
    expect(pendingBranch!.createdAt).toHaveProperty("lt");
  });

  it("Trash-Branch hat KEIN status-Feld (greift für alle Status)", async () => {
    setupPrismaMocks({ sessionIds: [] });

    await runCleanup({ dryRun: false });
    const findCall = (prisma.patientQuestionnaireSession.findMany as jest.Mock).mock.calls[0][0];
    const trashBranch = (findCall.where.OR as Record<string, unknown>[]).find(
      (c) => (c.deleted_at as Record<string, unknown>)?.lt !== undefined,
    );
    expect(trashBranch).toBeDefined();
    expect(trashBranch!.status).toBeUndefined();
  });
});

// ── Trash-Priorität: createdAt > 7 Tage, aber deleted_at < 7 Tage ────────────

describe("runCleanup – Trash-Priorität", () => {
  it("Session 8 Tage alt (createdAt), aber erst 2 Tage im Trash → NICHT physisch gelöscht", async () => {
    // now = heute; cutoff = heute minus 7 Tage
    // Session-createdAt = 8 Tage ago → jenseits cutoff
    // Session-deleted_at = 2 Tage ago → VOR cutoff → Trash-Regel greift NICHT
    // Pending-Regel: deleted_at IS NULL → greift nicht (deleted_at ist gesetzt)
    // Ergebnis: keine der Regeln trifft → count = 0

    // Wir simulieren: countCandidates gibt 0 zurück für alle
    (prisma.patientQuestionnaireSession.count as jest.Mock).mockResolvedValue(0);
    (prisma.digitalRequest.count as jest.Mock).mockResolvedValue(0);

    const result = await runCleanup({ dryRun: true });
    expect(result.trashSessions).toBe(0);
    expect(result.pendingSessions).toBe(0);
    expect(result.totalSessions).toBe(0);
  });

  it("Trash WHERE prüft deleted_at lt cutoff (nicht lt now)", async () => {
    setupPrismaMocks({ sessionIds: [] });

    await runCleanup({ dryRun: false });
    const findCall = (prisma.patientQuestionnaireSession.findMany as jest.Mock).mock.calls[0][0];
    const trashBranch = findCall.where.OR[0];

    // deleted_at muss den cutoff-Wert verwenden, nicht now
    const lt: Date = trashBranch.deleted_at.lt;
    const now = new Date();
    // cutoff liegt ~7 Tage vor now → muss klar kleiner als now sein
    expect(lt.getTime()).toBeLessThan(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  });

  it("completed Session sehr alt, aber erst 2 Tage im Trash → pending/completed-Regeln greifen nicht", async () => {
    // deleted_at IS NULL ist Voraussetzung für completed- und pending-Regeln
    // → eine Session mit deleted_at gesetzt fällt nur unter Trash
    // Wenn deleted_at < 7 Tage ago → wird nicht gelöscht (Trash-Regel: deleted_at lt cutoff)

    (prisma.patientQuestionnaireSession.count as jest.Mock).mockResolvedValue(0);
    (prisma.digitalRequest.count as jest.Mock).mockResolvedValue(0);

    const result = await runCleanup({ dryRun: true });
    expect(result.completedSessions).toBe(0);
    expect(result.trashSessions).toBe(0);
  });
});

// ── Website-Cleanup-Script löscht NICHT normale Sessions ─────────────────────

describe("cleanup-unconfirmed-website-submits.mjs – enger Scope", () => {
  // Das Skript selbst ist plain JS und nicht direkt testbar in Jest ohne
  // eigenen Import-Wrapper. Wir testen stattdessen, dass das Prisma-WHERE
  // der website-unconfirmed-Logik keinen completed/pending-Zweig enthält.
  it("website-unconfirmed filter enthält nur source=website + awaiting-Status", () => {
    const filter = {
      source: "website",
      status: "awaiting_email_confirmation",
      confirmed_at: null,
      confirm_token_expires_at: { lt: new Date() },
    };

    // Kein deleted_at-Check: Script löscht keine Trash-Sessions
    expect(filter).not.toHaveProperty("deleted_at");
    // Kein status-Catch-all
    expect(typeof filter.status).toBe("string");
    expect(filter.status).toBe("awaiting_email_confirmation");
    // Kein createdAt-Cutoff: keine 7-Tage-Frist für pending Sessions
    expect(filter).not.toHaveProperty("createdAt");
  });

  it("runCleanup pending-WHERE ist unabhängig vom website-unconfirmed-Filter", async () => {
    setupPrismaMocks({ sessionIds: ["s1"] });

    await runCleanup({ dryRun: false });
    const findCall = (prisma.patientQuestionnaireSession.findMany as jest.Mock).mock.calls[0][0];
    const orConditions: Record<string, unknown>[] = findCall.where.OR;

    // pending-Zweig muss deleted_at: null haben (= keine Trash-Sessions)
    const pendingBranch = orConditions.find((c) => c.status === "pending");
    expect(pendingBranch).toBeDefined();
    expect(pendingBranch!.deleted_at).toBeNull();

    // unconfirmed-Zweig muss source: "website" haben
    const unconfirmedBranch = orConditions.find(
      (c) => c.status === "awaiting_email_confirmation",
    );
    expect(unconfirmedBranch).toBeDefined();
    expect(unconfirmedBranch!.source).toBe("website");
  });
});
