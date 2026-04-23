import {
  PrefillRunError,
  PREFILL_RUN_SOURCES,
  appendFrozenRun,
  createOpenRun,
  freezeRun,
  getFrozenRuns,
  getOpenRun,
  isPrefillRunSource,
} from "@/lib/server/prefillRuns";

type Run = {
  id: string;
  case_id: string;
  sequence: number;
  source: string;
  active_checkpoints: unknown;
  answers: unknown;
  created_at: Date;
  frozen_at: Date | null;
  created_by_account_id: string | null;
  patient_token_used: string | null;
};

type CaseRow = {
  id: string;
  doctor_confirmed: boolean;
  clinical_status: string;
};

/**
 * Minimaler In-Memory-Stub des PrismaClient-Ausschnitts, den die
 * Service-Schicht benötigt. Erzeugt deterministische IDs/Zeiten und
 * setzt die wichtigste Invariante (max. ein offener Run pro Fall) durch.
 */
function makePrismaStub(initialCases: CaseRow[]) {
  const cases = new Map<string, CaseRow>(initialCases.map((c) => [c.id, c]));
  const runs: Run[] = [];
  let idCounter = 0;

  const prefillRun = {
    findMany: jest.fn(
      async (args: {
        where: { case_id: string; frozen_at?: { not: null } | null };
        orderBy: { sequence: "asc" | "desc" };
      }) => {
        let result = runs.filter((r) => r.case_id === args.where.case_id);
        if (args.where.frozen_at && typeof args.where.frozen_at === "object") {
          result = result.filter((r) => r.frozen_at !== null);
        } else if (args.where.frozen_at === null) {
          result = result.filter((r) => r.frozen_at === null);
        }
        const dir = args.orderBy.sequence === "asc" ? 1 : -1;
        return [...result].sort((a, b) => (a.sequence - b.sequence) * dir);
      },
    ),
    findFirst: jest.fn(
      async (args: {
        where: { case_id: string; frozen_at?: null };
        orderBy?: { sequence: "asc" | "desc" };
        select?: unknown;
      }) => {
        let result = runs.filter((r) => r.case_id === args.where.case_id);
        if (args.where.frozen_at === null) {
          result = result.filter((r) => r.frozen_at === null);
        }
        const dir = args.orderBy?.sequence === "asc" ? 1 : -1;
        const sorted = [...result].sort((a, b) => (a.sequence - b.sequence) * dir);
        return sorted[0] ?? null;
      },
    ),
    findUnique: jest.fn(async (args: { where: { id: string } }) => {
      return runs.find((r) => r.id === args.where.id) ?? null;
    }),
    create: jest.fn(async (args: { data: Omit<Run, "id" | "created_at"> & { created_at?: Date } }) => {
      // Invariante: höchstens ein offener Run pro Fall.
      if (
        args.data.frozen_at === null &&
        runs.some((r) => r.case_id === args.data.case_id && r.frozen_at === null)
      ) {
        throw new Error("Unique constraint failed (open run already exists)");
      }
      const run: Run = {
        id: `run-${++idCounter}`,
        created_at: args.data.created_at ?? new Date("2026-04-23T00:00:00.000Z"),
        ...args.data,
      } as Run;
      runs.push(run);
      return run;
    }),
    update: jest.fn(
      async (args: { where: { id: string }; data: Partial<Run> }) => {
        const idx = runs.findIndex((r) => r.id === args.where.id);
        if (idx < 0) throw new Error("not found");
        runs[idx] = { ...runs[idx], ...args.data };
        return runs[idx];
      },
    ),
  };

  const caseSession = {
    findUnique: jest.fn(async (args: { where: { id: string } }) => {
      return cases.get(args.where.id) ?? null;
    }),
  };

  const $transaction = jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
    return fn({ prefillRun, caseSession });
  });

  return {
    client: { prefillRun, caseSession, $transaction } as never,
    runs,
    cases,
  };
}

const baseCase: CaseRow = {
  id: "case-1",
  doctor_confirmed: false,
  clinical_status: "none",
};

