"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type SessionItem = {
  id: string;
  createdAt: string;
  updatedAt?: string;
  title: string | null;
  topicTitle: string | null;
  role: string | null;
  pointCount: number;
  href?: string | null;
  kind?: string;
  sessionStatus?: string;
  snapshotJson?: string;
  profileId?: string;
  workingSessionId?: string | null;
};

export default function WorkflowCasesListClient({ items: initialItems }: { items: SessionItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  async function handleDelete(id: string, title: string | null) {
    const label = title ? `"${title}"` : "diese Sitzung";
    if (!window.confirm(`${label} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/workflow-cases/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !(data as { ok?: boolean }).ok) {
        alert((data as { error?: string }).error ?? "Löschen fehlgeschlagen.");
        return;
      }
      setItems((prev) =>
        prev.filter((item) => item.id !== id && item.workingSessionId !== id),
      );
      router.refresh();
    } catch {
      alert("Netzwerkfehler beim Löschen.");
    } finally {
      setDeletingId(null);
    }
  }

  function handleWeiterbearbeiten(item: SessionItem) {
    const sessionId = item.workingSessionId ?? item.id;
    router.push(`/workflow-cases/internal-protocol/draft/resume?sessionId=${encodeURIComponent(sessionId)}`);
  }

  async function handlePracticeCase(item: SessionItem) {
    if (item.workingSessionId || !item.profileId) {
      handleWeiterbearbeiten(item);
      return;
    }
    const response = await fetch("/api/workflow-cases/internal-protocol/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseProfileId: item.profileId }),
    });
    const data = (await response.json()) as { ok?: boolean; sessionId?: string; error?: string };
    if (!response.ok || !data.ok || !data.sessionId) {
      alert(data.error ?? "Praxisfall konnte nicht gestartet werden.");
      return;
    }
    router.push(`/workflow-cases/internal-protocol/draft/m2?sessionId=${encodeURIComponent(data.sessionId)}`);
  }

  if (items.length === 0) {
    return <p className="text-muted">Noch keine Sitzungen gespeichert.</p>;
  }

  return (
    <section>
      <h2>Gespeicherte Sitzungen</h2>
      <table>
        <thead>
          <tr>
            <th>Datum</th>
            <th>Musterprozess</th>
            <th>Rolle</th>
            <th>Titel</th>
            <th>Status</th>
            <th>Punkte</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.updatedAt ?? item.createdAt}</td>
              <td>{item.topicTitle ?? "–"}</td>
              <td>{item.role ?? "–"}</td>
              <td>{item.title ?? "–"}</td>
              <td>{item.sessionStatus ?? "–"}</td>
              <td>{item.pointCount}</td>
              <td style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {item.href && (
                  <Link href={item.href}>
                    <button type="button">Öffnen</button>
                  </Link>
                )}
                {item.kind === "practice-workflow" && (
                  <button
                    type="button"
                    onClick={() => handleWeiterbearbeiten(item)}
                  >
                    Weiterbearbeiten
                  </button>
                )}
                {item.kind === "practice-case" && (
                  <button type="button" onClick={() => void handlePracticeCase(item)}>
                    {item.workingSessionId ? "Weiterbearbeiten" : "Bearbeiten"}
                  </button>
                )}
                {item.kind !== "practice-case" && <button
                  type="button"
                  onClick={() => void handleDelete(item.id, item.title)}
                  disabled={deletingId === item.id}
                >
                  {deletingId === item.id ? "Löscht…" : "Löschen"}
                </button>}
                {item.kind === "practice-case" && item.workingSessionId && (
                  <button
                    type="button"
                    onClick={() => void handleDelete(item.workingSessionId!, item.title)}
                    disabled={deletingId === item.workingSessionId}
                  >
                    {deletingId === item.workingSessionId ? "Löscht…" : "Verwerfen"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
