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

// ---------------------------------------------------------------------------
// Neue Architektur – M2-Facts, M3-OutputBlocks und überarbeitete V2-Typen
// ---------------------------------------------------------------------------

/**
 * Sprachliche Funktion eines Checkpoints nach der neuen Architektur.
 *
 * DECISION    – trifft die Kernentscheidung (möglich / nicht möglich).
 * EXPLANATION – erklärt Ursache oder Bedingung.
 * ACTION      – beschreibt den nächsten Schritt.
 * PREPARATION – sammelt Mitbring- oder Vorbereitungshinweise.
 */
export enum InquiryCheckpointKind {
  DECISION = "DECISION",
  EXPLANATION = "EXPLANATION",
  ACTION = "ACTION",
  PREPARATION = "PREPARATION",
}

/**
 * Geltungsbereich eines Checkpoints.
 *
 * SPECIFIC – gehört nur zu einem Anliegen.
 * GLOBAL   – wiederverwendbar; wird durch Anliegen gebunden, aber nicht immer aktiv.
 */
export enum InquiryCheckpointScope {
  SPECIFIC = "SPECIFIC",
  GLOBAL = "GLOBAL",
}

/**
 * Ausgabeposition eines Checkpoints in der Antwort.
 *
 * ATTACHED      – hängt am jeweiligen Anliegen-Abschnitt.
 * SHARED_BOTTOM – wird einmal unten in der Nachricht gesammelt (dedupliziert).
 */
export enum InquiryCheckpointPlacement {
  ATTACHED = "ATTACHED",
  SHARED_BOTTOM = "SHARED_BOTTOM",
}

/** Status für DECISION-Checkpoints. */
export enum DecisionStatus {
  POSSIBLE = "POSSIBLE",
  NOT_POSSIBLE = "NOT_POSSIBLE",
  DISABLED = "DISABLED",
}

/** Status für EXPLANATION-Checkpoints und M2-Facts. */
export enum ExplanationStatus {
  YES = "YES",
  NO = "NO",
  UNKNOWN = "UNKNOWN",
}

/** Status für ACTION- und PREPARATION-Checkpoints. */
export enum ActionStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

/** Union aller möglichen Checkpoint-Statuswerte. */
export type CheckpointStatusValue =
  | DecisionStatus
  | ExplanationStatus
  | ActionStatus;

/**
 * M2-Fakt – sammelt Kontext/Information für M3.
 * Erzeugt bewusst KEINEN Patiententext.
 * Status: YES / NO / UNKNOWN (ExplanationStatus).
 */
export type InquiryFact = {
  id: string;
  label: string;
  scope: InquiryCheckpointScope;
};

/**
 * M3-Ausgabebaustein – erzeugt Patiententext.
 * Wird vom Arzt/MFA explizit ausgewählt.
 * Erzeugt keinen Text aus Status-Mapping, sondern enthält direkt den Text.
 */
export type InquiryOutputBlock = {
  id: string;
  label: string;
  kind: InquiryCheckpointKind;
  scope: InquiryCheckpointScope;
  placement: InquiryCheckpointPlacement;
  /** Patiententext dieses Bausteins. */
  text: string;
  /** Optionaler Dokumentationstext. Fällt auf text zurück. */
  docText?: string;
};

/**
 * Checkpoint-Definition nach der alten V2-Architektur.
 * @deprecated Verwende InquiryFact (M2) und InquiryOutputBlock (M3).
 *
 * textByStatus – Antworttext je Statuswert (nur aktive Stati müssen befüllt sein).
 * docByStatus  – Dokumentationszeile je Statuswert (optional; fällt auf textByStatus zurück).
 */
export type InquiryCheckpoint = {
  id: string;
  label: string;
  kind: InquiryCheckpointKind;
  scope: InquiryCheckpointScope;
  placement: InquiryCheckpointPlacement;
  textByStatus: Partial<Record<CheckpointStatusValue, string>>;
  docByStatus?: Partial<Record<CheckpointStatusValue, string>>;
};

/**
 * Anfrageprofil nach der neuen M2/M3-Architektur.
 *
 * Trennt M2-Fakten (keine Textausgabe) von M3-Ausgabebausteinen (explizit gewählt).
 */
export type InquiryProfileV2 = {
  id: string;
  label: string;
  /** M2 – spezifische Klärfragen/Fakten, kein Patiententext. */
  specificFactIds: string[];
  /** M2 – gebundene globale Fakten, kein Patiententext. */
  boundGlobalFactIds: string[];
  /** M3 – OutputBlock-ID für Entscheidung POSSIBLE. */
  decisionPossibleOutputBlockId: string;
  /** M3 – OutputBlock-ID für Entscheidung NOT_POSSIBLE. */
  decisionNotPossibleOutputBlockId: string;
  /** M3 – wählbare ATTACHED-Begründungs-/Info-Bausteine. */
  availableOutputBlockIds: string[];
  /** M3 – wählbare SHARED_BOTTOM-Aktionsbausteine. */
  availableActionIds: string[];
};

/**
 * Eingabe für renderInquiryResponseFromSections:
 * Explizit ausgewählte M3-Ausgabebausteine pro Anliegen.
 *
 * Facts erscheinen in factStatuses nur als Kontext – sie erzeugen keinen Text.
 */
export type InquirySection = {
  inquiryId: string;
  decisionStatus: DecisionStatus;
  /** Explizit gewählte ATTACHED-Ausgabebausteine (M3). */
  selectedOutputBlockIds: string[];
  /** Explizit gewählte SHARED_BOTTOM-Aktionsbausteine (M3). */
  selectedActionIds: string[];
  /** M2-Faktstatus – nur Kontext, wird nicht gerendert. */
  factStatuses?: Record<string, ExplanationStatus>;
};

/** Ausgabe eines einzelnen Anliegen-Abschnitts. */
export type InquirySectionOutput = {
  inquiryId: string;
  label: string;
  /** Texte der ATTACHED-OutputBlocks dieses Abschnitts. */
  attachedParagraphs: string[];
  /** Dokumentationszeilen für diesen Abschnitt. */
  documentation: string[];
};

/**
 * Gesamtergebnis von renderInquiryResponseFromSections.
 *
 * sections     – ein Abschnitt pro Anliegen mit ATTACHED-Bausteinen.
 * sharedBottom – deduplizierte SHARED_BOTTOM-Bausteine (Wege, Sammelhinweise).
 * documentation – alle Dokumentationszeilen aller Abschnitte.
 */
export type InquiryResponseV2Output = {
  sections: InquirySectionOutput[];
  sharedBottom: string[];
  documentation: string[];
};

// ---------------------------------------------------------------------------
// Output (Altarchitektur)
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
