"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OfficeTopic } from "@/lib/office/checkpointCatalog";

type Props = {
  topics: readonly OfficeTopic[];
};

export default function OfficeCaseNewClient({ topics }: Props) {
  const router = useRouter();
  const [topicId, setTopicId] = useState<string>(topics[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!topicId) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/office-cases/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId,
          title: title.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Officefall konnte nicht angelegt werden.");
        return;
      }

      router.push(`/office-cases/${data.office_case.id}/m2`);
      router.refresh();
    } catch {
      setError("Netzwerkfehler beim Anlegen des Officefalls.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="card" style={{ display: "grid", gap: "0.75rem", maxWidth: "42rem" }}>
      <label style={{ display: "grid", gap: "0.25rem" }}>
        <span>Thema</span>
        <select value={topicId} onChange={(e) => setTopicId(e.target.value)}>
          {topics.map((topic) => (
            <option key={topic.id} value={topic.id}>
              {topic.title}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "grid", gap: "0.25rem" }}>
        <span>Titel optional</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} type="text" />
      </label>
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <button type="button" onClick={() => void handleCreate()} disabled={pending}>
          {pending ? "Wird erstellt…" : "Officefall erstellen"}
        </button>
        {error ? <span className="text-muted">{error}</span> : null}
      </div>
    </section>
  );
}
