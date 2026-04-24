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
// ResponseKind – sprachliche Funktion eines Hinweisbausteins
// ---------------------------------------------------------------------------

/**
 * Kategorisiert einen Hinweisbaustein nach seiner sprachlichen Funktion.
 *
 * INFO                 – ergänzende, weiche Information ohne Handlungsbedarf.
 * VORAUSSETZUNG        – muss erfüllt sein, bevor der Termin stattfinden kann.
 * AKTION               – konkrete Handlung, die der Patient ausführen soll.
 * VORBEREITUNG         – etwas, das der Patient zum Termin mitbringen/vorbereiten soll.
 * ABLEHNUNG_ALTERNATIVE – Anfrage kann nicht erfüllt werden; Alternative wird genannt.
 * AKTENNOTIZ           – interner Hinweis, nicht für den Patienten gedacht.
 */
export enum ResponseKind {
  INFO = "INFO",
  VORAUSSETZUNG = "VORAUSSETZUNG",
  AKTION = "AKTION",
  VORBEREITUNG = "VORBEREITUNG",
  ABLEHNUNG_ALTERNATIVE = "ABLEHNUNG_ALTERNATIVE",
  AKTENNOTIZ = "AKTENNOTIZ",
}

// ---------------------------------------------------------------------------
// Checkpoint-Status
// ---------------------------------------------------------------------------

/**
 * Status eines einzelnen Klärpunkts.
 *
 * UNGEKLAERT      – Initialzustand, darf NICHT in einem bestätigten Output vorkommen.
 * GEKLAERT        – Klärpunkt ist positiv beantwortet. Kein Hinweisbaustein.
 * HINWEIS         – Klärpunkt erfordert einen Hinweisbaustein (notwendig).
 * HINWEIS_OPTIONAL – Klärpunkt erzeugt einen weichen Hinweis (empfohlen, nicht zwingend).
 *                    Verwendet `hintTextOptional` aus dem Template, falls vorhanden.
 */
export enum InquiryCheckpointStatus {
  UNGEKLAERT = "UNGEKLAERT",
  GEKLAERT = "GEKLAERT",
  HINWEIS = "HINWEIS",
  HINWEIS_OPTIONAL = "HINWEIS_OPTIONAL",
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
  /** Hinweisbaustein für status === HINWEIS (notwendig). */
  hintText: string;
  /**
   * Optionaler weicher Hinweisbaustein für status === HINWEIS_OPTIONAL.
   * Falls nicht gesetzt, wird hintText als Fallback verwendet.
   */
  hintTextOptional?: string;
  /** Sprachliche Funktion des Hinweises bei status === HINWEIS. */
  responseKind: ResponseKind;
  /**
   * Sprachliche Funktion des Hinweises bei status === HINWEIS_OPTIONAL.
   * Falls nicht gesetzt, wird responseKind als Fallback verwendet.
   */
  responseKindOptional?: ResponseKind;
  /** Dokumentationszeile pro Status. */
  docText: {
    [InquiryCheckpointStatus.GEKLAERT]: string;
    [InquiryCheckpointStatus.HINWEIS]: string;
    /** Optional – wird nur benötigt, wenn der Checkpoint HINWEIS_OPTIONAL unterstützt. */
    [InquiryCheckpointStatus.HINWEIS_OPTIONAL]?: string;
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
  status:
    | InquiryCheckpointStatus.GEKLAERT
    | InquiryCheckpointStatus.HINWEIS
    | InquiryCheckpointStatus.HINWEIS_OPTIONAL;
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
  /** Hinweisbausteine für alle Checkpoints mit status === HINWEIS oder HINWEIS_OPTIONAL. Leer wenn alle GEKLAERT. */
  hints: string[];
  /**
   * Hinweise gruppiert nach ihrer sprachlichen Funktion (ResponseKind).
   * Rückwärtskompatibel mit hints – enthält dieselben Texte, nur kategorisiert.
   * Gruppen ohne Inhalte sind leere Arrays.
   */
  groupedHints: {
    voraussetzungen: string[];
    aktionen: string[];
    vorbereitungen: string[];
    infos: string[];
    ablehnungen: string[];
  };
  /**
   * Hinweise als geordnete Absatzliste, sortiert nach sprachlicher Funktion:
   * Voraussetzungen → Aktionen → Vorbereitungen → Infos → Ablehnungen.
   * Jeder Eintrag entspricht einem eigenen Absatz (kein Bulletpoint).
   * Leer wenn alle Checkpoints GEKLAERT sind.
   */
  paragraphs: string[];
  /** Eine Dokumentationszeile pro Checkpoint. */
  documentation: string[];
};
