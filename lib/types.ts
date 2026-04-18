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
  /** Medizinisch: fachliche Bewertung notwendig, keine automatische Entscheidung */
  M = "M",
  /** Organisatorisch: deterministisch aus Fakten ableitbar, automatisierbar */
  O = "O",
}

export enum CheckpointRelevance {
  /** Pflicht: immer sichtbar und zu bewerten */
  P = "P",
  /** Additiv: nur in passenden Kontexten aktiv */
  A = "A",
}

type ActiveCheckpointBase = {
  id: string;
  block_id: string;
  type: CheckpointType;
  relevance: CheckpointRelevance;
  title: string;
  description?: string;
};

export type ActiveCheckpointM = ActiveCheckpointBase & {
  category: CheckpointCategory.M;
  /** Medizinisch: OK | TO_DO | ZURÜCKSTELLEN */
  status: "OK" | "TO_DO" | "ZURÜCKSTELLEN";
};

export type ActiveCheckpointO = ActiveCheckpointBase & {
  category: CheckpointCategory.O;
  /** Organisatorisch: OK | TO_DO – ZURÜCKSTELLEN ist nicht erlaubt */
  status: "OK" | "TO_DO";
};

export type ActiveCheckpoint = ActiveCheckpointM | ActiveCheckpointO;

export type PrefillEntry = {
  block_id: string;
  key: string;
  value: string | number | boolean | null;
  source: "patient" | "praxis" | "extern" | "dokument";
};
