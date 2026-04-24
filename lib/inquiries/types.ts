/**
 * Typen für den Anfrage-Assistenten.
 *
 * Vollständig isoliert von der Verordnungslogik (lib/logic, lib/types).
 * Keine Imports aus CaseSession, deriveM5Output o. ä.
 */

// ---------------------------------------------------------------------------
// Inquiry Types
// ---------------------------------------------------------------------------

export enum InquiryType {
  FSME_IMPFUNG = "FSME_IMPFUNG",
}

// ---------------------------------------------------------------------------
// Checkpoint-Status
// ---------------------------------------------------------------------------

/**
 * Status eines einzelnen Klärpunkts.
 *
 * UNGEKLAERT – Initialzustand, darf NICHT in einem bestätigten Output vorkommen.
 * GEKLAERT   – Klärpunkt ist positiv beantwortet. Kein Hinweisbaustein.
 * HINWEIS    – Klärpunkt erfordert einen Hinweisbaustein in der Antwort.
 */
export enum InquiryCheckpointStatus {
  UNGEKLAERT = "UNGEKLAERT",
  GEKLAERT = "GEKLAERT",
  HINWEIS = "HINWEIS",
}

// ---------------------------------------------------------------------------
// Checkpoint-Template (statisch, katalogbasiert)
// ---------------------------------------------------------------------------

export type InquiryQuestion = {
  id: string;
  text: string;
};

/**
 * Unveränderliches Checkpoint-Template aus dem statischen Katalog.
 * Status ist nicht Teil des Templates – wird in ActiveInquiryCheckpoint ergänzt.
 */
export type InquiryCheckpointTemplate = {
  id: string;
  title: string;
  description?: string;
  questions: InquiryQuestion[];
  /** Hinweisbaustein, der im Antworttext erscheint wenn status === HINWEIS. */
  hintText: string;
  /** Dokumentationszeile pro Status. */
  docText: {
    [InquiryCheckpointStatus.GEKLAERT]: string;
    [InquiryCheckpointStatus.HINWEIS]: string;
  };
};

// ---------------------------------------------------------------------------
// Aktive Checkpoints (mit Status)
// ---------------------------------------------------------------------------

/**
 * Checkpoint mit draft-Status (noch nicht bestätigt, I2).
 * Darf UNGEKLAERT enthalten.
 */
export type DraftInquiryCheckpoint = InquiryCheckpointTemplate & {
  status: InquiryCheckpointStatus;
};

/**
 * Checkpoint mit bestätigtem Status (I3 abgeschlossen).
 * UNGEKLAERT ist strukturell ausgeschlossen – erzwungen durch den Typ.
 */
export type ConfirmedInquiryCheckpoint = InquiryCheckpointTemplate & {
  status: InquiryCheckpointStatus.GEKLAERT | InquiryCheckpointStatus.HINWEIS;
};

// ---------------------------------------------------------------------------
// Anfrageprofil
// ---------------------------------------------------------------------------

/**
 * Statisches Profil für einen Anfragetyp.
 * Definiert Kernantwort und Reihenfolge der Klärpunkte.
 */
export type InquiryProfile = {
  type: InquiryType;
  label: string;
  /** Immer ausgegebener Kernsatz, unabhängig von Checkpoint-Status. */
  coreAnswer: string;
  /** Geordnete Klärpunkt-IDs aus dem InquiryCheckpointCatalog. */
  checkpointIds: string[];
};

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

/**
 * Ergebnis von renderInquiryResponse.
 * Vollständig deterministisch – kein LLM, keine Seiteneffekte.
 */
export type InquiryOutput = {
  /** Immer enthaltene Kernantwort des Profils. */
  coreAnswer: string;
  /** Hinweisbausteine für alle Checkpoints mit status === HINWEIS. Leer wenn alle GEKLÄRT. */
  hints: string[];
  /** Eine Dokumentationszeile pro Checkpoint. */
  documentation: string[];
};
