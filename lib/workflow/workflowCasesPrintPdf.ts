import type { PrintPdfBlock } from "@/lib/pdf/printPdf";
import type { PracticeCaseProfile } from "@/lib/practiceProcesses/types";
import {
  isPublishedPracticeWorkflowSnapshot,
  type PracticeWorkflowSnapshot,
} from "@/lib/practiceProcesses/workflowSnapshot";
import type { InternalProtocolWorkflowSnapshot } from "@/lib/workflow/internalProtocol/workflowAdapter";
import { buildInternalProtocolPrintBlocks } from "@/lib/workflow/internalProtocol/printPdf";
import { getPatientWithoutAppointmentSections } from "@/lib/workflow/internalProtocol/patientWithoutAppointment";
import { getM2QuestionsForCheckpoint } from "@/lib/workflow/m2Questions";
import { getWorkflowTopic, isWorkflowTopicId } from "@/lib/workflow/processCatalog";
import type { WorkflowProcessSnapshot, WorkflowM2AnswerValue, ProcessPointStatus } from "@/lib/workflow/types";

export type WorkflowCasesPrintMode = "summary" | "detail";

type DatedEntry = {
  title: string | null;
  createdAt: Date | null;
};

export type WorkflowCasesPrintEntry =
  | (DatedEntry & { kind: "clinical"; snapshot: WorkflowProcessSnapshot })
  | (DatedEntry & { kind: "internal-protocol"; snapshot: InternalProtocolWorkflowSnapshot })
  | (DatedEntry & { kind: "practice-workflow"; snapshot: PracticeWorkflowSnapshot })
  | {
      kind: "practice-case";
      title: string;
      createdAt: Date;
      status: "In Bearbeitung" | "Veröffentlicht";
      snapshot: PracticeWorkflowSnapshot;
    }
  | {
      kind: "practice-profile";
      profile: PracticeCaseProfile;
      checkpointTitles: string[];
    };

const PROCESS_STATUS_LABEL: Record<ProcessPointStatus, string> = {
  ERKENNBAR: "Erkennbar",
  NICHT_ERFASST: "Nicht erfasst",
  UNKLAR: "Unklar",
};

const DECISION_LABEL = {
  PFLICHT: "Pflicht",
  OPTIONAL: "Optional",
  NICHT_RELEVANT: "Nicht relevant",
} as const;

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("de-DE").format(date);
}

function answerLabel(value: WorkflowM2AnswerValue): string {
  if (value === "YES") return "Ja";
  if (value === "NO") return "Nein";
  return "Unklar";
}

function addClinicalPointBlocks(
  blocks: PrintPdfBlock[],
  point: { title: string; status: ProcessPointStatus; note?: string },
) {
  blocks.push({ kind: "subheading", text: `${point.title}: ${PROCESS_STATUS_LABEL[point.status]}` });
  if (point.note) blocks.push({ kind: "paragraph", text: `Notiz: ${point.note}` });
}

function addClinicalAnswers(
  blocks: PrintPdfBlock[],
  snapshot: WorkflowProcessSnapshot,
  checkpointId: string,
  answers: Record<string, WorkflowM2AnswerValue> | undefined,
) {
  if (!answers || !isWorkflowTopicId(snapshot.topicId)) return;
  const questions = getM2QuestionsForCheckpoint(snapshot.topicId, checkpointId, snapshot.role);
  const knownIds = new Set(questions.map((question) => question.id));
  for (const question of questions) {
    const value = answers[question.id];
    if (value !== undefined) blocks.push({ kind: "paragraph", text: `${question.text}: ${answerLabel(value)}` });
  }
  if (Object.keys(answers).some((id) => !knownIds.has(id))) {
    blocks.push({ kind: "paragraph", text: "Weitere gespeicherte Angaben sind vorhanden." });
  }
}

function addPracticeWorkflowBlocks(
  blocks: PrintPdfBlock[],
  snapshot: PracticeWorkflowSnapshot,
) {
  const published = isPublishedPracticeWorkflowSnapshot(snapshot);
  for (const checkpoint of snapshot.checkpoints) {
    const decision = checkpoint.decision
      ? DECISION_LABEL[checkpoint.decision]
      : "Noch nicht entschieden";
    blocks.push({ kind: "subheading", text: `${checkpoint.checkpointTitle}: ${decision}` });
    if (!published || !("definition" in checkpoint)) continue;

    const definition = checkpoint.definition;
    if (definition.checkpointDescription) {
      blocks.push({ kind: "paragraph", text: definition.checkpointDescription });
    }
    const selectedAnchors = (definition.checkpointAnchors ?? [])
      .filter((anchor) => definition.selectedAnchorIds.includes(anchor.id))
      .map((anchor) => anchor.text);
    if (selectedAnchors.length > 0) {
      blocks.push({ kind: "paragraph", text: `Zu berücksichtigen: ${selectedAnchors.join("; ")}` });
    }
    if (definition.implementation) {
      blocks.push({ kind: "paragraph", text: `Umsetzung: ${definition.implementation}` });
    }
  }
}

function addClinicalSummary(blocks: PrintPdfBlock[], snapshot: WorkflowProcessSnapshot) {
  const openPoints = [
    ...snapshot.processPoints,
    ...(snapshot.m3Checkpoints ?? []),
  ].filter((point) => point.status !== "ERKENNBAR");
  blocks.push({ kind: "subheading", text: "Offene Punkte" });
  if (openPoints.length === 0) {
    blocks.push({ kind: "paragraph", text: "Keine offenen Punkte gespeichert." });
    return;
  }
  for (const point of openPoints) {
    blocks.push({ kind: "paragraph", text: `${point.title}: ${PROCESS_STATUS_LABEL[point.status]}` });
  }
}

