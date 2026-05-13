import {
  OfficeCheckpointType,
  OfficeCheckpointState,
  type OfficeCheckpointSnapshot,
} from "@/lib/office/types";
import { getM2QuestionsForCheckpoint, type OfficeM2Question } from "@/lib/office/m2Questions";
import { isOfficeTopicId } from "@/lib/office/checkpointCatalog";

export type OfficeSummaryInput = {
  topicTitle: string;
  topicId?: string | null;
  checkpoints: OfficeCheckpointSnapshot[];
};

function stateLabel(state: OfficeCheckpointState): string {
  if (state === OfficeCheckpointState.YES) return "YES";
  if (state === OfficeCheckpointState.NO) return "NO";
  return "OPEN";
}

function hasValue(value: string | undefined): boolean {
  return (value ?? "").trim().length > 0;
}

function hasDocuments(docs: string[] | undefined): boolean {
  return Array.isArray(docs) && docs.length > 0;
}

function getQuestionsForCheckpoint(topicId: string | null | undefined, checkpointId: string): readonly OfficeM2Question[] {
  if (!topicId || !isOfficeTopicId(topicId)) return [];
  return getM2QuestionsForCheckpoint(topicId, checkpointId);
}

function normalizeText(value: string | undefined): string {
  return (value ?? "").trim();
}

export function deriveOpenItems(
  checkpoint: OfficeCheckpointSnapshot,
  questions: readonly OfficeM2Question[],
): string[] {
  const answers = checkpoint.m2_answers ?? {};
  const openItems: string[] = [];

  for (const question of questions) {
    const answer = answers[question.id];
    if (answer === "NO") {
      openItems.push(`- ${question.text} (Nein)`);
    } else if (answer === "UNCLEAR") {
      openItems.push(`- ${question.text} (Unklar)`);
    }
  }

  if (openItems.length === 0 && checkpoint.state === OfficeCheckpointState.OPEN && Object.keys(answers).length === 0) {
    openItems.push("- Generische offene Pruefung noch nicht geklaert.");
  }

  return openItems;
}

export function deriveAnswerSource(checkpoint: OfficeCheckpointSnapshot): string {
  const authority = normalizeText(checkpoint.authority);
  const responsibleRole = normalizeText(checkpoint.responsible_role);
  const legacyAnswerSource = normalizeText(checkpoint.answer_source);
  const checkpointType = checkpoint.checkpointType ?? OfficeCheckpointType.KONTEXT_INFORMATION;

  switch (checkpointType) {
    case OfficeCheckpointType.EXTERNE_BESTAETIGUNG:
      return authority || legacyAnswerSource || "zustaendige externe Stelle";
    case OfficeCheckpointType.NACHWEIS_PFLICHT:
      return responsibleRole || legacyAnswerSource || "interne Nachweisablage / zustaendige Dokumentenquelle";
    case OfficeCheckpointType.REGEL_PARAMETER:
      return responsibleRole || legacyAnswerSource || "Praxisleitung / Regelpruefung";
    case OfficeCheckpointType.INTERNE_ENTSCHEIDUNG:
      return responsibleRole || legacyAnswerSource || "Praxisleitung";
    case OfficeCheckpointType.KONTEXT_INFORMATION:
    default:
      return responsibleRole || legacyAnswerSource || "Backoffice";
  }
}

export function buildOfficeSummaryText(input: OfficeSummaryInput): string {
  const checkpoints = input.checkpoints ?? [];

  const istStandLines = checkpoints.map(
    (cp) => `- [${stateLabel(cp.state)}] ${cp.title}`,
  );

  const openCheckpoints = checkpoints.filter(
    (cp) => cp.state === OfficeCheckpointState.OPEN,
  );

  const offenePunkteLines = openCheckpoints.length === 0
    ? ["- Keine offenen Punkte aus M2 erkennbar."]
    : openCheckpoints.flatMap((cp) => {
        const questions = getQuestionsForCheckpoint(input.topicId, cp.id);
        const openItems = deriveOpenItems(cp, questions);
        if (openItems.length === 0) {
          const legacyMissing = normalizeText(cp.missing_note);
          if (legacyMissing.length > 0) {
            return [`- ${cp.title}: ${legacyMissing}`];
          }
          return ["- Keine offenen Punkte aus M2 erkennbar."];
        }
        return [`- ${cp.title}:`, ...openItems];
      });

  const zustaendigQuelleLines = openCheckpoints.length === 0
    ? ["- Keine Zustaendigkeit erforderlich."]
    : openCheckpoints.map((cp) => `- ${cp.title}: ${deriveAnswerSource(cp)}`);

  // Strukturierte Felder
  const fristenLines = checkpoints
    .filter((cp) => hasValue(cp.deadline) || hasValue(cp.responsible_role))
    .map((cp) => {
      const parts = [cp.title];
      if (hasValue(cp.deadline)) parts.push(`Frist: ${cp.deadline}`);
      if (hasValue(cp.responsible_role)) parts.push(`Verantw: ${cp.responsible_role}`);
      return `- ${parts.join(", ")}`;
    });

  const verantwortungLines = checkpoints
    .filter((cp) => hasValue(cp.responsible_role))
    .map((cp) => `- ${cp.title}: ${cp.responsible_role}`);

  const authorityLines = checkpoints
    .filter((cp) => hasValue(cp.authority))
    .map((cp) => `- ${cp.title}: ${cp.authority}`);

  const checklistenLines = checkpoints
    .filter((cp) => hasDocuments(cp.required_documents))
    .flatMap((cp) => {
      const docs = cp.required_documents ?? [];
      if (docs.length === 0) return [];
      return [
        `- ${cp.title}:`,
        ...docs.map((doc) => `  • ${doc}`),
      ];
    });

  const eskalationLines = checkpoints
    .filter((cp) => cp.escalation_needed === true)
    .map((cp) => `- ${cp.title}`);

  const sections: string[] = [
    `Office-Snapshot: ${input.topicTitle}`,
    "",
  ];

  sections.push("Ist-Stand", ...istStandLines);

  if (fristenLines.length > 0) {
    sections.push("", "Fristen und Verantwortung", ...fristenLines);
  }

  if (authorityLines.length > 0) {
    sections.push("", "Zustaendige Stellen", ...authorityLines);
  }

  if (checklistenLines.length > 0) {
    sections.push("", "Erforderliche Unterlagen", ...checklistenLines);
  }

  if (eskalationLines.length > 0) {
    sections.push("", "Eskalation erforderlich", ...eskalationLines);
  }

  sections.push(
    "",
    "Offene Punkte",
    ...offenePunkteLines,
    "",
    "Zustaendig / Quelle",
    ...zustaendigQuelleLines,
  );

  return sections.join("\n");
}
