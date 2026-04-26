/**
 * Typen für den Anfrage-Assistenten.
 *
 * Vollständig isoliert von der Verordnungslogik (lib/logic, lib/types).
 * Keine Imports aus CaseSession, deriveM5Output o. ä.
 */

// ---------------------------------------------------------------------------
// Inquiry Types
// ---------------------------------------------------------------------------

/**
 * @deprecated V1-Anfragetyp. Verwende stattdessen Profil-IDs in INQUIRY_PROFILE_CATALOG_V2.
 */
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
 *
 * @deprecated V1-Konzept. Im V2-Modell gehört die sprachliche Kategorisierung
 * nicht mehr in den Checkpoint-Typ, sondern in den Antwort-Renderer.
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
 *
 * @deprecated V1-Statusmodell. Im V2-Modell werden DecisionStatus, ExplanationStatus
 * und ActionStatus verwendet.
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
 *
 * @deprecated V1-Template. Im V2-Modell wird InquiryCheckpoint verwendet.
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
 *
 * @deprecated V1-Typ. Im V2-Modell entfällt dieses Zwischenmodell.
 */
export type DraftInquiryCheckpoint = InquiryCheckpointTemplate & {
  status: InquiryCheckpointStatus;
};

/**
 * Checkpoint mit bestätigtem Status (I3 abgeschlossen).
 * UNGEKLAERT ist strukturell ausgeschlossen – erzwungen durch den Typ.
 *
 * @deprecated V1-Typ. Im V2-Modell entfällt dieses Zwischenmodell.
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
 *
 * @deprecated V1-Profil. Im V2-Modell wird InquiryProfileV2 verwendet.
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
// Neue Architektur – Checkpoint-Arten, Scope, Placement, Statusmodelle
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

/**
 * factStatus für EXPLANATION-Checkpoints (M2).
 *
 * M2 speichert ausschließlich den Sachverhalt – nicht die Ausgabe-Entscheidung:
 *   YES       – Sachverhalt liegt vor.
 *   NO        – Bewusst geprüft; Sachverhalt liegt nicht vor.
 *   undefined – Nicht geprüft / nicht relevant (Checkpoint erscheint nicht in M3).
 *
 * Die Ausgabe-Entscheidung (SHOW / HIDE) trifft M3 separat (outputStatus).
 * M4 erzeugt Erklärungstext nur bei outputStatus = SHOW.
 *
 * Vollständige Regel: docs/architecture/anfrage-assistent.md §18
 */
export enum ExplanationStatus {
  YES = "YES",
  NO = "NO",
}

/**
 * outputStatus für EXPLANATION-Checkpoints (M3).
 *
 * M3 entscheidet separat über die Ausgabe – unabhängig vom factStatus (M2):
 *   SHOW      – Erklärungstext in M4 anzeigen.
 *   HIDE      – Erklärung nicht anzeigen (kein Text in M4).
 *   undefined – Keine Ausgabe (Checkpoint erscheint nicht in M4).
 *
 * Defaults (Vorauswahl in M3):
 *   factStatus YES       → SHOW vorausgewählt.
 *   factStatus NO        → HIDE vorausgewählt + Hinweis „keine Erklärung erforderlich".
 *   factStatus undefined → Checkpoint erscheint gar nicht in M3.
 *
 * Vollständige Regel: docs/architecture/anfrage-assistent.md §18
 */
