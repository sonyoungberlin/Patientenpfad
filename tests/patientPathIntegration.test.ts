import { NextRequest } from "next/server";
import { renderToStaticMarkup } from "react-dom/server";
import { PATCH as saveM2 } from "@/app/api/cases/[id]/m2/prefill/route";
import { PATCH as updateM3Checkpoint } from "@/app/api/cases/[id]/checkpoint/update/route";
import { PATCH as closeCase } from "@/app/api/cases/[id]/close/route";
import M3Page from "@/app/cases/[id]/m3/page";
import { getCurrentRunAnswers } from "@/lib/server/prefillRuns";
import {
  CheckpointCategory,
  CheckpointPerspective,
  CheckpointType,
  type ActiveCheckpoint,
} from "@/lib/types";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

jest.mock("@/lib/authz", () => ({
  requireCasesAccess: jest.fn().mockResolvedValue({
    account: { id: "mfa-1", is_approved: true, current_practice: { id: "practice-1" } },
    error: null,
  }),
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccountFromCookies: jest.fn().mockResolvedValue({
    id: "mfa-1",
    is_approved: true,
    current_practice: { id: "practice-1" },
  }),
}));

jest.mock("@/lib/cases/practiceScope", () => ({
  canAccessCaseSession: jest.fn().mockReturnValue(true),
  getCaseOwnershipFilter: jest.fn().mockReturnValue({}),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    caseSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    prefillRun: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    practice: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}));

import { prisma } from "@/lib/prisma";

type MemorySession = {
  id: string;
  owner_account_id: string;
  owner_practice_id: string;
  active_checkpoints: ActiveCheckpoint[];
  ctx_prefill: unknown;
  clinical_status: string;
  doctor_confirmed: boolean;
  doctor_confirmed_at: Date | null;
  stage_status: string;
  m2_status: string;
  preparation_mode: string;
  m2_token: string | null;
  m2_token_expires_at: Date | null;
};

type MemoryRun = {
  id: string;
  case_id: string;
  sequence: number;
  source: string;
  active_checkpoints: unknown;
  answers: unknown;
  created_at: Date;
  frozen_at: Date | null;
  created_by_account_id: string | null;
};

type PrismaDouble = {
  caseSession: { findUnique: jest.Mock; update: jest.Mock; create: jest.Mock };
  prefillRun: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  practice: { findUnique: jest.Mock };
  $transaction: jest.Mock;
};

const db = prisma as unknown as PrismaDouble;
const CASE_ID = "case-existing";

function checkpoint(id: string, title: string): ActiveCheckpoint {
  return {
    id,
    block_id: "diagnosis_status",
    type: CheckpointType.VERIFIKATION,
    perspectives: [CheckpointPerspective.MFA, CheckpointPerspective.PATIENT],
    title,
    category: CheckpointCategory.M,
    status: "TO_DO",
    m4: { type: "ACTION", text: "M4" },
  };
}

const initialCheckpoints = [checkpoint("K01", "Diagnose"), checkpoint("K02", "Plan")];
let session: MemorySession;
let runs: MemoryRun[];

