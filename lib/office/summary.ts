import {
  OfficeCheckpointType,
  OfficeCheckpointState,
  type OfficeCheckpointSnapshot,
} from "@/lib/office/types";
import { deriveCheckpointActions } from "@/lib/office/derivedActions";
import {
  buildOfficeBlocks,
  getBlockAnswerSources,
  getPrimaryOpenTextForBlock,
  getTopNextSteps,
} from "@/lib/office/officeBlocks";
import type { OfficeM2Question } from "@/lib/office/m2Questions";

export type OfficeSummaryInput = {
  topicTitle: string;
  topicId?: string | null;
  checkpoints: OfficeCheckpointSnapshot[];
};

function hasValue(value: string | undefined): boolean {
  return (value ?? "").trim().length > 0;
}

function hasDocuments(docs: string[] | undefined): boolean {
  return Array.isArray(docs) && docs.length > 0;
}

function normalizeText(value: string | undefined): string {
  return (value ?? "").trim();
}

export function deriveOpenItems(
  checkpoint: OfficeCheckpointSnapshot,
  questions: readonly OfficeM2Question[],
): string[] {
  const openItems = deriveCheckpointActions({ checkpoint, questions }).map((action) => {
    const statusLabel = action.status === "nicht_vollstaendig"
      ? "Nicht vollstaendig"
      : action.status === "offen"
        ? "Offen"
        : "Geklaert";
    return `- ${statusLabel}: ${action.text}`;
  });

  const answers = checkpoint.m2_answers ?? {};
  if (openItems.length === 0 && checkpoint.state === OfficeCheckpointState.OPEN && Object.keys(answers).length === 0) {
    openItems.push("- Offen: Klaerung steht aus");
  }

  return openItems;
}

export function deriveAnswerSource(checkpoint: OfficeCheckpointSnapshot): string {
  const authority = normalizeText(checkpoint.authority);
  const legacyAnswerSource = normalizeText(checkpoint.answer_source);
  const checkpointType = checkpoint.checkpointType ?? OfficeCheckpointType.KONTEXT_INFORMATION;

  switch (checkpointType) {
    case OfficeCheckpointType.EXTERNE_BESTAETIGUNG:
      return authority || legacyAnswerSource || "zustaendige externe Stelle";
    case OfficeCheckpointType.NACHWEIS_PFLICHT:
      return authority || legacyAnswerSource || "Nachweis / Dokumentenquelle";
    case OfficeCheckpointType.REGEL_PARAMETER:
      return authority || legacyAnswerSource || "Regelgrundlage / interne Pruefung";
    case OfficeCheckpointType.INTERNE_ENTSCHEIDUNG:
      return authority || legacyAnswerSource || "Praxisleitung / interne Entscheidung";
    case OfficeCheckpointType.VERFAHRENSWEG:
      return authority || legacyAnswerSource || "Verfahrensdokumentation";
    case OfficeCheckpointType.KONTEXT_INFORMATION:
    default:
      return authority || legacyAnswerSource || "Falldokumentation";
  }
}

export function buildOfficeSummaryText(input: OfficeSummaryInput): string {
  const checkpoints = input.checkpoints ?? [];

  const blocks = buildOfficeBlocks({
    topicId: input.topicId,
    checkpoints,
  });

  const geklaerteBereiche = blocks
    .filter((block) => block.status === "geklaert")
    .map((block) => `- ${block.title}`);

  const offeneBereiche = blocks
    .filter((block) => block.status === "offen")
    .map((block) => {
      const primaryText = getPrimaryOpenTextForBlock(block);
      if (!primaryText) return `- ${block.title}`;
      return `- ${block.title}: ${primaryText}`;
    });

  const nextSteps = getTopNextSteps(blocks, 5).map((step) => `- ${step}`);

  const answerQuellenLines = blocks
    .filter((block) => block.status === "offen")
    .flatMap((block) => {
      const sources = getBlockAnswerSources(block);
      if (sources.length === 0) return [];
      return [`- ${block.title}: ${sources.join(", ")}`];
    });

  const fallbackAnswerQuellen = checkpoints
    .filter((cp) => cp.state === OfficeCheckpointState.OPEN || cp.state === OfficeCheckpointState.NO)
    .map((cp) => `- ${cp.title}: ${deriveAnswerSource(cp)}`);

  const mergedAnswerQuellen = answerQuellenLines.length > 0
    ? answerQuellenLines
    : fallbackAnswerQuellen;

  const docsSummary = checkpoints.filter((cp) => hasDocuments(cp.required_documents)).length;
  const fristenSummary = checkpoints.filter((cp) => hasValue(cp.deadline)).length;
  const verantwortungSummary = checkpoints.filter((cp) => hasValue(cp.responsible_role)).length;

  const sections: string[] = [
    `Office-Dokumentation: ${input.topicTitle}`,
    "",
  ];

  sections.push(
    "Kurzuebersicht",
    `- Bereiche gesamt: ${blocks.length}`,
    `- Geklaerte Bereiche: ${blocks.filter((block) => block.status === "geklaert").length}`,
    `- Offene Bereiche: ${blocks.filter((block) => block.status === "offen").length}`,
    `- Offene Fristen: ${fristenSummary}`,
    `- Bereiche mit Unterlagen: ${docsSummary}`,
    `- Bereiche mit Verantwortungsrolle: ${verantwortungSummary}`,
  );

  sections.push(
    "",
    "Geklaerte Bereiche",
    ...(geklaerteBereiche.length > 0 ? geklaerteBereiche : ["- Keine geklaerten Bereiche."]),
    "",
    "Offene Bereiche",
    ...(offeneBereiche.length > 0 ? offeneBereiche : ["- Keine offenen Bereiche."]),
    "",
    "Naechste Schritte",
    ...(nextSteps.length > 0 ? nextSteps : ["- Keine offenen Schritte."]),
    "",
    "Antwortquellen",
    ...(mergedAnswerQuellen.length > 0 ? mergedAnswerQuellen : ["- Keine offenen Antwortquellen."]),
  );

  return sections.join("\n");
}
