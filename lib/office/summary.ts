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

  return [
    `Office-Snapshot: ${input.topicTitle}`,
    "",
    "Ist-Stand",
    ...istStandLines,
    "",
    "Fehlende Informationen",
    ...fehlendeInfoLines,
    "",
    "Antwortquellen",
    ...antwortquellenLines,
  ].join("\n");
}
