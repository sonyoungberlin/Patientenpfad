import {
  OFFICE_MANAGEMENT_KIND_ANLASS,
  OFFICE_MANAGEMENT_KIND_ENTSCHEIDUNG,
  OFFICE_MANAGEMENT_KIND_EXTERNE_STELLE,
  OFFICE_MANAGEMENT_KIND_NACHWEIS,
  OFFICE_MANAGEMENT_KIND_PFLICHT_FRIST,
  OFFICE_MANAGEMENT_KIND_RISIKO_ABHAENGIGKEIT,
  OFFICE_MANAGEMENT_KIND_VERANTWORTUNG,
} from "@/lib/office/checkpointCatalog";
import { deriveTopicActions, type DerivedAction } from "@/lib/office/derivedActions";
import { OfficeCheckpointState, OfficeCheckpointType, type OfficeCheckpointSnapshot } from "@/lib/office/types";

export type OfficeBlockStatus = "geklaert" | "offen";

export type OfficeBlock = {
  id: string;
  title: string;
  checkpoints: OfficeCheckpointSnapshot[];
  actions: DerivedAction[];
  status: OfficeBlockStatus;
};

type OfficeBlockDefinition = {
  id: string;
  title: string;
};

type BuildOfficeBlocksInput = {
  topicId?: string | null;
  checkpoints: OfficeCheckpointSnapshot[];
};

const OPEN_PREFIXES = ["Offen: ", "Nicht vollstaendig: "] as const;

const BLOCK_DEFINITIONS: readonly OfficeBlockDefinition[] = [
  { id: "berufsrechtliche-voraussetzungen", title: "Berufsrechtliche Voraussetzungen" },
  { id: "kv-zulassung-abrechnung", title: "KV / Zulassung / Abrechnung" },
  { id: "vertrag-startorganisation", title: "Vertrag und Startorganisation" },
  { id: "zeitraum-vertretung", title: "Zeitraum und Vertretung" },
  { id: "externe-stellen-pflichten", title: "Externe Stellen und Pflichten" },
  { id: "kommunikation", title: "Kommunikation" },
  { id: "notfallversorgung", title: "Notfallversorgung" },
  { id: "abrechnung-zustaendigkeit", title: "Abrechnung / Zustaendigkeit" },
  { id: "zeitraum-punktestand", title: "Zeitraum und Punktestand" },
  { id: "nachweise-meldung", title: "Nachweise und Meldung" },
  { id: "frist-massnahmen", title: "Frist und Massnahmen" },
  { id: "nachweise", title: "Nachweise" },
  { id: "externe-stelle", title: "Externe Stelle" },
  { id: "regelpruefung", title: "Regelpruefung" },
  { id: "interne-entscheidung", title: "Interne Entscheidung" },
  { id: "kontext", title: "Kontext" },
  { id: "interne-organisation", title: "Interne Organisation" },
  { id: "nachweise-fristen", title: "Nachweise und Fristen" },
  { id: "weitere-klaerung", title: "Weitere Klaerung" },
] as const;

const BLOCK_TITLE_BY_ID = new Map(BLOCK_DEFINITIONS.map((entry) => [entry.id, entry.title]));

