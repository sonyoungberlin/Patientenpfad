"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OfficeTopic } from "@/lib/office/checkpointCatalog";

export type OfficeCaseListItem = {
  id: string;
  createdAt: string;
  title: string | null;
  trigger_note: string | null;
  topicId: string | null;
  topicTitle: string | null;
  checkpointCount: number;
};

type Props = {
  topics: readonly OfficeTopic[];
  items: OfficeCaseListItem[];
};

export default function OfficeCasesClient({ topics, items }: Props) {
  const router = useRouter();
  const [topicId, setTopicId] = useState<string>(topics[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [triggerNote, setTriggerNote] = useState("");
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
          trigger_note: triggerNote.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Officefall konnte nicht angelegt werden.");
        return;
      }

      router.push(`/office-cases/${data.office_case.id}/m1`);
      router.refresh();
    } catch {
      setError("Netzwerkfehler beim Anlegen des Officefalls.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="card" style={{ display: "grid", gap: "1rem" }}>
      <div>
        <h2 style={{ marginTop: 0 }}>Neuen Officefall erstellen</h2>
        <div style={{ display: "grid", gap: "0.75rem", maxWidth: "42rem" }}>
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
          <label style={{ display: "grid", gap: "0.25rem" }}>
            <span>trigger_note optional</span>
            <textarea
              value={triggerNote}
              onChange={(e) => setTriggerNote(e.target.value)}
              rows={3}
            />
          </label>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button type="button" onClick={() => void handleCreate()} disabled={pending}>
              {pending ? "Wird erstellt…" : "Officefall erstellen"}
            </button>
            {error ? <span className="text-muted">{error}</span> : null}
          </div>
        </div>
      </div>

      <div>
        <h2 style={{ marginTop: 0 }}>Officefälle-Liste</h2>
        {items.length === 0 ? (
          <p className="text-muted" style={{ marginBottom: 0 }}>
            Noch keine Officefälle vorhanden.
          </p>
        ) : (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {items.map((item) => (
              <article key={item.id} className="card" style={{ display: "grid", gap: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                  <div>
                    <strong>{item.title ?? item.topicTitle ?? "Officefall"}</strong>
                    <div className="text-small text-muted">{item.topicTitle ?? "Thema unbekannt"}</div>
                  </div>
                  <a href={`/office-cases/${item.id}/m1`}>Öffnen</a>
                </div>
                {item.trigger_note ? (
                  <div className="text-small">{item.trigger_note}</div>
                ) : null}
                <div className="text-small text-muted">
                  {item.checkpointCount} Checkpoints · {new Date(item.createdAt).toLocaleDateString("de-DE")}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}