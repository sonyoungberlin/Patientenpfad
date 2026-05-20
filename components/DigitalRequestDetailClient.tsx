"use client";

/**
 * Phase B Schritt 2: Interaktives Formular für die Detailseite einer
 * DigitalRequest.
 *
 * - Textfeld: patient_reference
 * - Checkboxen: Fragebogen-Blöcke (aus BLOCK_CATALOG)
 * - Speichern-Button: PATCH /api/digital-requests/[id]
 *   → setzt auch status="in_review", wenn noch nicht gesetzt
 *
 * Kein Fragebogen-Versand in diesem Schritt.
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

  function toggleBlock(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);

    const selectedBlockIds = blocks
      .map((b) => b.id)
      .filter((id) => selected[id]);

    try {
      const res = await fetch(`/api/digital-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_reference: patientReference.trim() || null,
          selected_block_ids: selectedBlockIds,
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

  return (
    <div className="mt-8 space-y-6">
      {isSent && (
        <p
          className="text-sm text-gray-500"
          data-testid="form-readonly-notice"
        >
          Das Formular ist schreibgeschützt, da der Fragebogen bereits versendet wurde.
        </p>
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
            if (isSent) return;
            setPatientReference(e.target.value);
            setSaved(false);
          }}
          readOnly={isSent}
          disabled={isSent}
          placeholder="z. B. PAT-12345"
          className={`w-full max-w-sm rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500${
            isSent ? " cursor-not-allowed bg-gray-50 text-gray-500" : ""
          }`}
        />
      </div>

      {/* Block-Auswahl */}
      <fieldset disabled={isSent}>
        <legend className="mb-2 text-sm font-medium text-gray-700">
          Fragebogen-Blöcke
        </legend>
        <div className="space-y-2">
          {blocks.map((b) => (
            <label
              key={b.id}
              className={`flex items-center gap-2 text-sm${
                isSent ? " cursor-not-allowed text-gray-400" : " cursor-pointer"
              }`}
              data-block-choice={b.id}
            >
              <input
                type="checkbox"
                checked={!!selected[b.id]}
                onChange={() => { if (!isSent) toggleBlock(b.id); }}
                disabled={isSent}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <span>{b.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Feedback + Speichern — nur wenn nicht versendet */}
      {!isSent && (
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
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
      )}
    </div>
  );
}
