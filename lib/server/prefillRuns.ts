/**
 * Service-Schicht für `PrefillRun`.
 *
 * Schritt 1 der PrefillRun-Migration: Diese Funktionen werden noch **nicht**
 * von den bestehenden API-Routen, M2/M3-Seiten oder der Statuslogik genutzt.
 * Sie sind die technische Grundlage für die folgenden Schritte.
 *
 * Vorab festgelegte fachliche Regeln (in dieser Schicht vorbereitet, aber
 * noch nicht an Routen angebunden):
 *
 *  1. Patientenrücklauf bei offenem MFA-Run wird **nicht** gemerged und
 *     überschreibt **nicht** – `appendFrozenRun` mit `source = "patient"`
 *     liefert einen eigenen zusätzlichen Run und tastet einen offenen
 *     MFA-/Conversation-Run nicht an.
 *  2. Token-Invalidierung beim MFA-Speichern wird hier **nicht** ausgelöst
 *     (keine Mutation an `m2_token` / `m2_status`); die bestehende Route
 *     verhält sich in Schritt 1 unverändert.
 *  3. Bei `clinical_status = "confirmed"` oder `doctor_confirmed = true`
 *     verweigern `createOpenRun`, `freezeRun` und `appendFrozenRun` die
 *     Anlage neuer Runs (Wurf von `PrefillRunError`).
 *
 * `ctx_prefill`, `preparation_mode` und `m2_status` werden in Schritt 1
 * **nicht** synchronisiert. Sie bleiben die heutige Quelle für Lesepfade.
 */

import { Prisma, type PrismaClient, type PrefillRun } from "@prisma/client";

import { prisma as defaultPrisma } from "@/lib/prisma";

/** Erlaubte Quellen eines Runs. */
export const PREFILL_RUN_SOURCES = ["mfa", "conversation", "patient"] as const;
export type PrefillRunSource = (typeof PREFILL_RUN_SOURCES)[number];

export function isPrefillRunSource(value: unknown): value is PrefillRunSource {
  return (
    typeof value === "string" &&
    (PREFILL_RUN_SOURCES as readonly string[]).includes(value)
  );
}

/** Antwort-Form analog zum bisherigen `ctx_prefill`. */
export type PrefillRunAnswers = Record<string, Record<string, string>>;

/** Snapshot der aktiven Checkpoints zum Zeitpunkt des Runs. */
export type PrefillRunActiveCheckpoints = unknown[];

export type PrefillRunErrorCode =
  | "case_not_found"
  | "case_confirmed"
  | "open_run_exists"
  | "no_open_run"
  | "run_already_frozen"
  | "invalid_source";

export class PrefillRunError extends Error {
  public readonly code: PrefillRunErrorCode;

  constructor(code: PrefillRunErrorCode, message: string) {
    super(message);
    this.name = "PrefillRunError";
    this.code = code;
  }
}

/**
 * Minimaler Prisma-Ausschnitt, den die Service-Schicht braucht. Erlaubt
 * leichtere Test-Doubles ohne den vollen `PrismaClient`.
 */
type PrismaLike = Pick<PrismaClient, "caseSession" | "prefillRun" | "$transaction">;

type CreateOpenRunInput = {
  caseId: string;
  source: PrefillRunSource;
  activeCheckpoints: PrefillRunActiveCheckpoints;
  answers?: PrefillRunAnswers;
  createdByAccountId?: string | null;
  patientTokenUsed?: string | null;
};

type FreezeRunInput = {
  caseId: string;
  runId: string;
  answers: PrefillRunAnswers;
  /** Optional aktualisierter Snapshot (z. B. wenn M1 zwischenzeitlich änderte). */
  activeCheckpoints?: PrefillRunActiveCheckpoints;
};

type AppendFrozenRunInput = CreateOpenRunInput & {
  answers: PrefillRunAnswers;
};

type CaseGuardRow = {
  id: string;
  doctor_confirmed: boolean;
  clinical_status: string;
};

/**
 * Holt alle eingefrorenen Runs eines Falls, aufsteigend nach `sequence`.
 */
export async function getFrozenRuns(
  caseId: string,
  client: PrismaLike = defaultPrisma,
): Promise<PrefillRun[]> {
  return client.prefillRun.findMany({
    where: { case_id: caseId, frozen_at: { not: null } },
    orderBy: { sequence: "asc" },
  });
}

/**
 * Liefert den (höchstens einen) offenen Run eines Falls oder `null`.
 */
export async function getOpenRun(
  caseId: string,
  client: PrismaLike = defaultPrisma,
): Promise<PrefillRun | null> {
  return client.prefillRun.findFirst({
    where: { case_id: caseId, frozen_at: null },
    orderBy: { sequence: "desc" },
  });
}

/**
 * Legt einen neuen offenen Run an. Wirft `PrefillRunError`, wenn der Fall
 * bereits einen offenen Run hat oder ärztlich bestätigt ist.
 */
