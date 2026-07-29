/**
 * Ableitung des Klärungsstands für eine einzelne Section des
 * internen Protokoll-Workflows.
 *
 * Reine Funktion ohne Seiteneffekte – keine Persistenz, keine UI-Abhängigkeit.
 * Kann direkt in Tests geprüft werden.
 *
 * Kein Import von React oder Browser-APIs.
 */

import type { ProtocolSection, ProtocolQuestion } from "./questions";
import type {
  ProtocolWorkflowCheckpoint,
  ProtocolCheckpointStatus,
  ProtocolWorkflowAnswerValue,
} from "./workflowAdapter";

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

/**
 * Ursache für einen offenen Klärungspunkt.
 *
 * - "missing":      Pflichtfrage ohne Antwort (null / leere Auswahl)
 * - "unclear":      Antwort ist "UNCLEAR" (Team hat bewusst „Unklar" gewählt)
 * - "unresolvable": Antwort vorhanden, aber für diesen Fragetyp / diese Optionen ungültig
 */
export type QuestionClarificationReason = "missing" | "unclear" | "unresolvable";

/** Einzelner offener Klärungspunkt für eine Frage. */
export interface QuestionClarificationIssue {
  question: ProtocolQuestion;
  reason: QuestionClarificationReason;
  /** Gespeicherter Rohwert (kann null sein bei "missing"). */
  currentAnswer: ProtocolWorkflowAnswerValue;
}

/** Abgeleiteter Klärungsstand für eine Section + Checkpoint-Kombination. */
export interface SectionClarificationState {
  /** ID des Checkpoints (= Section-ID). */
  checkpointId: string;
  /** Gespeicherter Statuswert. */
  status: ProtocolCheckpointStatus;
  /**
   * true wenn status === "CONFIRMED" oder "NOT_APPLICABLE".
   * Die Praxis hat diese Section ausdrücklich als erledigt markiert.
   */
  isClarified: boolean;
  /**
   * true wenn status === "OPEN".
   * Status OPEN bleibt offen, auch wenn alle Fragen beantwortet sind.
   */
  needsClarification: boolean;
  /** Liste konkreter offener Klärungspunkte (missing, unclear, unresolvable). */
  openIssues: QuestionClarificationIssue[];
  /** Pflichtfragen ohne Antwort. */
  unansweredRequiredQuestions: ProtocolQuestion[];
  /** Fragen mit Antwort "UNCLEAR". */
  unclearQuestions: ProtocolQuestion[];
  /** Fragen mit irgendeiner vorhandenen Antwort (inkl. UNCLEAR). */
  answeredQuestions: ProtocolQuestion[];
  /** true wenn jede Pflichtfrage eine gültige Antwort hat. */
  allRequiredAnswered: boolean;
  /**
   * true wenn keine offenen Issues vorliegen, die Section aber noch nicht
   * als CONFIRMED gesetzt wurde.
   * Hinweis für das Team: „Teamentscheidung noch nicht bestätigt."
   */
  hasTeamConfirmationPending: boolean;
}

// ---------------------------------------------------------------------------
// Interne Hilfsfunktionen
// ---------------------------------------------------------------------------

function isAnswerPresent(answer: ProtocolWorkflowAnswerValue): boolean {
  if (answer === null || answer === undefined) return false;
  if (typeof answer === "string" && answer.trim() === "") return false;
  if (Array.isArray(answer) && answer.length === 0) return false;
  return true;
}

/**
 * Prüft ob eine Antwort für den gegebenen Fragetyp und die vorhandenen Optionen
 * gültig ist. Voraussetzung: `isAnswerPresent(answer) === true`.
 *
 * - YES_NO_UNCLEAR: nur "YES", "NO", "UNCLEAR" erlaubt
 * - SINGLE_SELECT:  String muss einer der Optionen-IDs entsprechen
 * - MULTI_SELECT:   alle Array-Elemente müssen Optionen-IDs entsprechen
 * - FREE_TEXT:      jeder nichtleere String ist gültig
 */
