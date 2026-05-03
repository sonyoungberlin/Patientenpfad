/**
 * Phase 3c: Präsentationale Server-Component für die öffentliche
 * Formularseite `/p/[slug]`.
 *
 * Bewusst **kein** Client-Component und **kein** State: in Phase 3c werden
 * die Eingaben nicht verarbeitet, nicht gespeichert und nicht versendet.
 * Der Submit-Button ist `disabled` und ein deutlicher Hinweistext erklärt,
 * dass Antworten nicht übermittelt werden.
 *
 * Das Markup verwendet bewusst die gleichen `data-q-*`-Selektoren wie der
 * Token-Flow in `app/q/[token]/QuestionnaireFormClient.tsx`, damit spätere
 * E2E-Tests beide Pfade gemeinsam abdecken können.
 */

import type { QuestionDefinition, QuestionType } from "@/lib/questionnaire/blockCatalog";

const NOTICE_ID = "public-form-preview-notice";

const baseInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.4rem 0.6rem",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  background: "var(--input-background)",
  fontSize: "1rem",
  fontFamily: "inherit",
  color: "var(--foreground)",
};

function PublicQuestionField({ question }: { question: QuestionDefinition }) {
  switch (question.type as QuestionType) {
    case "multi_select":
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.25rem" }}>
          {(question.options ?? []).map((opt) => (
            <label
              key={opt}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.25rem 0.6rem",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                background: "var(--background)",
                fontSize: "0.9rem",
              }}
              data-q-multiselect={`${question.id}:${opt}`}
            >
              <input type="checkbox" name={question.id} value={opt} />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      );
    case "select":
      return (
        <select
          id={question.id}
          name={question.id}
          required={question.required}
          defaultValue=""
          style={baseInputStyle}
        >
          <option value="">— bitte wählen —</option>
          {(question.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    case "textarea":
      return (
        <textarea
          id={question.id}
          name={question.id}
          required={question.required}
          rows={3}
          defaultValue=""
          style={{ ...baseInputStyle, resize: "vertical" }}
        />
      );
    case "date":
      return (
        <input
          type="date"
          id={question.id}
          name={question.id}
          required={question.required}
          defaultValue=""
          style={baseInputStyle}
        />
      );
    case "yes_no":
      return (
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
          {(["Ja", "Nein"] as const).map((label) => {
            const val = label === "Ja" ? "ja" : "nein";
            return (
              <label
                key={val}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.25rem 0.6rem",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  background: "var(--background)",
                  fontSize: "0.9rem",
                }}
                data-q-yesno={`${question.id}:${val}`}
              >
                <input type="radio" name={question.id} value={val} />
                <span>{label}</span>
              </label>
            );
          })}
        </div>
      );
    default:
      return (
        <input
          type="text"
          id={question.id}
          name={question.id}
          required={question.required}
          defaultValue=""
          style={baseInputStyle}
        />
      );
  }
}

export function PublicFormView({
  title,
  introText,
  questions,
}: {
  title: string;
  introText: string | null;
  questions: QuestionDefinition[];
}) {
  return (
    <main>
      <h1>{title}</h1>

      <p
        id={NOTICE_ID}
        data-public-form-preview-notice
        role="note"
        style={{
          background: "#fff8e0",
          border: "1px solid #e0c060",
          padding: "0.5rem 0.75rem",
          borderRadius: "0.25rem",
          marginBottom: "1rem",
        }}
      >
        Vorschau-Modus: Diese Seite zeigt das Formular nur an. Eingaben werden in
        dieser Phase nicht übermittelt und nicht gespeichert.
      </p>

      {introText ? (
        <p style={{ whiteSpace: "pre-wrap", marginBottom: "1rem" }}>{introText}</p>
      ) : null}

      {/*
        Bewusst KEIN <form>-Element: in Phase 3c gibt es keinen Submit-Endpoint
        und die Felder sollen den Browser nicht zu einem Default-GET-Submit
        bewegen, falls jemand Enter drückt. Stattdessen ein neutraler
        Container mit deaktiviertem Submit-Button.
      */}
      <div data-public-form-preview style={{ display: "block" }}>
        <div className="card" style={{ marginBottom: "0.75rem" }}>
          <label
            htmlFor="public-form-email"
            style={{ display: "block", fontWeight: 500, marginBottom: "0.4rem" }}
          >
            E-Mail-Adresse
            <span aria-hidden="true" style={{ color: "var(--destructive)", marginLeft: "0.25rem" }}>
              *
            </span>
          </label>
          <input
            id="public-form-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue=""
            style={baseInputStyle}
            data-q-email
          />
        </div>

        {questions.length === 0 ? (
          <p data-q-empty>Dieses Formular enthält aktuell keine Fragen.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {questions.map((q) => (
              <li
                key={q.id}
                data-q-question={q.id}
                className="card"
                style={{ marginBottom: "0.75rem" }}
              >
                <label
                  htmlFor={q.id}
                  style={{ display: "block", fontWeight: 500, marginBottom: "0.4rem" }}
                >
                  {q.text}
                  {q.required && (
                    <span
                      aria-hidden="true"
                      style={{ color: "var(--destructive)", marginLeft: "0.25rem" }}
                    >
                      *
                    </span>
                  )}
                </label>
                <PublicQuestionField question={q} />
                {q.helperText && (
                  <p
                    style={{
                      margin: "0.25rem 0 0",
                      fontSize: "0.85rem",
                      color: "var(--muted-foreground, #6b7280)",
                    }}
                    data-q-helper={q.id}
                  >
                    {q.helperText}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          className="btn-primary"
          data-q-submit
          disabled
          aria-describedby={NOTICE_ID}
          style={{ marginTop: "1rem" }}
        >
          Absenden (in dieser Phase noch nicht aktiv)
        </button>
      </div>
    </main>
  );
}
