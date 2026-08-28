/**
 * Regelbasierte Texterzeugung für das M4-Ergebnisdokument.
 *
 * Ergebnisspeicherung: Variante B – alle Texte werden deterministisch aus
 * Antworten (M2), M3-Beurteilungen und der Ursprungssession berechnet.
 * Es werden keine abgeleiteten Texte im Snapshot gespeichert.
 * Gleiche Eingaben liefern immer identische Ausgaben.
 *
 * Erzeugt zusammenhängende deutsche Sätze aus gespeicherten M2-Antworten.
 * Kein Import von React oder Browser-APIs.
 * Kein Import von patientWithoutAppointment.ts (vermeidet Zirkularität).
 *
 * Unterstützt zwei Modi:
 *   CURRENT_STATE  – Beschreibt den heute gelebten Ablauf
 *   TARGET_STATE   – Beschreibt den künftig beschlossenen Ablauf
 */

import type { ProtocolSection, ProtocolQuestion } from "./questions";
import type {
  ProtocolWorkflowCheckpoint,
  ProtocolWorkflowAnswerValue,
  PracticeProcessMode,
} from "./workflowAdapter";

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

/** Ein aufbereiteter Abschnitt des Prozessberichts. */
export interface NarrativeSection {
  sectionId: string;
  sectionTitle: string;
  /** Bestätigte Aussagen aus beantworteten Fragen. */
  sentences: string[];
  /** Antworten, die als „unklar" markiert wurden. */
  unclearTexts: string[];
  /** Pflichtfragen ohne gültige Antwort. */
  openTexts: string[];
}

// ---------------------------------------------------------------------------
// Satzvorlagen für YES_NO_UNCLEAR-Fragen
// ---------------------------------------------------------------------------

interface YesNoSentences {
  current: { yes: string; no: string; unclear: string };
  target: { yes: string; no: string; unclear: string };
}

const YES_NO_STATEMENTS: Readonly<Record<string, YesNoSentences>> = {
  "POT-Q-C01-02": {
    current: {
      yes: "Dieser Ablauf gilt für alle Mitarbeitenden der Praxis.",
      no: "Dieser Ablauf gilt nicht für alle Mitarbeitenden der Praxis.",
      unclear: "Noch unklar, ob dieser Ablauf für alle Mitarbeitenden gilt.",
    },
    target: {
      yes: "Dieser Ablauf soll für alle Mitarbeitenden der Praxis gelten.",
      no: "Dieser Ablauf soll nicht für alle Mitarbeitenden der Praxis gelten.",
      unclear: "Noch festzulegen, ob dieser Ablauf für alle Mitarbeitenden gelten soll.",
    },
  },

  "POT-Q-C01-03": {
    current: {
      yes: "Ausnahmen von diesem Ablauf sind schriftlich festgehalten.",
      no: "Schriftlich festgehaltene Ausnahmen gibt es nicht.",
      unclear: "Noch unklar, ob es schriftlich festgehaltene Ausnahmen gibt.",
    },
    target: {
      yes: "Ausnahmen sollen schriftlich festgehalten werden.",
      no: "Schriftlich festgehaltene Ausnahmen sind nicht vorgesehen.",
      unclear: "Noch festzulegen, ob es schriftliche Ausnahmen geben soll.",
    },
  },

  "POT-Q-C02-03": {
    current: {
      yes: "Die Zuständigkeiten sind dem Team bekannt und schriftlich festgehalten.",
      no: "Die Zuständigkeiten sind nicht durchgängig bekannt oder nicht schriftlich festgehalten.",
      unclear: "Noch unklar, ob die Zuständigkeiten dokumentiert und dem Team bekannt sind.",
    },
    target: {
      yes: "Die Zuständigkeiten sollen dem Team bekannt und schriftlich festgehalten sein.",
      no: "Eine schriftliche Festlegung der Zuständigkeiten ist nicht geplant.",
      unclear: "Noch festzulegen, ob die Zuständigkeiten schriftlich dokumentiert werden sollen.",
    },
  },

  "POT-Q-C02-04": {
    current: {
      yes: "Für den Fall, dass die zuständige Person nicht verfügbar ist, gibt es eine Vertretungsregelung.",
      no: "Eine Vertretungsregelung für die Abwesenheit der zuständigen Person gibt es nicht.",
      unclear: "Noch unklar, ob es eine Vertretungsregelung gibt.",
    },
    target: {
      yes: "Für den Fall der Abwesenheit der zuständigen Person soll eine Vertretungsregelung gelten.",
      no: "Eine Vertretungsregelung ist nicht geplant.",
      unclear: "Noch festzulegen, ob es eine Vertretungsregelung geben soll.",
    },
  },

  "POT-Q-C03-03": {
    current: {
      yes: "Das Anliegen des Patienten wird festgehalten, bevor über das weitere Vorgehen entschieden wird.",
      no: "Das Anliegen des Patienten wird nicht systematisch vor der Entscheidung über das weitere Vorgehen dokumentiert.",
      unclear: "Noch unklar, ob das Anliegen vor der Entscheidung festgehalten wird.",
    },
    target: {
      yes: "Das Anliegen des Patienten soll festgehalten werden, bevor über das weitere Vorgehen entschieden wird.",
      no: "Eine routinemäßige Dokumentation des Anliegens vor der Entscheidung ist nicht vorgesehen.",
      unclear: "Noch festzulegen, ob das Anliegen vor der Entscheidung festgehalten werden soll.",
    },
  },

  "POT-Q-C04-04": {
    current: {
      yes: "Das Team weiß, wann der Arzt sofort hinzugezogen werden muss und wann der Notruf (112) notwendig ist.",
      no: "Dem Team ist nicht durchgängig klar, wann der Arzt sofort hinzugezogen werden muss und wann der Notruf (112) nötig ist.",
      unclear: "Noch unklar, ob dem Team die Eskalationsstufen bekannt sind.",
    },
    target: {
      yes: "Das Team soll wissen, wann der Arzt sofort hinzugezogen werden muss und wann der Notruf (112) nötig ist.",
      no: "Eine formelle Schulung zu den Eskalationsstufen ist nicht geplant.",
      unclear: "Noch festzulegen, ob das Team die Eskalationsstufen kennt.",
    },
  },

  "POT-Q-C05-01": {
    current: {
      yes: "Nicht behandelte Patienten und Weiterleitungen werden in der Praxis festgehalten.",
      no: "Nicht behandelte Patienten und Weiterleitungen werden nicht systematisch dokumentiert.",
      unclear: "Noch unklar, ob Weiterleitungen und Verweisungen festgehalten werden.",
    },
    target: {
      yes: "Nicht behandelte Patienten und Weiterleitungen sollen in der Praxis festgehalten werden.",
      no: "Eine Dokumentationspflicht für Weiterleitungen ist nicht geplant.",
      unclear: "Noch festzulegen, ob Weiterleitungen dokumentiert werden sollen.",
    },
  },
};

