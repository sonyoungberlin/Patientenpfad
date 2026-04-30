"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export type InquiryListItem = {
  id: string;
  labels: string;
  dateLabel: string;
  statusLabel: string;
};

export default function InquiryListClient({ sessions }: { sessions: InquiryListItem[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  function closeDialog() {
    setPendingDeleteId(null);
  }

  function handleOverlayKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") closeDialog();
  }

  async function executeDelete(sessionId: string) {
    setDeletingId(sessionId);
    setPendingDeleteId(null);
    try {
      const res = await fetch(`/api/inquiries/${sessionId}`, { method: "DELETE" });
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

  if (sessions.length === 0) {
    return <p className="text-muted">Keine Anfragen vorhanden.</p>;
  }

  return (
    <>
      <div style={{ display: "grid", gap: "0.75rem" }}>
        {sessions.map((s) => (
          <article
            key={s.id}
            className="card"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <div>
              <div style={{ fontWeight: 500 }}>{s.labels || "Anfrage"}</div>
              <div className="text-muted text-small" style={{ marginTop: "0.25rem" }}>
                {s.dateLabel}
              </div>
              <div style={{ marginTop: "0.3rem" }}>Status: {s.statusLabel}</div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <Link
                href={`/inquiries/${s.id}`}
                aria-label={`Öffnen: ${s.labels || "Anfrage"}`}
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
                Öffnen
              </Link>
              <button
                type="button"
                aria-label={`Löschen: ${s.labels || "Anfrage"}`}
                disabled={deletingId === s.id}
                onClick={() => setPendingDeleteId(s.id)}
                style={{
                  whiteSpace: "nowrap",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "0.5rem 1rem",
                  background: "var(--background)",
                  color: "var(--destructive)",
                  fontWeight: 500,
                  fontSize: "0.875rem",
                  cursor: deletingId === s.id ? "not-allowed" : "pointer",
                  opacity: deletingId === s.id ? 0.5 : 1,
                }}
              >
                {deletingId === s.id ? "Löschen…" : "Löschen"}
              </button>
            </div>
          </article>
        ))}
      </div>

      {pendingDeleteId && (
        <div
          className="modal-overlay"
          onClick={closeDialog}
          onKeyDown={handleOverlayKeyDown}
          role="presentation"
        >
          <div
            className="modal-box card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inquiry-delete-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <p
              id="inquiry-delete-dialog-title"
              style={{ fontWeight: 500, marginBottom: "0.5rem" }}
            >
              Diese Anfrage wirklich löschen?
            </p>
            <p className="text-muted text-small" style={{ marginBottom: "1.5rem" }}>
              Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                aria-label="Löschen abbrechen"
                onClick={closeDialog}
              >
                Abbrechen
              </button>
              <button
                type="button"
                className="btn-destructive"
                onClick={() => void executeDelete(pendingDeleteId)}
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
