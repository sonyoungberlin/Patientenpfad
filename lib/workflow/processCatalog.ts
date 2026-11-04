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
export const WORKFLOW_TOPIC_HYPERTONIE = "hypertonie-orientierung";
export const WORKFLOW_TOPIC_DIABETES_TYP_2 = "diabetes-mellitus-typ-2-orientierung";
export const WORKFLOW_TOPIC_ADIPOSITAS = "adipositas-orientierung";
export const WORKFLOW_TOPIC_EISENMANGEL = "eisenmangel-orientierung";
export const WORKFLOW_TOPIC_SCHILDDRUESE = "schilddruesenerkrankungen-orientierung";

export type WorkflowTopicId =
  | typeof WORKFLOW_TOPIC_AU
  | typeof WORKFLOW_TOPIC_REZEPT
  | typeof WORKFLOW_TOPIC_UEBERWEISUNG
  | typeof WORKFLOW_TOPIC_HEILMITTEL
  | typeof WORKFLOW_TOPIC_HILFSMITTEL
  | typeof WORKFLOW_TOPIC_KRANKENTRANSPORT
  | typeof WORKFLOW_TOPIC_HYPERTONIE
  | typeof WORKFLOW_TOPIC_DIABETES_TYP_2
  | typeof WORKFLOW_TOPIC_ADIPOSITAS
  | typeof WORKFLOW_TOPIC_EISENMANGEL
  | typeof WORKFLOW_TOPIC_SCHILDDRUESE;

