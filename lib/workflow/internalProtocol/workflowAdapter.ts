/**
 * Adapter zwischen praxisinternen Protokollen (lib/workflow/internalProtocol/)
 * und der bestehenden Workflow-Session-Infrastruktur.
 *
 * Kein Import aus lib/workflow/types.ts oder lib/workflow/processCatalog.ts
 * (um Kreisabhängigkeiten zu vermeiden). Kein Import aus klinischen
 * Workflow-Modulen.
 *
 * Dieses Modul definiert das Speicherformat für interne Protokoll-Sitzungen
 * im process_snapshot-JSON-Feld einer WorkflowSession.
 */

import { type WorkflowProcessKind, getProcessKindForTopicId } from "../processKind";
export type { WorkflowProcessKind } from "../processKind";

// ---------------------------------------------------------------------------
// Speicherformat im process_snapshot-JSON-Feld
// ---------------------------------------------------------------------------

/**
 * Antwortwert für eine einzelne Protokollfrage im Workflow-Kontext.
 *
 * - null        = noch nicht beantwortet
 * - string      = YES_NO_UNCLEAR-Antwort ("YES"|"NO"|"UNCLEAR"),
 *                 SINGLE_SELECT-Option-ID oder FREE_TEXT-Inhalt
 * - string[]    = MULTI_SELECT-Option-IDs
 */
export type ProtocolWorkflowAnswerValue = string | string[] | null;

/** Map von Frage-IDs zu Antwortwerten. */
export type ProtocolWorkflowAnswers = Record<string, ProtocolWorkflowAnswerValue>;

/**
 * Status eines Sections-Checkpoints im internen Protokoll.
 * Semantisch getrennt von ProcessPointStatus der klinischen Workflows.
 */
export type ProtocolCheckpointStatus = "OPEN" | "CONFIRMED" | "NOT_APPLICABLE";

/**
 * Fachliches Urteil aus M3. Separat vom technisch ableitbaren Antwortstand aus M2.
 *
 * SUFFICIENTLY_CLARIFIED = ausreichend geklärt
 * OPEN                   = noch offen
 * NOT_RELEVANT           = nicht relevant für diese Praxis
 */
export type ProtocolClarificationJudgement =
  | "SUFFICIENTLY_CLARIFIED"
  | "OPEN"
  | "NOT_RELEVANT";

/** Perspektive einer PRACTICE_PROCESS-Session: dokumentierter Ist-Zustand oder geplanter Soll-Zustand. */
export type PracticeProcessMode = "CURRENT_STATE" | "TARGET_STATE";

/** Zustand eines einzelnen Protocol-Checkpoints (entspricht einer ProtocolSection). */
export interface ProtocolWorkflowCheckpoint {
  /** ID der ProtocolSection, z. B. "PC-C01". */
  id: string;
  /** Titel der ProtocolSection. */
  title: string;
  /**
   * Technisch ableitbarer Antwortstand aus M2.
   * Nicht für das fachliche Urteil aus M3 verwenden – dafür clarificationJudgement.
   */
  status: ProtocolCheckpointStatus;
  /** Antworten auf alle Fragen dieser Section. */
  answers: ProtocolWorkflowAnswers;
  /**
   * Fachliches Urteil aus M3. Separat von `status`.
   * Nicht vorhanden, solange M3 noch nicht durchlaufen wurde (Altdaten: gilt als offen).
   */
  clarificationJudgement?: ProtocolClarificationJudgement;
}

/**
 * Snapshot-Format für praxisinterne Protokoll-Sitzungen im process_snapshot-Feld.
 *
 * Erkennbar durch processKind: "internal-protocol". Koexistiert mit dem
 * klinischen WorkflowProcessSnapshot (erkennbar durch Fehlen von processKind).
 */
export interface InternalProtocolWorkflowSnapshot {
  processKind: "internal-protocol";
  topicId: "patienten-ohne-termin";
  checkpoints: ProtocolWorkflowCheckpoint[];
  /**
   * Fachlich definierte Ausgangsvorschläge aus der Prozessvorlage.
   * Statisch pro topicId – wird nie durch Benutzerantworten überschrieben.
   * Fehlt bei Altdaten; nur in neuen Sitzungen gesetzt.
   */
  templateAnswers?: ProtocolWorkflowAnswers;
  /** Perspektive der Session. Fehlt bei Altdaten: gilt als CURRENT_STATE. */
  processMode?: PracticeProcessMode;
  /** Verweist auf die Ursprungs-Session bei einer aus CURRENT_STATE abgeleiteten TARGET_STATE-Session. */
  sourceWorkflowSessionId?: string;
  /**
   * Frage-IDs, deren Antworten aus einer CURRENT_STATE-Session übernommen und
   * seitdem nicht verändert wurden. Wird in M2 zur Herkunftskennzeichnung verwendet.
   * Nur gesetzt bei TARGET_STATE-Sessions mit sourceWorkflowSessionId.
   * Eine Frage-ID wird serverseitig entfernt, sobald ihre Antwort geändert wird.
   */
  inheritedQuestionIds?: string[];
  /**
   * @deprecated Ersetzt durch inheritedQuestionIds (ab Phase 3).
   * Nur noch für Altdaten vorhanden, die vor der Umstellung erzeugt wurden.
   * Neue Sessions enthalten ausschließlich inheritedQuestionIds.
   */
  inheritedAnswers?: ProtocolWorkflowAnswers;
}

