import {
  getOfficeCheckpointCatalog,
  isOfficeTopicId,
  type OfficeCheckpointTemplate,
} from "@/lib/office/checkpointCatalog";
import { getM2QuestionsForCheckpoint, type OfficeM2Question } from "@/lib/office/m2Questions";
import {
  OfficeCheckpointType,
  OfficeFailureEffect,
  OfficeOutcomeAudience,
  type OfficeCheckpointSnapshot,
} from "@/lib/office/types";

export type DerivedActionSeverity = "critical" | "high" | "medium" | "low";

export type DerivedActionType =
  | "external_confirmation_pending"
  | "evidence_missing"
  | "internal_decision_pending"
  | "rule_check_required"
  | "context_incomplete"
  | "process_path_unclear";

export type DerivedAction = {
  id: string;
  checkpointId: string;
  severity: DerivedActionSeverity;
  text: string;
  owner: OfficeOutcomeAudience;
  type: DerivedActionType;
  sourceQuestionId?: string;
};

type DeriveCheckpointActionsInput = {
  checkpoint: OfficeCheckpointSnapshot;
  questions: readonly OfficeM2Question[];
  checkpointTemplate?: Pick<OfficeCheckpointTemplate, "checkpointType" | "failureEffect" | "outcomeAudience">;
};

type DeriveTopicActionsInput = {
  topicId?: string | null;
  checkpoints: OfficeCheckpointSnapshot[];
};

const ACTION_TYPE_BY_CHECKPOINT_TYPE: Record<OfficeCheckpointType, DerivedActionType> = {
  [OfficeCheckpointType.EXTERNE_BESTAETIGUNG]: "external_confirmation_pending",
  [OfficeCheckpointType.NACHWEIS_PFLICHT]: "evidence_missing",
  [OfficeCheckpointType.INTERNE_ENTSCHEIDUNG]: "internal_decision_pending",
  [OfficeCheckpointType.REGEL_PARAMETER]: "rule_check_required",
  [OfficeCheckpointType.KONTEXT_INFORMATION]: "context_incomplete",
  [OfficeCheckpointType.VERFAHRENSWEG]: "process_path_unclear",
};

const ACTION_TEXT_BY_TYPE: Record<DerivedActionType, string> = {
  external_confirmation_pending: "Externe Rueckmeldung offen",
  evidence_missing: "Nachweis fehlt",
  internal_decision_pending: "Interne Entscheidung ausstehend",
  rule_check_required: "Regelpruefung erforderlich",
  context_incomplete: "Kontextinformation unvollstaendig",
  process_path_unclear: "Verfahrensweg klaeren",
};

const ACTION_TEXT_OVERRIDES: Record<string, string> = {
  "OE-02": "Arbeitszeiten festlegen",
  "UV-ABRECHNUNGSZUORDNUNG": "Abrechnungszuordnung klaeren",
  "DS-04": "Zugriffe absichern",
};

const SEVERITY_BY_FAILURE_EFFECT: Record<OfficeFailureEffect, DerivedActionSeverity> = {
  [OfficeFailureEffect.GATEKEEPER]: "critical",
  [OfficeFailureEffect.BLOCKER]: "high",
  [OfficeFailureEffect.RISK]: "medium",
  [OfficeFailureEffect.NONE]: "low",
};

const SEVERITY_RANK: Record<DerivedActionSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function resolveCheckpointType(input: DeriveCheckpointActionsInput): OfficeCheckpointType {
  return input.checkpoint.checkpointType
    ?? input.checkpointTemplate?.checkpointType
    ?? OfficeCheckpointType.KONTEXT_INFORMATION;
}

function resolveFailureEffect(input: DeriveCheckpointActionsInput): OfficeFailureEffect {
  return input.checkpoint.failureEffect
    ?? input.checkpointTemplate?.failureEffect
    ?? OfficeFailureEffect.NONE;
}

