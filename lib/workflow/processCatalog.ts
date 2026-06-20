import type { WorkflowRole, ProcessPointSnapshot } from "./types";

export type ProcessPointTemplate = {
  id: string;
  title: string;
  roles?: WorkflowRole[]; // undefined = für beide Rollen
  sourceLabel?: string;
};

export type WorkflowTopic = {
  id: WorkflowTopicId;
  title: string;
  sources: readonly string[];
};

export const WORKFLOW_TOPIC_AU = "au-musterprozess";
export const WORKFLOW_TOPIC_REZEPT = "rezept-musterprozess";
export const WORKFLOW_TOPIC_UEBERWEISUNG = "ueberweisung-musterprozess";
export const WORKFLOW_TOPIC_HEILMITTEL = "heilmittel-musterprozess";
export const WORKFLOW_TOPIC_HILFSMITTEL = "hilfsmittel-musterprozess";
export const WORKFLOW_TOPIC_KRANKENTRANSPORT = "krankentransport-musterprozess";

export type WorkflowTopicId =
  | typeof WORKFLOW_TOPIC_AU
  | typeof WORKFLOW_TOPIC_REZEPT
  | typeof WORKFLOW_TOPIC_UEBERWEISUNG
  | typeof WORKFLOW_TOPIC_HEILMITTEL
  | typeof WORKFLOW_TOPIC_HILFSMITTEL
  | typeof WORKFLOW_TOPIC_KRANKENTRANSPORT;

export function isWorkflowTopicId(value: unknown): value is WorkflowTopicId {
  return (
    value === WORKFLOW_TOPIC_AU ||
    value === WORKFLOW_TOPIC_REZEPT ||
    value === WORKFLOW_TOPIC_UEBERWEISUNG ||
    value === WORKFLOW_TOPIC_HEILMITTEL ||
    value === WORKFLOW_TOPIC_HILFSMITTEL ||
    value === WORKFLOW_TOPIC_KRANKENTRANSPORT
  );
}

// ---------------------------------------------------------------------------
// AU-Musterprozess Prozesspunkte
// ---------------------------------------------------------------------------

const AU_PROCESS_POINTS: readonly ProcessPointTemplate[] = [
  {
    id: "AU-P01",
    title: "Patientenkontakt",
  },
  {
    id: "AU-P02",
    title: "ICD-10-Code",
  },
  {
    id: "AU-P03",
    title: "Zeitraum der Arbeitsunfähigkeit",
  },
  {
    id: "AU-P04",
    title: "Ausstellungsdatum",
    roles: ["MFA"],
  },
  {
    id: "AU-P05",
    title: "Erst- oder Folgebescheinigung",
    roles: ["MFA"],
  },
  {
    id: "AU-P06",
    title: "Ausstellungsangaben",
    roles: ["MFA"],
  },
  {
    id: "AU-P07",
    title: "Kontakt-/Untersuchungsvermerk",
    roles: ["ARZT"],
  },
  {
    id: "AU-P08",
    title: "Ärztliche Entscheidungsgrundlage",
    roles: ["ARZT"],
  },
  {
    id: "AU-P09",
    title: "Weiteres Vorgehen / Wiedervorstellung",
    roles: ["ARZT"],
  },
  {
    id: "AU-P10",
    title: "Art des Patientenkontakts",
    sourceLabel: "Gemeinsamer Bundesausschuss (G-BA), Arbeitsunfähigkeits-Richtlinie",
  },
  {
    id: "AU-P11",
    title: "Besondere Konstellation",
    sourceLabel: "Gemeinsamer Bundesausschuss (G-BA), Arbeitsunfähigkeits-Richtlinie",
  },
];

const TOPICS: readonly WorkflowTopic[] = [
  {
    id: WORKFLOW_TOPIC_AU,
    title: "AU-Musterprozess",
    sources: [
      "Gemeinsamer Bundesausschuss (G-BA), Arbeitsunfähigkeits-Richtlinie",
      "Kassenärztliche Bundesvereinigung (KBV), Informationen zur Arbeitsunfähigkeit",
      "Einheitlicher Bewertungsmaßstab (EBM)",
      "Bundesmantelvertrag Ärzte (BMV-Ä)",
    ],
  },
  {
    id: WORKFLOW_TOPIC_REZEPT,
    title: "Rezept",
    sources: [
      "Gemeinsamer Bundesausschuss (G-BA), Arzneimittel-Richtlinie (AM-RL)",
      "Kassenärztliche Bundesvereinigung (KBV), Verordnung von Arzneimitteln",
      "Einheitlicher Bewertungsmaßstab (EBM)",
      "Bundesmantelvertrag Ärzte (BMV-Ä)",
    ],
  },
  {
    id: WORKFLOW_TOPIC_UEBERWEISUNG,
    title: "Überweisung",
    sources: [
      "Kassenärztliche Bundesvereinigung (KBV), Überweisung im Vertragsarztrecht",
      "Einheitlicher Bewertungsmaßstab (EBM)",
      "Bundesmantelvertrag Ärzte (BMV-Ä)",
    ],
  },
  {
    id: WORKFLOW_TOPIC_HEILMITTEL,
    title: "Heilmittelverordnung",
    sources: [
      "Gemeinsamer Bundesausschuss (G-BA), Heilmittel-Richtlinie (HeilM-RL)",
      "Kassenärztliche Bundesvereinigung (KBV), Informationen zur Heilmittelverordnung",
      "Einheitlicher Bewertungsmaßstab (EBM)",
      "Bundesmantelvertrag Ärzte (BMV-Ä)",
    ],
  },
  {
    id: WORKFLOW_TOPIC_HILFSMITTEL,
    title: "Hilfsmittelverordnung",
    sources: [
      "Gemeinsamer Bundesausschuss (G-BA), Hilfsmittel-Richtlinie (HilfsM-RL)",
      "Kassenärztliche Bundesvereinigung (KBV), Informationen zur Hilfsmittelverordnung",
      "Sozialgesetzbuch V (SGB V), §§ 33, 73",
    ],
  },
  {
    id: WORKFLOW_TOPIC_KRANKENTRANSPORT,
    title: "Krankentransport",
    sources: [
      "Gemeinsamer Bundesausschuss (G-BA), Krankentransport-Richtlinie (KT-RL)",
      "Kassenärztliche Bundesvereinigung (KBV), Informationen zum Krankentransport",
      "Bundesmantelvertrag Ärzte (BMV-Ä)",
    ],
  },
];

