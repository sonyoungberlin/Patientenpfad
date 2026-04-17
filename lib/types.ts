export enum BlockStatus {
  GEKLAERT = "GEKLAERT",
  TEILWEISE_OFFEN = "TEILWEISE_OFFEN",
  OFFEN = "OFFEN",
  NICHT_RELEVANT = "NICHT_RELEVANT",
}

export type BlockSummary = {
  block_id: string;
  block_title: string;
  block_status: BlockStatus;
  summary_short?: string;
  active_checkpoint_count: number;
};

export enum CheckpointType {
  PRESENCE_CHECK = "PRESENCE_CHECK",
  NACHWEIS = "NACHWEIS",
  VERIFIKATION = "VERIFIKATION",
  PROZESS_VORLAUF = "PROZESS_VORLAUF",
  BEDARF = "BEDARF",
  ZIEL = "ZIEL",
}

export enum CheckpointCategory {
  M = "M",
  O = "O",
}

export enum CheckpointRelevance {
  P = "P",
  A = "A",
}

export type ActiveCheckpoint = {
  id: string;
  block_id: string;
  type: CheckpointType;
  category: CheckpointCategory;
  relevance: CheckpointRelevance;
  title: string;
  description?: string;
  status: "OPEN" | "DONE" | "UNCLEAR";
};

export type PrefillEntry = {
  block_id: string;
  key: string;
  value: string | number | boolean | null;
  source: "patient" | "praxis" | "extern" | "dokument";
};
