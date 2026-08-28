/**
 * Vergleichslogik für IS/SOLL-Gegenüberstellung (M4-Ergebnisdokument).
 *
 * Vergleicht zwei Snapshots (CURRENT_STATE und TARGET_STATE) auf Frageebene
 * und erzeugt strukturierte Änderungsinformationen.
 *
 * Kein Import von React oder Browser-APIs.
 */

import type { ProtocolSection } from "./questions";
import type {
  ProtocolWorkflowCheckpoint,
  ProtocolWorkflowAnswerValue,
} from "./workflowAdapter";
import { getAnswerSentences } from "./narrativeEngine";

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

/** Art der Änderung einer einzelnen Frage zwischen IS und SOLL. */
export type QuestionDiffKind =
  | "unchanged"       // Antwort identisch
  | "changed"         // Antwort geändert (SINGLE_SELECT, YES_NO, FREE_TEXT)
  | "added"           // Neu beantwortet (vorher leer)
  | "removed"         // Antwort entfernt (nachher leer)
  | "multi-partial";  // MULTI_SELECT: teils geändert

/** Aufbereitete Änderungsinformation für eine einzelne Frage. */
export interface QuestionDiff {
  questionId: string;
  /** Kurze fachliche Bezeichnung der Frage (für Änderungsüberschriften). */
  questionLabel: string;
  kind: QuestionDiffKind;
  /** Vorher-Texte (CURRENT_STATE, leer wenn "added"). */
  beforeTexts: string[];
  /** Nachher-Texte (TARGET_STATE, leer wenn "removed"). */
  afterTexts: string[];
  /** Nur bei multi-partial: Sätze der hinzugefügten Optionen. */
  addedTexts: string[];
  /** Nur bei multi-partial: Sätze der entfernten Optionen. */
  removedTexts: string[];
}

/** Alle Änderungen eines Abschnitts. */
export interface SectionDiff {
  sectionId: string;
  sectionTitle: string;
  diffs: QuestionDiff[];
}

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function hasAnswer(answer: ProtocolWorkflowAnswerValue): boolean {
  if (answer === null || answer === undefined) return false;
  if (Array.isArray(answer) && answer.length === 0) return false;
  if (typeof answer === "string" && answer.trim() === "") return false;
  return true;
}

/**
 * Vergleicht zwei MULTI_SELECT-Antwort-Arrays mengenbasiert (Reihenfolge egal).
 */
function compareMultiSelect(
  currentIds: string[],
  targetIds: string[],
): { kind: QuestionDiffKind; addedIds: string[]; removedIds: string[] } {
  const currentSet = new Set(currentIds);
  const targetSet = new Set(targetIds);

  const addedIds = targetIds.filter((id) => !currentSet.has(id));
  const removedIds = currentIds.filter((id) => !targetSet.has(id));

  if (addedIds.length === 0 && removedIds.length === 0) {
    return { kind: "unchanged", addedIds: [], removedIds: [] };
  }
  if (removedIds.length === currentIds.length && addedIds.length > 0) {
    return { kind: "changed", addedIds, removedIds };
  }
  return { kind: "multi-partial", addedIds, removedIds };
}

// ---------------------------------------------------------------------------
// Kernfunktionen
// ---------------------------------------------------------------------------

/**
 * Die fünf handlungsrelevantesten Fragen für "Das bleibt bestehen".
 * Umfasst: Zuständigkeit, Entscheidungsbefugnis, Aufnahmeinformationen,
 * Eskalationsweg und Dokumentationsregel.
 */
const CORE_UNCHANGED_QUESTION_IDS: ReadonlySet<string> = new Set([
  "POT-Q-C02-01", // Zuständigkeit: wer übernimmt Erstaufnahme
  "POT-Q-C02-02", // Entscheidungsbefugnis: wer entscheidet bei Dringlichkeit
  "POT-Q-C03-01", // Aufnahmeinformationen: was wird erfasst
  "POT-Q-C04-02", // Eskalationsweg: was passiert bei Notfallverdacht
  "POT-Q-C05-01", // Dokumentationsregel: Weiterleitungen festhalten
]);

/**
 * Vergleicht alle Checkpoints zweier Snapshots abschnittsweise.
 *
 * Gibt für jeden Abschnitt die Differenzen zurück.
 * Abschnitte ohne jegliche Änderung haben leere diffs[].
 */
