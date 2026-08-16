"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DRAFT_SNAPSHOT_KEY,
  DRAFT_SOURCE_ID_KEY,
  DRAFT_SOURCE_TITLE_KEY,
} from "@/lib/workflow/internalProtocol/workflowSnapshotUpdater";

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
};

export default function WorkflowCasesListClient({ items: initialItems }: { items: SessionItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      setItems((prev) => prev.filter((item) => item.id !== id));
      router.refresh();
    } catch {
      alert("Netzwerkfehler beim Löschen.");
    } finally {
      setDeletingId(null);
    }
  }

  function handleWeiterbearbeiten(item: SessionItem) {
    if (!item.snapshotJson) return;
    sessionStorage.setItem(DRAFT_SNAPSHOT_KEY, item.snapshotJson);
    sessionStorage.setItem(DRAFT_SOURCE_ID_KEY, item.id);
    if (item.title) sessionStorage.setItem(DRAFT_SOURCE_TITLE_KEY, item.title);
    else sessionStorage.removeItem(DRAFT_SOURCE_TITLE_KEY);
    router.push("/workflow-cases/internal-protocol/draft/m3");
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
                {item.kind === "practice-workflow" && item.snapshotJson && (
                  <button
                    type="button"
                    onClick={() => handleWeiterbearbeiten(item)}
                  >
                    Weiterbearbeiten
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleDelete(item.id, item.title)}
                  disabled={deletingId === item.id}
                >
                  {deletingId === item.id ? "Löscht…" : "Löschen"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
