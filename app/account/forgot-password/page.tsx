"use client";

import { useState } from "react";

const GENERIC_MESSAGE =
  "Wenn für diese E-Mail-Adresse ein Konto existiert, wurde ein Link zum Zurücksetzen des Passworts versendet.";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const response = await fetch("/api/auth/request-password-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error("password_reset_request_failed");
    } catch {
      // Die Antwort bleibt absichtlich neutral: Weder Account-Existenz noch
      // Zustellstatus dürfen über die öffentliche UI erkennbar sein.
    } finally {
      setEmail("");
      setDone(true);
      setPending(false);
    }
  }

  return (
    <main>
      <h1>Passwort vergessen?</h1>
      {done ? (
        <p data-forgot-password-success>{GENERIC_MESSAGE}</p>
      ) : (
        <form onSubmit={onSubmit} data-forgot-password-form>
          <label>
            E-Mail-Adresse
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <button type="submit" disabled={pending}>
            {pending ? "Wird angefordert…" : "Passwort-Link anfordern"}
          </button>
        </form>
      )}
    </main>
  );
}
