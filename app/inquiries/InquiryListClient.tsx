"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type InquiryListItem = {
  id: string;
  /** Vom Nutzer vergebener Vorlagenname (z. B. „Neupatient"). */
  templateName: string;
  /** Anzeigetext der enthaltenen Anliegen, kommagetrennt. */
  labels: string;
  dateLabel: string;
};

export default function InquiryListClient({
  templates,
}: {
  templates: InquiryListItem[];
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [usingId, setUsingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  function closeDialog() {
    setPendingDeleteId(null);
  }

  function handleOverlayKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") closeDialog();
  }

  async function executeDelete(templateId: string) {
    setDeletingId(templateId);
    setPendingDeleteId(null);
    try {
      const res = await fetch(`/api/inquiries/${templateId}`, { method: "DELETE" });
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

  async function useTemplate(templateId: string) {
    setUsingId(templateId);
    try {
      const res = await fetch(
        `/api/inquiries/templates/${templateId}/instantiate`,
        { method: "POST" },
      );
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok || typeof body.inquiryId !== "string") {
        const msg = body?.error ?? "Vorlage konnte nicht verwendet werden.";
        alert(msg);
        return;
      }
      // Vorlage = gespeicherter Zustand bis zur M3-Arbeitsansicht.
      // Die Vorauswahlen (selected_inquiry_ids, section_snapshot,
      // checkpoint_/action_/explanation_output_statuses,
      // communication_reason_selection, response_goal_selection) wurden
      // bereits in /api/inquiries/templates/[id]/instantiate kopiert,
      // daher direkt nach M3 navigieren – M1/M2 müssen nicht erneut
      // durchgeklickt werden, M3 bleibt voll bearbeitbar.
      router.push(`/inquiries/${body.inquiryId}/m3`);
    } catch {
      alert("Netzwerkfehler beim Öffnen der Vorlage.");
    } finally {
      setUsingId(null);
    }
  }

  if (templates.length === 0) {
    return <p className="text-muted">Keine Vorlagen vorhanden.</p>;
  }

  return (
    <>
      <div style={{ display: "grid", gap: "0.75rem" }}>
        {templates.map((t) => (
          <article
            key={t.id}
            className="card"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <div>
              <div style={{ fontWeight: 500 }}>{t.templateName}</div>
              {t.labels && (
                <div className="text-muted text-small" style={{ marginTop: "0.25rem" }}>
                  {t.labels}
                </div>
              )}
              <div className="text-muted text-small" style={{ marginTop: "0.25rem" }}>
                Gespeichert: {t.dateLabel}
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <button
                type="button"
                aria-label={`Vorlage verwenden: ${t.templateName}`}
                disabled={usingId === t.id}
                onClick={() => void useTemplate(t.id)}
                style={{
                  whiteSpace: "nowrap",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "0.5rem 1rem",
                  background: "var(--background)",
                  color: "var(--foreground)",
                  fontWeight: 500,
                  fontSize: "1rem",
                  cursor: usingId === t.id ? "not-allowed" : "pointer",
                  opacity: usingId === t.id ? 0.5 : 1,
                }}
              >
                {usingId === t.id ? "Wird geöffnet…" : "Verwenden"}
              </button>
              <button
                type="button"
                aria-label={`Löschen: ${t.templateName}`}
                disabled={deletingId === t.id}
                onClick={() => setPendingDeleteId(t.id)}
                style={{
                  whiteSpace: "nowrap",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "0.5rem 1rem",
                  background: "var(--background)",
                  color: "var(--destructive)",
                  fontWeight: 500,
                  fontSize: "0.875rem",
                  cursor: deletingId === t.id ? "not-allowed" : "pointer",
                  opacity: deletingId === t.id ? 0.5 : 1,
                }}
              >
                {deletingId === t.id ? "Löschen…" : "Löschen"}
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
              Diese Vorlage wirklich löschen?
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