// ---------------------------------------------------------------------------
// Offene-Punkte-Vorlagen (Pflichtfragen ohne Antwort)
// ---------------------------------------------------------------------------

interface OpenStatements {
  current: string;
  target: string;
}

const OPEN_STATEMENTS: Readonly<Record<string, OpenStatements>> = {
  "POT-Q-C01-01": {
    current: "Noch nicht festgelegt, in welchen Situationen dieser Ablauf gilt.",
    target: "Noch festzulegen, für welche Situationen dieser Ablauf künftig gelten soll.",
  },
  "POT-Q-C01-02": {
    current: "Noch nicht festgelegt, ob dieser Ablauf für alle Mitarbeitenden gilt.",
    target: "Noch festzulegen, ob dieser Ablauf für alle Mitarbeitenden gelten soll.",
  },
  "POT-Q-C02-01": {
    current: "Noch nicht festgelegt, wer die Erstaufnahme übernimmt.",
    target: "Noch festzulegen, wer die Erstaufnahme künftig übernehmen soll.",
  },
  "POT-Q-C02-02": {
    current: "Noch nicht festgelegt, wer bei unklarer Dringlichkeit entscheidet.",
    target: "Noch festzulegen, wer bei unklarer Dringlichkeit entscheiden soll.",
  },
  "POT-Q-C02-03": {
    current: "Noch nicht festgelegt, ob die Zuständigkeiten dokumentiert und dem Team bekannt sind.",
    target: "Noch festzulegen, ob die Zuständigkeiten schriftlich festgehalten werden sollen.",
  },
  "POT-Q-C02-04": {
    current: "Noch nicht festgelegt, wer bei Abwesenheit der zuständigen Person übernimmt.",
    target: "Noch festzulegen, ob es eine Vertretungsregelung geben soll.",
  },
  "POT-Q-C03-01": {
    current: "Noch nicht festgelegt, welche Angaben bei der Erstaufnahme erfasst werden.",
    target: "Noch festzulegen, welche Angaben bei der Erstaufnahme erfasst werden sollen.",
  },
  "POT-Q-C03-02": {
    current: "Noch nicht festgelegt, wie es nach der Erstaufnahme standardmäßig weitergeht.",
    target: "Noch festzulegen, wie es nach der Erstaufnahme standardmäßig weitergehen soll.",
  },
  "POT-Q-C03-03": {
    current: "Noch nicht festgelegt, ob das Anliegen des Patienten vor der Entscheidung dokumentiert wird.",
    target: "Noch festzulegen, ob das Anliegen vor der Entscheidung festgehalten werden soll.",
  },
  "POT-Q-C04-01": {
    current: "Noch nicht festgelegt, woran das Team einen möglichen Notfall erkennt.",
    target: "Noch festzulegen, woran das Team einen möglichen Notfall erkennen soll.",
  },
  "POT-Q-C04-02": {
    current: "Noch nicht festgelegt, was bei Notfallverdacht zu tun ist.",
    target: "Noch festzulegen, was bei Notfallverdacht zu tun sein soll.",
  },
  "POT-Q-C04-04": {
    current: "Noch nicht festgelegt, ob dem Team die Eskalationsstufen bekannt sind.",
    target: "Noch festzulegen, ob das Team die Eskalationsstufen kennt.",
  },
  "POT-Q-C05-02": {
    current: "Noch nicht festgelegt, wann dieser Ablauf überprüft wird.",
    target: "Noch festzulegen, wann dieser Ablauf überprüft werden soll.",
  },
  "POT-Q-C05-03": {
    current: "Noch nicht festgelegt, wer dafür verantwortlich ist, dass der Ablauf aktuell bleibt.",
    target: "Noch festzulegen, wer die Verantwortung für die Aktualität des Ablaufs übernimmt.",
  },
};

