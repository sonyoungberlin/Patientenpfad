"use client";

import { useState } from "react";
import type { M1BlockStatus, M1Selection } from "@/lib/types";

const INITIAL_SELECTION: M1Selection = {
  kommunikation: "unklar",
  medizinische_lage: "unklar",
  versorgung_im_alltag: "unklar",
};

const BLOCK_LABELS: Record<keyof M1Selection, string> = {
  kommunikation: "Kommunikation",
  medizinische_lage: "Medizinische Lage",
  versorgung_im_alltag: "Versorgung im Alltag",
};

type CaseResult = {
  case_id: string;
  stage_status: string;
  m1_snapshot_initial?: {
    blocks: M1Selection;
    activated_checkpoint_ids: string[];
  };
};

export default function HomePage() {
  const [selection, setSelection] = useState<M1Selection>(INITIAL_SELECTION);
  const [result, setResult] = useState<CaseResult | null>(null);
  const [gatekeeper, setGatekeeper] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleBlockChange(blockId: keyof M1Selection, value: M1BlockStatus) {
    setSelection((prev) => ({ ...prev, [blockId]: value }));
  }

  async function handleCreate() {
    setLoading(true);
    setResult(null);
    setGatekeeper(false);
    setError(null);
    try {
      const res = await fetch("/api/cases/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ m1Selection: selection }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Unbekannter Fehler");
        return;
      }
      if (data.gatekeeper) {
        setGatekeeper(true);
        return;
      }
      setResult({
        case_id: data.case_id,
        stage_status: data.stage_status,
        m1_snapshot_initial: data.m1_snapshot_initial,
      });
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Was ist aktuell unklar oder klärungsbedürftig?</h1>
      <p style={{ color: "#555", marginBottom: "1.5rem" }}>
        Nur bei <strong>unklar</strong> wird ein Strukturfall mit Checkpoints gestartet.
      </p>
      <div>
        {(Object.keys(BLOCK_LABELS) as (keyof M1Selection)[]).map((blockId) => (
          <div key={blockId} style={{ marginBottom: "1rem" }}>
            <strong>{BLOCK_LABELS[blockId]}</strong>
            <div style={{ marginTop: "0.3rem" }}>
              {(["klar", "unklar"] as M1BlockStatus[]).map((val) => (
                <label
                  key={val}
                  style={{ marginRight: "1.5rem", cursor: "pointer" }}
                >
                  <input
                    type="radio"
                    name={blockId}
                    value={val}
                    checked={selection[blockId] === val}
                    onChange={() => handleBlockChange(blockId, val)}
                    style={{ marginRight: "0.3rem" }}
                  />
                  {val}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={handleCreate}
        disabled={loading}
        style={{ marginTop: "1rem" }}
      >
        {loading ? "Lädt…" : "Fall anlegen"}
      </button>

      {gatekeeper && (
        <div style={{ marginTop: "1.5rem", color: "#666" }}>
          <strong>Kein Strukturfall erforderlich.</strong> Alle Bereiche sind
          geklärt – es werden keine Checkpoints gestartet.
        </div>
      )}

      {result && (
        <div style={{ marginTop: "1.5rem" }}>
          <p style={{ margin: 0 }}>
            <strong>case_id:</strong> {result.case_id}
            <br />
            <strong>stage_status:</strong> {result.stage_status}
          </p>
          {result.m1_snapshot_initial && (
            <div style={{ marginTop: "0.75rem" }}>
              <strong>Aktivierte Checkpoints:</strong>{" "}
              {result.m1_snapshot_initial.activated_checkpoint_ids.length > 0
                ? result.m1_snapshot_initial.activated_checkpoint_ids.join(", ")
                : "–"}
            </div>
          )}
        </div>
      )}

      {error && (
        <p style={{ marginTop: "1rem", color: "red" }}>Fehler: {error}</p>
      )}
    </main>
  );
}
