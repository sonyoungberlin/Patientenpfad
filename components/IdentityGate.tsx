"use client";

import { useState } from "react";

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

/**
 * Leichter Zugriffsschutz vor dem Patientenformular.
 * Zeigt Datenschutzhinweis + Identitätsfelder, bevor das eigentliche Formular sichtbar wird.
 * Eingegebene Werte werden ausschließlich im Client-State gehalten und nicht weitergegeben.
 */
export function IdentityGate({ children }: { children: React.ReactNode }) {
  const [passed, setPassed] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [lastNamePrefix, setLastNamePrefix] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (passed) {
    return <>{children}</>;
  }

  function handleProceed() {
    if (!validateGateInput(birthDate, lastNamePrefix)) {
      setError(
        "Bitte geben Sie Ihr Geburtsdatum und die ersten 3 Buchstaben Ihres Nachnamens ein.",
      );
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
        <p style={{ fontWeight: 600, marginBottom: "0.4rem" }}>Hinweis:</p>
        <p style={{ margin: 0 }}>
          Die Angaben werden verschlüsselt an die Praxis übermittelt und dort zur Bearbeitung Ihrer
          Anfrage verwendet. Bitte geben Sie die Daten korrekt ein, damit die Praxis die Angaben
          richtig zuordnen kann. Gesundheitsbezogene Angaben machen Sie freiwillig zur Bearbeitung
          Ihres Anliegens. Weitere Informationen finden Sie in der Datenschutzerklärung der Praxis.
        </p>
      </div>

      <div style={{ display: "grid", gap: "1rem", maxWidth: "400px" }}>
        <div>
          <label
            htmlFor="gate-birthdate"
            style={{ display: "block", fontWeight: 500, marginBottom: "0.4rem" }}
          >
            Geburtsdatum
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
            Erste 3 Buchstaben des Nachnamens
          </label>
          <input
            id="gate-lastname"
            type="text"
            data-identity-gate-lastname
            value={lastNamePrefix}
            onChange={(e) => setLastNamePrefix(e.target.value)}
            placeholder="z. B. Mül"
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
          Weiter
        </button>
      </div>
    </div>
  );
}