function addPracticeSummary(blocks: PrintPdfBlock[], snapshot: PracticeWorkflowSnapshot) {
  const openCheckpoints = snapshot.checkpoints.filter((checkpoint) => checkpoint.decision === undefined);
  blocks.push({ kind: "subheading", text: "Noch nicht entschieden" });
  if (snapshot.checkpoints.length === 0) {
    blocks.push({ kind: "paragraph", text: "Keine Checkpoints vorhanden." });
    return;
  }
  if (openCheckpoints.length === 0) {
    blocks.push({ kind: "paragraph", text: "Alle gespeicherten Checkpoints sind entschieden." });
    return;
  }
  for (const checkpoint of openCheckpoints) {
    blocks.push({ kind: "paragraph", text: checkpoint.checkpointTitle });
  }
}

function addInternalProtocolSummary(blocks: PrintPdfBlock[], snapshot: InternalProtocolWorkflowSnapshot) {
  const sectionById = new Map(getPatientWithoutAppointmentSections().map((section) => [section.id, section]));
  const openCheckpoints = snapshot.checkpoints.filter(
    (checkpoint) => checkpoint.clarificationJudgement === undefined || checkpoint.clarificationJudgement === "OPEN",
  );
  blocks.push({ kind: "subheading", text: "Noch offene Klärungen" });
  if (snapshot.checkpoints.length === 0) {
    blocks.push({ kind: "paragraph", text: "Keine Checkpoints vorhanden." });
    return;
  }
  if (openCheckpoints.length === 0) {
    blocks.push({ kind: "paragraph", text: "Alle gespeicherten Klärungen sind abgeschlossen." });
    return;
  }
  for (const checkpoint of openCheckpoints) {
    blocks.push({ kind: "paragraph", text: sectionById.get(checkpoint.id)?.title ?? "Weitere Klärung" });
  }
}

export function buildWorkflowCasesPrintBlocks(
  entries: readonly WorkflowCasesPrintEntry[],
  mode: WorkflowCasesPrintMode = "summary",
): PrintPdfBlock[] {
  const blocks: PrintPdfBlock[] = [];

  for (const [index, entry] of entries.entries()) {
    if (blocks.length > 0) blocks.push({ kind: "separator" });

    if (entry.kind === "practice-profile") {
      blocks.push(
        { kind: "heading", text: entry.profile.title },
        { kind: "paragraph", text: "Status: Noch nicht begonnen" },
      );
      if (mode === "detail" && entry.profile.description) {
        blocks.push({ kind: "paragraph", text: entry.profile.description });
      }
      if (entry.checkpointTitles.length > 0) {
        blocks.push({ kind: "subheading", text: "Checkpoints des Praxisfalls" });
        for (const title of entry.checkpointTitles) blocks.push({ kind: "paragraph", text: title });
      }
      continue;
    }

    const title = entry.title?.trim() || "Arbeitsprozess ohne Titel";
    const kindLabel = entry.kind === "clinical"
      ? "Klinischer Musterprozess"
      : entry.kind === "internal-protocol"
        ? "Internes Praxisprotokoll"
        : "Praxisworkflow";
    const displayTitle = entry.kind === "practice-case" ? entry.snapshot.caseProfileTitle : title;
    blocks.push({ kind: "heading", text: displayTitle }, { kind: "paragraph", text: `Art: ${kindLabel}` });
    if (entry.createdAt) blocks.push({ kind: "paragraph", text: `Datum: ${formatDate(entry.createdAt)}` });

    if (entry.kind === "clinical") {
      const snapshot = entry.snapshot;
      const topic = isWorkflowTopicId(snapshot.topicId) ? getWorkflowTopic(snapshot.topicId).title : "Musterprozess";
      blocks.push({ kind: "paragraph", text: `${topic} – ${snapshot.role === "MFA" ? "MFA" : "Arzt"}` });
      if (mode === "summary") addClinicalSummary(blocks, snapshot);
      else {
        for (const point of snapshot.processPoints) {
          addClinicalPointBlocks(blocks, point);
          addClinicalAnswers(blocks, snapshot, point.id, point.m2_answers);
        }
        for (const checkpoint of snapshot.m3Checkpoints ?? []) {
          blocks.push({ kind: "subheading", text: `${checkpoint.title}: ${PROCESS_STATUS_LABEL[checkpoint.status]}` });
          addClinicalAnswers(blocks, snapshot, checkpoint.id, checkpoint.m2_answers);
        }
        if (snapshot.sessionNote) blocks.push({ kind: "paragraph", text: `Notiz zur Sitzung: ${snapshot.sessionNote}` });
      }
    } else if (entry.kind === "internal-protocol") {
      const snapshot = entry.snapshot;
      if (mode === "summary") addInternalProtocolSummary(blocks, snapshot);
      else blocks.push(...buildInternalProtocolPrintBlocks([{ title: entry.title, createdAt: entry.createdAt, snapshot }]));
    } else {
      const snapshot = entry.snapshot;
      if (entry.kind === "practice-case") {
        blocks.push({ kind: "paragraph", text: `Status: ${entry.status}` });
      }
      if (mode === "summary") addPracticeSummary(blocks, snapshot);
      else addPracticeWorkflowBlocks(blocks, snapshot);
    }
  }

  if (entries.length === 0) blocks.push({ kind: "paragraph", text: "Es wurden keine Einträge ausgewählt." });
  return blocks;
}