function isAnswerValidForQuestion(
  question: ProtocolQuestion,
  answer: ProtocolWorkflowAnswerValue,
): boolean {
  if (!isAnswerPresent(answer)) return false;

  // YES / NO / UNCLEAR sind semantische Tristate-Werte, nur für YES_NO_UNCLEAR
  if (answer === "YES" || answer === "NO" || answer === "UNCLEAR") {
    return question.kind === "YES_NO_UNCLEAR";
  }

  switch (question.kind) {
    case "YES_NO_UNCLEAR":
      // Jeder andere String (z. B. Option-ID, Freitext) ist ungültig
      return false;

    case "SINGLE_SELECT": {
      if (typeof answer !== "string") return false;
      return question.options.some((o) => o.id === answer);
    }

    case "MULTI_SELECT": {
      if (!Array.isArray(answer) || answer.length === 0) return false;
      const validIds = new Set(question.options.map((o) => o.id));
      return answer.every((id) => validIds.has(id));
    }

    case "FREE_TEXT": {
      return typeof answer === "string" && answer.trim().length > 0;
    }
  }
}

// ---------------------------------------------------------------------------
// Hauptfunktion
// ---------------------------------------------------------------------------

/**
 * Leitet den Klärungsstand für eine Section ab.
 *
 * Regeln:
 * - Optional unbeantwortete Fragen erzeugen keinen offenen Punkt.
 * - Pflichtfrage mit null / leerer Auswahl → "missing"
 * - Antwort "UNCLEAR" → "unclear" (gilt unabhängig von required)
 * - Antwort vorhanden, aber ungültig → "unresolvable"
 * - Status NOT_APPLICABLE → isClarified, kein needsClarification
 * - Status CONFIRMED → isClarified, kein needsClarification
 * - Status OPEN → needsClarification, auch wenn alle Fragen beantwortet sind
 *
 * Die Funktion verändert keine gespeicherten Daten.
 */
export function getProtocolSectionClarificationState(
  section: ProtocolSection,
  checkpoint: ProtocolWorkflowCheckpoint,
): SectionClarificationState {
  const { status } = checkpoint;
  const isClarified = status === "CONFIRMED" || status === "NOT_APPLICABLE";
  const needsClarification = !isClarified;

  const unansweredRequiredQuestions: ProtocolQuestion[] = [];
  const unclearQuestions: ProtocolQuestion[] = [];
  const answeredQuestions: ProtocolQuestion[] = [];
  const openIssues: QuestionClarificationIssue[] = [];

  for (const question of section.questions) {
    const answer: ProtocolWorkflowAnswerValue =
      question.id in checkpoint.answers ? checkpoint.answers[question.id] : null;
    const isRequired = question.required === true;
    const present = isAnswerPresent(answer);

    if (present) {
      answeredQuestions.push(question);

      if (answer === "UNCLEAR") {
        unclearQuestions.push(question);
        openIssues.push({ question, reason: "unclear", currentAnswer: answer });
      } else if (!isAnswerValidForQuestion(question, answer)) {
        // Antwort vorhanden, aber nicht auflösbar (z. B. veraltete Option-ID)
        openIssues.push({ question, reason: "unresolvable", currentAnswer: answer });
      }
    } else if (isRequired) {
      unansweredRequiredQuestions.push(question);
      openIssues.push({ question, reason: "missing", currentAnswer: null });
    }
    // Optional + nicht beantwortet → kein Issue
  }

  const allRequiredAnswered = unansweredRequiredQuestions.length === 0;
  const hasTeamConfirmationPending = needsClarification && openIssues.length === 0;

  return {
    checkpointId: checkpoint.id,
    status,
    isClarified,
    needsClarification,
    openIssues,
    unansweredRequiredQuestions,
    unclearQuestions,
    answeredQuestions,
    allRequiredAnswered,
    hasTeamConfirmationPending,
  };
}