// Minimale Prozesspunkte für neue Topics (Ausgabe läuft über M3-Checkpoints)
const REZEPT_PROCESS_POINTS: readonly ProcessPointTemplate[] = [
  { id: "RZ-P01", title: "Formale Angaben" },
  { id: "RZ-P02", title: "Entscheidungsgrundlage" },
  { id: "RZ-P03", title: "Verlauf und Kontext" },
  { id: "RZ-P04", title: "Weiteres Vorgehen" },
];

const UEBERWEISUNG_PROCESS_POINTS: readonly ProcessPointTemplate[] = [
  { id: "UE-P01", title: "Formale Angaben" },
  { id: "UE-P02", title: "Entscheidungsgrundlage" },
  { id: "UE-P03", title: "Verlauf und Kontext" },
  { id: "UE-P04", title: "Weiteres Vorgehen" },
];

const HEILMITTEL_PROCESS_POINTS: readonly ProcessPointTemplate[] = [
  { id: "HM-P01", title: "Formale Angaben" },
  { id: "HM-P02", title: "Entscheidungsgrundlage" },
  { id: "HM-P03", title: "Verlauf und Kontext" },
  { id: "HM-P04", title: "Weiteres Vorgehen" },
];

const HILFSMITTEL_PROCESS_POINTS: readonly ProcessPointTemplate[] = [
  { id: "HI-P01", title: "Formale Angaben" },
  { id: "HI-P02", title: "Entscheidungsgrundlage" },
  { id: "HI-P03", title: "Verlauf und Kontext" },
  { id: "HI-P04", title: "Weiteres Vorgehen" },
];

const KRANKENTRANSPORT_PROCESS_POINTS: readonly ProcessPointTemplate[] = [
  { id: "KT-P01", title: "Formale Angaben" },
  { id: "KT-P02", title: "Entscheidungsgrundlage" },
  { id: "KT-P03", title: "Verlauf und Kontext" },
  { id: "KT-P04", title: "Weiteres Vorgehen" },
];

const PROCESS_POINTS_BY_TOPIC: Record<WorkflowTopicId, readonly ProcessPointTemplate[]> = {
  [WORKFLOW_TOPIC_AU]: AU_PROCESS_POINTS,
  [WORKFLOW_TOPIC_REZEPT]: REZEPT_PROCESS_POINTS,
  [WORKFLOW_TOPIC_UEBERWEISUNG]: UEBERWEISUNG_PROCESS_POINTS,
  [WORKFLOW_TOPIC_HEILMITTEL]: HEILMITTEL_PROCESS_POINTS,
  [WORKFLOW_TOPIC_HILFSMITTEL]: HILFSMITTEL_PROCESS_POINTS,
  [WORKFLOW_TOPIC_KRANKENTRANSPORT]: KRANKENTRANSPORT_PROCESS_POINTS,
};

export function listWorkflowTopics(): readonly WorkflowTopic[] {
  return TOPICS;
}

export function getWorkflowTopic(topicId: WorkflowTopicId): WorkflowTopic {
  const topic = TOPICS.find((t) => t.id === topicId);
  if (!topic) throw new Error(`Unknown workflow topic: ${topicId}`);
  return topic;
}

export function getProcessPoints(
  topicId: WorkflowTopicId,
  role: WorkflowRole,
): readonly ProcessPointTemplate[] {
  const points = PROCESS_POINTS_BY_TOPIC[topicId] ?? [];
  return points.filter((p) => !p.roles || p.roles.includes(role));
}

export function buildInitialSnapshot(
  topicId: WorkflowTopicId,
  role: WorkflowRole,
): ProcessPointSnapshot[] {
  return getProcessPoints(topicId, role).map((p) => ({
    id: p.id,
    title: p.title,
    status: "UNKLAR" as const,
  }));
}
