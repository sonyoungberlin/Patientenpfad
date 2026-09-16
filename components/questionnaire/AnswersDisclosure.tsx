import type { QuestionDefinition } from "@/lib/questionnaire/blockCatalog";
import {
  parseFacharztEntries,
  parseRepeatableGroupEntries,
  formatYesNoValue,
} from "@/lib/questionnaire/formatAnswer";
import type { RepGroupEntry } from "@/lib/questionnaire/formatAnswer";
import { parseMultiSelectValue } from "@/lib/questionnaire/multiSelect";
import { resolveQuestionOptionLabel } from "@/lib/questionnaire/questionOptions";
import { formatStructuredVaccinationEntries } from "@/lib/questionnaire/vaccinationReview";

function StructuredVaccinationAnswerDisplay({ lines }: { lines: string[] }) {
  if (lines.length === 0) return <span className="text-muted">–</span>;
  return <div style={{ display: "grid", gap: "0.25rem" }}>
    {lines.map((line, index) => <div key={index}>{line}</div>)}
  </div>;
}

function RepeatableGroupAnswerDisplay({ entries }: { entries: RepGroupEntry[] }) {
  if (entries.length === 0) return <span className="text-muted">–</span>;
  return (
    <div style={{ display: "grid", gap: "0.5rem", marginTop: "0.25rem" }}>
      {entries.map((entry) => (
        <div
          key={entry.index}
          style={{ paddingLeft: "0.5rem", borderLeft: "2px solid var(--border)" }}
        >
          <div style={{ fontWeight: 500, marginBottom: "0.25rem" }}>
            {entry.index}. Eintrag
          </div>
          {entry.fields.map((field, fi) => (
            <div key={fi}>
              <span style={{ fontWeight: 500 }}>{field.label}:</span> {field.value}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function renderAnswerValue(
  q: QuestionDefinition,
  answers: Record<string, string>,
  visibleQuestionIds: ReadonlySet<string> | undefined,
): React.ReactNode {
  const isVisible = !visibleQuestionIds || visibleQuestionIds.has(q.id);
  if (!isVisible) return <span className="text-muted">Nicht abgefragt</span>;
  const val = answers[q.id];
  if (!val || val === "") return <span className="text-muted">–</span>;
  if (q.id === "FACHAERZTE") {
    return <RepeatableGroupAnswerDisplay entries={parseFacharztEntries(val)} />;
  }
  if (q.type === "repeatable_group") {
    const structuredVaccinations = formatStructuredVaccinationEntries(val, q);
    if (structuredVaccinations.length > 0) {
      return <StructuredVaccinationAnswerDisplay lines={structuredVaccinations} />;
    }
    return (
      <RepeatableGroupAnswerDisplay
        entries={parseRepeatableGroupEntries(val, q.id, q)}
      />
    );
  }
  if (q.type === "yes_no") {
    return formatYesNoValue(resolveQuestionOptionLabel(q, val));
  }
  if (q.type === "confirmation") return val === "true" ? "Bestätigt" : "–";
  if (q.type === "multi_select") {
    return parseMultiSelectValue(val, q.options ?? [])
      .map((value) => resolveQuestionOptionLabel(q, value))
      .join(", ");
  }
  if (q.type === "select") return resolveQuestionOptionLabel(q, val);
  return val;
}

export type AnswersDisclosureProps = {
  questions: QuestionDefinition[];
  answers: Record<string, string>;
  visibleQuestionIds?: ReadonlySet<string>;
  showSummary?: boolean;
};

export default function AnswersDisclosure({
  questions,
  answers,
  visibleQuestionIds,
  showSummary = true,
}: AnswersDisclosureProps) {
  if (questions.length === 0) return null;
  const answersList = (
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: "0.5rem 0 0",
          display: "grid",
          gap: "0.4rem",
        }}
      >
        {questions.map((q) => (
          <li key={q.id} data-q-answer={q.id}>
            <div className="text-small" style={{ fontWeight: 500 }}>
              {q.text}
            </div>
            <div className="text-small" style={{ marginLeft: "0.5rem" }}>
              {renderAnswerValue(q, answers, visibleQuestionIds)}
            </div>
          </li>
        ))}
      </ul>
  );
  if (!showSummary) return answersList;
  return (
    <details style={{ marginTop: "0.5rem" }}>
      <summary style={{ cursor: "pointer", fontWeight: 500, fontSize: "0.9rem" }}>
        Antworten anzeigen
      </summary>
      {answersList}
    </details>
  );
}
