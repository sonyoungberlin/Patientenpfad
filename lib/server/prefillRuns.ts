/**
 * Service-Schicht für `PrefillRun`.
 *
 * Ab Schritt 2 der PrefillRun-Umstellung werden die M2-Schreibpfade
 * (`app/api/cases/[id]/m2/prefill/route.ts` und
 * `app/api/m2-link/[token]/route.ts`) ausschließlich über diese Funktionen
 * geführt. `ctx_prefill`, `preparation_mode` und `m2_status` werden parallel
 * als Cache/Kompatibilitätsschicht synchron gehalten; Lesepfade und UI
 * bleiben in diesem Schritt unverändert.
 *
 * Vorab festgelegte fachliche Regeln:
 *
 *  1. Der Patientenrücklauf verwendet denselben aktuellen-Stand-Upsert wie
 *     MFA und Patientengespräch. Ein offener Run einer anderen Quelle bleibt
 *     unverändert.
 *  2. Token-Invalidierung beim MFA-Speichern bleibt weiterhin Sache der
 *     Route; diese Schicht ändert `m2_token` / `m2_status` nicht.
 *  3. Speichernde Run-Operationen akzeptieren keine ärztlich bestätigten
 *     Fälle. `allowConfirmed` bleibt für bestehende Aufrufer typisiert,
 *     kann diese Schreibsperre aber nicht umgehen.
 */

import { Prisma, type PrismaClient, type PrefillRun } from "@prisma/client";
import { randomUUID } from "node:crypto";

import { prisma as defaultPrisma } from "@/lib/prisma";

/** Erlaubte Quellen eines Runs. */
export const PREFILL_RUN_SOURCES = ["mfa", "conversation", "patient"] as const;
export type PrefillRunSource = (typeof PREFILL_RUN_SOURCES)[number];
export const PREFILL_CHANGED_STATUS_PREFIX = "prefill_changed:";

export type PrefillChangedClinicalStatus = {
  token: string;
  wasPrepared: boolean;
  reviewedCheckpointIds: string[];
};

export function isPrefillChangedClinicalStatus(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(PREFILL_CHANGED_STATUS_PREFIX);
}

export function parsePrefillChangedClinicalStatus(
  value: unknown,
): PrefillChangedClinicalStatus | null {
  if (!isPrefillChangedClinicalStatus(value)) return null;
  const parts = value.slice(PREFILL_CHANGED_STATUS_PREFIX.length).split(":");
  const wasPrepared = parts[0] === "prepared";
  const tokenIndex = wasPrepared ? 1 : 0;
  const token = parts[tokenIndex];
  if (!token) return null;

  let reviewedCheckpointIds: string[] = [];
  if (parts[tokenIndex + 1] === "reviewed" && parts[tokenIndex + 2]) {
    try {
      const decoded: unknown = JSON.parse(decodeURIComponent(parts[tokenIndex + 2]));
      if (Array.isArray(decoded)) {
        reviewedCheckpointIds = decoded.filter(
          (checkpointId): checkpointId is string => typeof checkpointId === "string",
        );
      }
    } catch {
      reviewedCheckpointIds = [];
    }
  }

  return { token, wasPrepared, reviewedCheckpointIds };
}

export function withReviewedPrefillCheckpoints(
  marker: PrefillChangedClinicalStatus,
  checkpointIds: Iterable<string>,
): string {
  const ids = [...new Set(checkpointIds)].sort();
  return `${PREFILL_CHANGED_STATUS_PREFIX}${marker.wasPrepared ? "prepared:" : ""}${marker.token}:reviewed:${encodeURIComponent(JSON.stringify(ids))}`;
}

export function isPreparedClinicalStatus(value: unknown): boolean {
  return value === "prepared" || parsePrefillChangedClinicalStatus(value)?.wasPrepared === true;
}

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
  /**
   * Umgeht die Sperre für `doctor_confirmed` / `clinical_status="confirmed"`
   * (Regel 3). Wird in Schritt 2 der PrefillRun-Umstellung von den
   * umgestellten Routen gesetzt, damit das Außenverhalten identisch zur
   * vorherigen Implementierung bleibt. Der endgültige Hard-Stop folgt in
   * einem späteren Schritt.
   */
  allowConfirmed?: boolean;
};

