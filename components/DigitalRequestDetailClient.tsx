"use client";

/**
 * Interaktives Formular für die Detailseite einer DigitalRequest.
 *
 * - Textfeld: patient_reference
 * - Checkboxen: Fragebogen-Blöcke (aus BLOCK_CATALOG)
 * - "Auswahl speichern": PATCH /api/digital-requests/[id]
 * - "Fragebogen senden": PATCH + POST /api/digital-requests/[id]/process
 *   Voraussetzung: patient_reference vorhanden, ≥1 Block ausgewählt,
 *   status nicht sent/closed.
 */

import { useState } from "react";

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
};

export function DigitalRequestDetailClient({
  requestId,
  initialPatientReference,
  initialSelectedBlockIds,
  blocks,
  isSent = false,
}: Props) {
  const [patientReference, setPatientReference] = useState(
    initialPatientReference ?? "",
  );
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

  // Effektiver Readonly-Zustand: server-seitig versendet ODER lokal gerade versendet.
  const isReadOnly = isSent || sent;

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

  return (
    <div className="mt-8 space-y-6">
      {isReadOnly && (
        <p
          className="text-sm text-gray-500"
          data-testid="form-readonly-notice"
        >
          Das Formular ist schreibgeschützt, da der Fragebogen bereits versendet wurde.
        </p>
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
      <fieldset disabled={isReadOnly}>
        <legend className="mb-2 text-sm font-medium text-gray-700">
          Fragebogen-Blöcke
        </legend>
        <div className="space-y-2">
          {blocks.map((b) => (
            <label
              key={b.id}
              className={`flex items-center gap-2 text-sm${
                isReadOnly ? " cursor-not-allowed text-gray-400" : " cursor-pointer"
              }`}
              data-block-choice={b.id}
            >
              <input
                type="checkbox"
                checked={!!selected[b.id]}
                onChange={() => { if (!isReadOnly) toggleBlock(b.id); }}
                disabled={isReadOnly}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <span>{b.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

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
    </div>
  );
}
