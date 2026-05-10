import { OfficeCheckpointState, type OfficeCheckpointSnapshot } from "@/lib/office/types";

export type HrGovernanceId = "HR-GOV-A" | "HR-GOV-B" | "HR-GOV-C" | "HR-GOV-D";

export type HrSummaryStatus = "FREIGEGEBEN" | "NICHT_FREIGEGEBEN" | "AUSSTEHEND";

export type HrSummaryResult = {
  status: HrSummaryStatus;
  reasons: string[];
};

export type HrM4ActionType =
  | "NO_BLOCKER"
  | "OPEN_MISSING_INFO"
  | "OPEN_EXTERNAL_CONFIRMATION";

export type HrM4Action = {
  checkpointId: string;
  normalizedId: HrGovernanceId;
  actionType: HrM4ActionType;
  message: string;
};

export type HrCheckpointEvaluation = {
  checkpointId: string;
  normalizedId: HrGovernanceId;
  state: OfficeCheckpointState;
  missingNote: string;
  answerSource: string;
};

export type HrGovernanceEvaluation = {
  checkpoints: HrCheckpointEvaluation[];
  summaryStatus: HrSummaryResult;
  m4Actions: HrM4Action[];
};

const HR_GOV_IDS: readonly HrGovernanceId[] = [
  "HR-GOV-A",
  "HR-GOV-B",
  "HR-GOV-C",
  "HR-GOV-D",
] as const;

const LEGACY_HR_MAP: Record<string, HrGovernanceId> = {
  "HR-01": "HR-GOV-A",
  "HR-02": "HR-GOV-A",
  "HR-03": "HR-GOV-C",
  "HR-04": "HR-GOV-B",
  "HR-05": "HR-GOV-D",
};

export function mapLegacyHrCheckpointId(id: string): string {
  return LEGACY_HR_MAP[id] ?? id;
}

function isHrGovernanceId(id: string): id is HrGovernanceId {
  return (HR_GOV_IDS as readonly string[]).includes(id);
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/\u00e4/g, "ae")
    .replace(/\u00f6/g, "oe")
    .replace(/\u00fc/g, "ue")
    .replace(/\u00df/g, "ss");
}

function hintsExternalConfirmation(missingNote: string, answerSource: string): boolean {
  const haystack = normalizeText(`${missingNote} ${answerSource}`);
  return ["kv", "aerztekammer", "zulassungsausschuss", "versicherung"].some((key) =>
    haystack.includes(key),
  );
}

function toHrEvaluations(checkpoints: OfficeCheckpointSnapshot[]): HrCheckpointEvaluation[] {
  return checkpoints
    .map((checkpoint) => {
      const normalized = mapLegacyHrCheckpointId(checkpoint.id);
      if (!isHrGovernanceId(normalized)) return null;
      return {
        checkpointId: checkpoint.id,
        normalizedId: normalized,
        state: checkpoint.state,
        missingNote: (checkpoint.missing_note ?? "").trim(),
        answerSource: (checkpoint.answer_source ?? "").trim(),
      } satisfies HrCheckpointEvaluation;
    })
    .filter((item): item is HrCheckpointEvaluation => item !== null);
}

function aggregateStateForId(
  evaluations: HrCheckpointEvaluation[],
  id: HrGovernanceId,
): OfficeCheckpointState | "MISSING" {
  const states = evaluations.filter((item) => item.normalizedId === id).map((item) => item.state);
  if (states.length === 0) return "MISSING";
  if (states.includes(OfficeCheckpointState.NO)) return OfficeCheckpointState.NO;
  if (states.includes(OfficeCheckpointState.OPEN)) return OfficeCheckpointState.OPEN;
  return OfficeCheckpointState.YES;
}

export function deriveHrSummaryStatus(
  checkpoints: OfficeCheckpointSnapshot[],
): HrSummaryResult {
  const evaluations = toHrEvaluations(checkpoints);
  const aggregate = new Map<HrGovernanceId, OfficeCheckpointState | "MISSING">();

  for (const id of HR_GOV_IDS) {
    aggregate.set(id, aggregateStateForId(evaluations, id));
  }

  const reasons: string[] = [];

  const noIds = HR_GOV_IDS.filter((id) => aggregate.get(id) === OfficeCheckpointState.NO);
  if (noIds.length > 0) {
    reasons.push(
      ...noIds.map((id) => `${id}: Status NO blockiert die Gesamtfreigabe.`),
    );
    return { status: "NICHT_FREIGEGEBEN", reasons };
  }

  const ausstehendIds = HR_GOV_IDS.filter((id) => {
    const state = aggregate.get(id);
    return state === OfficeCheckpointState.OPEN || state === "MISSING";
  });

  if (ausstehendIds.length > 0) {
    reasons.push(
      ...ausstehendIds.map((id) => {
        const state = aggregate.get(id);
        if (state === "MISSING") {
          return `${id}: Checkpoint fehlt im Snapshot.`;
        }
        return `${id}: Status OPEN erfordert weitere Klaerung.`;
      }),
    );
    return { status: "AUSSTEHEND", reasons };
  }

  reasons.push("HR-GOV-A bis HR-GOV-D sind auf YES.");
  return { status: "FREIGEGEBEN", reasons };
}

export function deriveHrM4Actions(
  checkpoints: OfficeCheckpointSnapshot[],
): HrM4Action[] {
  const evaluations = toHrEvaluations(checkpoints);

  const actions: HrM4Action[] = [];

  for (const item of evaluations) {
    if (item.state === OfficeCheckpointState.NO) {
      actions.push({
          checkpointId: item.checkpointId,
          normalizedId: item.normalizedId,
          actionType: "NO_BLOCKER",
          message: `${item.normalizedId}: Negativer Governance-Status muss vor Freigabe aufgeloest werden.`,
      });
      continue;
    }

    if (item.state === OfficeCheckpointState.OPEN) {
      const external = hintsExternalConfirmation(item.missingNote, item.answerSource);
      actions.push({
          checkpointId: item.checkpointId,
          normalizedId: item.normalizedId,
          actionType: external ? "OPEN_EXTERNAL_CONFIRMATION" : "OPEN_MISSING_INFO",
          message: external
            ? `${item.normalizedId}: Externe Bestaetigung steht aus.`
            : `${item.normalizedId}: Fehlende Information intern nacherheben.`,
      });
    }
  }

  return actions;
}

export function evaluateHrGovernance(
  checkpoints: OfficeCheckpointSnapshot[],
): HrGovernanceEvaluation {
  const evaluations = toHrEvaluations(checkpoints);
  return {
    checkpoints: evaluations,
    summaryStatus: deriveHrSummaryStatus(checkpoints),
    m4Actions: deriveHrM4Actions(checkpoints),
  };
}
