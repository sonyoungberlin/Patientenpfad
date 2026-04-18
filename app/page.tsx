"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CaseMode, M1BlockStatus, M1Selection } from "@/lib/types";
import { getCreateSuccessRedirectPath } from "@/lib/flow/caseNavigation";

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

type CaseListItem = {
  id: string;
  createdAt: string;
  mode: CaseMode;
  patient_reference: string | null;
  checkpoint_count: number;
};

export default function HomePage() {
  const router = useRouter();
  const [selection, setSelection] = useState<M1Selection>(INITIAL_SELECTION);
  const [mode, setMode] = useState<CaseMode>("guest");
  const [patientReference, setPatientReference] = useState("");
  const [gatekeeper, setGatekeeper] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [caseList, setCaseList] = useState<CaseListItem[] | null>(null);
  const [listLoading, setListLoading] = useState(false);

  function handleBlockChange(blockId: keyof M1Selection, value: M1BlockStatus) {
    setSelection((prev) => ({ ...prev, [blockId]: value }));
  }

  async function handleCreate() {
    setLoading(true);
    setGatekeeper(false);
    setError(null);
    try {
      const body: Record<string, unknown> = { m1Selection: selection, mode };
      if (mode === "practice" && patientReference.trim()) {
        body.patient_reference = patientReference.trim();
      }
      const res = await fetch("/api/cases/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
      const redirectPath = getCreateSuccessRedirectPath(data);
      if (redirectPath) {
        router.push(redirectPath);
      } else {
        setError("Fehlende Fall-ID");
      }
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadList() {
    setListLoading(true);
    try {
      const res = await fetch("/api/cases");
      const data = await res.json();
      if (data.ok) setCaseList(data.cases);
    } catch {
      // ignore
    } finally {
      setListLoading(false);
    }
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "600px" }}>
      <h1>Was ist aktuell unklar oder klärungsbedürftig?</h1>
      <p style={{ color: "#555", marginBottom: "1.5rem" }}>
        Nur bei <strong>unklar</strong> wird ein Strukturfall mit Checkpoints gestartet.
      </p>

      {/* Modus-Auswahl */}
      <div style={{ marginBottom: "1.5rem" }}>
        <strong>Modus</strong>
        <div style={{ marginTop: "0.4rem" }}>
          {(["guest", "practice"] as CaseMode[]).map((m) => (
            <label key={m} style={{ marginRight: "1.5rem", cursor: "pointer" }}>
              <input
                type="radio"
                name="mode"
                value={m}
                checked={mode === m}
                onChange={() => setMode(m)}
                style={{ marginRight: "0.3rem" }}
              />
              {m === "guest" ? "Als Gast starten" : "Mit Praxiszuordnung starten"}
            </label>
          ))}
        </div>
        {mode === "practice" && (
          <div style={{ marginTop: "0.6rem" }}>
            <label htmlFor="patient_reference">Patientennummer (optional)</label>
            <br />
            <input
              id="patient_reference"
              type="text"
              value={patientReference}
              onChange={(e) => setPatientReference(e.target.value)}
              placeholder="z. B. P-2024-001"
              style={{ marginTop: "0.3rem", padding: "0.3rem 0.5rem", width: "280px" }}
            />
          </div>
        )}
      </div>

      {/* M1-Blöcke */}
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

      {error && (
        <p style={{ marginTop: "1rem", color: "red" }}>Fehler: {error}</p>
      )}

      {/* Fallübersicht */}
      <div style={{ marginTop: "3rem", borderTop: "1px solid #ddd", paddingTop: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>Letzte Fälle</h2>
        <button onClick={handleLoadList} disabled={listLoading}>
          {listLoading ? "Lädt…" : "Fälle laden"}
        </button>
        {caseList !== null && (
          <table style={{ marginTop: "1rem", borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                <th style={{ paddingRight: "1rem" }}>Datum</th>
                <th style={{ paddingRight: "1rem" }}>Modus</th>
                <th style={{ paddingRight: "1rem" }}>Patientennr.</th>
                <th>Checkpoints</th>
              </tr>
            </thead>
            <tbody>
              {caseList.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ color: "#888", paddingTop: "0.5rem" }}>
                    Keine Fälle vorhanden.
                  </td>
                </tr>
              )}
              {caseList.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "0.4rem 1rem 0.4rem 0" }}>
                    {new Date(c.createdAt).toLocaleString("de-DE")}
                  </td>
                  <td style={{ paddingRight: "1rem" }}>
                    {c.mode === "practice" ? "Praxis" : "Gast"}
                  </td>
                  <td style={{ paddingRight: "1rem" }}>{c.patient_reference ?? "–"}</td>
                  <td>{c.checkpoint_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
