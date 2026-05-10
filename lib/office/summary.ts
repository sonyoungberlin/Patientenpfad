import {
  OfficeCheckpointState,
  type OfficeCheckpointSnapshot,
} from "@/lib/office/types";

export type OfficeSummaryInput = {
  topicTitle: string;
  checkpoints: OfficeCheckpointSnapshot[];
};

function stateLabel(state: OfficeCheckpointState): string {
  if (state === OfficeCheckpointState.YES) return "YES";
  if (state === OfficeCheckpointState.NO) return "NO";
  return "OPEN";
}

function visibleText(value: string | undefined, marker: string): string {
  const normalized = (value ?? "").trim();
  if (normalized.length > 0) return normalized;
  return marker;
}

function hasValue(value: string | undefined): boolean {
  return (value ?? "").trim().length > 0;
}

function hasDocuments(docs: string[] | undefined): boolean {
  return Array.isArray(docs) && docs.length > 0;
}

export function buildOfficeSummaryText(input: OfficeSummaryInput): string {
  const checkpoints = input.checkpoints ?? [];

  const istStandLines = checkpoints.map(
    (cp) => `- [${stateLabel(cp.state)}] ${cp.title}`,
  );

  const openCheckpoints = checkpoints.filter(
    (cp) => cp.state === OfficeCheckpointState.OPEN,
  );

  const fehlendeInfoLines =
    openCheckpoints.length === 0
      ? ["- Keine offenen Informationsluecken markiert."]
      : openCheckpoints.map(
          (cp) =>
            `- ${cp.title}: ${visibleText(cp.missing_note, "!!! FEHLT: missing_note")}`,
        );

  const antwortquellenLines =
    openCheckpoints.length === 0
      ? ["- Keine Antwortquellen erforderlich."]
      : openCheckpoints.map(
          (cp) =>
            `- ${cp.title}: ${visibleText(cp.answer_source, "!!! FEHLT: answer_source")}`,
        );

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
    "Ist-Stand",
    ...istStandLines,
  ];

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
    "Fehlende Informationen",
    ...fehlendeInfoLines,
    "",
    "Antwortquellen",
    ...antwortquellenLines,
  );

  return sections.join("\n");
}
