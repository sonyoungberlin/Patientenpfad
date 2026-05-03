"use client";

/**
 * Admin-Aktion: Passwort-Setup-Link per E-Mail an einen bestehenden Account
 * versenden.
 *
 * Ruft den bestehenden Endpoint `POST /api/auth/request-password-setup` auf.
 * Dieser antwortet bewusst IMMER mit 200 (keine Account-Enumeration), daher
 * zeigen wir auch hier nur eine generische Erfolgs-/Fehlermeldung — keine
 * Account-Existenz oder Token-Details.
 *
 * Funktioniert unabhängig vom Freischalt-Status des Accounts; wichtig für
 * Bestandsaccounts ohne `password_hash`.
 *
 * UI bewusst minimal (kein Design): nur der Button und ein knapper Status.
 */

import { useState } from "react";

type Status =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "success" }
  | { kind: "error"; message: string };

export function SendPasswordLinkButton({ email }: { email: string }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onClick() {
    if (status.kind === "pending") return;
    setStatus({ kind: "pending" });
    try {
      const res = await fetch("/api/auth/request-password-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        // Sollte praktisch nie auftreten — die API antwortet immer 200.
        // Defensiv trotzdem als Fehler anzeigen.
        setStatus({
          kind: "error",
          message: "Versand fehlgeschlagen. Bitte später erneut versuchen.",
        });
        return;
      }
      setStatus({ kind: "success" });
    } catch {
      setStatus({
        kind: "error",
        message: "Versand fehlgeschlagen. Bitte später erneut versuchen.",
      });
    }
  }

  return (
    <span style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center" }}>
      <button
        type="button"
        onClick={onClick}
        disabled={status.kind === "pending"}
        data-send-password-link={email}
      >
        {status.kind === "pending" ? "Sende…" : "Passwort-Link senden"}
      </button>
      {status.kind === "success" ? (
        <span data-send-password-link-success={email}>
          Passwort-Link wurde versendet.
        </span>
      ) : null}
      {status.kind === "error" ? (
        <span
          role="alert"
          data-send-password-link-error={email}
          style={{ color: "#a00" }}
        >
          {status.message}
        </span>
      ) : null}
    </span>
  );
}