describe("isPrefillRunSource / PREFILL_RUN_SOURCES", () => {
  it("akzeptiert genau mfa | conversation | patient", () => {
    expect(PREFILL_RUN_SOURCES).toEqual(["mfa", "conversation", "patient"]);
    expect(isPrefillRunSource("mfa")).toBe(true);
    expect(isPrefillRunSource("conversation")).toBe(true);
    expect(isPrefillRunSource("patient")).toBe(true);
    expect(isPrefillRunSource("skipped")).toBe(false);
    expect(isPrefillRunSource("")).toBe(false);
    expect(isPrefillRunSource(null)).toBe(false);
  });
});

describe("createOpenRun", () => {
  it("legt einen offenen Run mit sequence=1 an", async () => {
    const stub = makePrismaStub([baseCase]);
    const run = await createOpenRun(
      {
        caseId: "case-1",
        source: "mfa",
        activeCheckpoints: [{ id: "K01" }],
        createdByAccountId: "acc-1",
      },
      stub.client,
    );
    expect(run.sequence).toBe(1);
    expect(run.source).toBe("mfa");
    expect(run.frozen_at).toBeNull();
    expect(run.created_by_account_id).toBe("acc-1");
  });

  it("vergibt monoton steigende sequence", async () => {
    const stub = makePrismaStub([baseCase]);
    const first = await appendFrozenRun(
      {
        caseId: "case-1",
        source: "mfa",
        activeCheckpoints: [],
        answers: {},
      },
      stub.client,
    );
    const second = await createOpenRun(
      {
        caseId: "case-1",
        source: "conversation",
        activeCheckpoints: [],
      },
      stub.client,
    );
    expect(first.sequence).toBe(1);
    expect(second.sequence).toBe(2);
  });

  it("verweigert einen zweiten offenen Run pro Fall", async () => {
    const stub = makePrismaStub([baseCase]);
    await createOpenRun(
      { caseId: "case-1", source: "mfa", activeCheckpoints: [] },
      stub.client,
    );
    await expect(
      createOpenRun(
        { caseId: "case-1", source: "conversation", activeCheckpoints: [] },
        stub.client,
      ),
    ).rejects.toMatchObject({ code: "open_run_exists" } as PrefillRunError);
  });

  it("verweigert die Anlage bei doctor_confirmed=true (Regel 3)", async () => {
    const stub = makePrismaStub([{ ...baseCase, doctor_confirmed: true }]);
    await expect(
      createOpenRun(
        { caseId: "case-1", source: "mfa", activeCheckpoints: [] },
        stub.client,
      ),
    ).rejects.toMatchObject({ code: "case_confirmed" });
  });

  it("verweigert die Anlage bei clinical_status='confirmed' (Regel 3)", async () => {
    const stub = makePrismaStub([{ ...baseCase, clinical_status: "confirmed" }]);
    await expect(
      createOpenRun(
        { caseId: "case-1", source: "mfa", activeCheckpoints: [] },
        stub.client,
      ),
    ).rejects.toMatchObject({ code: "case_confirmed" });
  });

  it("wirft case_not_found für unbekannte Fälle", async () => {
    const stub = makePrismaStub([]);
    await expect(
      createOpenRun(
        { caseId: "ghost", source: "mfa", activeCheckpoints: [] },
        stub.client,
      ),
    ).rejects.toMatchObject({ code: "case_not_found" });
  });

  it("wirft invalid_source bei nicht erlaubter Quelle", async () => {
    const stub = makePrismaStub([baseCase]);
    await expect(
      createOpenRun(
        // @ts-expect-error – bewusst ungültiger Wert für Laufzeitprüfung
        { caseId: "case-1", source: "skipped", activeCheckpoints: [] },
        stub.client,
      ),
    ).rejects.toMatchObject({ code: "invalid_source" });
  });
});