export enum ExplanationOutputStatus {
  SHOW = "SHOW",
  HIDE = "HIDE",
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
 * Checkpoint-Definition nach der neuen Architektur.
 *
 * Für GLOBAL-Checkpoints:
 * - `question` enthält die einmalige M2-Frage (reiner Schalter: ja / nein).
 * - `textByStatus` darf bei GLOBAL-Checkpoints nicht befüllt werden;
 *   der Antworttext wird aus `InquiryProfileV2.globalHints` bezogen.
 *
 * Für SPECIFIC-Checkpoints:
 * - `questions` enthält Klärungsfragen als Entscheidungshilfe / Prefill für M3.
 *   Sie lösen selbst nichts aus und erzeugen keinen automatischen Output.
 * - `textByStatus` enthält den Antworttext je Statuswert.
 *
 * textByStatus – Antworttext je Statuswert (nur aktive Stati müssen befüllt sein).
 * docByStatus  – Dokumentationszeile je Statuswert (optional; fällt auf textByStatus zurück).
 *
 * ### SPECIFIC Explanation Checkpoint
 * Ein SPECIFIC EXPLANATION-Checkpoint hat `scope = SPECIFIC` und `kind = EXPLANATION`.
 * Er trifft keine Hauptentscheidung, sondern bildet eine fachliche Regel ab und kann
 * – falls der Status relevant ist – eine neutrale Erklärung in M4 erzeugen.
 * Jeder Status muss bewusst definiert sein (mit Text oder explizit ohne).
 * Stille durch fehlende Einträge in `textByStatus` ist nicht erlaubt.
 * → Vollständige Definition: docs/architecture/anfrage-assistent.md §18
 */
export type InquiryCheckpoint = {
  id: string;
  label: string;
  kind: InquiryCheckpointKind;
  scope: InquiryCheckpointScope;
  placement: InquiryCheckpointPlacement;
  /**
   * Optionale Feinklassifikation eines Checkpoints.
   *
   * OUTCOME kennzeichnet Checkpoints, die das Ergebnis einer positiven Hauptentscheidung
   * beschreiben. Sie folgen nicht der factStatus/outputStatus-Regel (§18), sondern werden
   * nur gerendert, wenn section.decisionStatus === POSSIBLE (OUTCOME-Guard im Renderer).
   * Beispiel: PRESCRIPTION_STATUTORY_POSSIBLE.
   *
   * Vollständige Abgrenzung EXPLANATION vs. OUTCOME: docs/architecture/anfrage-assistent.md §19
   */
  classification?: "GLOBAL_STATE" | "MODULAR" | "CONTEXT_SPECIFIC" | "OUTCOME";
  /**
   * Einmalige M2-Frage für GLOBAL-Checkpoints (reiner Schalter: ja / nein).
   * Bei SPECIFIC-Checkpoints nicht gesetzt.
   */
  question?: string;
  /**
   * Klärungsfragen für SPECIFIC-Checkpoints als Entscheidungshilfe / Prefill für M3.
   * Lösen selbst nichts aus und erzeugen keinen automatischen Output.
   * Bei GLOBAL-Checkpoints nicht gesetzt.
   */
  questions?: InquiryQuestion[];
  textByStatus: Partial<Record<CheckpointStatusValue, string>>;
  docByStatus?: Partial<Record<CheckpointStatusValue, string>>;
};

/**
 * Anfrageprofil nach der neuen Architektur.
 *
 * Bindet einen DECISION-Checkpoint, spezifische Checkpoints,
 * gebundene globale Checkpoints und verfügbare Aktionen.
 *
 * globalHints definiert pro gebundenem globalem Checkpoint den
 * anliegenspezifischen Hinweistext, der erscheint, wenn der globale
 * Checkpoint mit „ja" beantwortet wurde. Der Text ist bewusst im Profil
 * (nicht im Checkpoint) definiert, da derselbe globale Checkpoint bei
 * verschiedenen Anliegen unterschiedliche Hinweise auslösen kann.
 */
export type InquiryProfileV2 = {
  id: string;
  label: string;
  decisionCheckpointId: string;
  specificCheckpointIds: string[];
  boundGlobalCheckpointIds: string[];
  availableActionIds: string[];
  /**
   * Anliegenspezifische Hinweistexte aus globalen Checkpoints.
   * Key = globalCheckpointId; Value = Hinweistext, der bei Status „ja"
   * für dieses Anliegen in M4 erscheint.
   */
  globalHints?: Record<string, string>;
};

/**
 * Eingabe für renderInquiryResponseFromSections:
 * ein Anliegen mit Entscheidungsstatus und allen Checkpoint-Statuses.
 */
export type InquirySection = {
  inquiryId: string;
  decisionStatus: DecisionStatus;
  checkpointStatuses: Record<string, CheckpointStatusValue>;
  /**
   * outputStatus für EXPLANATION-Checkpoints (gesetzt von M3, §18).
   *
   * SHOW      → Erklärungstext in M4 ausgeben.
   * HIDE      → kein Text.
   * undefined → kein Text (kein Output).
   *
   * Falls dieses Feld fehlt (ältere Sessions / Backward-Compat):
   * Der Renderer leitet den outputStatus aus dem factStatus ab:
   *   factStatus YES → wie SHOW (Text erscheint).
   *   factStatus NO / undefined → kein Output.
   */
  explanationOutputStatuses?: Record<string, ExplanationOutputStatus>;
};

/** Ausgabe eines einzelnen Anliegen-Abschnitts. */
export type InquirySectionOutput = {
  inquiryId: string;
  label: string;
  /**
   * Text des DECISION-Checkpoints für dieses Anliegen.
   * null, wenn kein Text für den aktuellen DecisionStatus definiert ist.
   */
  mainDecision: string | null;
  /** Texte der ATTACHED-Checkpoints dieses Abschnitts (ohne Decision). */
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
 *
 * @deprecated V1-Output. Im V2-Modell wird InquiryResponseV2Output verwendet.
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
