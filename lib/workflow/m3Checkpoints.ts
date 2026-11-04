import type { WorkflowRole, WorkflowM3CheckpointSnapshot } from "./types";
import {
  WORKFLOW_TOPIC_AU,
  WORKFLOW_TOPIC_REZEPT,
  WORKFLOW_TOPIC_UEBERWEISUNG,
  WORKFLOW_TOPIC_HEILMITTEL,
  WORKFLOW_TOPIC_HILFSMITTEL,
  WORKFLOW_TOPIC_KRANKENTRANSPORT,
  WORKFLOW_TOPIC_HYPERTONIE,
  WORKFLOW_TOPIC_DIABETES_TYP_2,
  WORKFLOW_TOPIC_ADIPOSITAS,
  WORKFLOW_TOPIC_EISENMANGEL,
  WORKFLOW_TOPIC_SCHILDDRUESE,
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

const HYPERTONIE_M3_CHECKPOINTS: readonly WorkflowM3CheckpointDefinition[] = [
  { id: "HT-C01", title: "Erstdiagnostik und Bestätigung", pointIdsByRole: { MFA: ["HT-P01"], ARZT: ["HT-P01"] } },
  { id: "HT-C02", title: "Therapieziele und Einstellung", pointIdsByRole: { MFA: ["HT-P02"], ARZT: ["HT-P02"] } },
  { id: "HT-C03", title: "Kontrollrhythmus und Labor", pointIdsByRole: { MFA: ["HT-P03"], ARZT: ["HT-P03"] } },
  { id: "HT-C04", title: "Fachärztliche Mitbehandlung", pointIdsByRole: { MFA: ["HT-P04"], ARZT: ["HT-P04"] } },
  { id: "HT-C05", title: "Organisation und Patientenmitwirkung", pointIdsByRole: { MFA: ["HT-P05"], ARZT: ["HT-P05"] } },
  { id: "HT-C06", title: "Neubewertung und Warnsignale", pointIdsByRole: { MFA: ["HT-P06"], ARZT: ["HT-P06"] } },
];

const DIABETES_TYP_2_M3_CHECKPOINTS: readonly WorkflowM3CheckpointDefinition[] = [
  { id: "DM2-C01", title: "Diagnosestellung und Erstabklärung", pointIdsByRole: { MFA: ["DM2-P01"], ARZT: ["DM2-P01"] } },
  { id: "DM2-C02", title: "Therapieziele und Medikation", pointIdsByRole: { MFA: ["DM2-P02"], ARZT: ["DM2-P02"] } },
  { id: "DM2-C03", title: "HbA1c und Verlaufskontrollen", pointIdsByRole: { MFA: ["DM2-P03"], ARZT: ["DM2-P03"] } },
  { id: "DM2-C04", title: "Nierenfunktion und Nephropathie", pointIdsByRole: { MFA: ["DM2-P04"], ARZT: ["DM2-P04"] } },
  { id: "DM2-C05", title: "Augenärztliche Mitbetreuung", pointIdsByRole: { MFA: ["DM2-P05"], ARZT: ["DM2-P05"] } },
  { id: "DM2-C06", title: "Füße, Neuropathie und Risiken", pointIdsByRole: { MFA: ["DM2-P06"], ARZT: ["DM2-P06"] } },
  { id: "DM2-C07", title: "Aufgabenverteilung und Schulung", pointIdsByRole: { MFA: ["DM2-P07"], ARZT: ["DM2-P07"] } },
  { id: "DM2-C08", title: "Warnsignale und Akut-Neubewertung", pointIdsByRole: { MFA: ["DM2-P08"], ARZT: ["DM2-P08"] } },
];

const ADIPOSITAS_M3_CHECKPOINTS: readonly WorkflowM3CheckpointDefinition[] = [
  { id: "AD-C01", title: "Diagnostik und Klassifikation", pointIdsByRole: { MFA: ["AD-P01"], ARZT: ["AD-P01"] } },
  { id: "AD-C02", title: "Begleiterkrankungen und Risikoprofil", pointIdsByRole: { MFA: ["AD-P02"], ARZT: ["AD-P02"] } },
  { id: "AD-C03", title: "Individuelle Ziele und Präferenzen", pointIdsByRole: { MFA: ["AD-P03"], ARZT: ["AD-P03"] } },
  { id: "AD-C04", title: "Multimodale Basistherapie und Praxisteam", pointIdsByRole: { MFA: ["AD-P04"], ARZT: ["AD-P04"] } },
  { id: "AD-C05", title: "Hausärztliche Begleitung und Kontrollen", pointIdsByRole: { MFA: ["AD-P05"], ARZT: ["AD-P05"] } },
  { id: "AD-C06", title: "Eskalation und Facharztindikatoren", pointIdsByRole: { MFA: ["AD-P06"], ARZT: ["AD-P06"] } },
  { id: "AD-C07", title: "Langfristige Stabilisierung und Neubewertung", pointIdsByRole: { MFA: ["AD-P07"], ARZT: ["AD-P07"] } },
];

const EISENMANGEL_M3_CHECKPOINTS: readonly WorkflowM3CheckpointDefinition[] = [
  { id: "EI-C01", title: "Eisenmangel richtig einordnen", pointIdsByRole: { MFA: ["EI-P01"], ARZT: ["EI-P01"] } },
  { id: "EI-C02", title: "Sinnvolle Labordiagnostik", pointIdsByRole: { MFA: ["EI-P02"], ARZT: ["EI-P02"] } },
  { id: "EI-C03", title: "Entzündung und chronische Erkrankung", pointIdsByRole: { MFA: ["EI-P03"], ARZT: ["EI-P03"] } },
  { id: "EI-C04", title: "Ursachensuche", pointIdsByRole: { MFA: ["EI-P04"], ARZT: ["EI-P04"] } },
  { id: "EI-C05", title: "Orale und intravenöse Eisensubstitution", pointIdsByRole: { MFA: ["EI-P05"], ARZT: ["EI-P05"] } },
  { id: "EI-C06", title: "Verlaufskontrollen und Therapiedauer", pointIdsByRole: { MFA: ["EI-P06"], ARZT: ["EI-P06"] } },
  { id: "EI-C07", title: "Praxisorganisation und Warnsignale", pointIdsByRole: { MFA: ["EI-P07"], ARZT: ["EI-P07"] } },
];

const SCHILDDRUESE_M3_CHECKPOINTS: readonly WorkflowM3CheckpointDefinition[] = [
  { id: "SD-C01", title: "Hypothyreose: Diagnostik und TSH-Einordnung", pointIdsByRole: { MFA: ["SD-P01"], ARZT: ["SD-P01"] } },
  { id: "SD-C02", title: "Schilddrüsenknoten: Abklärung und Malignitätsausschluss", pointIdsByRole: { MFA: ["SD-P02"], ARZT: ["SD-P02"] } },
  { id: "SD-C03", title: "Hyperthyreose: Diagnostik und Ätiologie", pointIdsByRole: { MFA: ["SD-P03"], ARZT: ["SD-P03"] } },
  { id: "SD-C04", title: "Hypothyreose: Therapie und Einnahme", pointIdsByRole: { MFA: ["SD-P04"], ARZT: ["SD-P04"] } },
  { id: "SD-C05", title: "Hyperthyreose: Thyreostatika und RIT-Vorbereitung", pointIdsByRole: { MFA: ["SD-P05"], ARZT: ["SD-P05"] } },
  { id: "SD-C06", title: "Diagnosespezifische Kontrollintervalle", pointIdsByRole: { MFA: ["SD-P06"], ARZT: ["SD-P06"] } },
  { id: "SD-C07", title: "Fachärztliche und chirurgische Mitbetreuung", pointIdsByRole: { MFA: ["SD-P07"], ARZT: ["SD-P07"] } },
  { id: "SD-C08", title: "Warnsignale und Neubewertung", pointIdsByRole: { MFA: ["SD-P08"], ARZT: ["SD-P08"] } },
];

const M3_CHECKPOINTS_BY_TOPIC: Record<WorkflowTopicId, readonly WorkflowM3CheckpointDefinition[]> = {
  [WORKFLOW_TOPIC_AU]: AU_M3_CHECKPOINTS,
  [WORKFLOW_TOPIC_REZEPT]: REZEPT_M3_CHECKPOINTS,
  [WORKFLOW_TOPIC_UEBERWEISUNG]: UEBERWEISUNG_M3_CHECKPOINTS,
  [WORKFLOW_TOPIC_HEILMITTEL]: HEILMITTEL_M3_CHECKPOINTS,
  [WORKFLOW_TOPIC_HILFSMITTEL]: HILFSMITTEL_M3_CHECKPOINTS,
  [WORKFLOW_TOPIC_KRANKENTRANSPORT]: KRANKENTRANSPORT_M3_CHECKPOINTS,
  [WORKFLOW_TOPIC_HYPERTONIE]: HYPERTONIE_M3_CHECKPOINTS,
  [WORKFLOW_TOPIC_DIABETES_TYP_2]: DIABETES_TYP_2_M3_CHECKPOINTS,
  [WORKFLOW_TOPIC_ADIPOSITAS]: ADIPOSITAS_M3_CHECKPOINTS,
  [WORKFLOW_TOPIC_EISENMANGEL]: EISENMANGEL_M3_CHECKPOINTS,
  [WORKFLOW_TOPIC_SCHILDDRUESE]: SCHILDDRUESE_M3_CHECKPOINTS,
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