// ---------------------------------------------------------------------------
// Type Guards
// ---------------------------------------------------------------------------

/** Prüft ob ein Wert ein gültiger ProtocolCheckpointStatus ist. */
export function isProtocolCheckpointStatus(
  value: unknown,
): value is ProtocolCheckpointStatus {
  return value === "OPEN" || value === "CONFIRMED" || value === "NOT_APPLICABLE";
}

/** Prüft ob ein Wert ein gültiges ProtocolClarificationJudgement ist. */
export function isProtocolClarificationJudgement(
  value: unknown,
): value is ProtocolClarificationJudgement {
  return (
    value === "SUFFICIENTLY_CLARIFIED" ||
    value === "OPEN" ||
    value === "NOT_RELEVANT"
  );
}

/** Prüft ob ein Wert ein gültiger PracticeProcessMode ist. */
export function isPracticeProcessMode(
  value: unknown,
): value is PracticeProcessMode {
  return value === "CURRENT_STATE" || value === "TARGET_STATE";
}

/** Prüft ob ein Wert ein gültiger ProtocolWorkflowAnswerValue ist. */
export function isProtocolWorkflowAnswerValue(
  value: unknown,
): value is ProtocolWorkflowAnswerValue {
  if (value === null) return true;
  if (typeof value === "string") return true;
  if (Array.isArray(value)) return value.every((v) => typeof v === "string");
  return false;
}

/** Prüft ob ein Wert ein gültiger ProtocolWorkflowCheckpoint ist. */
export function isProtocolWorkflowCheckpoint(
  value: unknown,
): value is ProtocolWorkflowCheckpoint {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || v.id.length === 0) return false;
  if (typeof v.title !== "string") return false;
  if (!isProtocolCheckpointStatus(v.status)) return false;
  if (!v.answers || typeof v.answers !== "object" || Array.isArray(v.answers))
    return false;
  for (const val of Object.values(v.answers as Record<string, unknown>)) {
    if (!isProtocolWorkflowAnswerValue(val)) return false;
  }
  // clarificationJudgement ist optional; wenn vorhanden muss es gültig sein
  if (
    "clarificationJudgement" in v &&
    v.clarificationJudgement !== undefined &&
    !isProtocolClarificationJudgement(v.clarificationJudgement)
  )
    return false;
  return true;
}

/**
 * Prüft ob ein Wert ein gültiger InternalProtocolWorkflowSnapshot ist.
 * Wirft keine Ausnahmen.
 */
export function isInternalProtocolWorkflowSnapshot(
  value: unknown,
): value is InternalProtocolWorkflowSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (v.processKind !== "internal-protocol") return false;
  if (v.topicId !== "patienten-ohne-termin") return false;
  if (!Array.isArray(v.checkpoints)) return false;
  if (!v.checkpoints.every(isProtocolWorkflowCheckpoint)) return false;
  // templateAnswers ist optional; wenn vorhanden muss es ein Objekt sein
  if (
    "templateAnswers" in v &&
    v.templateAnswers !== undefined &&
    v.templateAnswers !== null &&
    (typeof v.templateAnswers !== "object" || Array.isArray(v.templateAnswers))
  )
    return false;
  // processMode ist optional; wenn vorhanden muss es ein gültiger Wert sein
  if (
    "processMode" in v &&
    v.processMode !== undefined &&
    !isPracticeProcessMode(v.processMode)
  )
    return false;
  // sourceWorkflowSessionId ist optional; wenn vorhanden muss es ein String sein
  if (
    "sourceWorkflowSessionId" in v &&
    v.sourceWorkflowSessionId !== undefined &&
    typeof v.sourceWorkflowSessionId !== "string"
  )
    return false;
  // inheritedQuestionIds ist optional; wenn vorhanden muss es ein Array von Strings sein
  if ("inheritedQuestionIds" in v && v.inheritedQuestionIds !== undefined) {
    if (!Array.isArray(v.inheritedQuestionIds)) return false;
    if (!(v.inheritedQuestionIds as unknown[]).every((id) => typeof id === "string")) return false;
  }
  // inheritedAnswers: Rückwärtskompatibilität für Altdaten; wenn vorhanden muss es ein Objekt sein
  if (
    "inheritedAnswers" in v &&
    v.inheritedAnswers !== undefined &&
    v.inheritedAnswers !== null &&
    (typeof v.inheritedAnswers !== "object" || Array.isArray(v.inheritedAnswers))
  )
    return false;
  return true;
}

