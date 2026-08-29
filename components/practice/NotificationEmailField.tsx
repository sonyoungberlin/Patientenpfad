"use client";

import { useState } from "react";

type Props = {
  /** Aktuell gespeicherter Wert aus der DB (null = deaktiviert). */
  initialValue: string | null;
  /** Welches Feld gesetzt wird: "patient" oder "office". */
  variant: "patient" | "office";
  /** Label oberhalb des Feldes. */
  label: string;
  /** Hinweistext unterhalb des Feldes. */
  hint: string;
};

type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Kleines Client-Formular zum Setzen der Benachrichtigungs-E-Mail.
 *
 * PUTet an /api/practice/notification-settings mit dem zugehörigen Feld.
 * Leerstring → deaktiviert die Benachrichtigung (null in der DB).
 */
export default function NotificationEmailField({
  initialValue,
  variant,
  label,
  hint,
}: Props) {
  const [value, setValue] = useState(initialValue ?? "");
  const [state, setState] = useState<SaveState>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setState("saving");
    setErrorMsg("");

    const bodyKey =
      variant === "patient"
        ? "digitalRequestNotificationEmail"
        : "officeApplicationNotificationEmail";

    try {
      const res = await fetch("/api/practice/notification-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [bodyKey]: value }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (json.ok) {
        setState("saved");
      } else {
        setState("error");
        setErrorMsg(json.error ?? "Unbekannter Fehler.");
      }
    } catch {
      setState("error");
      setErrorMsg("Netzwerkfehler – bitte erneut versuchen.");
    }
  }

  return (
    <form
      onSubmit={handleSave}
      style={{ marginTop: "1rem", maxWidth: "36rem" }}
      data-testid={`notification-email-form-${variant}`}
    >
      <label style={{ display: "block", marginBottom: "0.25rem" }}>
        <span style={{ fontWeight: 500 }}>{label}</span>
        <span
          className="text-muted"
          style={{ display: "block", fontSize: "0.85em", marginBottom: "0.25rem" }}
        >
          {hint}
        </span>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="email"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setState("idle");
            }}
            maxLength={254}
            placeholder="E-Mail-Adresse (leer = keine Benachrichtigung)"
            style={{ flexGrow: 1 }}
            data-testid={`notification-email-input-${variant}`}
          />
          <button
            type="submit"
            disabled={state === "saving"}
            data-testid={`notification-email-save-${variant}`}
          >
            {state === "saving" ? "Speichern…" : "Speichern"}
          </button>
        </div>
      </label>
      {state === "saved" && (
        <p
          role="status"
          style={{ color: "#0a6", marginTop: "0.25rem", fontSize: "0.9em" }}
          data-testid={`notification-email-success-${variant}`}
        >
          Gespeichert.
        </p>
      )}
      {state === "error" && (
        <p
          role="alert"
          style={{ color: "#a00", marginTop: "0.25rem", fontSize: "0.9em" }}
          data-testid={`notification-email-error-${variant}`}
        >
          {errorMsg}
        </p>
      )}
    </form>
  );
}
