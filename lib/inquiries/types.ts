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
 * Wiederverwendbare Kommunikationsfunktion eines SPECIFIC EXPLANATION-Checkpoints.
 *
 * Dient der strukturellen Klassifikation für Analyse, Guidance und zukünftige
 * M1B/M3-Steuerung. Hat keinen Einfluss auf den Renderer, factStatus oder
 * die Decision-Logik.
 *
 * Nur relevant für kind = EXPLANATION, scope = SPECIFIC.
 * Bei anderen kind/scope-Kombinationen wird das Feld ignoriert.
 *
 * MISSING_DOCUMENT       – fehlende Voraussetzung: Dokument / Nachweis fehlt.
 * MISSING_INFORMATION    – fehlende Voraussetzung: Angabe / Information fehlt.
 * CHANNEL_NOT_SUITABLE   – Kanaleignung nicht gegeben; Weiterleitung auf regulären Weg.
 * EXTERNAL_RESPONSIBILITY – Anliegen liegt bei anderer Stelle / Fachrichtung.
 * RULE_TIME_LIMIT        – zeitliche Regelgrenze (Rückdatierung, Fristen).
 * RULE_COST_COVERAGE     – Kostenübernahme / Kassenleistungsgrenze.
 * MEDICAL_REVIEW_REQUIRED – ärztliche Einschätzung / Konsultation erforderlich.
 * PROCESS_INFO           – Ablauf-, Kanal- oder Formathinweis.
 * OUTCOME_INFO           – Ergebnis-/Outcome-Information nach positiver Entscheidung.
 */
export type SpecificRole =
  | "MISSING_DOCUMENT"
  | "MISSING_INFORMATION"
  | "CHANNEL_NOT_SUITABLE"
  | "EXTERNAL_RESPONSIBILITY"
  | "RULE_TIME_LIMIT"
  | "RULE_COST_COVERAGE"
  | "MEDICAL_REVIEW_REQUIRED"
  | "PROCESS_INFO"
  | "OUTCOME_INFO";

// ---------------------------------------------------------------------------
// M1B – Kommunikationsanlass
// ---------------------------------------------------------------------------

/**
 * Bekannte M1B-Identifier des PRESCRIPTION-Profils (zur Dokumentation).
 *
 * Eingehende Anfragen (Patient → Praxis):
 *   REQ_RENEWAL           – Wiederverordnung Dauermedikation
 *   REQ_NEW_PRESCRIPTION  – Neuverordnung / erstmaliges Präparat
 *   REQ_PRESCRIPTION_CLARIFICATION – Rückfrage zu ausgestelltem oder abgelehntem Rezept
 *   REQ_DELIVERY_FORMAT   – Frage zu eRezept / Apotheke / Zustellweg
 *
 * Ausgehende Praxisnachrichten (Praxis → Patient):
 *   OUT_RECIPE_READY_INFO        – Praxis informiert: Rezept liegt bereit / wurde ausgestellt
 *   OUT_MISSING_REQUIREMENT      – Praxis fordert fehlende Angaben / Voraussetzungen an
 *   OUT_SPECIALIST_RESPONSIBILITY – Praxis verweist auf andere Zuständigkeit
 *   OUT_PRACTICE_CLARIFICATION   – Praxis klärt organisatorisch nach
 *
 * Jedes Profil kann eigene IDs definieren. Der Feldtyp ist bewusst `string`,
 * damit AU und spätere Profile keine Erweiterung dieser Union benötigen.
 * Reine Metadaten – keine Auswirkung auf Decision, Action oder Renderer.
 */
export type CommunicationReasonId =
  | "REQ_RENEWAL"
  | "REQ_NEW_PRESCRIPTION"
  | "REQ_PRESCRIPTION_CLARIFICATION"
  | "REQ_DELIVERY_FORMAT"
  | "OUT_RECIPE_READY_INFO"
  | "OUT_MISSING_REQUIREMENT"
  | "OUT_SPECIALIST_RESPONSIBILITY"
  | "OUT_PRACTICE_CLARIFICATION";

/** Richtung des Kommunikationsanlasses. */
export type CommunicationReasonDirection = "INCOMING" | "OUTGOING";