beforeEach(() => {
  session = {
    id: CASE_ID,
    owner_account_id: "mfa-1",
    owner_practice_id: "practice-1",
    active_checkpoints: initialCheckpoints.map((item) => ({ ...item })),
    ctx_prefill: {},
    clinical_status: "none",
    doctor_confirmed: false,
    doctor_confirmed_at: null,
    stage_status: "OPEN",
    m2_status: "none",
    preparation_mode: "none",
    m2_token: null,
    m2_token_expires_at: null,
  };
  runs = [];

  db.caseSession.findUnique.mockReset().mockImplementation(async ({ where }) =>
    where.id === session.id
      ? { ...session, active_checkpoints: session.active_checkpoints.map((item) => ({ ...item })) }
      : null,
  );
  db.caseSession.update.mockReset().mockImplementation(async ({ where, data }) => {
    if (where.id !== session.id) return null;
    Object.assign(session, data);
    return { ...session };
  });
  db.caseSession.create.mockReset().mockImplementation(async () => {
    throw new Error("A M2/M3 edit must not create another CaseSession");
  });

  db.prefillRun.findMany.mockReset().mockImplementation(async ({ where, orderBy }) => {
    let result = runs.filter((run) => run.case_id === where.case_id);
    if (where.frozen_at === null) result = result.filter((run) => run.frozen_at === null);
    if (where.frozen_at && typeof where.frozen_at === "object") {
      result = result.filter((run) => run.frozen_at !== null);
    }
    return [...result].sort((left, right) =>
      (left.sequence - right.sequence) * (orderBy?.sequence === "desc" ? -1 : 1),
    );
  });
  db.prefillRun.findFirst.mockImplementation(async ({ where }) => {
    const matching = runs
      .filter((run) => run.case_id === where.case_id)
      .filter((run) => where.frozen_at === null ? run.frozen_at === null : true)
      .sort((left, right) => right.sequence - left.sequence);
    return matching[0] ?? null;
  });
  db.prefillRun.create.mockImplementation(async ({ data }) => {
    const run: MemoryRun = {
      id: `run-${runs.length + 1}`,
      created_at: new Date(),
      ...data,
    };
    runs.push(run);
    return run;
  });
  db.prefillRun.update.mockImplementation(async ({ where, data }) => {
    const run = runs.find((item) => item.id === where.id);
    if (!run) throw new Error("PrefillRun not found");
    Object.assign(run, data);
    return run;
  });
  db.practice.findUnique.mockReset().mockResolvedValue({ message_signature: null });
  db.$transaction.mockReset().mockImplementation(
    async (callback: (tx: PrismaDouble) => Promise<unknown>) => callback(db),
  );
});

function mfaAnswers(answer: string) {
  return {
    K01: { "MFA-K01-01": answer },
    K02: { "MFA-K02-01": answer },
  };
}

async function saveMfa(prefill: ReturnType<typeof mfaAnswers>) {
  const request = new NextRequest(`http://localhost/api/cases/${CASE_ID}/m2/prefill`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefill }),
  });
  return saveM2(request, { params: Promise.resolve({ id: CASE_ID }) });
}

async function saveConversation(answer: string) {
  const request = new NextRequest(`http://localhost/api/cases/${CASE_ID}/m2/prefill`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "conversation",
      prefill: { K01: { "M2-01": answer } },
    }),
  });
  return saveM2(request, { params: Promise.resolve({ id: CASE_ID }) });
}

async function assess(checkpointId: string, status: "OK" | "TO_DO" | "ZURÜCKSTELLEN") {
  const request = new NextRequest(
    `http://localhost/api/cases/${CASE_ID}/checkpoint/update`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checkpoint_id: checkpointId,
        status,
        expected_clinical_status: session.clinical_status,
      }),
    },
  );
  return updateM3Checkpoint(request, { params: Promise.resolve({ id: CASE_ID }) });
}

async function renderM3() {
  return renderToStaticMarkup(await M3Page({ params: Promise.resolve({ id: CASE_ID }) }));
}