function resolveOwner(input: DeriveCheckpointActionsInput): OfficeOutcomeAudience {
  const audiences = input.checkpoint.outcomeAudience && input.checkpoint.outcomeAudience.length > 0
    ? input.checkpoint.outcomeAudience
    : input.checkpointTemplate?.outcomeAudience ?? [OfficeOutcomeAudience.BACKOFFICE];
  return audiences[0] ?? OfficeOutcomeAudience.BACKOFFICE;
}

function toSeverity(effect: OfficeFailureEffect): DerivedActionSeverity {
  return SEVERITY_BY_FAILURE_EFFECT[effect] ?? "low";
}

function toActionType(checkpointType: OfficeCheckpointType): DerivedActionType {
  return ACTION_TYPE_BY_CHECKPOINT_TYPE[checkpointType] ?? "context_incomplete";
}

function toActionText(checkpointId: string, actionType: DerivedActionType): string {
  return ACTION_TEXT_OVERRIDES[checkpointId] ?? ACTION_TEXT_BY_TYPE[actionType];
}

function actionSort(a: DerivedAction, b: DerivedAction): number {
  const severityDelta = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
  if (severityDelta !== 0) return severityDelta;
  const checkpointDelta = a.checkpointId.localeCompare(b.checkpointId);
  if (checkpointDelta !== 0) return checkpointDelta;
  return a.text.localeCompare(b.text);
}

function dedupeActionKey(action: Pick<DerivedAction, "checkpointId" | "type" | "owner" | "text">): string {
  return `${action.checkpointId}::${action.type}::${action.owner}::${action.text}`;
}

export function deriveCheckpointActions(input: DeriveCheckpointActionsInput): DerivedAction[] {
  const answers = input.checkpoint.m2_answers ?? {};
  const checkpointType = resolveCheckpointType(input);
  const failureEffect = resolveFailureEffect(input);
  const owner = resolveOwner(input);

  const actionType = toActionType(checkpointType);
  const text = toActionText(input.checkpoint.id, actionType);
  const severity = toSeverity(failureEffect);

  const deduped = new Map<string, DerivedAction>();

  for (const question of input.questions) {
    const answer = answers[question.id];
    if (answer !== "NO" && answer !== "UNCLEAR") continue;

    const candidate: DerivedAction = {
      id: `${input.checkpoint.id}:${actionType}:${owner}`,
      checkpointId: input.checkpoint.id,
      severity,
      text,
      owner,
      type: actionType,
      sourceQuestionId: question.id,
    };

    const key = dedupeActionKey(candidate);
    if (!deduped.has(key)) {
      deduped.set(key, candidate);
    }
  }

  return Array.from(deduped.values()).sort(actionSort);
}

export function deriveTopicActions(input: DeriveTopicActionsInput): DerivedAction[] {
  const checkpoints = input.checkpoints ?? [];
  if (checkpoints.length === 0) return [];

  const templateById = new Map<string, OfficeCheckpointTemplate>();
  const topicId = input.topicId && isOfficeTopicId(input.topicId)
    ? input.topicId
    : null;

  if (topicId) {
    for (const checkpoint of getOfficeCheckpointCatalog(topicId)) {
      templateById.set(checkpoint.id, checkpoint);
    }
  }

  const allActions: DerivedAction[] = [];

  for (const checkpoint of checkpoints) {
    const questions = topicId
      ? getM2QuestionsForCheckpoint(topicId, checkpoint.id)
      : [];
    if (questions.length === 0) continue;

    const actions = deriveCheckpointActions({
      checkpoint,
      questions,
      checkpointTemplate: templateById.get(checkpoint.id),
    });

    allActions.push(...actions);
  }

  const deduped = new Map<string, DerivedAction>();
  for (const action of allActions) {
    const key = dedupeActionKey(action);
    if (!deduped.has(key)) deduped.set(key, action);
  }

  return Array.from(deduped.values()).sort(actionSort);
}