describe("freezeRun", () => {
  it("setzt frozen_at und schreibt Antworten", async () => {
    const stub = makePrismaStub([baseCase]);
    const open = await createOpenRun(
      { caseId: "case-1", source: "mfa", activeCheckpoints: [{ id: "K01" }] },
      stub.client,
    );
    const frozen = await freezeRun(
      {
        caseId: "case-1",
        runId: open.id,
        answers: { K01: { "MFA-K01-01": "ja" } },
      },
      stub.client,
    );
    expect(frozen.frozen_at).toBeInstanceOf(Date);
    expect(frozen.answers).toEqual({ K01: { "MFA-K01-01": "ja" } });
  });

  it("verweigert das erneute Einfrieren", async () => {
    const stub = makePrismaStub([baseCase]);
    const open = await createOpenRun(
      { caseId: "case-1", source: "mfa", activeCheckpoints: [] },
      stub.client,
    );
    await freezeRun(
      { caseId: "case-1", runId: open.id, answers: {} },
      stub.client,
    );
    await expect(
      freezeRun(
        { caseId: "case-1", runId: open.id, answers: {} },
        stub.client,
      ),
    ).rejects.toMatchObject({ code: "run_already_frozen" });
  });

  it("wirft no_open_run bei unbekanntem runId", async () => {
    const stub = makePrismaStub([baseCase]);
    await expect(
      freezeRun(
        { caseId: "case-1", runId: "missing", answers: {} },
        stub.client,
      ),
    ).rejects.toMatchObject({ code: "no_open_run" });
  });
});

describe("appendFrozenRun (Regel 1: Patientenrücklauf bei offenem MFA-Run)", () => {
  it("legt einen zusätzlichen, sofort eingefrorenen Patient-Run an, ohne den offenen MFA-Run anzutasten", async () => {
    const stub = makePrismaStub([baseCase]);
    const mfaOpen = await createOpenRun(
      { caseId: "case-1", source: "mfa", activeCheckpoints: [{ id: "K01" }] },
      stub.client,
    );

    const patient = await appendFrozenRun(
      {
        caseId: "case-1",
        source: "patient",
        activeCheckpoints: [{ id: "K01" }],
        answers: { K01: { "M2-01": "ja" } },
        patientTokenUsed: "tok-xyz",
      },
      stub.client,
    );

    expect(patient.sequence).toBe(2);
    expect(patient.source).toBe("patient");
    expect(patient.frozen_at).toBeInstanceOf(Date);
    expect(patient.patient_token_used).toBe("tok-xyz");

    const stillOpen = await getOpenRun("case-1", stub.client);
    expect(stillOpen?.id).toBe(mfaOpen.id);
    expect(stillOpen?.frozen_at).toBeNull();

    const frozen = await getFrozenRuns("case-1", stub.client);
    expect(frozen).toHaveLength(1);
    expect(frozen[0].id).toBe(patient.id);
  });

  it("verweigert appendFrozenRun bei bestätigtem Fall (Regel 3)", async () => {
    const stub = makePrismaStub([{ ...baseCase, doctor_confirmed: true }]);
    await expect(
      appendFrozenRun(
        {
          caseId: "case-1",
          source: "patient",
          activeCheckpoints: [],
          answers: {},
        },
        stub.client,
      ),
    ).rejects.toMatchObject({ code: "case_confirmed" });
  });
});

describe("getFrozenRuns / getOpenRun", () => {
  it("liefert eingefrorene Runs aufsteigend nach sequence und ignoriert offene Runs", async () => {
    const stub = makePrismaStub([baseCase]);
    await appendFrozenRun(
      { caseId: "case-1", source: "mfa", activeCheckpoints: [], answers: {} },
      stub.client,
    );
    await appendFrozenRun(
      {
        caseId: "case-1",
        source: "conversation",
        activeCheckpoints: [],
        answers: {},
      },
      stub.client,
    );
    await createOpenRun(
      { caseId: "case-1", source: "patient", activeCheckpoints: [] },
      stub.client,
    );

    const frozen = await getFrozenRuns("case-1", stub.client);
    expect(frozen.map((r) => r.sequence)).toEqual([1, 2]);
    expect(frozen.map((r) => r.source)).toEqual(["mfa", "conversation"]);

    const open = await getOpenRun("case-1", stub.client);
    expect(open?.source).toBe("patient");
    expect(open?.sequence).toBe(3);
  });

  it("liefert null, wenn kein offener Run existiert", async () => {
    const stub = makePrismaStub([baseCase]);
    expect(await getOpenRun("case-1", stub.client)).toBeNull();
  });
});