// ---------------------------------------------------------------------------
// Initialisierung
// ---------------------------------------------------------------------------

import { getPatientWithoutAppointmentSections } from "./patientWithoutAppointment";

/**
 * Erzeugt die initialen Checkpoints für eine neue Protokoll-Sitzung
 * aus den definierten Sections des Pilotprozesses.
 *
 * Alle Checkpoints starten mit status: "OPEN" und leeren Antworten (alle null).
 * Wird für Tests und als Basis für buildPrefillProtocolWorkflowCheckpoints verwendet.
 */
export function buildInitialProtocolWorkflowCheckpoints(): ProtocolWorkflowCheckpoint[] {
  return getPatientWithoutAppointmentSections().map((section) => {
    const answers: ProtocolWorkflowAnswers = {};
    for (const q of section.questions) {
      answers[q.id] = null;
    }
    return {
      id: section.id,
      title: section.title,
      status: "OPEN" as const,
      answers,
    };
  });
}

// ---------------------------------------------------------------------------
// Prefill-Vorschlagswerte für „Patienten ohne Termin"
// ---------------------------------------------------------------------------

/**
 * Praxistaugliche Ausgangsvorschläge für neue Internal-Protocol-Sitzungen.
 *
 * Diese Werte sind Praxisvorschläge, keine gesetzlichen Vorgaben.
 * Alle Fragen-IDs und Option-IDs beziehen sich auf die aktuellen Definitionen
 * in patientWithoutAppointment.ts. Nicht abgedeckte Fragen bleiben null.
 */
const PATIENTEN_OHNE_TERMIN_PREFILL: Readonly<Record<string, ProtocolWorkflowAnswerValue>> = {
  // PC-C01: Geltungsbereich
  "POT-Q-C01-01": ["POT-Q-C01-01-A"],   // Während regulärer Sprechzeiten
  "POT-Q-C01-02": "YES",                 // Gilt für alle Mitarbeitenden

  // PC-C02: Zuständigkeit
  "POT-Q-C02-01": "POT-Q-C02-01-A",     // MFA am Empfang
  "POT-Q-C02-02": "POT-Q-C02-02-B",     // Erfahrene MFA nach Schema, Rücksprache Arzt

  // PC-C03: Standardablauf
  "POT-Q-C03-01": [
    "POT-Q-C03-01-A",  // Name und Geburtsdatum
    "POT-Q-C03-01-B",  // Art und Schwere der Beschwerden
    "POT-Q-C03-01-C",  // Dringlichkeits-Selbsteinschätzung
  ],
  "POT-Q-C03-02": "POT-Q-C03-02-D",     // Situationsabhängige Entscheidung
  "POT-Q-C03-03": "YES",                 // Anliegen vor Entscheidung dokumentieren

  // PC-C04: Ausnahmen und Eskalation
  "POT-Q-C04-01": [
    "POT-Q-C04-01-A",  // Abfrage definierter Warnsymptome
    "POT-Q-C04-01-B",  // Einschätzung durch erfahrene MFA
  ],
  "POT-Q-C04-02": "POT-Q-C04-02-A",     // Sofortige Benachrichtigung + Notruf 112
  "POT-Q-C04-04": "UNCLEAR",             // Eskalationsstufen bekannt: noch unklar

  // PC-C05: Dokumentation und Überprüfung
  "POT-Q-C05-01": "YES",                 // Entscheidungen dokumentieren
  "POT-Q-C05-02": ["POT-Q-C05-02-A"],    // Jährlich im Rahmen des QM-Zyklus (Mehrfachauswahl möglich)
  "POT-Q-C05-03": "POT-Q-C05-03-D",     // Gemeinsam im Praxisteam
} as const;

/**
 * Erzeugt Checkpoints für eine neue Sitzung mit praxistauglichen Vorschlagswerten.
 *
 * - Nur beim Erstellen einer neuen Sitzung verwenden.
 * - Bereits gespeicherte Antworten werden durch diesen Aufruf nicht verändert.
 * - Prefill-Werte basieren ausschließlich auf vorhandenen Option-IDs.
 */