const CHECKPOINT_ID_TO_BLOCK_ID: Record<string, string> = {
  "NC-REGISTERSTATUS": "berufsrechtliche-voraussetzungen",
  "NC-APPROBATION": "berufsrechtliche-voraussetzungen",
  "NC-FACHARZTQUALIFIKATION": "berufsrechtliche-voraussetzungen",
  "NC-BERUFSHAFTPFLICHT": "berufsrechtliche-voraussetzungen",

  "NC-TAETIGKEITSUMFANG": "kv-zulassung-abrechnung",
  "NC-EXTERNE_STELLE": "kv-zulassung-abrechnung",
  "NC-ANTRAGSWEG": "kv-zulassung-abrechnung",
  "NC-GENEHMIGUNGSSTATUS": "kv-zulassung-abrechnung",
  "NC-LANR_BSNR_ZUORDNUNG": "kv-zulassung-abrechnung",

  "NC-BETRIEBSSTAETTENSTRUKTUR": "vertrag-startorganisation",
  "NC-ARBEITSVERTRAG_FREIGABE": "vertrag-startorganisation",
  "NC-SYSTEMZUGRIFFE_EINGERICHTET": "vertrag-startorganisation",

  "UV-01": "zeitraum-vertretung",
  "UV-05": "zeitraum-vertretung",
  "UV-02": "externe-stellen-pflichten",
  "UV-06": "externe-stellen-pflichten",
  "UV-PATIENTENINFO": "kommunikation",
  "UV-TERMINMANAGEMENT": "kommunikation",
  "UV-NOTFALLVERSORGUNG": "notfallversorgung",
  "UV-ABRECHNUNGSZUORDNUNG": "abrechnung-zustaendigkeit",

  "FB-01": "zeitraum-punktestand",
  "FB-02": "zeitraum-punktestand",
  "FB-03": "nachweise-meldung",
  "FB-05": "nachweise-meldung",
  "FB-04": "frist-massnahmen",
  "FB-06": "frist-massnahmen",
  "FB-AUFHOLPLAN": "frist-massnahmen",
};

const OFFICE_KIND_TO_BLOCK_ID: Record<string, string> = {
  [OFFICE_MANAGEMENT_KIND_ANLASS]: "interne-organisation",
  [OFFICE_MANAGEMENT_KIND_PFLICHT_FRIST]: "nachweise-fristen",
  [OFFICE_MANAGEMENT_KIND_VERANTWORTUNG]: "interne-organisation",
  [OFFICE_MANAGEMENT_KIND_NACHWEIS]: "nachweise-fristen",
  [OFFICE_MANAGEMENT_KIND_ENTSCHEIDUNG]: "interne-organisation",
  [OFFICE_MANAGEMENT_KIND_EXTERNE_STELLE]: "externe-stelle",
  [OFFICE_MANAGEMENT_KIND_RISIKO_ABHAENGIGKEIT]: "weitere-klaerung",
};

const CHECKPOINT_TYPE_TO_BLOCK_ID: Partial<Record<OfficeCheckpointType, string>> = {
  [OfficeCheckpointType.NACHWEIS_PFLICHT]: "nachweise",
  [OfficeCheckpointType.EXTERNE_BESTAETIGUNG]: "externe-stelle",
  [OfficeCheckpointType.REGEL_PARAMETER]: "regelpruefung",
  [OfficeCheckpointType.INTERNE_ENTSCHEIDUNG]: "interne-entscheidung",
  [OfficeCheckpointType.KONTEXT_INFORMATION]: "kontext",
};

function toBlockTitle(blockId: string): string {
  return BLOCK_TITLE_BY_ID.get(blockId) ?? "Weitere Klaerung";
}

function normalizeActionText(value: string): string {
  let result = value.trim();
  for (const prefix of OPEN_PREFIXES) {
    if (result.startsWith(prefix)) {
      result = result.slice(prefix.length).trim();
    }
  }
  return result;
}

function isOpenAction(action: DerivedAction): boolean {
  return action.status === "offen" || action.status === "nicht_vollstaendig";
}

function resolveBlockId(checkpoint: OfficeCheckpointSnapshot): string {
  const byCheckpointId = CHECKPOINT_ID_TO_BLOCK_ID[checkpoint.id];
  if (byCheckpointId) return byCheckpointId;

  const byOfficeKind = checkpoint.office_kind ? OFFICE_KIND_TO_BLOCK_ID[checkpoint.office_kind] : undefined;
  if (byOfficeKind) return byOfficeKind;

  if (checkpoint.checkpointType) {
    const byCheckpointType = CHECKPOINT_TYPE_TO_BLOCK_ID[checkpoint.checkpointType];
    if (byCheckpointType) return byCheckpointType;
  }

  return "weitere-klaerung";
}