describe("Patientenpfad – M2/M3 über echte Route- und Servicepfade", () => {
  it("A: speichert, öffnet und korrigiert dieselbe MFA-Quelle auf derselben CaseSession", async () => {
    expect((await saveMfa(mfaAnswers("ja"))).status).toBe(200);
    const originalRunId = runs[0]?.id;
    expect((await saveMfa(mfaAnswers("nein"))).status).toBe(200);

    expect(session.id).toBe(CASE_ID);
    expect(runs).toHaveLength(1);
    expect(runs[0].id).toBe(originalRunId);
    expect(await getCurrentRunAnswers(CASE_ID, "mfa")).toMatchObject({
      K01: { "MFA-K01-01": "nein" },
    });
    expect(db.caseSession.create).not.toHaveBeenCalled();
  });

  it("B: aktualisiert nach einem Gespräch nur den MFA-Stand und erhält beide Quellen", async () => {
    expect((await saveMfa(mfaAnswers("ja"))).status).toBe(200);
    expect((await saveConversation("ja")).status).toBe(200);
    expect((await saveMfa(mfaAnswers("nein"))).status).toBe(200);

    expect(runs).toHaveLength(2);
    expect(runs.filter((run) => run.source === "mfa")).toHaveLength(1);
    expect(runs.filter((run) => run.source === "conversation")).toHaveLength(1);
    expect(await getCurrentRunAnswers(CASE_ID, "mfa")).toMatchObject({
      K01: { "MFA-K01-01": "nein" },
    });
    expect(await getCurrentRunAnswers(CASE_ID, "conversation")).toMatchObject({
      K01: { "M2-01": "ja" },
    });
    expect(db.caseSession.create).not.toHaveBeenCalled();
  });

  it("C: zeigt nach erneutem Öffnen teilweise gespeicherte ärztliche Bewertungen", async () => {
    expect((await assess("K01", "OK")).status).toBe(200);

    const markup = await renderM3();
    expect(markup).toContain('class="answer-btn active" data-status-button="K01:OK"');
    expect(markup).toContain('class="answer-btn active" data-status-button="K02:TO_DO"');
    expect(db.caseSession.create).not.toHaveBeenCalled();
  });

  it("D: zeigt nach echter M2-Änderung neutralisierte M3-Bewertungen und den roten Hinweis", async () => {
    expect((await saveMfa(mfaAnswers("ja"))).status).toBe(200);
    expect((await assess("K01", "OK")).status).toBe(200);
    expect((await assess("K02", "ZURÜCKSTELLEN")).status).toBe(200);

    expect((await saveMfa(mfaAnswers("nein"))).status).toBe(200);
    const markup = await renderM3();

    expect(
      session.active_checkpoints.flatMap((item) =>
        "status" in item ? [item.status] : [],
      ),
    ).toEqual(["TO_DO", "TO_DO"]);
    expect(markup).toContain("data-prefill-reset-notice");
    expect(markup).toContain('class="answer-btn active" data-status-button="K01:TO_DO"');
    expect(markup).not.toContain('class="answer-btn active" data-status-button="K01:OK"');
  });

  it("E: blendet den Hinweis erst nach der letzten erfolgreichen Neubewertung aus", async () => {
    expect((await saveMfa(mfaAnswers("ja"))).status).toBe(200);
    expect((await saveMfa(mfaAnswers("nein"))).status).toBe(200);
    expect((await assess("K01", "OK")).status).toBe(200);
    expect(session.clinical_status).toContain(":reviewed:");

    const finalReview = await assess("K02", "TO_DO");
    expect(finalReview.status).toBe(200);
    expect((await finalReview.json()).review_complete).toBe(true);
    expect(session.clinical_status).toBe("none");
    expect(await renderM3()).not.toContain("data-prefill-reset-notice");
  });

  it("F: setzt M3 bei unverändertem erneutem M2-Save nicht zurück", async () => {
    const sameAnswers = mfaAnswers("ja");
    expect((await saveMfa(sameAnswers)).status).toBe(200);
    expect((await assess("K01", "OK")).status).toBe(200);
    expect((await assess("K02", "TO_DO")).status).toBe(200);
    expect(session.clinical_status).toBe("none");
    expect((await assess("K01", "OK")).status).toBe(200);

    expect((await saveMfa(sameAnswers)).status).toBe(200);
    expect(session.clinical_status).toBe("none");
    const firstCheckpoint = session.active_checkpoints[0];
    expect("status" in firstCheckpoint ? firstCheckpoint.status : undefined).toBe("OK");
  });

  it("G: blockiert M2- und M3-Schreibzugriffe nach ausdrücklicher Bestätigung", async () => {
    const closeRequest = new NextRequest(`http://localhost/api/cases/${CASE_ID}/close`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checkpoints: session.active_checkpoints,
        expected_clinical_status: session.clinical_status,
      }),
    });
    expect((await closeCase(closeRequest, { params: Promise.resolve({ id: CASE_ID }) })).status)
      .toBe(200);
    expect(session.doctor_confirmed).toBe(true);

    expect((await saveMfa(mfaAnswers("nein"))).status).toBe(403);
    expect((await assess("K01", "OK")).status).toBe(409);
    expect(db.caseSession.create).not.toHaveBeenCalled();
  });
});