// ---------------------------------------------------------------------------
// Kontextvorlagen für FREE_TEXT-Fragen
// ---------------------------------------------------------------------------

// Neutrale Label:Wert-Vorlagen für FREE_TEXT-Fragen.
// KEIN grammatischer Konnektor wie "wenn:" – der Freitext kann jeden Inhalt haben.
const FREE_TEXT_PREFIXES: Readonly<Record<string, { current: string; target: string }>> = {
  "POT-Q-C04-03": {
    current: "Weiterleitung an den ärztlichen Bereitschaftsdienst (116 117) – Praxisangabe: ",
    target: "Weiterleitung an den ärztlichen Bereitschaftsdienst (116 117) – geplante Regelung: ",
  },
};

// Explizite fachliche Formulierungen für MULTI_SELECT-Optionen.
// Wird in getAnswerSentences und buildChangeComparison verwendet.
// Vorrang vor dem generischen opt.outputText in der Fragendefinition.
export const MULTI_SELECT_OPTION_TEXTS: Readonly<Record<string, string>> = {
  "POT-Q-C04-05-A": "Die Telefonnummer 116 117 wird dem Patienten genannt.",
  "POT-Q-C04-05-B": "Der Patient nimmt selbst Kontakt zum ärztlichen Bereitschaftsdienst auf.",
  "POT-Q-C04-05-C": "Die Praxis stellt den telefonischen Kontakt zum ärztlichen Bereitschaftsdienst her.",
  "POT-Q-C04-05-D": "Dem Patienten wird ein schriftlicher Hinweis auf den ärztlichen Bereitschaftsdienst mitgegeben.",
  "POT-Q-C04-05-E": "Die Weiterleitung zum ärztlichen Bereitschaftsdienst erfolgt auf individuell vereinbarte Weise.",
};

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
 * Gibt den lesbaren Satz für eine Antwort zurück.
 * Gibt null zurück, wenn keine Antwort vorhanden ist.
 * Bei MULTI_SELECT wird ein Satz pro gewählter Option erzeugt (siehe getAnswerSentences).
 */
export function getAnswerSentence(
  question: ProtocolQuestion,
  answer: ProtocolWorkflowAnswerValue,
  mode: PracticeProcessMode,
): string | null {
  if (!hasAnswer(answer)) return null;
  const sentences = getAnswerSentences(question, answer, mode);
  return sentences.length > 0 ? sentences[0] : null;
}

/**
 * Gibt alle lesbaren Sätze für eine Antwort zurück (wichtig für MULTI_SELECT).
 * Gibt leeres Array zurück, wenn keine Antwort vorhanden ist.
 */