export function isWorkflowTopicId(value: unknown): value is WorkflowTopicId {
  return (
    value === WORKFLOW_TOPIC_AU ||
    value === WORKFLOW_TOPIC_REZEPT ||
    value === WORKFLOW_TOPIC_UEBERWEISUNG ||
    value === WORKFLOW_TOPIC_HEILMITTEL ||
    value === WORKFLOW_TOPIC_HILFSMITTEL ||
    value === WORKFLOW_TOPIC_KRANKENTRANSPORT ||
    value === WORKFLOW_TOPIC_HYPERTONIE ||
    value === WORKFLOW_TOPIC_DIABETES_TYP_2 ||
    value === WORKFLOW_TOPIC_ADIPOSITAS ||
    value === WORKFLOW_TOPIC_EISENMANGEL ||
    value === WORKFLOW_TOPIC_SCHILDDRUESE
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
  {
    id: WORKFLOW_TOPIC_HYPERTONIE,
    title: "Muster-Orientierung: Hypertonie",
    sources: [
      "NVL Hypertonie (2023), Kap. 3.1.1–3.1.6",
      "NVL Hypertonie (2023), Kap. 4.1, Abb. 2, Tab. 7–8",
      "NVL Hypertonie (2023), Kap. 5.2, 5.4, 6.2, 6.4, 6.6, 6.7 und 6.9",
      "NVL Hypertonie (2023), Kap. 7.3 und 7.5",
      "NVL Hypertonie (2023), Kap. 9.1, Tab. 25 und Kap. 9.2",
    ],
  },
  {
    id: WORKFLOW_TOPIC_DIABETES_TYP_2,
    title: "Muster-Orientierung: Diabetes mellitus Typ 2",
    sources: [
      "NVL Typ-2-Diabetes (2023), Kap. 2–7 und Anhänge",
      "NVL Typ-2-Diabetes, Ergänzung (2024), Kap. 6.1–6.2 und Tab. 30",
      "G-BA DMP-Anforderungen-Richtlinie, Anlage Diabetes mellitus Typ 2",
      "IWGDF, Fußinspektionsintervalle (in NVL Typ-2-Diabetes 2023, Tab. 19 modifiziert)",
    ],
  },
  {
    id: WORKFLOW_TOPIC_ADIPOSITAS,
    title: "Muster-Orientierung: Adipositas",
    sources: [
      "S3-Leitlinie Adipositas (2024), Kap. 2–5",
      "DEGAM S3-Leitlinie Prävention",
      "G-BA DMP-Anforderungen-Richtlinie, Anlagen 23 und 24",
      "BfArM-Fachinformationen (wirkstoffspezifische Zulassungsangaben)",
    ],
  },
  {
    id: WORKFLOW_TOPIC_EISENMANGEL,
    title: "Muster-Orientierung: Eisenmangel / Eisenmangelanämie",
    sources: [
      "AWMF S1-Leitlinie Eisenmangelanämie (025-021), seit 30.10.2026 abgelaufen; daraus stammende Hinweise sind nicht als aktuelle Leitlinienempfehlungen zu verstehen",
      "AWMF S3-Leitlinie Präoperative Anämie (001-024), ausschließlich präoperativer Geltungsbereich",
      "G-BA Arzneimittel-Richtlinie, Anlage I Nr. 37",
    ],
  },
  {
    id: WORKFLOW_TOPIC_SCHILDDRUESE,
    title: "Muster-Orientierung: Schilddrüsenerkrankungen",
    sources: [
      "DEGAM S2k-Leitlinie Erhöhter TSH-Wert in der Hausarztpraxis (AWMF 053-046)",
      "DEGAM S1-Leitlinie Schilddrüsenknoten bei Erwachsenen (AWMF 053-058)",
      "DGN S1-Leitlinie Radioiodtherapie bei benignen Schilddrüsenerkrankungen (AWMF 031-003)",
      "CAEK S2k-Leitlinie Operative Therapie (AWMF 088-007)",
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

const HYPERTONIE_PROCESS_POINTS: readonly ProcessPointTemplate[] = [
  { id: "HT-P01", title: "Erstdiagnostik und Bestätigung" },
  { id: "HT-P02", title: "Therapieziele und Einstellung" },
  { id: "HT-P03", title: "Kontrollrhythmus und Labor" },
  { id: "HT-P04", title: "Fachärztliche Mitbehandlung" },
  { id: "HT-P05", title: "Organisation und Patientenmitwirkung" },
  { id: "HT-P06", title: "Neubewertung und Warnsignale" },
];

const DIABETES_TYP_2_PROCESS_POINTS: readonly ProcessPointTemplate[] = [
  { id: "DM2-P01", title: "Diagnosestellung und Erstabklärung" },
  { id: "DM2-P02", title: "Therapieziele und Medikation" },
  { id: "DM2-P03", title: "HbA1c und Verlaufskontrollen" },
  { id: "DM2-P04", title: "Nierenfunktion und Nephropathie" },
  { id: "DM2-P05", title: "Augenärztliche Mitbetreuung" },
  { id: "DM2-P06", title: "Füße, Neuropathie und Risiken" },
  { id: "DM2-P07", title: "Aufgabenverteilung und Schulung" },
  { id: "DM2-P08", title: "Warnsignale und Akut-Neubewertung" },
];

const ADIPOSITAS_PROCESS_POINTS: readonly ProcessPointTemplate[] = [
  { id: "AD-P01", title: "Diagnostik und Klassifikation" },
  { id: "AD-P02", title: "Begleiterkrankungen und Risikoprofil" },
  { id: "AD-P03", title: "Individuelle Ziele und Präferenzen" },
  { id: "AD-P04", title: "Multimodale Basistherapie und Praxisteam" },
  { id: "AD-P05", title: "Hausärztliche Begleitung und Kontrollen" },
  { id: "AD-P06", title: "Eskalation und Facharztindikatoren" },
  { id: "AD-P07", title: "Langfristige Stabilisierung und Neubewertung" },
];

const EISENMANGEL_PROCESS_POINTS: readonly ProcessPointTemplate[] = [
  { id: "EI-P01", title: "Eisenmangel richtig einordnen" },
  { id: "EI-P02", title: "Sinnvolle Labordiagnostik" },
  { id: "EI-P03", title: "Entzündung und chronische Erkrankung" },
  { id: "EI-P04", title: "Ursachensuche" },
  { id: "EI-P05", title: "Orale und intravenöse Eisensubstitution" },
  { id: "EI-P06", title: "Verlaufskontrollen und Therapiedauer" },
  { id: "EI-P07", title: "Praxisorganisation und Warnsignale" },
];

const SCHILDDRUESE_PROCESS_POINTS: readonly ProcessPointTemplate[] = [
  { id: "SD-P01", title: "Hypothyreose: Diagnostik und TSH-Einordnung" },
  { id: "SD-P02", title: "Schilddrüsenknoten: Abklärung und Malignitätsausschluss" },
  { id: "SD-P03", title: "Hyperthyreose: Diagnostik und Ätiologie" },
  { id: "SD-P04", title: "Hypothyreose: Therapie und Einnahme" },
  { id: "SD-P05", title: "Hyperthyreose: Thyreostatika und RIT-Vorbereitung" },
  { id: "SD-P06", title: "Diagnosespezifische Kontrollintervalle" },
  { id: "SD-P07", title: "Fachärztliche und chirurgische Mitbetreuung" },
  { id: "SD-P08", title: "Warnsignale und Neubewertung" },
];

const PROCESS_POINTS_BY_TOPIC: Record<WorkflowTopicId, readonly ProcessPointTemplate[]> = {
  [WORKFLOW_TOPIC_AU]: AU_PROCESS_POINTS,
  [WORKFLOW_TOPIC_REZEPT]: REZEPT_PROCESS_POINTS,
  [WORKFLOW_TOPIC_UEBERWEISUNG]: UEBERWEISUNG_PROCESS_POINTS,
  [WORKFLOW_TOPIC_HEILMITTEL]: HEILMITTEL_PROCESS_POINTS,
  [WORKFLOW_TOPIC_HILFSMITTEL]: HILFSMITTEL_PROCESS_POINTS,
  [WORKFLOW_TOPIC_KRANKENTRANSPORT]: KRANKENTRANSPORT_PROCESS_POINTS,
  [WORKFLOW_TOPIC_HYPERTONIE]: HYPERTONIE_PROCESS_POINTS,
  [WORKFLOW_TOPIC_DIABETES_TYP_2]: DIABETES_TYP_2_PROCESS_POINTS,
  [WORKFLOW_TOPIC_ADIPOSITAS]: ADIPOSITAS_PROCESS_POINTS,
  [WORKFLOW_TOPIC_EISENMANGEL]: EISENMANGEL_PROCESS_POINTS,
  [WORKFLOW_TOPIC_SCHILDDRUESE]: SCHILDDRUESE_PROCESS_POINTS,
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
