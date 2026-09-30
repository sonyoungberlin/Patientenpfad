"use client";

import Link from "next/link";
import { useState } from "react";
import type { PracticeCheckpoint } from "@/lib/practiceProcesses";
import type { PracticeCheckpointDefinitionRecord } from "@/lib/practiceProcesses/practiceDefinition";

type SaveState = "idle" | "saving" | "saved" | "error";

export default function PracticeDefinitionEditor({
  checkpoint,
  initialDefinition,
}: {
  checkpoint: PracticeCheckpoint;
  initialDefinition: PracticeCheckpointDefinitionRecord | null;
}) {
  const [selectedAnchorIds, setSelectedAnchorIds] = useState(initialDefinition?.selectedAnchorIds ?? []);
  const [implementation, setImplementation] = useState(initialDefinition?.implementation ?? "");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  function toggleAnchor(id: string) {
    setSelectedAnchorIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
    setSaveState("idle");
  }

  async function save() {
    setSaveState("saving");
    setError(null);
    const response = await fetch(`/api/practice-checkpoint-definitions/${checkpoint.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedAnchorIds, implementation }),
    });
    const data = await response.json() as { ok?: boolean; error?: string };
    if (!response.ok || !data.ok) {
      setSaveState("error");
      setError(data.error ?? "Definition konnte nicht gespeichert werden.");
      return;
    }
    setImplementation((value) => value.trim());
    setSaveState("saved");
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "54rem", margin: "0 auto", display: "grid", gap: "1.25rem" }}>
      <header>
        <Link href="/practice/checkpoint-definitions" className="text-small text-muted">← Praxisdefinitionen</Link>
        <h1 style={{ marginBottom: "0.25rem" }}>{checkpoint.title}</h1>
        <p className="text-muted" style={{ margin: 0 }}>{checkpoint.description}</p>
      </header>

      <section className="card" style={{ padding: "1rem", display: "grid", gap: "0.75rem" }}>
        <h2 style={{ margin: 0 }}>Praxisstandard</h2>
        <label>
          Wie setzt die Praxis diesen Checkpoint konkret um?
          <textarea
            value={implementation}
            onChange={(event) => { setImplementation(event.target.value); setSaveState("idle"); }}
            rows={5}
            style={{ width: "100%", boxSizing: "border-box", font: "inherit", padding: "0.5rem" }}
            placeholder="Eine konkrete Beschreibung der Umsetzung"
          />
        </label>
      </section>

      <section className="card" style={{ padding: "1rem", display: "grid", gap: "0.6rem" }}>
        <h2 style={{ margin: 0 }}>Orientierungsanker</h2>
        <p className="text-small text-muted" style={{ margin: 0 }}>Die Auswahl darf leer sein. Neue Anchors erscheinen automatisch als unselektierte Optionen.</p>
        {(checkpoint.orientationAnchors ?? []).map((anchor) => (
          <label key={anchor.id} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
            <input type="checkbox" checked={selectedAnchorIds.includes(anchor.id)} onChange={() => toggleAnchor(anchor.id)} />
            <span>{anchor.text}</span>
          </label>
        ))}
      </section>

      {error && <p role="alert" style={{ color: "#a00" }}>{error}</p>}
      <footer style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <button type="button" onClick={() => void save()} disabled={saveState === "saving"}>
          {saveState === "saving" ? "Speichern…" : "Praxisstandard speichern"}
        </button>
        {saveState === "saved" && <span className="text-small text-muted">Gespeichert.</span>}
      </footer>
    </main>
  );
}
