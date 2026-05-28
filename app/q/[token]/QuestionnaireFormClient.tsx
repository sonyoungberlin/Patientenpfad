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

// ---------------------------------------------------------------------------
// FACHAERZTE Schema (lokaler Spezialfall)
// ---------------------------------------------------------------------------

type FacharztEntry = {
  erkrankung: string;
  bereich: string;
  name: string;
  adresse: string;
  _localId?: string; // Nur für React keys, wird nicht gespeichert
};

function generateLocalId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

const FACHAERZTE_SCHEMA: Array<{
  key: keyof FacharztEntry;
  label: string;
  label_en: string;
  type: "text" | "select" | "textarea";
  required: boolean;
  options?: string[];
  placeholder?: string;
  placeholder_en?: string;
  helperText?: string;
  helperText_en?: string;
}> = [
  {
    key: "erkrankung",
    label: "Erkrankung / Grund der fachärztlichen Behandlung",
    label_en: "Condition / Reason for specialist treatment",
    type: "textarea",
    required: true,
    placeholder: "z.B. Herz-Kreislauf-Probleme, Diabetes",
    placeholder_en: "e.g. Cardiovascular problems, Diabetes",
  },
  {
    key: "bereich",
    label: "Facharztbereich",
    label_en: "Medical specialty",
    type: "select",
    required: true,
    options: [
      "Allgemeinmedizin",
      "Augenheilkunde",
      "Chirurgie",
      "Dermatologie",
      "Gynäkologie",
      "HNO",
      "Innere Medizin",
      "Kardiologie",
      "Neurologie",
      "Orthopädie",
      "Pädiatrie",
      "Psychiatrie / Psychotherapie",
      "Radiologie",
      "Urologie",
      "Sonstiges",
    ],
  },
  {
    key: "name",
    label: "Name des Facharztes oder der Praxis",
    label_en: "Name of the specialist or practice",
    type: "text",
    required: true,
    placeholder: "Dr. Müller / Praxis am Markt",
    placeholder_en: "Dr. Smith / Market Practice",
  },
  {
    key: "adresse",
    label: "Adresse der Praxis",
    label_en: "Address of the practice",
    type: "textarea",
    required: false,
    placeholder: "Straße, PLZ, Ort",
    placeholder_en: "Street, Postcode, City",
    helperText: "Falls bekannt",
    helperText_en: "If known",
  },
];

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

  // Spezialfall: FACHAERZTE repeatable group
  if (question.id === "FACHAERZTE") {
    return (
      <FachaerzeField
        value={value}
        onChange={(jsonValue) => onChange(question.id, jsonValue)}
        disabled={disabled}
        language={language}
      />
    );
  }

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

// ---------------------------------------------------------------------------
// FACHAERZTE Repeatable Field (lokaler Spezialfall)
// ---------------------------------------------------------------------------

function FachaerzeField({
  value,
  onChange,
  disabled,
  language,
}: {
  value: string;
  onChange: (jsonValue: string) => void;
  disabled: boolean;
  language: QuestionnaireLanguage;
}) {
  const entries: FacharztEntry[] = useMemo(() => {
    if (!value || value === "") return [];
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) return [];
      // Füge _localId hinzu wenn nicht vorhanden (für stabile React keys)
      return parsed.map((entry) => ({
        ...entry,
        _localId: entry._localId || generateLocalId(),
      }));
    } catch {
      return [];
    }
  }, [value]);

  // Entfernt _localId vor dem Speichern (nur Datenfelder bleiben)
  const cleanEntries = (entries: FacharztEntry[]) => {
    return entries.map(({ erkrankung, bereich, name, adresse }) => ({
      erkrankung,
      bereich,
      name,
      adresse,
    }));
  };

  const addEntry = () => {
    if (entries.length >= 10) return;
    const newEntries = [
      ...entries,
      { erkrankung: "", bereich: "", name: "", adresse: "", _localId: generateLocalId() },
    ];
    onChange(JSON.stringify(cleanEntries(newEntries)));
  };

  const removeEntry = (index: number) => {
    const newEntries = entries.filter((_, i) => i !== index);
    onChange(JSON.stringify(cleanEntries(newEntries)));
  };

  const updateEntry = (index: number, key: keyof FacharztEntry, val: string) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [key]: val };
    onChange(JSON.stringify(cleanEntries(newEntries)));
  };

  const getLabel = (field: typeof FACHAERZTE_SCHEMA[number]): string => {
    return language === "en" && field.label_en ? field.label_en : field.label;
  };

  const getPlaceholder = (field: typeof FACHAERZTE_SCHEMA[number]): string | undefined => {
    return language === "en" && field.placeholder_en ? field.placeholder_en : field.placeholder;
  };

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {entries.map((entry, idx) => (
        <div
          key={entry._localId || `fachaerzte-${idx}`}
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "1rem",
            background: "var(--card-background, #fafafa)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <strong style={{ fontSize: "0.9rem", color: "var(--foreground)" }}>
              {language === "en" ? `Specialist ${idx + 1}` : `Eintrag ${idx + 1}`}
            </strong>
            <button
              type="button"
              onClick={() => removeEntry(idx)}
              disabled={disabled}
              style={{
                padding: "0.25rem 0.5rem",
                fontSize: "0.85rem",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                background: "var(--destructive, #dc2626)",
                color: "#fff",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.6 : 1,
              }}
            >
              {language === "en" ? "Remove" : "Entfernen"}
            </button>
          </div>
          {FACHAERZTE_SCHEMA.map((field) => (
            <label
              key={field.key}
              style={{ display: "block", marginBottom: "0.5rem" }}
            >
              <span style={{ display: "block", fontWeight: 500, marginBottom: "0.25rem", fontSize: "0.9rem" }}>
                {getLabel(field)}
                {field.required && (
                  <span style={{ color: "var(--destructive, #dc2626)", marginLeft: "0.25rem" }}>*</span>
                )}
              </span>
              {field.type === "select" ? (
                <select
                  value={entry[field.key]}
                  onChange={(e) => updateEntry(idx, field.key, e.target.value)}
                  disabled={disabled}
                  style={baseStyle}
                >
                  <option value="">
                    {language === "en" ? "— please choose —" : "— bitte wählen —"}
                  </option>
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  value={entry[field.key]}
                  onChange={(e) => updateEntry(idx, field.key, e.target.value)}
                  disabled={disabled}
                  rows={2}
                  placeholder={getPlaceholder(field)}
                  style={{ ...baseStyle, resize: "vertical" }}
                />
              ) : (
                <input
                  type="text"
                  value={entry[field.key]}
                  onChange={(e) => updateEntry(idx, field.key, e.target.value)}
                  disabled={disabled}
                  placeholder={getPlaceholder(field)}
                  style={baseStyle}
                />
              )}
              {field.helperText && (
                <span style={{ display: "block", fontSize: "0.8rem", color: "var(--muted-foreground, #6b7280)", marginTop: "0.25rem" }}>
                  {language === "en" && field.helperText_en ? field.helperText_en : field.helperText}
                </span>
              )}
            </label>
          ))}
        </div>
      ))}
      {entries.length < 10 && (
        <button
          type="button"
          onClick={addEntry}
          disabled={disabled}
          style={{
            padding: "0.5rem 1rem",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            background: "var(--secondary, #f1f5f9)",
            color: "var(--foreground)",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.6 : 1,
            fontSize: "0.9rem",
            fontWeight: 500,
          }}
        >
          {language === "en"
            ? "+ Add another specialist"
            : "+ Weiteren Facharzt hinzufügen"}
        </button>
      )}
    </div>
  );
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