type FreezeRunInput = {
  caseId: string;
  runId: string;
  answers: PrefillRunAnswers;
  /** Optional aktualisierter Snapshot (z. B. wenn M1 zwischenzeitlich änderte). */
  activeCheckpoints?: PrefillRunActiveCheckpoints;
  /**
   * Optionale Quell-Korrektur: Falls der offene Run mit einer anderen Quelle
   * angelegt wurde (z. B. "mfa" bei Ergänzungs-Flow, aber Nutzer wechselt auf
   * "conversation"), wird die Quelle beim Einfrieren auf diesen Wert gesetzt.
   */
  source?: PrefillRunSource;
  /** Siehe `CreateOpenRunInput.allowConfirmed`. */
  allowConfirmed?: boolean;
};

type AppendFrozenRunInput = CreateOpenRunInput & {
  answers: PrefillRunAnswers;
  caseSessionUpdate?: Omit<Prisma.CaseSessionUpdateInput, "ctx_prefill">;
  /** Neutralisiert M3-Ratings atomar, aber nur wenn sich der effektive Prefill ändert. */
  resetM3RatingsOnChange?: boolean;
};

type SaveCurrentRunInput = AppendFrozenRunInput;

type CaseGuardRow = {
  id: string;
  doctor_confirmed: boolean;
  clinical_status: string;
  active_checkpoints?: unknown;
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
 * Liefert den aktuell wirksamen Antwortstand einer Quelle. Ältere Delta-Runs
 * bleiben dabei gültig: spätere Antworten überschreiben nur dieselben
 * Checkpoint-/Fragewerte; ausgelassene Antworten werden beibehalten. `null`
 * bedeutet, dass es für die Quelle noch keinen Run gibt.
 */
export async function getCurrentRunAnswers(
  caseId: string,
  source: PrefillRunSource,
  client: PrismaLike = defaultPrisma,
): Promise<PrefillRunAnswers | null> {
  const runs = await client.prefillRun.findMany({
    where: { case_id: caseId },
    orderBy: { sequence: "asc" },
  });
  const sourceRuns = runs.filter((run) => run.source === source);
  return sourceRuns.length > 0 ? mergeRunAnswers(sourceRuns) : null;
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
    if (!input.allowConfirmed) assertCaseAcceptsNewRun(guard);

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
    if (!input.allowConfirmed) assertCaseAcceptsNewRun(guard);

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
    // Fehler-2-Fix: Quelle korrigieren, wenn der Run mit anderer source angelegt
    // wurde (z. B. MFA-Run aus Ergänzungs-Flow, jetzt als Patientengespräch gespeichert).
    if (input.source !== undefined && input.source !== run.source) {
      data.source = input.source;
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
  const result = await saveCurrentRun(input, client);
  return result.run;
}

/**
 * Aktualisiert den aktuellen wirksamen Run einer Quelle. Vorhandene Runs
 * werden je Checkpoint in Sequenzreihenfolge zusammengeführt, damit ältere
 * Delta-Runs weiterhin gültige Antworten beitragen. Der neueste Run dieser
 * Quelle wird anschließend als vollständiger aktueller Stand überschrieben.
 *
 * Das Schreiben des Runs und optionaler CaseSession-Kompatibilitätsdaten
 * erfolgt atomar. Der Rückgabewert `changed` vergleicht den wirksamen
 * Antwortstand vor und nach dem Speichern und steuert bei aktivierter
 * `resetM3RatingsOnChange`-Option den M3-Reset in derselben Transaktion.
 */
export async function saveCurrentRun(
  input: SaveCurrentRunInput,
  client: PrismaLike = defaultPrisma,
): Promise<{ run: PrefillRun; changed: boolean }> {
  if (!isPrefillRunSource(input.source)) {
    throw new PrefillRunError("invalid_source", `Ungültige Quelle: ${String(input.source)}`);
  }

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await client.$transaction(async (tx) => {
        const guard = await loadCaseGuard(tx, input.caseId);
        assertCaseAcceptsNewRun(guard);

        const runs = await tx.prefillRun.findMany({
          where: { case_id: input.caseId },
          orderBy: { sequence: "asc" },
        });
        const sourceRuns = runs.filter((run) => run.source === input.source);
        const existingAnswers = mergeRunAnswers(sourceRuns);
        const nextAnswers = mergePrefillAnswers(existingAnswers, input.answers);
        const changed = stableJson(existingAnswers) !== stableJson(nextAnswers);

        const now = new Date();
        const currentRun = sourceRuns[sourceRuns.length - 1];
        const run = currentRun
          ? await tx.prefillRun.update({
              where: { id: currentRun.id },
              data: {
                source: input.source,
                active_checkpoints: toJsonInput(input.activeCheckpoints),
                answers: toJsonInput(nextAnswers),
                created_by_account_id: input.createdByAccountId ?? currentRun.created_by_account_id,
                frozen_at: now,
              },
            })
          : await tx.prefillRun.create({
              data: {
                case_id: input.caseId,
                sequence: nextSequenceFromRuns(runs),
                source: input.source,
                active_checkpoints: toJsonInput(input.activeCheckpoints),
                answers: toJsonInput(nextAnswers),
                created_by_account_id: input.createdByAccountId ?? null,
                frozen_at: now,
              },
            });

        const shouldResetRatings = input.resetM3RatingsOnChange === true && changed;
        if (input.caseSessionUpdate || shouldResetRatings) {
          const caseSessionUpdate: Prisma.CaseSessionUpdateInput = {
            ...input.caseSessionUpdate,
            ctx_prefill: toJsonInput(nextAnswers),
          };
          if (shouldResetRatings) {
            const neutralizedCheckpoints = resetM3CheckpointStatuses(guard.active_checkpoints);
            if (neutralizedCheckpoints) {
              caseSessionUpdate.active_checkpoints = toJsonInput(neutralizedCheckpoints);
            }
            const preparedPrefix = isPreparedClinicalStatus(guard.clinical_status)
              ? "prepared:"
              : "";
            caseSessionUpdate.clinical_status =
              `${PREFILL_CHANGED_STATUS_PREFIX}${preparedPrefix}${randomUUID()}`;
          }
          await tx.caseSession.update({
            where: { id: input.caseId },
            data: caseSessionUpdate,
          });
        }

        return { run, changed };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (err) {
      const code = (err as { code?: unknown } | null)?.code;
      if (code === "P2034" && attempt < 2) continue;
      throw err;
    }
  }
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
    select: {
      id: true,
      doctor_confirmed: true,
      clinical_status: true,
      active_checkpoints: true,
    },
  });
  if (!row) {
    throw new PrefillRunError("case_not_found", `Fall ${caseId} existiert nicht.`);
  }
  return row;
}

function resetM3CheckpointStatuses(value: unknown): unknown[] | null {
  if (!Array.isArray(value)) return null;
  return value.map((checkpoint) => {
    if (!checkpoint || typeof checkpoint !== "object" || Array.isArray(checkpoint)) {
      return checkpoint;
    }
    const record = checkpoint as Record<string, unknown>;
    if (record.mode === "MULTI_SELECT" || typeof record.status !== "string") {
      return checkpoint;
    }
    return { ...record, status: "TO_DO" };
  });
}

function assertCaseAcceptsNewRun(guard: CaseGuardRow): void {
  if (guard.doctor_confirmed || guard.clinical_status === "confirmed") {
    throw new PrefillRunError(
      "case_confirmed",
      `Fall ${guard.id} ist ärztlich bestätigt – keine neuen PrefillRuns mehr möglich.`,
    );
  }
}

function mergeRunAnswers(runs: PrefillRun[]): PrefillRunAnswers {
  const answers: PrefillRunAnswers = {};
  for (const run of runs) {
    if (!run.answers || typeof run.answers !== "object" || Array.isArray(run.answers)) {
      continue;
    }
    for (const [checkpointId, checkpointAnswers] of Object.entries(run.answers)) {
      if (
        checkpointAnswers &&
        typeof checkpointAnswers === "object" &&
        !Array.isArray(checkpointAnswers)
      ) {
        answers[checkpointId] = mergeCheckpointAnswers(
          answers[checkpointId] ?? {},
          checkpointAnswers as Record<string, string>,
        );
      }
    }
  }
  return answers;
}

function mergePrefillAnswers(
  current: PrefillRunAnswers,
  update: PrefillRunAnswers,
): PrefillRunAnswers {
  const answers = { ...current };
  for (const [checkpointId, checkpointAnswers] of Object.entries(update)) {
    answers[checkpointId] = mergeCheckpointAnswers(
      answers[checkpointId] ?? {},
      checkpointAnswers,
    );
  }
  return answers;
}

function mergeCheckpointAnswers(
  current: Record<string, string>,
  update: Record<string, string>,
): Record<string, string> {
  const answers = { ...current };
  for (const [questionId, answer] of Object.entries(update)) {
    // `offen` is the server's default for unanswered questions, not an
    // explicit answer option. Do not let a default-filled delta erase a
    // previously captured response.
    if (answer === "offen" && answers[questionId] && answers[questionId] !== "offen") {
      continue;
    }
    answers[questionId] = answer;
  }
  return answers;
}

function nextSequenceFromRuns(runs: PrefillRun[]): number {
  return runs.reduce((highest, run) => Math.max(highest, run.sequence), 0) + 1;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value);
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