/**
 * M1B-Eintrag: ein Kommunikationsanlass mit typischen M3-Antwortzielen.
 *
 * suggestedResponseGoalIds – Vorschläge, nicht Zwang.
 *   Der Nutzer kann jedes responseGoal unabhängig vom M1B wählen.
 *
 * `id` und `suggestedResponseGoalIds` sind bewusst als `string` typisiert,
 * damit jedes Profil eigene IDs definieren kann.
 */
export type CommunicationReason = {
  id: string;
  label: string;
  direction: CommunicationReasonDirection;
  /** Typische M3-Antwortziele für diesen Anlass (Vorschläge). */
  suggestedResponseGoalIds: string[];
};

// ---------------------------------------------------------------------------
// M3 – Antwortziel
// ---------------------------------------------------------------------------

/**
 * Bekannte M3-Identifier des PRESCRIPTION-Profils (zur Dokumentation).
 *
 *   ISSUE_CONFIRMED             – Rezept wurde ausgestellt
 *   ISSUE_BLOCKED_EXTERNAL      – Externe / andere Zuständigkeit
 *   ISSUE_BLOCKED_MISSING_DOC   – Unterlagen oder Nachweis fehlen
 *   ISSUE_BLOCKED_COST_COVERAGE – Kassenleistung / Privatrezept / Kostenklärung
 *   PROCESS_EXPLAINED           – eRezept / Apotheke / Zustellweg erklären
 *   MEDICAL_REVIEW_NEEDED       – ärztliche Einschätzung erforderlich
 *
 * Jedes Profil kann eigene IDs definieren. Der Feldtyp ist bewusst `string`.
 * Reine Metadaten – keine Auswirkung auf Decision, Action oder Renderer.
 */
export type ResponseGoalId =
  | "ISSUE_CONFIRMED"
  | "ISSUE_BLOCKED_EXTERNAL"
  | "ISSUE_BLOCKED_MISSING_DOC"
  | "ISSUE_BLOCKED_COST_COVERAGE"
  | "PROCESS_EXPLAINED"
  | "MEDICAL_REVIEW_NEEDED";

/**
 * ## M3 – 4er-Core-Struktur der ResponseGoals (Architektur-Regel)
 *
 * Jedes Profil soll seine ResponseGoals gegen die folgenden vier Kern-Kategorien
 * prüfen, bevor neue IDs eingeführt werden:
 *
 *   ISSUE_CONFIRMED      – Anliegen positiv abgeschlossen (z. B. Rezept ausgestellt).
 *                          Pflicht-SpecificRole: OUTCOME_INFO.
 *                          Darf NUR bei diesem Goal-Typ vorkommen.
 *
 *   ISSUE_BLOCKED_*      – Anliegen blockiert (z. B. fehlende Unterlagen, Kostenklärung,
 *                          externe Zuständigkeit). Profilspezifische Suffixe erlaubt
 *                          (z. B. ISSUE_BLOCKED_MISSING_DOC).
 *                          SpecificRole: MISSING_DOCUMENT, MISSING_INFORMATION,
 *                          EXTERNAL_RESPONSIBILITY, RULE_TIME_LIMIT, RULE_COST_COVERAGE.
 *                          Verboten: OUTCOME_INFO.
 *
 *   MEDICAL_REVIEW_NEEDED – Ärztliche Einschätzung / Rücksprache erforderlich.
 *                          Pflicht-SpecificRole: MEDICAL_REVIEW_REQUIRED.
 *
 *   PROCESS_EXPLAINED    – Ablauf-, Kanal- oder Formathinweis (z. B. eRezept, Zustellweg).
 *                          Pflicht-SpecificRole: PROCESS_INFO.
 *                          Verboten: profilspezifische Ersatz-IDs wie DELIVERY_FORMAT_EXPLAINED.
 *
 * Neue ResponseGoals nur einführen, wenn ein Anliegen semantisch in keine dieser vier
 * Kategorien passt und eine eigene ID inhaltlich notwendig ist.
 */

