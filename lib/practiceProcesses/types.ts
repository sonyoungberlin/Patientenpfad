/**
 * Kerntypen der Checkpoint-Bibliothek.
 * Keine Runtime-Objekte, keine Session-Typen, keine Regellogik.
 */

// ---------------------------------------------------------------------------
// Orientierungsanker
// ---------------------------------------------------------------------------

/** Fachlicher Ankerpunkt, der den Denkprozess bei der Einschätzung eines Checkpoints strukturiert. */
export interface PracticeCheckpointAnchor {
  readonly id: string;
  readonly text: string;
}

// ---------------------------------------------------------------------------
// Checkpoint
// ---------------------------------------------------------------------------

/**
 * Atomare fachliche Informationseinheit der Bibliothek.
 * Kennt keinen Prozess, keine Regeln, keine Verantwortlichkeiten.
 */
export interface PracticeCheckpoint {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  /** Orientierungshinweis zur Anwendung des Checkpoints — kein fachlicher Definitionsbestandteil. */
  readonly orientationHint?: string;
  readonly orientationAnchors?: readonly PracticeCheckpointAnchor[];
}

// ---------------------------------------------------------------------------
// Ablaufprofil
// ---------------------------------------------------------------------------

/** Verweis eines Ablaufprofils auf einen Checkpoint. */
export interface PracticeCheckpointRef {
  readonly checkpointId: string;
  /** Rein visuelle Gruppierung; keine fachliche Bedeutung. */
  readonly group?: string;
}

/**
 * Ablaufprofil: geordnete Zusammenstellung von Checkpoints für einen Falltyp.
 * Enthält keine Regeln und keine Praxiskonfiguration.
 */
export interface PracticeCaseProfile {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly checkpointRefs: readonly PracticeCheckpointRef[];
}
