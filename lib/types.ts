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

/**
 * Interaktionsmodus eines Checkpoints.
 *
 * STANDARD: Bewertungsbasiert (OK / TO_DO / ggf. ZURÜCKSTELLEN).
 * MULTI_SELECT: Dokumentationsbasiert – Mehrfachauswahl ohne Bewertung, nur M5.
 */
export enum CheckpointMode {
  STANDARD = "STANDARD",
  MULTI_SELECT = "MULTI_SELECT",
}

type ActiveCheckpointBase = {
  id: string;
  block_id: string;
  type: CheckpointType;
  relevance: CheckpointRelevance;
  title: string;
  description?: string;
  m4: {
    /** Static per checkpoint – not computed from status */
    type: "ACTION" | "NOTICE";
    text: string;
  };
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

/** Standard-Checkpoints mit Bewertungsstatus (M oder O). */
export type StandardCheckpoint = ActiveCheckpointM | ActiveCheckpointO;

/**
 * Dokumentations-Checkpoint mit Mehrfachauswahl – ohne Bewertung, ohne M4.
 *
 * Wird z. B. für optionale Versorgungsaspekte verwendet, die nur in M5
 * dokumentiert werden sollen. Keine Patienten-To-dos (kein M4).
 */
export type ActiveCheckpointMultiSelect = {
  id: string;
  block_id: string;
  type: CheckpointType;
  category: CheckpointCategory;
  relevance: CheckpointRelevance;
  mode: CheckpointMode.MULTI_SELECT;
  title: string;
  description?: string;
  /** Definierte Auswahlmöglichkeiten für diesen Checkpoint. */
  options: string[];
  /** Aktuell ausgewählte Optionen (initial leer). */
  selections: string[];
  /** Ob der Checkpoint vom Arzt aktiviert wurde (default: false). */
  enabled: boolean;
};

export type ActiveCheckpoint = StandardCheckpoint | ActiveCheckpointMultiSelect;

/** Type guard: prüft ob ein Checkpoint vom Typ MULTI_SELECT ist. */
export function isMultiSelectCheckpoint(
  cp: ActiveCheckpoint,
): cp is ActiveCheckpointMultiSelect {
  return "mode" in cp && cp.mode === CheckpointMode.MULTI_SELECT;
}

/** Type guard: prüft ob ein Checkpoint ein Standard-Bewertungscheckpoint ist. */
export function isStandardCheckpoint(
  cp: ActiveCheckpoint,
): cp is StandardCheckpoint {
  return !isMultiSelectCheckpoint(cp);
}

// ---------------------------------------------------------------------------
// M1 – Aktivierungsblöcke
// ---------------------------------------------------------------------------

/** The three activation blocks M1 works with. No M1A / M1B. */
export type M1BlockId =
  | "kommunikation"
  | "medizinische_lage"
  | "versorgung_im_alltag"
  | "pflegebeobachtung";

/** Binary state per block: klar → no activation, unklar → activate checkpoints */
export type M1BlockStatus = "klar" | "unklar";

/**
 * The user's M1 selection: one status per block.
 * Passed into `deriveActiveCheckpointIdsFromM1` to obtain the list of
 * checkpoint IDs that should be activated for this case.
 */
export type M1Selection = Record<M1BlockId, M1BlockStatus>;

/**
 * Eingefrorener M1-Aktivierungsstand zum Zeitpunkt der Fallanlage.
 *
 * Invariante: Dieser Snapshot darf nach der Fallanlage nie mehr verändert werden.
 * Spätere Änderungen am Block-Mapping dürfen bestehende Fälle nicht berühren.
 */
export type M1SnapshotInitial = {
  /** Die M1-Blockauswahl zum Zeitpunkt der Fallanlage. */
  blocks: M1Selection;
  /**
   * Die daraus abgeleitete, eingefrorene Liste aktivierter Checkpoint-IDs.
   * Einzige erlaubte Quelle für `active_checkpoints` dieses Falls.
   */
  activated_checkpoint_ids: string[];
};

// ---------------------------------------------------------------------------

export type PrefillEntry = {
  block_id: string;
  key: string;
  value: string | number | boolean | null;
  source: "patient" | "praxis" | "extern" | "dokument";
};

// ---------------------------------------------------------------------------
// Case Mode
// ---------------------------------------------------------------------------

/** Startmodus eines Falls. "guest" = kein Patientenbezug, "practice" = Praxiszuordnung */
export type CaseMode = "guest" | "practice";
