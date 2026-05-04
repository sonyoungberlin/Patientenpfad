"use client";

/**
 * Minimaler Client für `app/account/set-password/page.tsx`.
 *
 * Bewusst KEIN UI-Design — nur funktional:
 *   - Passwort-Feld (type="password")
 *   - Submit ruft `POST /api/auth/set-password` auf
 *   - bei Erfolg: Erfolgsmeldung
 *   - bei Fehler: Fehlertext aus der API anzeigen
 *
 * Klartext-Passwort verlässt den Browser nur per HTTPS-POST an die eigene
 * API; es wird nicht in den URL-Parametern, im DOM (außer dem Eingabefeld)
 * oder im Local-/Session-Storage abgelegt.
 */

import { useState } from "react";

const MIN_PASSWORD_LENGTH = 10;

export function SetPasswordFormClient({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <p data-set-password-success>
        Passwort gesetzt. Sie können sich jetzt anmelden.
      </p>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(
        `Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`,
      );
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Passwort konnte nicht gesetzt werden.");
        return;
      }
      setPassword("");
      setDone(true);
    } catch {
      setError("Netzwerkfehler. Bitte versuchen Sie es erneut.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} data-set-password-form>
      <label>
        Neues Passwort
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "Wird gesetzt…" : "Passwort setzen"}
      </button>
      {error ? <p data-set-password-error>{error}</p> : null}
    </form>
  );
}