/**
 * M3-Eintrag: ein Antwortziel mit relevanten specificRoles und Action-Guidance-Hinweisen.
 *
 * relevantSpecificRoles    – specificRoles, die typisch für dieses Ziel sind (Metadaten).
 * relevantActionGuidanceIds – IDs bestehender ActionGuidanceRules, die zu diesem Ziel passen.
 *
 * `id` ist bewusst als `string` typisiert, damit jedes Profil eigene IDs definieren kann.
 */
export type ResponseGoal = {
  id: string;
  label: string;
  /** Typische specificRoles für dieses Antwortziel. */
  relevantSpecificRoles: SpecificRole[];
  /** IDs bestehender ActionGuidanceRules, die zu diesem Antwortziel passen. */
  relevantActionGuidanceIds: string[];
};

/**
 * Checkpoint-Definition nach der neuen Architektur.
 *
 * Für GLOBAL GLOBAL_STATE-Checkpoints:
 * - `question` enthält die einmalige M2-Frage (reiner Schalter: ja / nein).
 * - `textByStatus` muss leer bleiben; kein patientensichtbarer Output.
 *   Diese Checkpoints steuern intern den Kontext (z. B. IS_CHRONIC_PATIENT).
 *
 * Für GLOBAL MODULAR EXPLANATION-Checkpoints:
 * - `question` enthält die einmalige M2-Frage.
 * - `textByStatus[YES]` enthält den zentralen, profilübergreifenden Default-Text.
 * - Profile können den Text via `InquiryProfileV2.globalHints[id]` überschreiben.
 * - Diese Checkpoints erscheinen in M3 als SHOW/HIDE-fähige Output-Bausteine.
 * - Der Renderer gibt sie nur aus, wenn M2-Status YES und M3-outputStatus SHOW gesetzt ist.
 *   Ohne gespeicherte explanationOutputStatuses gilt Backward-Compat: YES → Ausgabe.
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
   * Thematische Unterkategorie für ACTION-Checkpoints (kind = ACTION).
   *
   * Dient der Gruppierung und Darstellung in M2/M3 (z. B. Vorbereitungshinweise,
   * Prozessinfos, nächste Schritte). Hat keinen Einfluss auf die Decision-Logik.
   *
   * PREPARATION – Patientenhinweise vor dem Termin (z. B. nüchtern, Probe vorbereiten).
   * PROCESS     – Ablaufhinweise (z. B. Probenabgabe).
   * NEXT_STEP   – Hinweise auf nächste Handlungsschritte (z. B. Buchungscode nutzen).
   * INFO        – Allgemeine Sachinformationen (z. B. Befunddauer).
   */
  actionCategory?: "PREPARATION" | "PROCESS" | "NEXT_STEP" | "INFO";
  /**
   * Wiederverwendbare Kommunikationsfunktion dieses Checkpoints.
   *
   * Nur relevant für kind = EXPLANATION, scope = SPECIFIC.
   * Optional – beeinflusst weder Renderer noch factStatus noch Decision-Logik.
   * Bei anderen kind/scope-Kombinationen wird das Feld ignoriert.
   */
  specificRole?: SpecificRole;
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

// ---------------------------------------------------------------------------
// ActionGuidanceRule – UI-only Guidance-System
// ---------------------------------------------------------------------------

/**
 * UI-Darstellungshinweis für eine Action.
 * Steuert ausschließlich Sichtbarkeit und Hervorhebung – kein Einfluss auf
 * DecisionStatus oder ActionStatus.
 *
 * recommended     – empfohlene Aktion; wird visuell hervorgehoben.
 * visible         – Aktion wird angezeigt (Standard-Sichtbarkeit).
 * hiddenByDefault – Aktion wird standardmäßig ausgeblendet.
 * caution         – Aktion wird mit einem Warnhinweis versehen.
 */
export type UIGuidanceHint = "recommended" | "visible" | "hiddenByDefault" | "caution";

/**
 * Einzelne Checkpoint-Bedingung innerhalb einer when-Klausel.
 * Referenziert einen beliebigen Checkpoint aus checkpointStatuses der Session.
 */
export type GuidanceCondition = {
  checkpointId: string;
  status: CheckpointStatusValue;
};

