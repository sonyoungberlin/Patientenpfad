"use client";

import { useState } from "react";

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{
    case_id: string;
    stage_status: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/cases/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Unbekannter Fehler");
      } else {
        setResult({ case_id: data.case_id, stage_status: data.stage_status });
      }
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Neuen Fall anlegen</h1>
      <div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Query (optional)"
          style={{ marginRight: "0.5rem", padding: "0.4rem", width: "300px" }}
        />
        <button onClick={handleCreate} disabled={loading}>
          {loading ? "Lädt…" : "Fall anlegen"}
        </button>
      </div>
      {result && (
        <p style={{ marginTop: "1rem" }}>
          <strong>case_id:</strong> {result.case_id}
          <br />
          <strong>stage_status:</strong> {result.stage_status}
        </p>
      )}
      {error && (
        <p style={{ marginTop: "1rem", color: "red" }}>Fehler: {error}</p>
      )}
    </main>
  );
}
