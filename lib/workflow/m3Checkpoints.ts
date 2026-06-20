import type { WorkflowRole, WorkflowM3CheckpointSnapshot } from "./types";
import {
  WORKFLOW_TOPIC_AU,
  WORKFLOW_TOPIC_REZEPT,
  WORKFLOW_TOPIC_UEBERWEISUNG,
  WORKFLOW_TOPIC_HEILMITTEL,
  WORKFLOW_TOPIC_HILFSMITTEL,
  WORKFLOW_TOPIC_KRANKENTRANSPORT,
  type WorkflowTopicId,
} from "./processCatalog";

export type WorkflowM3CheckpointDefinition = {
  id: string;
  title: string;
  /** Process-point-IDs per Rolle, die in diesen Checkpoint einfließen. */
  pointIdsByRole: {
    MFA?: readonly string[];
    ARZT?: readonly string[];
  };
};

const AU_M3_CHECKPOINTS: readonly WorkflowM3CheckpointDefinition[] = [
  {
    id: "WF-C01",
    title: "Formale Angaben",
    pointIdsByRole: {
      MFA: ["AU-P01", "AU-P02", "AU-P03", "AU-P04", "AU-P05", "AU-P06"],
      ARZT: ["AU-P01", "AU-P02", "AU-P03"],
    },
  },
  {
    id: "WF-C02",
    title: "Entscheidungsgrundlage",
    pointIdsByRole: {
      MFA: [],
      ARZT: ["AU-P07", "AU-P08"],
    },
  },
  {
    id: "WF-C03",
    title: "Verlauf und Kontext",
    pointIdsByRole: {
      MFA: ["AU-P10", "AU-P11"],
      ARZT: ["AU-P10", "AU-P11"],
    },
  },
  {
    id: "WF-C04",
    title: "Weiteres Vorgehen",
    pointIdsByRole: {
      MFA: [],
      ARZT: ["AU-P09"],
    },
  },
];

const REZEPT_M3_CHECKPOINTS: readonly WorkflowM3CheckpointDefinition[] = [
  { id: "WF-C01", title: "Formale Angaben",        pointIdsByRole: { MFA: ["RZ-P01"], ARZT: ["RZ-P01"] } },
  { id: "WF-C02", title: "Entscheidungsgrundlage", pointIdsByRole: { MFA: ["RZ-P02"], ARZT: ["RZ-P02"] } },
  { id: "WF-C03", title: "Verlauf und Kontext",    pointIdsByRole: { MFA: ["RZ-P03"], ARZT: ["RZ-P03"] } },
  { id: "WF-C04", title: "Weiteres Vorgehen",      pointIdsByRole: { MFA: ["RZ-P04"], ARZT: ["RZ-P04"] } },
];

const UEBERWEISUNG_M3_CHECKPOINTS: readonly WorkflowM3CheckpointDefinition[] = [
  { id: "WF-C01", title: "Formale Angaben",        pointIdsByRole: { MFA: ["UE-P01"], ARZT: ["UE-P01"] } },
  { id: "WF-C02", title: "Entscheidungsgrundlage", pointIdsByRole: { MFA: ["UE-P02"], ARZT: ["UE-P02"] } },
  { id: "WF-C03", title: "Verlauf und Kontext",    pointIdsByRole: { MFA: ["UE-P03"], ARZT: ["UE-P03"] } },
  { id: "WF-C04", title: "Weiteres Vorgehen",      pointIdsByRole: { MFA: ["UE-P04"], ARZT: ["UE-P04"] } },
];