/**
 * Kontextbedingung einer Guidance-Regel.
 *
 * Alle gesetzten Felder werden per AND verknüpft.
 * Innerhalb von allOf / anyOf / noneOf gelten die üblichen Mengenregeln.
 *
 * decisionStatus – DecisionStatus der Section (POSSIBLE / NOT_POSSIBLE / DISABLED).
 *                  undefined = gilt für alle DecisionStatus-Werte.
 * allOf          – alle genannten Checkpoint-Bedingungen müssen erfüllt sein.
 * anyOf          – mindestens eine der genannten Bedingungen muss erfüllt sein.
 * noneOf         – keine der genannten Bedingungen darf erfüllt sein.
 *
 * Leere Arrays ([]) gelten als erfüllt (vacuous truth).
 * Fehlende Einträge in checkpointStatuses gelten als nicht erfüllt.
 */
export type GuidanceWhen = {
  decisionStatus?: DecisionStatus;
  allOf?: GuidanceCondition[];
  anyOf?: GuidanceCondition[];
  noneOf?: GuidanceCondition[];
};

/**
 * Regel zur UI-Steuerung einer Action.
 *
 * Invarianten:
 * - Guidance setzt keine DecisionStatus-Werte.
 * - Guidance aktiviert keine Action automatisch (ActionStatus bleibt unberührt).
 * - Guidance beeinflusst ausschließlich die UI-Darstellung.
 *
 * checkpointId – die Action, deren UI-Hinweis bewertet wird.
 * profileId    – Einschränkung auf ein Profil (undefined = profilübergreifend).
 * when         – Kontextbedingung; fehlt = Regel gilt immer.
 * hint         – Darstellungshinweis.
 * hintText     – optionaler Erklärungstext, nur sinnvoll bei hint = "caution".
 */
export type ActionGuidanceRule = {
  id: string;
  checkpointId: string;
  profileId?: string;
  when?: GuidanceWhen;
  hint: UIGuidanceHint;
  hintText?: string;
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
   * Profil-spezifische Action/Info/Preparation-Checkpoints (kind = ACTION).
   *
   * Diese Checkpoints werden in M2 abgefragt (factStatus) und in M3 schaltbar
   * angeboten (outputStatus, Default: HIDE). M4 rendert ihren Text nur, wenn
   * der Status ACTIVE ist.
   *
   * Abgrenzung zu availableActionIds: availableActionIds sind globale,
   * profilübergreifende Aktionen (z. B. PROCESSING_DELAY), die in sharedBottom
   * erscheinen. boundActionCheckpointIds sind anliegenspezifisch.
   */
  boundActionCheckpointIds?: string[];
  /**
   * Anliegenspezifische Hinweistexte aus globalen Checkpoints.
   * Key = globalCheckpointId; Value = Hinweistext, der bei Status „ja"
   * für dieses Anliegen in M4 erscheint.
   */
  globalHints?: Record<string, string>;
  /**
   * UI-only Guidance-Regeln für Actions dieses Profils.
   *
   * Steuern ausschließlich die Darstellung von Actions in der UI.
   * Kein Einfluss auf DecisionStatus, ActionStatus oder den Renderer.
   * Ausgewertet durch evaluateActionGuidance (lib/inquiries/evaluateActionGuidance.ts).
   */
  actionGuidanceRules?: ActionGuidanceRule[];
  /**
   * M1B – Kommunikationsanlässe dieses Profils (Pilot: PRESCRIPTION).
   *
   * Reine Metadaten zur UI-Führung. Keine Auswirkung auf Decision, Action oder Renderer.
   * Nur in Profilen gesetzt, für die der M1B/M3-Pilot aktiv ist.
   */
  communicationReasons?: CommunicationReason[];
  /**
   * M3 – Antwortziele dieses Profils (Pilot: PRESCRIPTION).
   *
   * Reine Metadaten zur UI-Führung. Keine Auswirkung auf Decision, Action oder Renderer.
   * Nur in Profilen gesetzt, für die der M1B/M3-Pilot aktiv ist.
   */
  responseGoals?: ResponseGoal[];
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
