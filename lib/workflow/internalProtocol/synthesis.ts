/**
 * Synthese-Logik für M3 (Klärungsstand) und M4 (Ergebnis).
 *
 * Wandelt gespeicherte M2-Antworten in lesbare Aussagen um.
 * Verwendet outputText-Felder der Antwortoptionen als primäre Quelle.
 * Erzeugt strukturierte Fallbacks für Fragetypen ohne optiongebundene outputTexts.
 *
 * Kein Import von React oder Browser-APIs.
 */

import type { ProtocolSection, ProtocolQuestion } from "./questions";
import type {
  ProtocolWorkflowCheckpoint,
  ProtocolWorkflowAnswerValue,
  ProtocolCheckpointStatus,
  ProtocolClarificationJudgement,
} from "./workflowAdapter";

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

/** Status eines einzelnen Synthese-Eintrags. */
export type SynthesisItemStatus = "confirmed" | "unclear" | "open";

/**
 * Ein einzelner, lesbarer Synthese-Eintrag.
 *
 * confirmed = fachlich beantwortet
 * unclear   = Antwort vorhanden, aber inhaltlich unklar
 * open      = Pflichtfrage ohne Antwort
 */
export interface SynthesisItem {
  text: string;
  status: SynthesisItemStatus;
}

// ---------------------------------------------------------------------------
// Schritt-Konfiguration für M2
// ---------------------------------------------------------------------------

/** Konfiguration einer M2-Teilseite. */
export interface M2StepConfig {
  /** Schrittnummer 1–5. */
  step: number;
  /** ID der zugehörigen ProtocolSection (z. B. "PC-C01"). */
  sectionId: string;
  /** Anzeige-Titel des Aspekts. */
  title: string;
  /** Fachliche Kernfrage, die dem Benutzer den Fokus des Schritts erklärt. */
  kernfrage: string;
}

/**
 * Verbindliche Zuordnung der fünf Klärungsaspekte zu M2-Schritten.
 * Reihenfolge ist fachlich festgelegt und darf nicht geändert werden.
 */
export const M2_STEP_CONFIGS: readonly M2StepConfig[] = [
  {
    step: 1,
    sectionId: "PC-C01",
    title: "Geltungsbereich",
    kernfrage:
      "In welchen Situationen tritt das bei Ihnen auf – und wen betrifft dieser Ablauf?",
  },
  {
    step: 2,
    sectionId: "PC-C02",
    title: "Zuständigkeit und Entscheidungsbefugnis",
    kernfrage:
      "Wer kümmert sich als Erste Person um den Patienten – und wer entscheidet, wenn die Dringlichkeit unklar ist?",
  },
  {
    step: 3,
    sectionId: "PC-C03",
    title: "Standardablauf",
    kernfrage:
      "Wie geht es in der Regel weiter – welche Informationen werden erfasst und was passiert danach?",
  },
  {
    step: 4,
    sectionId: "PC-C04",
    title: "Ausnahmen und Eskalation",
    kernfrage:
      "Woran erkennt das Team einen möglichen Notfall – und was passiert dann?",
  },
  {
    step: 5,
    sectionId: "PC-C05",
    title: "Dokumentation und Überprüfung",
    kernfrage:
      "Was hält die Praxis fest – und wer sorgt dafür, dass der Ablauf aktuell bleibt?",
  },
];

/** Kernfragen für den TARGET_STATE-Modus (Soll-Perspektive). */
export const TARGET_STATE_KERNFRAGEN: Readonly<Record<string, string>> = {
  "PC-C01": "Für welche Situationen soll dieser Ablauf künftig gelten – und wen soll er betreffen?",
  "PC-C02": "Wer soll sich künftig als Erste Person um den Patienten kümmern – und wer soll entscheiden, wenn die Dringlichkeit unklar ist?",
  "PC-C03": "Wie soll es in der Regel weitergehen – welche Informationen sollen künftig erfasst werden?",
  "PC-C04": "Woran soll das Team künftig einen möglichen Notfall erkennen – und was soll dann passieren?",
  "PC-C05": "Was soll die Praxis festhalten – und wer soll dafür sorgen, dass der Ablauf aktuell bleibt?",
};

/**
 * Gibt die Konfiguration für einen M2-Schritt zurück.
 * Gibt undefined zurück, wenn der Schritt außerhalb von 1–5 liegt.
 */
export function getM2StepConfig(step: number): M2StepConfig | undefined {
  return M2_STEP_CONFIGS.find((c) => c.step === step);
}

