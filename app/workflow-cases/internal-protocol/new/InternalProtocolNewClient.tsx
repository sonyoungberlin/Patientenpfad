"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InternalProtocolNewClient() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/workflow-cases/internal-protocol/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId: "patienten-ohne-termin" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !(data as { ok?: boolean }).ok) {
        setError((data as { error?: string }).error ?? "Erstellen fehlgeschlagen.");
        return;
      }
      const sessionId = (data as { id?: string }).id;
      if (!sessionId) {
        setError("Keine Session-ID erhalten.");
        return;
      }
      router.push(`/workflow-cases/${sessionId}/protocol`);
    } catch {
      setError("Netzwerkfehler beim Erstellen der Sitzung.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <article
      className="card"
      style={{ display: "grid", gap: "0.75rem", maxWidth: "36rem" }}
    >
      <h2 style={{ margin: 0 }}>Patienten ohne Termin</h2>
      <p className="text-muted" style={{ margin: 0 }}>
        Praxisinternes Regelungsdokument erstellen: Wie geht die Praxis strukturiert
        mit Patienten ohne Termin um? Zuständigkeiten, Standardabläufe, Ausnahmen
        und Dokumentation gemeinsam festlegen.
      </p>
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={creating}
        >
          {creating ? "Sitzung wird erstellt…" : "Sitzung starten"}
        </button>
      </div>
      {error && (
        <p className="text-muted" style={{ margin: 0, color: "#c00" }}>
          {error}
        </p>
      )}
    </article>
  );
}
