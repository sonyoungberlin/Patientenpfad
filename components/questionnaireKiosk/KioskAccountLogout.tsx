"use client";

import { useState } from "react";

export function KioskAccountLogout() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Abmeldung fehlgeschlagen.");
      window.location.replace("/login");
    } catch {
      setError("Abmeldung fehlgeschlagen. Bitte erneut versuchen.");
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
      <div>
        <button type="button" onClick={logout} disabled={loading}>
          {loading ? "Wird abgemeldet …" : "Abmelden"}
        </button>
        {error ? <p role="alert">{error}</p> : null}
      </div>
    </div>
  );
}