// ---------------------------------------------------------------------------
// Interne Hilfsfunktionen
// ---------------------------------------------------------------------------

function hasAnswer(answer: ProtocolWorkflowAnswerValue): boolean {
  if (answer === null || answer === undefined) return false;
  if (typeof answer === "string" && answer.trim() === "") return false;
  if (Array.isArray(answer) && answer.length === 0) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Öffentliche Synthese-Funktionen
// ---------------------------------------------------------------------------

/**
 * Erzeugt lesbare Aussagen für eine einzelne Frage und ihre Antwort.
 *
 * Gibt ein leeres Array zurück, wenn keine Antwort vorhanden ist.
 * Gibt mehrere Items für MULTI_SELECT zurück (eines pro gewählter Option).
 *
 * Priorität: outputText der Option > strukturierter Fallback aus Frage + Wert.
 */
export function synthesizeAnswer(
  question: ProtocolQuestion,
  answer: ProtocolWorkflowAnswerValue,
): SynthesisItem[] {
  if (!hasAnswer(answer)) return [];

  switch (question.kind) {
    case "YES_NO_UNCLEAR": {
      if (answer === "YES") {
        return [{ text: `${question.text}: Ja`, status: "confirmed" }];
      }
      if (answer === "NO") {
        return [{ text: `${question.text}: Nein`, status: "confirmed" }];
      }
      if (answer === "UNCLEAR") {
        return [{ text: question.text, status: "unclear" }];
      }
      return [];
    }

    case "SINGLE_SELECT": {
      if (typeof answer !== "string") return [];
      const option = question.options.find((o) => o.id === answer);
      if (!option) {
        return [
          {
            text: `${question.text}: Unbekannte Auswahl`,
            status: "unclear",
          },
        ];
      }
      // outputText ist laut Typdefinition immer vorhanden
      return [{ text: option.outputText, status: "confirmed" }];
    }

    case "MULTI_SELECT": {
      if (!Array.isArray(answer)) return [];
      const items: SynthesisItem[] = [];
      for (const optId of answer) {
        const opt = question.options.find((o) => o.id === optId);
        if (!opt) {
          items.push({
            text: `${question.text}: Unbekannte Auswahl`,
            status: "unclear",
          });
        } else {
          items.push({ text: opt.outputText, status: "confirmed" });
        }
      }
      return items;
    }

    case "FREE_TEXT": {
      if (typeof answer !== "string") return [];
      const trimmed = answer.trim();
      if (!trimmed) return [];
      return [{ text: trimmed, status: "confirmed" }];
    }
  }
}

/**
 * Erzeugt die vollständige Synthese-Liste für einen Klärungsaspekt.
 *
 * - Beantwortete Fragen → confirmed/unclear items (via synthesizeAnswer)
 * - Pflichtfragen ohne Antwort → open item (Text der Frage)
 * - Optionale Fragen ohne Antwort → nicht angezeigt
 */
export function synthesizeCheckpoint(
  section: ProtocolSection,
  checkpoint: ProtocolWorkflowCheckpoint,
): SynthesisItem[] {
  const items: SynthesisItem[] = [];

  for (const question of section.questions) {
    const answer =
      (checkpoint.answers[question.id] as ProtocolWorkflowAnswerValue) ?? null;

    if (hasAnswer(answer)) {
      items.push(...synthesizeAnswer(question, answer));
    } else if (question.required) {
      items.push({ text: question.text, status: "open" });
    }
    // Optionale Fragen ohne Antwort: überspringen
  }

  return items;
}

/**
 * Lesbares Label für einen ProtocolCheckpointStatus in der M3-Ansicht.
 * Ersetzt die technischen internen Bezeichner durch Fachsprache.
 */
export function judgmentLabel(status: ProtocolCheckpointStatus): string {
  switch (status) {
    case "CONFIRMED":
      return "Ausreichend geklärt";
    case "OPEN":
      return "Noch offen";
    case "NOT_APPLICABLE":
      return "Nicht relevant";
  }
}

/**
 * Lesbares Label für ein ProtocolClarificationJudgement (M3-Urteil).
 * Separates Feld von checkpoint.status; wird in M3 und M4 verwendet.
 */
export function clarificationJudgementLabel(
  judgement: ProtocolClarificationJudgement,
): string {
  switch (judgement) {
    case "SUFFICIENTLY_CLARIFIED":
      return "Ausreichend geklärt";
    case "OPEN":
      return "Noch offen";
    case "NOT_RELEVANT":
      return "Nicht relevant";
  }
}
