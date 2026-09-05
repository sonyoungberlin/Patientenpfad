import { parseISODate } from "./parseNumericAnswer";

export type QuestionnaireAttentionHint = {
  id: string;
  label: string;
  kind: "attention";
};

export type AttentionHints = QuestionnaireAttentionHint[];

type AttentionHintOptions = {
  today?: Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function hasVisibleAnswer(
  answers: Record<string, string>,
  visibleQuestionIds: ReadonlySet<string>,
  questionId: string,
): boolean {
  return visibleQuestionIds.has(questionId) && (answers[questionId] ?? "").trim() !== "";
}

function daysUntil(rawDate: string, today: Date): number | null {
  const date = parseISODate(rawDate);
  if (!date) return null;

  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const dateUtc = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  const days = Math.round((dateUtc - todayUtc) / DAY_MS);
  return days > 0 ? days : null;
}

/**
 * Erzeugt qualitative Hinweise aus sichtbaren Impfberatungsantworten.
 * Die Funktion enthält keine medizinische Bewertung und keine Empfehlung.
 */
export function computeQuestionnaireAttentionHints(
  answers: Record<string, string>,
  visibleQuestionIds: ReadonlySet<string>,
  options: AttentionHintOptions = {},
): AttentionHints {
  const hints: AttentionHints = [];
  const today = options.today ?? new Date();

  if (hasVisibleAnswer(answers, visibleQuestionIds, "IMPFBERATUNG_REISELAND")) {
    hints.push({
      id: "IMPFBERATUNG_REISELAND",
      label: "Reise: länderspezifische Prüfung erforderlich",
      kind: "attention",
    });
  }

  if (hasVisibleAnswer(answers, visibleQuestionIds, "IMPFBERATUNG_RISIKOGRUPPEN")) {
    hints.push({
      id: "IMPFBERATUNG_RISIKOGRUPPEN",
      label: "Risikokonstellation angegeben",
      kind: "attention",
    });
  }

  if (answers.IMPFBERATUNG_NACHWEIS_BEDARF === "Ja" &&
      visibleQuestionIds.has("IMPFBERATUNG_NACHWEIS_BEDARF")) {
    const purpose = visibleQuestionIds.has("IMPFBERATUNG_NACHWEIS_ZWECK")
      ? (answers.IMPFBERATUNG_NACHWEIS_ZWECK ?? "").trim()
      : "";
    hints.push({
      id: "IMPFBERATUNG_NACHWEIS_BEDARF",
      label: purpose ? `Nachweis erforderlich – ${purpose}` : "Nachweis erforderlich",
      kind: "attention",
    });
  }

  if (hasVisibleAnswer(answers, visibleQuestionIds, "IMPFBERATUNG_AKUT_ART")) {
    hints.push({
      id: "IMPFBERATUNG_AKUT_ART",
      label: "Akute Situation: zeitnah prüfen",
      kind: "attention",
    });
  }

  const deadlines = [
    {
      questionId: "IMPFBERATUNG_REISE_ABREISE",
      label: "Abreise",
    },
    {
      questionId: "IMPFBERATUNG_NACHWEIS_FRIST",
      label: "Nachweisfrist",
    },
  ]
    .filter(({ questionId }) => hasVisibleAnswer(answers, visibleQuestionIds, questionId))
    .map(({ questionId, label }) => ({
      questionId,
      label,
      days: daysUntil(answers[questionId]!, today),
    }))
    .filter((entry): entry is { questionId: string; label: string; days: number } => entry.days !== null && entry.days < 28)
    .sort((a, b) => a.days - b.days);

  const earliest = deadlines[0];
  if (earliest) {
    hints.push({
      id: `IMPFBERATUNG_KURZER_VORLAUF_${earliest.questionId}`,
      label: `Kurzer Vorlauf: ${earliest.label} in ${earliest.days} Tagen`,
      kind: "attention",
    });
  }

  return hints;
}