export function buildOfficeBlocks(input: BuildOfficeBlocksInput): OfficeBlock[] {
  const checkpoints = input.checkpoints ?? [];
  if (checkpoints.length === 0) return [];

  const topicActions = deriveTopicActions({
    topicId: input.topicId,
    checkpoints,
  });

  const actionsByCheckpoint = new Map<string, DerivedAction[]>();
  for (const action of topicActions) {
    const existing = actionsByCheckpoint.get(action.checkpointId) ?? [];
    existing.push(action);
    actionsByCheckpoint.set(action.checkpointId, existing);
  }

  const blockMap = new Map<string, OfficeBlock>();
  const blockOrder: string[] = [];

  for (const checkpoint of checkpoints) {
    const blockId = resolveBlockId(checkpoint);
    const checkpointActions = actionsByCheckpoint.get(checkpoint.id) ?? [];

    if (!blockMap.has(blockId)) {
      blockMap.set(blockId, {
        id: blockId,
        title: toBlockTitle(blockId),
        checkpoints: [],
        actions: [],
        status: "geklaert",
      });
      blockOrder.push(blockId);
    }

    const block = blockMap.get(blockId);
    if (!block) continue;

    block.checkpoints.push(checkpoint);
    block.actions.push(...checkpointActions);
  }

  return blockOrder
    .map((blockId) => blockMap.get(blockId))
    .filter((block): block is OfficeBlock => Boolean(block))
    .map((block) => {
      const hasOpenOrNoCheckpoint = block.checkpoints.some(
        (checkpoint) => checkpoint.state === OfficeCheckpointState.OPEN || checkpoint.state === OfficeCheckpointState.NO,
      );
      return {
        ...block,
        status: hasOpenOrNoCheckpoint ? "offen" : "geklaert",
      };
    });
}

export function getPrimaryOpenTextForBlock(block: OfficeBlock): string | null {
  if (block.status !== "offen") return null;

  const firstOpenAction = block.actions.find(isOpenAction);
  if (firstOpenAction) {
    return normalizeActionText(firstOpenAction.text);
  }

  const hasNoCheckpoint = block.checkpoints.some((checkpoint) => checkpoint.state === OfficeCheckpointState.NO);
  if (hasNoCheckpoint) return "Nicht ausreichend geklaert";

  const hasOpenCheckpoint = block.checkpoints.some((checkpoint) => checkpoint.state === OfficeCheckpointState.OPEN);
  if (hasOpenCheckpoint) return "Klaerung steht aus";

  return null;
}

export function getBlockAnswerSources(block: OfficeBlock): string[] {
  const sources = block.actions
    .filter(isOpenAction)
    .map((action) => action.answerOwner.trim())
    .filter((value) => value.length > 0);

  return Array.from(new Set(sources));
}

function actionToNextStep(action: DerivedAction, checkpointTitle: string): string {
  switch (action.type) {
    case "evidence_missing":
      return `Nachweis beschaffen: ${checkpointTitle}`;
    case "external_confirmation_pending":
      return `Klaerung anfragen: ${action.answerOwner}`;
    case "internal_decision_pending":
      return `Interne Entscheidung dokumentieren: ${checkpointTitle}`;
    case "rule_check_required":
      return `Regelabgleich durchfuehren: ${checkpointTitle}`;
    case "process_path_unclear":
      return `Verfahrensweg klaeren: ${checkpointTitle}`;
    case "context_incomplete":
    default:
      return `Klaerung vervollstaendigen: ${checkpointTitle}`;
  }
}

export function getTopNextSteps(blocks: readonly OfficeBlock[], maxItems = 5): string[] {
  const nextSteps: string[] = [];
  const seen = new Set<string>();

  for (const block of blocks) {
    const openActions = block.actions.filter(isOpenAction);
    for (const action of openActions) {
      const checkpoint = block.checkpoints.find((item) => item.id === action.checkpointId);
      const checkpointTitle = checkpoint?.title ?? action.checkpointId;
      const step = actionToNextStep(action, checkpointTitle);
      const key = step.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      nextSteps.push(step);
      if (nextSteps.length >= maxItems) return nextSteps;
    }

    if (openActions.length === 0 && block.status === "offen") {
      const fallbackStep = `Klaerung abstimmen: ${block.title}`;
      const key = fallbackStep.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      nextSteps.push(fallbackStep);
      if (nextSteps.length >= maxItems) return nextSteps;
    }
  }

  return nextSteps;
}