export async function createOpenRun(
  input: CreateOpenRunInput,
  client: PrismaLike = defaultPrisma,
): Promise<PrefillRun> {
  if (!isPrefillRunSource(input.source)) {
    throw new PrefillRunError("invalid_source", `Ungültige Quelle: ${String(input.source)}`);
  }

  return client.$transaction(async (tx) => {
    const guard = await loadCaseGuard(tx, input.caseId);
    assertCaseAcceptsNewRun(guard);

    const existingOpen = await tx.prefillRun.findFirst({
      where: { case_id: input.caseId, frozen_at: null },
      select: { id: true },
    });
    if (existingOpen) {
      throw new PrefillRunError(
        "open_run_exists",
        `Fall ${input.caseId} hat bereits einen offenen PrefillRun.`,
      );
    }

    const sequence = await nextSequence(tx, input.caseId);
    return tx.prefillRun.create({
      data: {
        case_id: input.caseId,
        sequence,
        source: input.source,
        active_checkpoints: toJsonInput(input.activeCheckpoints),
        answers: toJsonInput(input.answers ?? {}),
        created_by_account_id: input.createdByAccountId ?? null,
        patient_token_used: input.patientTokenUsed ?? null,
        frozen_at: null,
      },
    });
  });
}

/**
 * Friert einen vorhandenen offenen Run ein. Schreibt die übergebenen
 * `answers` (und optional einen aktualisierten Checkpoint-Snapshot) und
 * setzt `frozen_at = now()`.
 */
export async function freezeRun(
  input: FreezeRunInput,
  client: PrismaLike = defaultPrisma,
): Promise<PrefillRun> {
  return client.$transaction(async (tx) => {
    const guard = await loadCaseGuard(tx, input.caseId);
    assertCaseAcceptsNewRun(guard);

    const run = await tx.prefillRun.findUnique({ where: { id: input.runId } });
    if (!run || run.case_id !== input.caseId) {
      throw new PrefillRunError("no_open_run", `PrefillRun ${input.runId} nicht gefunden.`);
    }
    if (run.frozen_at) {
      throw new PrefillRunError(
        "run_already_frozen",
        `PrefillRun ${input.runId} ist bereits eingefroren.`,
      );
    }

    const data: Prisma.PrefillRunUpdateInput = {
      answers: toJsonInput(input.answers),
      frozen_at: new Date(),
    };
    if (input.activeCheckpoints !== undefined) {
      data.active_checkpoints = toJsonInput(input.activeCheckpoints);
    }

    return tx.prefillRun.update({
      where: { id: input.runId },
      data,
    });
  });
}

/**
 * Atomarer Shortcut: Legt einen sofort eingefrorenen Run an. Nützlich für
 * den Patientenrücklauf via Token, der direkt vollständig ist.
 *
 * Wichtig (Regel 1): Wenn bereits ein offener Run anderer Quelle existiert,
 * wird er **nicht** angetastet – der neue Run wird zusätzlich angelegt. Das
 * gelingt nur, weil der partielle Unique-Index auf offene Runs zielt; ein
 * sofort eingefrorener Run kollidiert nicht damit.
 */
export async function appendFrozenRun(
  input: AppendFrozenRunInput,
  client: PrismaLike = defaultPrisma,
): Promise<PrefillRun> {
  if (!isPrefillRunSource(input.source)) {
    throw new PrefillRunError("invalid_source", `Ungültige Quelle: ${String(input.source)}`);
  }

  return client.$transaction(async (tx) => {
    const guard = await loadCaseGuard(tx, input.caseId);
    assertCaseAcceptsNewRun(guard);

    const sequence = await nextSequence(tx, input.caseId);
    return tx.prefillRun.create({
      data: {
        case_id: input.caseId,
        sequence,
        source: input.source,
        active_checkpoints: toJsonInput(input.activeCheckpoints),
        answers: toJsonInput(input.answers),
        created_by_account_id: input.createdByAccountId ?? null,
        patient_token_used: input.patientTokenUsed ?? null,
        frozen_at: new Date(),
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loadCaseGuard(
  tx: Pick<PrismaClient, "caseSession">,
  caseId: string,
): Promise<CaseGuardRow> {
  const row = await tx.caseSession.findUnique({
    where: { id: caseId },
    select: { id: true, doctor_confirmed: true, clinical_status: true },
  });
  if (!row) {
    throw new PrefillRunError("case_not_found", `Fall ${caseId} existiert nicht.`);
  }
  return row;
}

function assertCaseAcceptsNewRun(guard: CaseGuardRow): void {
  if (guard.doctor_confirmed || guard.clinical_status === "confirmed") {
    throw new PrefillRunError(
      "case_confirmed",
      `Fall ${guard.id} ist ärztlich bestätigt – keine neuen PrefillRuns mehr möglich.`,
    );
  }
}

async function nextSequence(
  tx: Pick<PrismaClient, "prefillRun">,
  caseId: string,
): Promise<number> {
  const last = await tx.prefillRun.findFirst({
    where: { case_id: caseId },
    orderBy: { sequence: "desc" },
    select: { sequence: true },
  });
  return (last?.sequence ?? 0) + 1;
}

function toJsonInput(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
