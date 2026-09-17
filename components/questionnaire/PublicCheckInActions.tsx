"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BLOCK_CATALOG, BLOCK_IDS_SORTED } from "@/lib/questionnaire/blockCatalog";

export function PublicCheckInActions({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [selecting, setSelecting] = useState(false);
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(action: "close" | "start_questionnaire") {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/questionnaire/${sessionId}/public-handoff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...(action === "start_questionnaire" ? { selected_block_ids: selectedBlockIds } : {}) }),
      });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        setError(data?.error ?? "Aktion konnte nicht ausgeführt werden.");
        return;
      }
      router.refresh();
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section data-public-check-in-actions={sessionId} style={{ display: "grid", gap: "0.5rem" }}>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button type="button" disabled={pending} onClick={() => void submit("close")}>Vorgang beenden</button>
        <button type="button" disabled={pending} onClick={() => setSelecting(true)}>Folgefragebogen starten</button>
      </div>
      {selecting ? <div style={{ display: "grid", gap: "0.5rem" }}>
        <fieldset style={{ maxHeight: "16rem", overflow: "auto" }}>
          <legend>Folgefragebogen</legend>
          {BLOCK_IDS_SORTED.filter((id) => BLOCK_CATALOG[id].selectable !== false).map((id) => (
            <label key={id} style={{ display: "block" }}>
              <input type="checkbox" checked={selectedBlockIds.includes(id)} disabled={pending}
                onChange={(event) => setSelectedBlockIds((current) => event.target.checked
                  ? [...current, id] : current.filter((blockId) => blockId !== id))} />{" "}{BLOCK_CATALOG[id].label}
            </label>
          ))}
        </fieldset>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button type="button" disabled={pending} onClick={() => setSelecting(false)}>Abbrechen</button>
          <button type="button" className="btn-primary" disabled={pending || selectedBlockIds.length === 0}
            onClick={() => void submit("start_questionnaire")}>
            {pending ? "Wird bereitgestellt…" : "Bereitstellen"}
          </button>
        </div>
      </div> : null}
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}