const HEILMITTEL_M3_CHECKPOINTS: readonly WorkflowM3CheckpointDefinition[] = [
  { id: "WF-C01", title: "Formale Angaben",        pointIdsByRole: { MFA: ["HM-P01"], ARZT: ["HM-P01"] } },
  { id: "WF-C02", title: "Entscheidungsgrundlage", pointIdsByRole: { MFA: ["HM-P02"], ARZT: ["HM-P02"] } },
  { id: "WF-C03", title: "Verlauf und Kontext",    pointIdsByRole: { MFA: ["HM-P03"], ARZT: ["HM-P03"] } },
  { id: "WF-C04", title: "Weiteres Vorgehen",      pointIdsByRole: { MFA: ["HM-P04"], ARZT: ["HM-P04"] } },
];

const HILFSMITTEL_M3_CHECKPOINTS: readonly WorkflowM3CheckpointDefinition[] = [
  { id: "WF-C01", title: "Formale Angaben",        pointIdsByRole: { MFA: ["HI-P01"], ARZT: ["HI-P01"] } },
  { id: "WF-C02", title: "Entscheidungsgrundlage", pointIdsByRole: { MFA: ["HI-P02"], ARZT: ["HI-P02"] } },
  { id: "WF-C03", title: "Verlauf und Kontext",    pointIdsByRole: { MFA: ["HI-P03"], ARZT: ["HI-P03"] } },
  { id: "WF-C04", title: "Weiteres Vorgehen",      pointIdsByRole: { MFA: ["HI-P04"], ARZT: ["HI-P04"] } },
];

const KRANKENTRANSPORT_M3_CHECKPOINTS: readonly WorkflowM3CheckpointDefinition[] = [
  { id: "WF-C01", title: "Formale Angaben",        pointIdsByRole: { MFA: ["KT-P01"], ARZT: ["KT-P01"] } },
  { id: "WF-C02", title: "Entscheidungsgrundlage", pointIdsByRole: { MFA: ["KT-P02"], ARZT: ["KT-P02"] } },
  { id: "WF-C03", title: "Verlauf und Kontext",    pointIdsByRole: { MFA: ["KT-P03"], ARZT: ["KT-P03"] } },
  { id: "WF-C04", title: "Weiteres Vorgehen",      pointIdsByRole: { MFA: ["KT-P04"], ARZT: ["KT-P04"] } },
];

const M3_CHECKPOINTS_BY_TOPIC: Record<WorkflowTopicId, readonly WorkflowM3CheckpointDefinition[]> = {
  [WORKFLOW_TOPIC_AU]: AU_M3_CHECKPOINTS,
  [WORKFLOW_TOPIC_REZEPT]: REZEPT_M3_CHECKPOINTS,
  [WORKFLOW_TOPIC_UEBERWEISUNG]: UEBERWEISUNG_M3_CHECKPOINTS,
  [WORKFLOW_TOPIC_HEILMITTEL]: HEILMITTEL_M3_CHECKPOINTS,
  [WORKFLOW_TOPIC_HILFSMITTEL]: HILFSMITTEL_M3_CHECKPOINTS,
  [WORKFLOW_TOPIC_KRANKENTRANSPORT]: KRANKENTRANSPORT_M3_CHECKPOINTS,
};

export function getM3CheckpointDefinitions(
  topicId: WorkflowTopicId,
): readonly WorkflowM3CheckpointDefinition[] {
  return M3_CHECKPOINTS_BY_TOPIC[topicId] ?? [];
}

export function buildInitialM3Checkpoints(
  topicId: WorkflowTopicId,
): WorkflowM3CheckpointSnapshot[] {
  return getM3CheckpointDefinitions(topicId).map((def) => ({
    id: def.id,
    title: def.title,
    status: "UNKLAR" as const,
  }));
}

/** Gibt die Quelldpunkte zurück, die für einen M3-Checkpoint und eine Rolle relevant sind. */
export function getSourcePointIds(
  topicId: WorkflowTopicId,
  checkpointId: string,
  role: WorkflowRole,
): readonly string[] {
  const def = getM3CheckpointDefinitions(topicId).find((d) => d.id === checkpointId);
  if (!def) return [];
  return def.pointIdsByRole[role] ?? [];
}
