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
  OfficeCheckpointState,
  type OfficeCheckpointSnapshot,
} from "@/lib/office/types";

export type DerivedActionStatus = "geklaert" | "offen" | "nicht_vollstaendig";

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
  status: DerivedActionStatus;
  text: string;
  answerOwner: string;
  processOwner?: OfficeOutcomeAudience;
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
  external_confirmation_pending: "Offen: Klaerung mit externer Stelle steht aus",
  evidence_missing: "Nicht vollstaendig: Nachweis fehlt",
  internal_decision_pending: "Offen: Entscheidung noch nicht dokumentiert",
  rule_check_required: "Offen: Klaerung steht aus",
  context_incomplete: "Offen: Klaerung steht aus",
  process_path_unclear: "Offen: Klaerung steht aus",
};

const ACTION_TEXT_OVERRIDES: Record<string, string> = {
  "OE-02": "Offen: Arbeitszeiten festlegen",
  "UV-ABRECHNUNGSZUORDNUNG": "Offen: Abrechnungszuordnung klaeren",
  "DS-04": "Nicht vollstaendig: Zugriffe absichern",
};

const ANSWER_OWNER_OVERRIDES: Record<string, string> = {
  "NC-APPROBATION": "Aerztekammer / Approbationsnachweis / Register",
  "NC-FACHARZTQUALIFIKATION": "Aerztekammer / Facharzturkunde",
  "NC-GENEHMIGUNGSSTATUS": "KV / Zulassungsausschuss",
  "NC-EXTERNE_STELLE": "KV / zustaendige externe Stelle",
  "NC-ARBEITSVERTRAG_FREIGABE": "Praxisleitung / Arbeitgeberunterlagen",
  "NC-LANR_BSNR_ZUORDNUNG": "KV-Abrechnungsdaten / PVS",
  "NC-SYSTEMZUGRIFFE_EINGERICHTET": "interne IT / PVS-Administration",
  "UV-ABRECHNUNGSZUORDNUNG": "KV-Abrechnungsdaten / PVS",
  "DS-04": "interne IT / Zugriffsdokumentation",
};

const PRIORITY_BY_FAILURE_EFFECT: Record<OfficeFailureEffect, number> = {
  [OfficeFailureEffect.GATEKEEPER]: 0,
  [OfficeFailureEffect.BLOCKER]: 1,
  [OfficeFailureEffect.RISK]: 2,
  [OfficeFailureEffect.NONE]: 3,
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

function toPriority(effect: OfficeFailureEffect): number {
  return PRIORITY_BY_FAILURE_EFFECT[effect] ?? 3;
}

function toActionType(checkpointType: OfficeCheckpointType): DerivedActionType {
  return ACTION_TYPE_BY_CHECKPOINT_TYPE[checkpointType] ?? "context_incomplete";
}

function toActionText(checkpointId: string, actionType: DerivedActionType): string {
  return ACTION_TEXT_OVERRIDES[checkpointId] ?? ACTION_TEXT_BY_TYPE[actionType];
}

function toAnswerOwner(checkpointId: string, checkpointType: OfficeCheckpointType): string {
  if (ANSWER_OWNER_OVERRIDES[checkpointId]) return ANSWER_OWNER_OVERRIDES[checkpointId];

  switch (checkpointType) {
    case OfficeCheckpointType.EXTERNE_BESTAETIGUNG:
      return "zustaendige externe Stelle";
    case OfficeCheckpointType.NACHWEIS_PFLICHT:
      return "Nachweis / Dokumentenquelle";
    case OfficeCheckpointType.REGEL_PARAMETER:
      return "Regelgrundlage / interne Pruefung";
    case OfficeCheckpointType.INTERNE_ENTSCHEIDUNG:
      return "Praxisleitung / interne Entscheidung";
    case OfficeCheckpointType.VERFAHRENSWEG:
      return "Verfahrensdokumentation";
    case OfficeCheckpointType.KONTEXT_INFORMATION:
    default:
      return "Falldokumentation";
  }
}

function toStatus(answer: "NO" | "UNCLEAR"): DerivedActionStatus {
  if (answer === "NO") return "nicht_vollstaendig";
  return "offen";
}

function actionSort(a: DerivedAction, b: DerivedAction): number {
  const priorityDelta = toPriorityFromAction(a) - toPriorityFromAction(b);
  if (priorityDelta !== 0) return priorityDelta;
  const statusDelta = statusRank(a.status) - statusRank(b.status);
  if (statusDelta !== 0) return statusDelta;
  const checkpointDelta = a.checkpointId.localeCompare(b.checkpointId);
  if (checkpointDelta !== 0) return checkpointDelta;
  return a.text.localeCompare(b.text);
}

function statusRank(status: DerivedActionStatus): number {
  if (status === "nicht_vollstaendig") return 0;
  if (status === "offen") return 1;
  return 2;
}

function toPriorityFromAction(action: DerivedAction): number {
  if (action.type === "evidence_missing") return 0;
  if (action.type === "external_confirmation_pending") return 1;
  if (action.type === "internal_decision_pending") return 2;
  if (action.type === "rule_check_required") return 3;
  if (action.type === "process_path_unclear") return 4;
  return 5;
}

function dedupeActionKey(action: Pick<DerivedAction, "checkpointId" | "type" | "status" | "text" | "answerOwner">): string {
  return `${action.checkpointId}::${action.type}::${action.status}::${action.text}::${action.answerOwner}`;
}

export function deriveCheckpointActions(input: DeriveCheckpointActionsInput): DerivedAction[] {
  const checkpointType = resolveCheckpointType(input);
  resolveFailureEffect(input);
  const processOwner = resolveOwner(input);
  const actionType = toActionType(checkpointType);
  const answerOwner = toAnswerOwner(input.checkpoint.id, checkpointType);

  if (input.checkpoint.state === OfficeCheckpointState.YES) {
    return [];
  }

  if (input.checkpoint.state === OfficeCheckpointState.NO) {
    return [{
      id: `${input.checkpoint.id}:${actionType}:state_no`,
      checkpointId: input.checkpoint.id,
      status: "nicht_vollstaendig",
      text: "Nicht ausreichend geklaert",
      answerOwner,
      processOwner,
      type: actionType,
    }];
  }

  const answers = input.checkpoint.m2_answers ?? {};
  const text = toActionText(input.checkpoint.id, actionType);
  const deduped = new Map<string, DerivedAction>();

  for (const question of input.questions) {
    const answer = answers[question.id];
    if (answer !== "NO" && answer !== "UNCLEAR") continue;
    const status = toStatus(answer);

    const candidate: DerivedAction = {
      id: `${input.checkpoint.id}:${actionType}:${status}`,
      checkpointId: input.checkpoint.id,
      status,
      text,
      answerOwner,
      processOwner,
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
