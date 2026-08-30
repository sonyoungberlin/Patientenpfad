"use client";

/**
 * Öffentliche Formularseite `/p/[slug]` — Client Component.
 *
 * Nutzt dieselbe Questionnaire-Engine wie `/q/[token]`:
 *   - conditionalLogic.ts  (computeVisibleQuestionIds)
 *   - derivedValues.ts     (computeAllDerivedValues)
 *   - QuestionField.tsx    (alle Fragetypen inkl. repeatable_group)
 *
 * Submit: fetch POST als JSON an `/api/p/[slug]/submit`.
 * Bei Erfolg (Server bestätigt 200 OK nach 303-Redirect-Follow) navigiert
 * der Client nach `/p/[slug]/eingereicht`.
 */

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { QuestionDefinition } from "@/lib/questionnaire/blockCatalog";
import type { QuestionnaireLanguage } from "@/lib/questionnaire/i18n";
import {
  PATIENT_QUESTIONNAIRE_INTRO_TEXT,
  PATIENT_QUESTIONNAIRE_INTRO_TEXT_EN,
} from "@/lib/questionnaire/patientIntro";
import {
  computeVisibleQuestionIds,
  type ConditionalRule,
} from "@/lib/questionnaire/conditionalLogic";
import { computeAllDerivedValues } from "@/lib/questionnaire/derivedValues";
import { buildOptionsByQuestionId } from "@/lib/questionnaire/multiSelect";
import {
  answerCharactersErrorMessage,
  isAnswerTextAllowed,
  validateAnswerCharacters,
} from "@/lib/questionnaire/validateAnswerCharacters";
import { HONEYPOT_FIELD_NAME } from "@/lib/websiteForms/submitValidation";
import {
  QuestionField,
  MAIN_GATE_QUESTION_IDS,
} from "@/components/questionnaire/QuestionField";
import { PublicPracticeFooter } from "@/components/practice/PublicPracticeFooter";
import type { PublicPracticeIdentity } from "@/lib/practice/publicIdentity";

const NOTICE_ID = "public-form-confirm-notice";

const UI_STRINGS = {
  de: {
    confirmNotice:
      "Nach dem Absenden erhalten Sie eine Bestätigungs-E-Mail. Erst nach Klick auf den Bestätigungslink werden Ihre Angaben an die Praxis übermittelt. Der Link ist 48 Stunden gültig.",
    emailLabel: "E-Mail-Adresse",
    noQuestions: "Dieses Formular enthält aktuell keine Fragen.",
    submit: "Absenden",
    submitting: "Wird gesendet…",
    honeypotLabel: "Bitte dieses Feld leer lassen.",
    errorPrefix: "Fehler beim Senden: ",
    requiredMissing: "Bitte füllen Sie alle Pflichtfelder aus.",
    intro: PATIENT_QUESTIONNAIRE_INTRO_TEXT,
  },
  en: {
    confirmNotice:
      "After submitting, you will receive a confirmation email. Your information will only be transmitted to the practice after you click the confirmation link. The link is valid for 48 hours.",
    emailLabel: "Email address",
    noQuestions: "This form currently contains no questions.",
    submit: "Submit",
    submitting: "Submitting…",
    honeypotLabel: "Please leave this field empty.",
    errorPrefix: "Submission error: ",
    requiredMissing: "Please fill in all required fields.",
    intro: PATIENT_QUESTIONNAIRE_INTRO_TEXT_EN,
  },
} as const;

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

/** Off-screen, aber NICHT display:none — damit naive Bots das Feld sehen. */
const honeypotStyle: React.CSSProperties = {
  position: "absolute",
  left: "-9999px",
  top: "auto",
  width: "1px",
  height: "1px",
  overflow: "hidden",
};

