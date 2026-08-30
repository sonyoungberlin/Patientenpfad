"use client";

/**
 * Interaktives Formular für die Detailseite einer DigitalRequest.
 *
 * - Textfeld: patient_reference
 * - Checkboxen: Fragebogen-Blöcke (aus BLOCK_CATALOG)
 * - "Auswahl speichern": PATCH /api/digital-requests/[id]
 * - "Fragebogen senden": PATCH + POST /api/digital-requests/[id]/process
 *   Voraussetzung: patient_reference vorhanden, ≥1 Block ausgewählt,
 *   status nicht sent/closed/rejected.
 * - "Digitale Anfrage ablehnen": POST /api/digital-requests/[id]/reject
 *   Sendet Standard-Ablehnungsmail, setzt Status auf rejected.
 * - "Löschen": DELETE /api/digital-requests/[id]
 *   Hard-Delete ohne Mail. Nur wenn nicht sent/closed.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  PracticeConfirmationId,
  PracticeConfirmationSlot,
} from "@/lib/questionnaire/confirmation";

export type BlockChoice = {
  id: string;
  label: string;
};

type Props = {
  requestId: string;
  initialPatientReference: string | null;
  initialSelectedBlockIds: string[];
  blocks: BlockChoice[];
  /** Wenn true, ist das Formular schreibgeschützt (status = sent/closed). */
  isSent?: boolean;
  /** Wenn true, wurde die Anfrage abgelehnt (status = rejected). */
  isRejected?: boolean;
  /** Wenn true, darf die Anfrage nicht gelöscht werden (status = sent/closed). */
  canDelete?: boolean;
  practiceConfirmationSlots?: PracticeConfirmationSlot[];
};

export function DigitalRequestDetailClient({
  requestId,
  initialPatientReference,
  initialSelectedBlockIds,
  blocks,
  isSent = false,
  isRejected: isRejectedProp = false,
  canDelete = false,
  practiceConfirmationSlots = [],
}: Props) {
  const router = useRouter();
  const [patientReference, setPatientReference] = useState(
    initialPatientReference ?? "",
  );
  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const id of initialSelectedBlockIds) init[id] = true;
    return init;
  });
  const [selectedConfirmations, setSelectedConfirmations] = useState<
    Set<PracticeConfirmationId>
  >(() => new Set());
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

  // Effektiver Readonly-Zustand
  const isRejected = isRejectedProp || rejected;
  // Effektiver Readonly-Zustand: server-seitig versendet ODER lokal gerade versendet ODER abgelehnt.
  const isReadOnly = isSent || sent || isRejected;

  function toggleBlock(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
    setSaved(false);
  }

  const currentSelectedBlockIds = blocks
    .map((b) => b.id)
    .filter((id) => selected[id]);

  const canSend =
    !isReadOnly &&
    patientReference.trim() !== "" &&
    currentSelectedBlockIds.length > 0;

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const res = await fetch(`/api/digital-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_reference: patientReference.trim() || null,
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
      const patchRes = await fetch(`/api/digital-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_reference: patientReference.trim() || null,
          selected_block_ids: currentSelectedBlockIds,
          status: "in_review",
        }),
      });
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
        `/api/digital-requests/${requestId}/process`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selected_confirmation_ids: Array.from(selectedConfirmations),
          }),
        },
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
      const res = await fetch(`/api/digital-requests/${requestId}/reject`, {
        method: "POST",
      });
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
    if (!window.confirm("Anfrage wirklich löschen?")) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/digital-requests/${requestId}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        router.push("/digital-requests");
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
        <p
          className="text-sm text-gray-500"
          data-testid="form-readonly-notice"
        >
          Das Formular ist schreibgeschützt, da der Fragebogen bereits versendet wurde.
        </p>
      )}

      {/* Lokal abgelehnte Anfrage – Hinweis */}
      {isRejected && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          data-testid="reject-notice"
        >
          <p className="font-medium">Anfrage wurde abgelehnt.</p>
          <p className="mt-1 text-red-700">
            Der Patient wurde per E-Mail benachrichtigt.
          </p>
        </div>
      )}

      {/* Lokal versendete Erfolgsmeldung */}
      {sent && (
        <div
          className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
          data-testid="send-success-notice"
        >
          <p className="font-medium">Fragebogen wurde versendet.</p>
        </div>
      )}

      {/* Patientenreferenz */}
      <div>
        <label
          htmlFor="patient_reference"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Patientenreferenz / PVS-Nummer
        </label>
        <input
          id="patient_reference"
          type="text"
          value={patientReference}
          onChange={(e) => {
            if (isReadOnly) return;
            setPatientReference(e.target.value);
            setSaved(false);
          }}
          readOnly={isReadOnly}
          disabled={isReadOnly}
          placeholder="z. B. PAT-12345"
          className={`w-full max-w-sm rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500${
            isReadOnly ? " cursor-not-allowed bg-gray-50 text-gray-500" : ""
          }`}
        />
      </div>

      {/* Block-Auswahl */}
      <fieldset disabled={isReadOnly} style={{ margin: "1.5rem 0", padding: 0, border: "none" }}>
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
                onChange={() => { if (!isReadOnly) toggleBlock(b.id); }}
                disabled={isReadOnly}
                style={{ marginTop: "0.2rem", flexShrink: 0, width: "1rem", height: "1rem" }}
              />
              <span>{b.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {practiceConfirmationSlots.length > 0 && (
        <fieldset disabled={isReadOnly} style={{ margin: "1.5rem 0", padding: 0, border: "none" }}>
          <legend style={{ marginBottom: "0.75rem", fontWeight: 500 }}>
            Bestätigungen
          </legend>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {practiceConfirmationSlots.map((slot) => (
              <label key={slot.id} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                <input
                  type="checkbox"
                  checked={selectedConfirmations.has(slot.id)}
                  disabled={isReadOnly}
                  onChange={(event) => {
                    setSelectedConfirmations((previous) => {
                      const next = new Set(previous);
                      event.target.checked ? next.add(slot.id) : next.delete(slot.id);
                      return next;
                    });
                  }}
                  data-confirmation-choice={slot.id}
                />
                <span style={{ whiteSpace: "pre-wrap" }}>{slot.text}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* Feedback + Buttons — nur wenn nicht schreibgeschützt */}
      {!isReadOnly && (
        <div className="space-y-3">
          {/* Speichern */}
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

          {/* Fragebogen senden */}
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
              <span className="text-sm text-red-600" role="alert" data-testid="send-error">
                {sendError}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Ablehnen-Button – nur wenn nicht readonly und nicht schon abgelehnt */}
      {!isSent && !isRejected && !sent && (
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleReject}
              disabled={rejecting || deleting || saving || sending}
              data-testid="reject-btn"
              className="rounded border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {rejecting ? "Wird abgelehnt…" : "Digitale Anfrage ablehnen"}
            </button>
            {rejectError && (
              <span className="text-sm text-red-600" role="alert" data-testid="reject-error">
                {rejectError}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Löschen-Button – nur wenn nicht sent/closed */}
      {!isSent && (
        <div className="space-y-2">
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
              <span className="text-sm text-red-600" role="alert" data-testid="delete-error">
                {deleteError}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