export function buildChangeComparison(
  sections: readonly ProtocolSection[],
  currentCheckpoints: readonly ProtocolWorkflowCheckpoint[],
  targetCheckpoints: readonly ProtocolWorkflowCheckpoint[],
): SectionDiff[] {
  return sections.map((section) => {
    const currentCp = currentCheckpoints.find((cp) => cp.id === section.id);
    const targetCp = targetCheckpoints.find((cp) => cp.id === section.id);

    const diffs: QuestionDiff[] = [];

    for (const question of section.questions) {
      const currentAnswer =
        (currentCp?.answers[question.id] as ProtocolWorkflowAnswerValue) ?? null;
      const targetAnswer =
        (targetCp?.answers[question.id] as ProtocolWorkflowAnswerValue) ?? null;

      const currentHas = hasAnswer(currentAnswer);
      const targetHas = hasAnswer(targetAnswer);

      if (!currentHas && !targetHas) continue; // beides leer → ignorieren

      const beforeTexts = currentHas
        ? getAnswerSentences(question, currentAnswer, "CURRENT_STATE")
        : [];
      const afterTexts = targetHas
        ? getAnswerSentences(question, targetAnswer, "TARGET_STATE")
        : [];

      if (!currentHas && targetHas) {
        diffs.push({
          questionId: question.id,
          questionLabel: question.text,
          kind: "added",
          beforeTexts: [],
          afterTexts,
          addedTexts: [],
          removedTexts: [],
        });
        continue;
      }

      if (currentHas && !targetHas) {
        diffs.push({
          questionId: question.id,
          questionLabel: question.text,
          kind: "removed",
          beforeTexts,
          afterTexts: [],
          addedTexts: [],
          removedTexts: [],
        });
        continue;
      }

      // Beide haben Antworten → vergleichen
      if (question.kind === "MULTI_SELECT") {
        const currentIds = Array.isArray(currentAnswer) ? currentAnswer : [];
        const targetIds = Array.isArray(targetAnswer) ? targetAnswer : [];
        const { kind, addedIds, removedIds } = compareMultiSelect(currentIds, targetIds);

        if (kind === "unchanged") continue;

        const addedTexts = addedIds.flatMap((optId) =>
          getAnswerSentences(question, [optId], "TARGET_STATE")
        );
        const removedTexts = removedIds.flatMap((optId) =>
          getAnswerSentences(question, [optId], "CURRENT_STATE")
        );

        diffs.push({
          questionId: question.id,
          questionLabel: question.text,
          kind,
          beforeTexts,
          afterTexts,
          addedTexts,
          removedTexts,
        });
        continue;
      }

      // SINGLE_SELECT, YES_NO_UNCLEAR, FREE_TEXT: String-Vergleich
      const currentStr = JSON.stringify(currentAnswer);
      const targetStr = JSON.stringify(targetAnswer);
      if (currentStr === targetStr) continue;

      diffs.push({
        questionId: question.id,
        questionLabel: question.text,
        kind: "changed",
        beforeTexts,
        afterTexts,
        addedTexts: [],
        removedTexts: [],
      });
    }

    return { sectionId: section.id, sectionTitle: section.title, diffs };
  });
}

/**
 * Sammelt unveränderte Kernregeln als lesbare Sätze, gruppiert nach Abschnitt.
 *
 * Beschränkt sich auf maximal fünf handlungsrelevante Fragen (Whitelist).
 * Rein administrative oder wiederholende Antworten werden nicht aufgeführt.
 * Berücksichtigt auch beantwortete optionale Fragen in der Whitelist.
 */
export function buildUnchangedSummary(
  sections: readonly ProtocolSection[],
  currentCheckpoints: readonly ProtocolWorkflowCheckpoint[],
  targetCheckpoints: readonly ProtocolWorkflowCheckpoint[],
): { sectionId: string; sectionTitle: string; sentences: string[] }[] {
  return sections.map((section) => {
    const currentCp = currentCheckpoints.find((cp) => cp.id === section.id);
    const targetCp = targetCheckpoints.find((cp) => cp.id === section.id);
    const sentences: string[] = [];

    for (const question of section.questions) {
      if (!CORE_UNCHANGED_QUESTION_IDS.has(question.id)) continue;

      const currentAnswer =
        (currentCp?.answers[question.id] as ProtocolWorkflowAnswerValue) ?? null;
      const targetAnswer =
        (targetCp?.answers[question.id] as ProtocolWorkflowAnswerValue) ?? null;

      if (!hasAnswer(currentAnswer) || !hasAnswer(targetAnswer)) continue;

      if (question.kind === "MULTI_SELECT") {
        const currentIds = Array.isArray(currentAnswer) ? currentAnswer : [];
        const targetIds = Array.isArray(targetAnswer) ? targetAnswer : [];
        const { kind } = compareMultiSelect(currentIds, targetIds);
        if (kind !== "unchanged") continue;
      } else {
        if (JSON.stringify(currentAnswer) !== JSON.stringify(targetAnswer)) continue;
      }

      const texts = getAnswerSentences(question, currentAnswer, "CURRENT_STATE");
      sentences.push(...texts);
    }

    return { sectionId: section.id, sectionTitle: section.title, sentences };
  });
}
