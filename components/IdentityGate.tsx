"use client";

import { useState } from "react";
import type { QuestionnaireLanguage } from "@/lib/questionnaire/i18n";

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "0.4rem 0.6rem",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  background: "var(--input-background)",
  fontSize: "1rem",
  fontFamily: "inherit",
  color: "var(--foreground)",
};

/** Einfache Client-seitige Validierung: Geburtsdatum gesetzt und mind. 3 Zeichen Nachname. */
export function validateGateInput(birthDate: string, lastNamePrefix: string): boolean {
  return birthDate.trim() !== "" && lastNamePrefix.trim().length >= 3;
}

// Lokalisierte UI-Strings. Default DE, damit alle bestehenden Aufrufer
// (insbesondere `/p/[slug]`) ohne Anpassung wie bisher rendern.
const STRINGS = {
  de: {
    noticeHeading: "Hinweis:",
    noticeBody:
      "Die Angaben werden verschlüsselt an die Praxis übermittelt und dort zur Bearbeitung Ihrer " +
      "Anfrage verwendet. Bitte geben Sie die Daten korrekt ein, damit die Praxis die Angaben " +
      "richtig zuordnen kann. Gesundheitsbezogene Angaben machen Sie freiwillig zur Bearbeitung " +
      "Ihres Anliegens. Weitere Informationen finden Sie in der Datenschutzerklärung der Praxis.",
    birthdateLabel: "Geburtsdatum",
    lastnameLabel: "Erste 3 Buchstaben des Nachnamens",
    lastnamePlaceholder: "z. B. Mül",
    error:
      "Bitte geben Sie Ihr Geburtsdatum und die ersten 3 Buchstaben Ihres Nachnamens ein.",
    proceed: "Weiter",
  },
  en: {
    noticeHeading: "Note:",
    noticeBody:
      "Your information will be transmitted to the practice in encrypted form and used there to " +
      "process your request. Please enter the data correctly so the practice can match your " +
      "information. Health-related details are provided voluntarily to handle your request. " +
      "For more information, please see the practice's privacy notice.",
    birthdateLabel: "Date of birth",
    lastnameLabel: "First 3 letters of your last name",
    lastnamePlaceholder: "e.g. Smi",
    error:
      "Please enter your date of birth and the first 3 letters of your last name.",
    proceed: "Continue",
  },
} as const;

/**
 * Leichter Zugriffsschutz vor dem Patientenformular.
 * Zeigt Datenschutzhinweis + Identitätsfelder, bevor das eigentliche Formular sichtbar wird.
 * Eingegebene Werte werden ausschließlich im Client-State gehalten und nicht weitergegeben.
 *
 * Sprache ist optional; Default `"de"` erhält das bisherige Verhalten für
 * `/p/[slug]` und alle anderen Aufrufer unverändert.
 */
export function IdentityGate({
  children,
  language = "de",
}: {
  children: React.ReactNode;
  language?: QuestionnaireLanguage;
}) {
  const t = STRINGS[language];
  const [passed, setPassed] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [lastNamePrefix, setLastNamePrefix] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (passed) {
    return <>{children}</>;
  }

  function handleProceed() {
    if (!validateGateInput(birthDate, lastNamePrefix)) {
      setError(t.error);
      return;
    }
    setError(null);
    setPassed(true);
  }

  return (
    <div data-identity-gate>
      <div
        data-identity-gate-notice
        className="card"
        style={{ marginBottom: "1.5rem", fontSize: "0.9rem", lineHeight: "1.6" }}
      >
        <p style={{ fontWeight: 600, marginBottom: "0.4rem" }}>{t.noticeHeading}</p>
        <p style={{ margin: 0 }}>{t.noticeBody}</p>
      </div>

      <div style={{ display: "grid", gap: "1rem", maxWidth: "400px" }}>
        <div>
          <label
            htmlFor="gate-birthdate"
            style={{ display: "block", fontWeight: 500, marginBottom: "0.4rem" }}
          >
            {t.birthdateLabel}
          </label>
          <input
            id="gate-birthdate"
            type="date"
            data-identity-gate-birthdate
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            style={INPUT_STYLE}
          />
        </div>

        <div>
          <label
            htmlFor="gate-lastname"
            style={{ display: "block", fontWeight: 500, marginBottom: "0.4rem" }}
          >
            {t.lastnameLabel}
          </label>
          <input
            id="gate-lastname"
            type="text"
            data-identity-gate-lastname
            value={lastNamePrefix}
            onChange={(e) => setLastNamePrefix(e.target.value)}
            placeholder={t.lastnamePlaceholder}
            style={INPUT_STYLE}
          />
        </div>

        {error && (
          <p
            className="text-error"
            role="alert"
            aria-live="polite"
            data-identity-gate-error
            style={{ margin: 0 }}
          >
            {error}
          </p>
        )}

        <button
          type="button"
          className="btn-primary"
          data-identity-gate-submit
          onClick={handleProceed}
          style={{ justifySelf: "start" }}
        >
          {t.proceed}
        </button>
      </div>
    </div>
  );
}
