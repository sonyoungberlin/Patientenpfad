"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type BlockChoice = {
  id: string;
  label: string;
};

type Props = {
  applicationId: string;
  submitterName: string;
  /** Angezeigte Rollen (Labels, bereits aufgelöst). */
  roleLabels: string[];
  concernText?: string | null;
  initialSelectedBlockIds: string[];
  blocks: BlockChoice[];
  isSent?: boolean;
  isRejected?: boolean;
  canDelete?: boolean;
};

export function OfficeApplicationDetailClient({
  applicationId,
  submitterName,
  roleLabels,
  concernText,
  initialSelectedBlockIds,
  blocks,
  isSent = false,
  isRejected: isRejectedProp = false,
  canDelete = false,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const id of initialSelectedBlockIds) init[id] = true;
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const [rejecting, setRejecting] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [rejected, setRejected] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isRejected = isRejectedProp || rejected;
  const isReadOnly = isSent || sent || isRejected;

  function toggleBlock(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
    setSaved(false);
  }

  const currentSelectedBlockIds = blocks
    .map((b) => b.id)
    .filter((id) => selected[id]);

  // Bewerbungsanfragen benötigen keine patient_reference — min. 1 Block reicht.
  const canSend = !isReadOnly && currentSelectedBlockIds.length > 0;

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const res = await fetch(`/api/office-cases/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selected_block_ids: currentSelectedBlockIds,
          status: "in_review",
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        setSaved(true);
      } else {
        setError(data.error ?? "Fehler beim Speichern.");
      }
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSend() {
    setSending(true);
    setSendError(null);

    try {
      // 1. Aktuellen Stand speichern.
      const patchRes = await fetch(
        `/api/office-cases/applications/${applicationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selected_block_ids: currentSelectedBlockIds,
            status: "in_review",
          }),
        },
      );
      const patchData = (await patchRes.json()) as {
        ok: boolean;
        error?: string;
      };
      if (!patchData.ok) {
        setSendError(patchData.error ?? "Fehler beim Speichern.");
        setSending(false);
        return;
      }

      // 2. Fragebogen-Link erzeugen und per Mail senden.
      const processRes = await fetch(
        `/api/office-cases/applications/${applicationId}/process`,
        { method: "POST" },
      );
      const processData = (await processRes.json()) as {
        ok: boolean;
        error?: string;
      };
      if (processData.ok) {
        setSent(true);
      } else {
        setSendError(processData.error ?? "Fehler beim Versand.");
      }
    } catch {
      setSendError("Netzwerkfehler.");
    } finally {
      setSending(false);
    }
  }

  async function handleReject() {
    setRejecting(true);
    setRejectError(null);

    try {
      const res = await fetch(
        `/api/office-cases/applications/${applicationId}/reject`,
        { method: "POST" },
      );
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        setRejected(true);
      } else {
        setRejectError(data.error ?? "Fehler beim Ablehnen.");
      }
    } catch {
      setRejectError("Netzwerkfehler.");
    } finally {
      setRejecting(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Bewerbungsanfrage wirklich löschen?")) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(
        `/api/office-cases/applications/${applicationId}`,
        { method: "DELETE" },
      );
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        router.push("/office-cases/applications");
      } else {
        setDeleteError(data.error ?? "Fehler beim Löschen.");
      }
    } catch {
      setDeleteError("Netzwerkfehler.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      {isReadOnly && !isRejected && (
        <p className="text-sm text-gray-500" data-testid="form-readonly-notice">
          Das Formular ist schreibgeschützt, da der Fragebogen bereits versendet wurde.
        </p>
      )}

      {isRejected && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          data-testid="reject-notice"
        >
          <p className="font-medium">Bewerbung wurde abgelehnt.</p>
          <p className="mt-1 text-red-700">
            Der Bewerber wurde per E-Mail benachrichtigt.
          </p>
        </div>
      )}

      {sent && (
        <div
          className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
          data-testid="send-success-notice"
        >
          <p className="font-medium">Fragebogen wurde versendet.</p>
        </div>
      )}

      {/* Bewerber-Info */}
      <div className="space-y-1 text-sm">
        <p>
          <span className="font-medium">Bewerber:</span> {submitterName}
        </p>
        <p>
          <span className="font-medium">Bewirbt sich als:</span>{" "}
          {roleLabels.join(", ")}
        </p>
        {concernText && (
          <p>
            <span className="font-medium">Nachricht:</span>{" "}
            <span className="whitespace-pre-wrap">{concernText}</span>
          </p>
        )}
      </div>

      {/* Block-Auswahl */}
      <fieldset
        disabled={isReadOnly}
        style={{ margin: "1.5rem 0", padding: 0, border: "none" }}
      >
        <legend style={{ marginBottom: "0.75rem", fontWeight: 500 }}>
          Fragebogen-Blöcke
        </legend>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {blocks.map((b) => (
            <label
              key={b.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
                cursor: isReadOnly ? "not-allowed" : "pointer",
                color: isReadOnly ? "#9ca3af" : undefined,
                fontWeight: 400,
              }}
              data-block-choice={b.id}
            >
              <input
                type="checkbox"
                checked={!!selected[b.id]}
                onChange={() => {
                  if (!isReadOnly) toggleBlock(b.id);
                }}
                disabled={isReadOnly}
                style={{
                  marginTop: "0.2rem",
                  flexShrink: 0,
                  width: "1rem",
                  height: "1rem",
                }}
              />
              <span>{b.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Buttons — nur wenn nicht schreibgeschützt */}
      {!isReadOnly && (
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || sending}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Speichert…" : "Auswahl speichern"}
            </button>
            {saved && (
              <span className="text-sm text-green-600" role="status">
                Gespeichert.
              </span>
            )}
            {error && (
              <span className="text-sm text-red-600" role="alert">
                {error}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend || sending || saving}
              data-testid="send-questionnaire-btn"
              className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {sending ? "Wird versendet…" : "Fragebogen senden"}
            </button>
            {sendError && (
              <span
                className="text-sm text-red-600"
                role="alert"
                data-testid="send-error"
              >
                {sendError}
              </span>
            )}
          </div>
        </div>
      )}

      {!isSent && !isRejected && !sent && (
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleReject}
            disabled={rejecting || deleting || saving || sending}
            data-testid="reject-btn"
            className="rounded border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {rejecting ? "Wird abgelehnt…" : "Bewerbung ablehnen"}
          </button>
          {rejectError && (
            <span
              className="text-sm text-red-600"
              role="alert"
              data-testid="reject-error"
            >
              {rejectError}
            </span>
          )}
        </div>
      )}

      {canDelete && !isSent && (
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || rejecting || sending || saving}
            data-testid="delete-btn"
            className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            {deleting ? "Wird gelöscht…" : "Löschen"}
          </button>
          {deleteError && (
            <span
              className="text-sm text-red-600"
              role="alert"
              data-testid="delete-error"
            >
              {deleteError}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
