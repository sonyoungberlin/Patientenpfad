"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ChainCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function create() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/practice-chains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await response.json() as { ok?: boolean; chain?: { id: string }; error?: string };
      if (!response.ok || !data.ok || !data.chain) {
        setError(data.error ?? "Kette konnte nicht angelegt werden.");
        return;
      }
      router.push(`/practice/chains/${data.chain.id}`);
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card" style={{ padding: "1rem 1.25rem", display: "grid", gap: "0.75rem" }}>
      <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Neue Kette</h2>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name der Kette" style={{ flex: "1 1 18rem" }} />
        <button type="button" onClick={() => void create()} disabled={saving || !name.trim()}>
          Entwurf anlegen
        </button>
      </div>
      {error && <p style={{ color: "#a00", margin: 0 }}>{error}</p>}
    </section>
  );
}