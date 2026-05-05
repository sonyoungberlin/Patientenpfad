/**
 * Phase 3d: Präsentationale Server-Component für die öffentliche
 * Formularseite `/p/[slug]`.
 *
 * Bewusst **kein** Client-Component und **kein** State: das `<form>`
 * postet direkt an `/api/p/[slug]/submit` (HTML-Form-Submit). Der Server
 * antwortet mit einem 303-Redirect auf `/p/[slug]/eingereicht`.
 *
 * Sicherheits-Details:
 *   - Honeypot-Feld `company_website` ist sichtgeschützt positioniert
 *     (kein `display:none`, damit auch naive Bots es nicht überspringen)
 *     und vor Hilfstechnologien sowie Tab-Reihenfolge versteckt.
 *   - `autoComplete="new-password"` am Honeypot, damit Browser-Autofill
 *     keinen Wert einträgt.
 *
 * Das Markup verwendet bewusst die gleichen `data-q-*`-Selektoren wie der
 * Token-Flow in `app/q/[token]/QuestionnaireFormClient.tsx`, damit spätere
 * E2E-Tests beide Pfade gemeinsam abdecken können.
 */

import type { QuestionDefinition, QuestionType } from "@/lib/questionnaire/blockCatalog";
import {
  PATIENT_QUESTIONNAIRE_INTRO_TEXT,
  PATIENT_QUESTIONNAIRE_INTRO_TEXT_EN,
} from "@/lib/questionnaire/patientIntro";
import type { QuestionnaireLanguage } from "@/lib/questionnaire/i18n";
import { HONEYPOT_FIELD_NAME } from "@/lib/websiteForms/submitValidation";
import {
  ALLOWED_ANSWER_CHARACTERS_HTML_PATTERN,
  answerCharactersErrorMessage,
} from "@/lib/questionnaire/validateAnswerCharacters";
import { PublicFormCharactersValidator } from "./PublicFormCharactersValidator";

const NOTICE_ID = "public-form-confirm-notice";

// Lokalisierte UI-Strings für die öffentliche Patientensicht. Bewusst inline
// statt i18n-Library, analog zu `app/q/[token]/QuestionnaireFormClient.tsx`.
const UI_STRINGS = {
  de: {
    confirmNotice:
      "Nach dem Absenden erhalten Sie eine Bestätigungs-E-Mail. Erst nach Klick auf den Bestätigungslink werden Ihre Angaben an die Praxis übermittelt. Der Link ist 48 Stunden gültig.",
    emailLabel: "E-Mail-Adresse",
    selectPlaceholder: "— bitte wählen —",
    yes: "Ja",
    no: "Nein",
    noQuestions: "Dieses Formular enthält aktuell keine Fragen.",
    submit: "Absenden",
    honeypotLabel: "Bitte dieses Feld leer lassen.",
    intro: PATIENT_QUESTIONNAIRE_INTRO_TEXT,
  },
  en: {
    confirmNotice:
      "After submitting, you will receive a confirmation email. Your information will only be transmitted to the practice after you click the confirmation link. The link is valid for 48 hours.",
    emailLabel: "Email address",
    selectPlaceholder: "— please choose —",
    yes: "Yes",
    no: "No",
    noQuestions: "This form currently contains no questions.",
    submit: "Submit",
    honeypotLabel: "Please leave this field empty.",
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

/** Off-screen, aber NICHT display:none — damit naive Bots es ausfüllen. */
const honeypotStyle: React.CSSProperties = {
  position: "absolute",
  left: "-9999px",
  top: "auto",
  width: "1px",
  height: "1px",
  overflow: "hidden",
};

function PublicQuestionField({
  question,
  language,
}: {
  question: QuestionDefinition;
  language: QuestionnaireLanguage;
}) {
  const t = UI_STRINGS[language];
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
          <option value="">{t.selectPlaceholder}</option>
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
          data-q-freetext={question.id}
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
          {([
            { val: "ja", label: t.yes },
            { val: "nein", label: t.no },
          ] as const).map(({ val, label }) => {
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
          pattern={ALLOWED_ANSWER_CHARACTERS_HTML_PATTERN}
          data-q-freetext={question.id}
          style={baseInputStyle}
        />
      );
  }
}

export function PublicFormView({
  slug,
  title,
  introText,
  practiceSignature,
  questions,
  language = "de",
}: {
  slug: string;
  title: string;
  introText: string | null;
  practiceSignature: string | null;
  questions: QuestionDefinition[];
  language?: QuestionnaireLanguage;
}) {
  const t = UI_STRINGS[language];
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
        method="POST"
        action={`/api/p/${slug}/submit`}
        data-public-form
        style={{ display: "block" }}
      >
        <PublicFormCharactersValidator
          errorMessage={answerCharactersErrorMessage(language)}
        />
        {/*
          Honeypot-Feld: für Menschen unsichtbar (off-screen, tabIndex=-1,
          aria-hidden), naive Bots füllen es trotzdem aus → Submit wird
          serverseitig still verworfen.
        */}
        <div aria-hidden="true" style={honeypotStyle}>
          <label htmlFor="public-form-hp">
            {t.honeypotLabel}
            <input
              id="public-form-hp"
              type="text"
              name={HONEYPOT_FIELD_NAME}
              tabIndex={-1}
              autoComplete="new-password"
              defaultValue=""
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
            defaultValue=""
            style={baseInputStyle}
            data-q-email
          />
        </div>

        {questions.length === 0 ? (
          <p data-q-empty>{t.noQuestions}</p>
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
                <PublicQuestionField question={q} language={language} />
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
          type="submit"
          className="btn-primary"
          data-q-submit
          aria-describedby={NOTICE_ID}
          style={{ marginTop: "1rem" }}
        >
          {t.submit}
        </button>
      </form>
    </main>
  );
}
