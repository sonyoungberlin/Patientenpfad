"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export type CaseListItem = {
  id: string;
  title: string;
  patient_reference: string | null;
  statusLabel: string;
};

export default function CaseListClient({ cases }: { cases: CaseListItem[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(caseId: string) {
    if (!window.confirm("Diesen Fall aus der Liste entfernen?")) return;

    setDeletingId(caseId);
    try {
      const res = await fetch(`/api/cases/${caseId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const msg = body?.error ?? "Löschen fehlgeschlagen.";
        alert(msg);
        return;
      }
      router.refresh();
    } catch {
      alert("Netzwerkfehler beim Löschen.");
    } finally {
      setDeletingId(null);
    }
  }

  if (cases.length === 0) {
    return <p className="text-muted">Keine Fälle vorhanden.</p>;
  }

  return (
    <>
      {cases.map((c) => (
        <article
          key={c.id}
          className="card"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div>
            <div style={{ fontWeight: 500 }}>{c.title}</div>
            {c.patient_reference ? (
              <div className="text-muted text-small" style={{ marginTop: "0.25rem" }}>
                Patienten-Referenz: {c.patient_reference}
              </div>
            ) : null}
            <div style={{ marginTop: "0.3rem" }}>Status: {c.statusLabel}</div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <Link
              href={`/cases/${c.id}`}
              aria-label={`Weiterbearbeiten: ${c.title}`}
              style={{
                whiteSpace: "nowrap",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "0.5rem 1rem",
                textDecoration: "none",
                color: "var(--foreground)",
                background: "var(--background)",
                fontWeight: 500,
                fontSize: "1rem",
              }}
            >
              Weiterbearbeiten
            </Link>
            <button
              type="button"
              aria-label={`Aus Liste entfernen: ${c.title}`}
              disabled={deletingId === c.id}
              onClick={() => void handleDelete(c.id)}
              style={{
                whiteSpace: "nowrap",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "0.5rem 1rem",
                background: "var(--background)",
                color: "var(--destructive)",
                fontWeight: 500,
                fontSize: "0.875rem",
                cursor: deletingId === c.id ? "not-allowed" : "pointer",
                opacity: deletingId === c.id ? 0.5 : 1,
              }}
            >
              {deletingId === c.id ? "Entfernen…" : "Aus Liste entfernen"}
            </button>
          </div>
        </article>
      ))}
    </>
  );
}
