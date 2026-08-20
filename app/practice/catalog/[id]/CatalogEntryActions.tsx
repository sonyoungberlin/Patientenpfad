"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  entryId: string;
  isActive: boolean;
}

export default function CatalogEntryActions({ entryId, isActive }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStartRevision() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/practice-catalog/${entryId}/start-revision`, {
        method: "POST",
      });
      const data = await res.json() as { ok: boolean; sessionId?: string; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Fehler beim Starten der Revision.");
        return;
      }
      router.push(`/workflow-cases/${data.sessionId}/protocol`);
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleActive() {
    setBusy(true);
    setError(null);
    const action = isActive ? "deactivate" : "reactivate";
    try {
      const res = await fetch(`/api/practice-catalog/${entryId}/${action}`, {
        method: "PATCH",
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Fehler.");
        return;
      }
      router.refresh();
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-end" }}>
      <button
        type="button"
        onClick={() => void handleStartRevision()}
        disabled={busy}
        style={{ fontWeight: 600 }}
      >
        Neue Version erstellen
      </button>
      <button
        type="button"
        onClick={() => void handleToggleActive()}
        disabled={busy}
        style={{ fontSize: "0.85rem" }}
      >
        {isActive ? "Deaktivieren" : "Reaktivieren"}
      </button>
      {error && <p style={{ color: "red", margin: 0, fontSize: "0.85rem" }}>{error}</p>}
    </div>
  );
}