export function PublicFormView({
  slug,
  title,
  introText,
  practiceSignature,
  questions,
  language = "de",
  conditionalRules,
  successPath,
  practice,
}: {
  slug: string;
  title: string;
  introText: string | null;
  practiceSignature: string | null;
  questions: QuestionDefinition[];
  language?: QuestionnaireLanguage;
  /** Alle Conditional-Rules aus den gewählten Blöcken. */
  conditionalRules: ConditionalRule[];
  successPath?: string;
  practice?: PublicPracticeIdentity | null;
}) {
  const t = UI_STRINGS[language];
  const charErrorMessage = answerCharactersErrorMessage(language);
  const router = useRouter();

  const [values, setValues] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const contactEmailTouched = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingRequired, setMissingRequired] = useState<Set<string>>(new Set());

  // Gate-Fragen: explizite Hauptpfad-Konstante (keine Ableitung aus conditionalRules)
  const gateQuestionIds = MAIN_GATE_QUESTION_IDS;

  // Sichtbare Fragen basierend auf aktuellen Antworten
  const derivedValues = useMemo(() => computeAllDerivedValues(values), [values]);
  const allQuestionIds = useMemo(() => questions.map((q) => q.id), [questions]);
  const optionsByQuestionId = useMemo(() => buildOptionsByQuestionId(questions), [questions]);

  const visibleIds = useMemo(
    () => computeVisibleQuestionIds(conditionalRules, allQuestionIds, values, derivedValues, optionsByQuestionId),
    [conditionalRules, allQuestionIds, values, derivedValues, optionsByQuestionId]
  );

  const visibleQuestions = useMemo(
    () => questions.filter((q) => visibleIds.has(q.id)),
    [questions, visibleIds]
  );

  // Zeichenfehler pro Frage (nur sichtbare Felder)
  const fieldHasCharError = useMemo<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const q of visibleQuestions) {
      const v = values[q.id] ?? "";
      if (v) {
        map[q.id] = !isAnswerTextAllowed(v, q.type as import("@/lib/questionnaire/blockCatalog").QuestionType, q.id);
      }
    }
    return map;
  }, [visibleQuestions, values]);

  const handleChange = (id: string, value: string) => {
    if (id === "CONTACT_EMAIL") {
      contactEmailTouched.current = true;
    }
    setValues((prev) => ({ ...prev, [id]: value }));
    if (missingRequired.has(id)) {
      setMissingRequired((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (
      !contactEmailTouched.current &&
      allQuestionIds.includes("CONTACT_EMAIL")
    ) {
      setValues((prev) => ({ ...prev, CONTACT_EMAIL: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Pflichtfeld-Validierung für sichtbare Felder
    const missing = new Set<string>();
    for (const q of visibleQuestions) {
      if (q.required && !(values[q.id] ?? "").trim()) {
        missing.add(q.id);
      }
    }
    if (missing.size > 0) {
      setMissingRequired(missing);
      return;
    }

    // Zeichenfehler prüfen
    const { invalidQuestionIds } = validateAnswerCharacters(values, visibleQuestions);
    if (invalidQuestionIds.length > 0) return;

    // Nur sichtbare Antworten senden
    const visibleAnswers: Record<string, string> = {};
    for (const q of visibleQuestions) {
      if (values[q.id] !== undefined) {
        visibleAnswers[q.id] = values[q.id];
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/p/${slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          [HONEYPOT_FIELD_NAME]: "",
          answers: visibleAnswers,
        }),
      });
      if (res.ok) {
        router.push(successPath ?? `/p/${slug}/eingereicht`);
      } else {
        const text = await res.text().catch(() => String(res.status));
        setError(t.errorPrefix + text);
      }
    } catch (err) {
      setError(t.errorPrefix + String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main lang={language}>
      <h1>{title}</h1>

      <p
        id={NOTICE_ID}
        data-public-form-confirm-notice
        role="note"
        style={{
          background: "#fff8e0",
          border: "1px solid #e0c060",
          padding: "0.5rem 0.75rem",
          borderRadius: "0.25rem",
          marginBottom: "1rem",
        }}
      >
        {t.confirmNotice}
      </p>

      {introText ? (
        <p
          style={{
            whiteSpace: "pre-wrap",
            marginBottom: "1.25rem",
            fontStyle: "italic",
            color: "var(--muted-foreground, #6b7280)",
          }}
        >
          {introText}
        </p>
      ) : null}

      <p data-patient-intro style={{ marginBottom: "0.5rem" }}>
        {t.intro}
      </p>

      {practiceSignature ? (
        <p
          data-practice-signature
          style={{ whiteSpace: "pre-wrap", marginBottom: "1rem" }}
        >
          {practiceSignature}
        </p>
      ) : null}

      <form
        onSubmit={handleSubmit}
        data-public-form
        style={{ display: "block" }}
        noValidate
      >
        {/* Honeypot: off-screen, kein tabIndex, aria-hidden */}
        <div aria-hidden="true" style={honeypotStyle}>
          <label htmlFor="public-form-hp">
            {t.honeypotLabel}
            <input
              id="public-form-hp"
              type="text"
              name={HONEYPOT_FIELD_NAME}
              tabIndex={-1}
              autoComplete="new-password"
              value=""
              readOnly
            />
          </label>
        </div>

        <div className="card" style={{ marginBottom: "0.75rem" }}>
          <label
            htmlFor="public-form-email"
            style={{ display: "block", fontWeight: 500, marginBottom: "0.4rem" }}
          >
            {t.emailLabel}
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
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            style={baseInputStyle}
            data-q-email
          />
        </div>

        {questions.length === 0 ? (
          <p data-q-empty>{t.noQuestions}</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {visibleQuestions.map((q) => {
              const isGate = gateQuestionIds.has(q.id);
              const isMissing = missingRequired.has(q.id);
              const hasCharErr = !!fieldHasCharError[q.id];
              return (
                <li
                  key={q.id}
                  data-q-question={q.id}
                  className="card"
                  style={{
                    marginBottom: "0.75rem",
                    ...(isGate
                      ? {
                          marginTop: "1.5rem",
                          background: "#f5f5f5",
                          borderColor: "#c8cdd4",
                        }
                      : {}),
                    ...(isMissing || hasCharErr
                      ? { borderColor: "var(--destructive, #dc2626)" }
                      : {}),
                  }}
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
                  <QuestionField
                    question={q}
                    value={values[q.id] ?? ""}
                    onChange={handleChange}
                    disabled={submitting}
                    language={language}
                    hasError={isMissing || hasCharErr}
                  />
                  {hasCharErr && (
                    <p
                      role="alert"
                      style={{
                        margin: "0.25rem 0 0",
                        fontSize: "0.85rem",
                        color: "var(--destructive, #dc2626)",
                      }}
                    >
                      {charErrorMessage}
                    </p>
                  )}
                  {isMissing && !hasCharErr && (
                    <p
                      role="alert"
                      style={{
                        margin: "0.25rem 0 0",
                        fontSize: "0.85rem",
                        color: "var(--destructive, #dc2626)",
                      }}
                    >
                      {t.requiredMissing}
                    </p>
                  )}
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
              );
            })}
          </ul>
        )}

        {error && (
          <p
            role="alert"
            style={{
              color: "var(--destructive, #dc2626)",
              marginTop: "0.5rem",
            }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          className="btn-primary"
          data-q-submit
          disabled={submitting}
          aria-describedby={NOTICE_ID}
          style={{ marginTop: "1rem" }}
        >
          {submitting ? t.submitting : t.submit}
        </button>
      </form>
      {practice && <PublicPracticeFooter practice={practice} />}
    </main>
  );
}
