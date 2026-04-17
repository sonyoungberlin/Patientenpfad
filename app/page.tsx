"use client";

import { useState } from "react";

type Block = {
  block_title?: string;
  block_status?: string;
  active_checkpoint_count?: number;
};

type CaseResult = {
  case_id: string;
  stage_status: string;
  blocks: Block[];
};

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<CaseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function reloadBlocks(caseId: string) {
    const getRes = await fetch(`/api/cases/${caseId}`);
    const getData = await getRes.json();
    const anchor = getData?.case?.block_status_anchor;
    const blocks: Block[] = Array.isArray(anchor) ? anchor : [];
    setResult((prev) =>
      prev ? { ...prev, blocks } : null
    );
  }

  async function handleSetGeklaert() {
    if (!result) return;
    setError(null);
    try {
      const res = await fetch(`/api/cases/${result.case_id}/block/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          block_id: "communication",
          block_status: "GEKLAERT",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Unbekannter Fehler");
        return;
      }
      await reloadBlocks(result.case_id);
    } catch {
      setError("Netzwerkfehler");
    }
  }

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
        return;
      }

      const caseId: string = data.case_id;

      setResult({ case_id: caseId, stage_status: data.stage_status, blocks: [] });
      await reloadBlocks(caseId);
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
        <div style={{ marginTop: "1rem" }}>
          <p style={{ margin: 0 }}>
            <strong>case_id:</strong> {result.case_id}
            <br />
            <strong>stage_status:</strong> {result.stage_status}
          </p>
          {result.blocks.length > 0 && (
            <ul style={{ marginTop: "0.5rem", paddingLeft: "1.2rem" }}>
              {result.blocks.map((b, i) => (
                <li key={i}>
                  {b.block_title ?? "–"} · {b.block_status ?? "–"} ·{" "}
                  {b.active_checkpoint_count ?? 0} Checkpoints
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={handleSetGeklaert}
            style={{ marginTop: "0.75rem" }}
          >
            Kommunikation auf GEKLAERT setzen
          </button>
        </div>
      )}
      {error && (
        <p style={{ marginTop: "1rem", color: "red" }}>Fehler: {error}</p>
      )}
    </main>
  );
}
