"use client";

import { useMemo, useState } from "react";
import type { QuestionDefinition, QuestionType } from "@/lib/questionnaire/blockCatalog";
import type { QuestionnaireLanguage } from "@/lib/questionnaire/i18n";
import { IdentityGate } from "@/components/IdentityGate";
import {
  ALLOWED_ANSWER_CHARACTERS_HTML_PATTERN,
  answerCharactersErrorMessage,
  isAnswerTextAllowed,
  validateAnswerCharacters,
} from "@/lib/questionnaire/validateAnswerCharacters";

function QuestionField({
  question,
  value,
  onChange,
  disabled,
  language,
  hasError,
}: {
  question: QuestionDefinition;
  value: string;
  onChange: (id: string, val: string) => void;
  disabled: boolean;
  language: QuestionnaireLanguage;
  hasError: boolean;
}) {
  const baseStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.4rem 0.6rem",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    background: "var(--input-background)",
    fontSize: "1rem",
    fontFamily: "inherit",
    color: "var(--foreground)",
  };

  switch (question.type as QuestionType) {
    case "multi_select":
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.25rem" }}>
          {(question.options ?? []).map((opt) => {
            const selected = value.split(",").map((s) => s.trim()).filter(Boolean).includes(opt);
            return (
              <button
                key={opt}
                type="button"
                disabled={disabled}
                onClick={() => {
                  const current = value.split(",").map((s) => s.trim()).filter(Boolean);
                  const next = selected
                    ? current.filter((s) => s !== opt)
                    : [...current, opt];
                  onChange(question.id, next.join(", "));
                }}
                style={{
                  padding: "0.25rem 0.75rem",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  background: selected ? "var(--primary, #2563eb)" : "var(--background)",
                  color: selected ? "#fff" : "var(--foreground)",
                  fontWeight: selected ? 600 : 400,
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.6 : 1,
                  fontSize: "0.9rem",
                }}
                data-q-multiselect={`${question.id}:${opt}`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      );
    case "select":
      return (
        <select
          id={question.id}
          value={value}
          onChange={(e) => onChange(question.id, e.target.value)}
          disabled={disabled}
          required={question.required}
          style={{ ...baseStyle }}
        >
          <option value="">
            {language === "en" ? "— please choose —" : "— bitte wählen —"}
          </option>
          {(question.options ?? []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    case "textarea":
      return (
        <textarea
          id={question.id}
          value={value}
          onChange={(e) => onChange(question.id, e.target.value)}
          disabled={disabled}
          required={question.required}
          rows={3}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? `${question.id}-charerror` : undefined}
          style={{ ...baseStyle, resize: "vertical" }}
        />
      );
    case "date":
      return (
        <input
          type="date"
          id={question.id}
          value={value}
          onChange={(e) => onChange(question.id, e.target.value)}
          disabled={disabled}
          required={question.required}
          style={baseStyle}
        />
      );
    case "yes_no":
      return (
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
          {([
            { val: "ja", labelDe: "Ja", labelEn: "Yes" },
            { val: "nein", labelDe: "Nein", labelEn: "No" },
          ] as const).map(({ val, labelDe, labelEn }) => {
            const label = language === "en" ? labelEn : labelDe;
            return (
              <button
                key={val}
                type="button"
                disabled={disabled}
                onClick={() => onChange(question.id, val)}
                style={{
                  padding: "0.25rem 0.75rem",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  background: value === val ? "var(--primary, #2563eb)" : "var(--background)",
                  color: value === val ? "#fff" : "var(--foreground)",
                  fontWeight: value === val ? 600 : 400,
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.6 : 1,
                  fontSize: "0.9rem",
                }}
                data-q-yesno={`${question.id}:${val}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      );
    default:
      return (
        <input
          type="text"
          id={question.id}
          value={value}
          onChange={(e) => onChange(question.id, e.target.value)}
          disabled={disabled}
          required={question.required}
          pattern={ALLOWED_ANSWER_CHARACTERS_HTML_PATTERN}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? `${question.id}-charerror` : undefined}
          style={baseStyle}
        />
      );
  }
}

/**
 * Client-Komponente für /q/[token].
 *
 * Wichtig: Patient-Intro und Praxis-Signatur werden bewusst innerhalb
 * dieser Client-Komponente gerendert (und nicht von der Server-Page),
 * damit sie nach erfolgreichem Absenden gemeinsam mit dem Formular
 * verschwinden. Im `submitted`-Branch gibt die Komponente ausschließlich
 * die Bestätigungsnachricht zurück. Status `completed`/`expired` werden
 * bereits in der Server-Page abgefangen und rendern diese Komponente
 * gar nicht erst.
 */
// Lokalisierte UI-Strings für die Patientensicht (außerhalb des Frage-Katalogs).
// Bewusst inline statt i18n-Library, um den minimalen Scope zu wahren.
const UI_STRINGS = {
  de: {
    requiredAriaSuffix: " (Pflichtfeld)",
    noQuestions: "Keine Fragen vorhanden.",
    submit: "Absenden",
    submitting: "Wird übermittelt…",
    submitted: "Vielen Dank, Ihre Angaben wurden übermittelt.",
    submitError:
      "Angaben konnten nicht übermittelt werden. Bitte versuchen Sie es erneut.",
  },
  en: {
    requiredAriaSuffix: " (required)",
    noQuestions: "No questions available.",
    submit: "Submit",
    submitting: "Submitting…",
    submitted: "Thank you, your information has been submitted.",
    submitError:
      "Your information could not be submitted. Please try again.",
  },
} as const;

export function QuestionnaireFormClient({
  token,
  questions,
  introText,
  practiceSignature,
  language = "de",
}: {
  token: string;
  questions: QuestionDefinition[];
  introText?: string | null;
  practiceSignature?: string | null;
  language?: QuestionnaireLanguage;
}) {
  const t = UI_STRINGS[language];
  const charErrorMessage = answerCharactersErrorMessage(language);

  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const q of questions) {
      init[q.id] = "";
    }
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Per-Frage Live-Charactervalidierung. Gibt true zurück, wenn der aktuelle
  // Wert ungültige (nicht-lateinische) Zeichen enthält. Auswahl-/Datums-/
  // Yes-No-Felder liefern immer false (siehe `isAnswerTextAllowed`).
  const fieldHasCharError = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const q of questions) {
      const v = values[q.id] ?? "";
      map[q.id] = !isAnswerTextAllowed(v, q.type as QuestionType);
    }
    return map;
  }, [values, questions]);

  const hasAnyCharError = Object.values(fieldHasCharError).some(Boolean);

  function handleChange(id: string, val: string) {
    setValues((prev) => ({ ...prev, [id]: val }));
  }

  async function handleSubmit() {
    setError(null);

    // Clientseitige Validierung der Freitext-Antworten gegen erlaubte Zeichen.
    // Block submit, falls verletzt — Server validiert zusätzlich (Bypass-Schutz).
    const charCheck = validateAnswerCharacters(values, questions);
    if (!charCheck.ok) {
      setError(charErrorMessage);
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/q/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: values }),
      });

      if (!response.ok) {
        // Fehlermeldungen vom Server sind aktuell deutsch; wir verwenden
        // sie nur, wenn die Patient:in deutsch ausgewählt hat. Sonst
        // einheitlich englischer Fallback.
        const data = await response.json().catch(() => null);
        const serverError =
          (data as { error?: string } | null)?.error ?? null;
        setError(language === "de" && serverError ? serverError : t.submitError);
        return;
      }

      setSubmitted(true);
    } catch {
      setError(t.submitError);
    } finally {
      setSaving(false);
    }
  }

  if (submitted) {
    return (
      <p data-q-submitted style={{ marginTop: "1.5rem" }}>
        {t.submitted}
      </p>
    );
  }

  return (
    <>
      {introText ? (
        <p data-patient-intro style={{ marginBottom: "0.5rem" }}>
          {introText}
        </p>
      ) : null}
      {practiceSignature ? (
        <p
          data-practice-signature
          style={{ whiteSpace: "pre-wrap", marginBottom: "1rem" }}
        >
          {practiceSignature}
        </p>
      ) : null}
      <IdentityGate language={language}>
        <div>
        {questions.length === 0 ? (
        <p>{t.noQuestions}</p>
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
                  <>
                    <span aria-hidden="true" style={{ color: "var(--destructive)", marginLeft: "0.25rem" }}>
                      *
                    </span>
                    <span className="sr-only">{t.requiredAriaSuffix}</span>
                  </>
                )}
              </label>
              <QuestionField
                question={q}
                value={values[q.id] ?? ""}
                onChange={handleChange}
                disabled={saving}
                language={language}
                hasError={fieldHasCharError[q.id] === true}
              />
              {fieldHasCharError[q.id] && (
                <p
                  id={`${q.id}-charerror`}
                  data-q-charerror={q.id}
                  className="text-error"
                  role="alert"
                  aria-live="polite"
                  style={{ margin: "0.25rem 0 0", fontSize: "0.85rem" }}
                >
                  {charErrorMessage}
                </p>
              )}
              {q.helperText && (
                <p
                  style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--muted-foreground, #6b7280)" }}
                  data-q-helper={q.id}
                >
                  {q.helperText}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      {error ? (
        <p className="text-error" role="alert" aria-live="polite">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className="btn-primary"
        data-q-submit
        onClick={() => void handleSubmit()}
        disabled={saving || hasAnyCharError}
        style={{ marginTop: "1rem" }}
      >
        {saving ? t.submitting : t.submit}
      </button>
    </div>
    </IdentityGate>
    </>
  );
}