export function buildPrefillProtocolWorkflowCheckpoints(): ProtocolWorkflowCheckpoint[] {
  return getPatientWithoutAppointmentSections().map((section) => {
    const answers: ProtocolWorkflowAnswers = {};
    for (const q of section.questions) {
      const prefill = PATIENTEN_OHNE_TERMIN_PREFILL[q.id];
      answers[q.id] = prefill !== undefined ? prefill : null;
    }
    return {
      id: section.id,
      title: section.title,
      status: "OPEN" as const,
      answers,
    };
  });
}

/**
 * Erzeugt einen neuen InternalProtocolWorkflowSnapshot für den Pilotprozess.
 *
 * Neue Sitzungen starten mit null-Antworten (`checkpoints`) und einem
 * separaten `templateAnswers`-Feld, das die fachlich definierten Vorschläge
 * enthält. Dadurch sind Vorschläge von bestätigten Benutzerantworten getrennt.
 */
export function buildInitialInternalProtocolWorkflowSnapshot(
  processMode?: PracticeProcessMode,
): InternalProtocolWorkflowSnapshot {
  return {
    processKind: "internal-protocol",
    topicId: "patienten-ohne-termin",
    checkpoints: buildInitialProtocolWorkflowCheckpoints(),
    templateAnswers: { ...PATIENTEN_OHNE_TERMIN_PREFILL },
    ...(processMode !== undefined ? { processMode } : {}),
  };
}

/**
 * Gibt die Prozessart eines Snapshots zurück, indem die topicId im zentralen Katalog
 * nachgeschlagen wird (lib/workflow/processKind.ts).
 *
 * Gibt undefined zurück, wenn die topicId unbekannt ist.
 * Gibt undefined zurück, wenn der Snapshot keine extrahierbare topicId enthält.
 */
export function getWorkflowProcessKind(snapshot: unknown): WorkflowProcessKind | undefined {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return undefined;
  const topicId = (snapshot as Record<string, unknown>).topicId;
  if (typeof topicId !== "string") return undefined;
  return getProcessKindForTopicId(topicId);
}

/** Gibt den Modus der Session zurück; Altdaten ohne Modus gelten als CURRENT_STATE. */
export function getPracticeProcessMode(
  snapshot: InternalProtocolWorkflowSnapshot,
): PracticeProcessMode {
  return snapshot.processMode ?? "CURRENT_STATE";
}

/**
 * Erzeugt einen neuen TARGET_STATE-Snapshot aus einer CURRENT_STATE-Session.
 * Kopiert alle fachlichen Antworten; übernimmt keine M3-Urteile.
 * Setzt sourceWorkflowSessionId und inheritedAnswers.
 */
export function buildTargetStateSnapshotFromCurrent(
  sourceSnapshot: InternalProtocolWorkflowSnapshot,
  sourceSessionId: string,
): InternalProtocolWorkflowSnapshot {
  const inheritedQuestionIds: string[] = [];
  const newCheckpoints = sourceSnapshot.checkpoints.map((cp) => {
    const answers: ProtocolWorkflowAnswers = {};
    for (const [qId, answer] of Object.entries(cp.answers)) {
      answers[qId] = Array.isArray(answer) ? [...answer] : answer;
      if (answer !== null) {
        inheritedQuestionIds.push(qId);
      }
    }
    return {
      id: cp.id,
      title: cp.title,
      status: "OPEN" as const,
      answers,
      // clarificationJudgement wird bewusst nicht übernommen
    };
  });
  return {
    processKind: "internal-protocol",
    topicId: "patienten-ohne-termin",
    checkpoints: newCheckpoints,
    processMode: "TARGET_STATE",
    sourceWorkflowSessionId: sourceSessionId,
    ...(inheritedQuestionIds.length > 0 ? { inheritedQuestionIds } : {}),
  };
}

// ---------------------------------------------------------------------------
// Hilfsfunktionen für den Client
// ---------------------------------------------------------------------------

/** Anzahl beantworteter Fragen in einem Checkpoint. */
export function countAnsweredQuestions(checkpoint: ProtocolWorkflowCheckpoint): number {
  return Object.values(checkpoint.answers).filter((v) => {
    if (v === null) return false;
    if (Array.isArray(v)) return v.length > 0;
    return v.length > 0;
  }).length;
}

/** Anzahl unbeantworteter Fragen in einem Checkpoint. */
export function countUnansweredQuestions(checkpoint: ProtocolWorkflowCheckpoint): number {
  return Object.values(checkpoint.answers).filter((v) => {
    if (v === null) return true;
    if (Array.isArray(v)) return v.length === 0;
    return v.length === 0;
  }).length;
}