export function getAnswerSentences(
  question: ProtocolQuestion,
  answer: ProtocolWorkflowAnswerValue,
  mode: PracticeProcessMode,
): string[] {
  if (!hasAnswer(answer)) return [];

  switch (question.kind) {
    case "YES_NO_UNCLEAR": {
      const stmts = YES_NO_STATEMENTS[question.id];
      if (!stmts) {
        // Fallback für unbekannte Fragen-IDs
        const modeStmts = { yes: `${question.text}: Ja`, no: `${question.text}: Nein`, unclear: question.text };
        if (answer === "YES") return [modeStmts.yes];
        if (answer === "NO") return [modeStmts.no];
        if (answer === "UNCLEAR") return [modeStmts.unclear];
        return [];
      }
      const s = mode === "CURRENT_STATE" ? stmts.current : stmts.target;
      if (answer === "YES") return [s.yes];
      if (answer === "NO") return [s.no];
      if (answer === "UNCLEAR") return [s.unclear];
      return [];
    }

    case "SINGLE_SELECT": {
      if (typeof answer !== "string") return [];
      const option = question.options.find((o) => o.id === answer);
      if (!option) return [`${question.text}: Unbekannte Auswahl`];
      return [option.outputText];
    }

    case "MULTI_SELECT": {
      if (!Array.isArray(answer)) return [];
      return answer.map((optId) => {
        const override = MULTI_SELECT_OPTION_TEXTS[optId];
        if (override) return override;
        const opt = question.options.find((o) => o.id === optId);
        return opt ? opt.outputText : `${question.text}: Unbekannte Auswahl`;
      });
    }

    case "FREE_TEXT": {
      if (typeof answer !== "string") return [];
      const trimmed = answer.trim();
      if (!trimmed) return [];
      const prefix = FREE_TEXT_PREFIXES[question.id];
      if (prefix) {
        const template = mode === "CURRENT_STATE" ? prefix.current : prefix.target;
        const text = trimmed.endsWith(".") || trimmed.endsWith("!") || trimmed.endsWith("?")
          ? template + trimmed
          : template + trimmed + ".";
        return [text];
      }
      // Generischer Fallback: Kontextloser Freitext wird mit Kontextüberschrift versehen
      return [`${question.text}: ${trimmed}`];
    }
  }
}

/**
 * Gibt den Offen-Satz für eine unbeantwortete Pflichtfrage zurück.
 */
export function getOpenStatement(questionId: string, mode: PracticeProcessMode): string {
  const stmts = OPEN_STATEMENTS[questionId];
  if (!stmts) return `Noch nicht festgelegt: Frage ${questionId}.`;
  return mode === "CURRENT_STATE" ? stmts.current : stmts.target;
}

// ---------------------------------------------------------------------------
// Narrative-Aufbau pro Abschnitt
// ---------------------------------------------------------------------------

/**
 * Erzeugt einen aufbereiteten Narrativ-Abschnitt aus einem Checkpoint.
 *
 * - Bestätigte Antworten → sentences (outputText oder Satzvorlagen)
 * - UNCLEAR-Antworten → unclearTexts
 * - Pflichtfragen ohne Antwort → openTexts
 * - Optionale Fragen ohne Antwort → werden ignoriert
 */
export function buildSectionNarrative(
  section: ProtocolSection,
  checkpoint: ProtocolWorkflowCheckpoint,
  mode: PracticeProcessMode,
): NarrativeSection {
  const sentences: string[] = [];
  const unclearTexts: string[] = [];
  const openTexts: string[] = [];

  for (const question of section.questions) {
    const answer =
      (checkpoint.answers[question.id] as ProtocolWorkflowAnswerValue) ?? null;

    if (!hasAnswer(answer)) {
      if (question.required) {
        openTexts.push(getOpenStatement(question.id, mode));
      }
      // optionale Fragen ohne Antwort: ignorieren
      continue;
    }

    // Für YES_NO_UNCLEAR: UNCLEAR → unclearTexts, YES/NO → sentences
    if (question.kind === "YES_NO_UNCLEAR" && answer === "UNCLEAR") {
      const stmts = YES_NO_STATEMENTS[question.id];
      if (stmts) {
        const s = mode === "CURRENT_STATE" ? stmts.current.unclear : stmts.target.unclear;
        unclearTexts.push(s);
      } else {
        unclearTexts.push(question.text);
      }
      continue;
    }

    const sents = getAnswerSentences(question, answer, mode);
    sentences.push(...sents);
  }

  return {
    sectionId: section.id,
    sectionTitle: section.title,
    sentences,
    unclearTexts,
    openTexts,
  };
}

/**
 * Erzeugt alle Narrativ-Abschnitte für ein vollständiges Prozess-Snapshot.
 *
 * Gibt einen Eintrag pro Checkpoint zurück; fehlende Checkpoints für eine Section
 * erzeugen einen leeren Abschnitt mit allen Required-Fragen als open.
 */
export function buildProcessNarrative(
  sections: readonly ProtocolSection[],
  checkpoints: readonly ProtocolWorkflowCheckpoint[],
  mode: PracticeProcessMode,
): NarrativeSection[] {
  return sections.map((section) => {
    const checkpoint = checkpoints.find((cp) => cp.id === section.id);
    if (!checkpoint) {
      // Section existiert im Snapshot nicht → alle Pflichtfragen als offen
      const openTexts = section.questions
        .filter((q) => q.required)
        .map((q) => getOpenStatement(q.id, mode));
      return {
        sectionId: section.id,
        sectionTitle: section.title,
        sentences: [],
        unclearTexts: [],
        openTexts,
      };
    }
    return buildSectionNarrative(section, checkpoint, mode);
  });
}
