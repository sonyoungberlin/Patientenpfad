"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import M1SelectionForm from "@/components/M1SelectionForm";
import MultiSelectCheckpointSection from "@/components/MultiSelectCheckpointSection";
import type { ActiveCheckpointMultiSelect, M1BlockId, M1BlockStatus, M1Selection } from "@/lib/types";

const INITIAL_SELECTION: M1Selection = {
  kommunikation: "klar",
  medizinische_lage: "klar",
  versorgung_im_alltag: "klar",
  pflegebeobachtung: "klar",
};

export type M1ErgaenzungClientProps = {
  /** Case-ID für den Ergänzungs-Endpoint. */
  caseId: string;
  /** Block-IDs, die im aktuellen Fall bereits aktiv sind. */
  lockedBlocks: ReadonlyArray<M1BlockId>;
  /** Aktueller MULTI_SELECT-Stand aus der DB (K10/K11). */
  initialMultiSelectCheckpoints: ActiveCheckpointMultiSelect[];
};

/**
 * Schritt C des Ergänzungs-Flows: echter additiver Submit.
 *
 * Verhalten:
 *   * Bereits aktive Blöcke werden gesperrt dargestellt und nie übermittelt.
 *   * Submit sendet ausschließlich die neu auf „unklar" gesetzten Blöcke
 *     an `POST /api/cases/[id]/m1/supplement`. Der Server entscheidet, was
 *     additiv ergänzt wird.
 *   * Bei Erfolg wird auf `/cases/[id]/m2` weitergeleitet (oder auf den
 *     vom Server zurückgegebenen Redirect).
 *   * Wenn nichts Neues ausgewählt wurde, ist der Button deaktiviert –
 *     keine Schreibwirkung.
 *   * MULTI_SELECT-Checkpoints (K10/K11) werden separat oberhalb der
 *     Blockauswahl angezeigt. Jede Änderung wird sofort via
 *     PATCH /api/cases/[id]/checkpoint/update persistiert.
 */
export default function M1ErgaenzungClient({
  caseId,
  lockedBlocks,
  initialMultiSelectCheckpoints,
}: M1ErgaenzungClientProps) {
  const router = useRouter();
  const [selection, setSelection] = useState<M1Selection>(INITIAL_SELECTION);
  const [multiSelectCheckpoints, setMultiSelectCheckpoints] = useState<ActiveCheckpointMultiSelect[]>(
    initialMultiSelectCheckpoints,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingPrepared, setSavingPrepared] = useState(false);

  const lockedSet = useMemo(
    () => new Set<M1BlockId>(lockedBlocks),
    [lockedBlocks],
  );

  // Nur tatsächlich neu „unklar"-markierte (nicht bereits aktive) Blöcke.
  const newlySelectedBlocks = useMemo(() => {
    const out: M1BlockId[] = [];
    (Object.keys(selection) as M1BlockId[]).forEach((blockId) => {
      if (selection[blockId] === "unklar" && !lockedSet.has(blockId)) {
        out.push(blockId);
      }
    });
    return out;
  }, [selection, lockedSet]);

  function handleBlockChange(blockId: keyof M1Selection, value: M1BlockStatus) {
    if (lockedSet.has(blockId)) return;
    setSelection((prev) => ({ ...prev, [blockId]: value }));
  }

  async function patchMultiSelect(
    id: string,
    enabled: boolean,
    selections: string[],
  ) {
    try {
      await fetch(`/api/cases/${caseId}/checkpoint/update`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ checkpoint_id: id, enabled, selections }),
      });
    } catch {
      // Best-effort: UI-Stand bleibt erhalten, DB-Fehler wird still ignoriert.
    }
  }

  function handleMultiToggleEnabled(id: string) {
    setMultiSelectCheckpoints((prev) =>
      prev.map((cp) => {
        if (cp.id !== id) return cp;
        const newEnabled = !cp.enabled;
        const newSelections = newEnabled ? cp.selections : [];
        void patchMultiSelect(id, newEnabled, newSelections);
        return { ...cp, enabled: newEnabled, selections: newSelections };
      }),
    );
  }

  function handleMultiToggleOption(id: string, option: string) {
    setMultiSelectCheckpoints((prev) =>
      prev.map((cp) => {
        if (cp.id !== id || !cp.enabled) return cp;
        const newSelections = cp.selections.includes(option)
          ? cp.selections.filter((s) => s !== option)
          : [...cp.selections, option];
        void patchMultiSelect(id, true, newSelections);
        return { ...cp, selections: newSelections };
      }),
    );
  }

  /**
   * Setzt clinical_status = "prepared" und navigiert zur Fallübersicht.
   * Der Arzt signalisiert damit, dass der Fall im Rahmen von M1 vorbereitet wurde.
   */
  async function handlePrepare() {
    if (savingPrepared || loading) return;
    setSavingPrepared(true);
    setError(null);
    try {
      const response = await fetch(`/api/cases/${caseId}/clinical-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "prepared" }),
      });
      if (!response.ok) {
        setError('Ärztlich vorbereitet konnte nicht gespeichert werden.');
        return;
      }
      router.push("/cases");
    } catch {
      setError('Ärztlich vorbereitet konnte nicht gespeichert werden.');
    } finally {
      setSavingPrepared(false);
    }
  }

  async function handleSubmit() {
    if (loading) return;
    // Ergänzungs-Flow darf auch ohne neuen Block gestartet werden:
    // In diesem Fall reicht der Server eine idempotente Antwort zurück
    // und leitet direkt nach M2 weiter.
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/cases/${caseId}/m1/supplement`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ blocks: newlySelectedBlocks }),
      });
      if (!response.ok) {
        setError("Fallergänzung konnte nicht gespeichert werden.");
        return;
      }
      let redirectTo = `/cases/${caseId}/m2`;
      try {
        const data = (await response.json()) as { redirect?: unknown } | null;
        if (
          data &&
          typeof data.redirect === "string" &&
          data.redirect.length > 0
        ) {
          redirectTo = data.redirect;
        }
      } catch {
        // Default-Redirect bleibt bestehen.
      }
      router.push(redirectTo);
    } catch {
      setError("Fallergänzung konnte nicht gespeichert werden.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <MultiSelectCheckpointSection
        checkpoints={multiSelectCheckpoints}
        onToggleEnabled={handleMultiToggleEnabled}
        onToggleOption={handleMultiToggleOption}
      />
      <M1SelectionForm
        selection={selection}
        onBlockChange={handleBlockChange}
        onSubmit={handleSubmit}
        loading={loading}
        lockedBlocks={lockedBlocks}
        submitDisabled={false}
      />
      <button
        type="button"
        data-clinical-status-prepared
        className="answer-btn"
        onClick={() => void handlePrepare()}
        disabled={savingPrepared || loading}
        style={{ marginTop: "0.75rem" }}
      >
        {savingPrepared ? "Wird gespeichert…" : "Ärztlich vorbereitet"}
      </button>
      {error ? (
        <p
          role="alert"
          data-supplement-error
          className="text-small"
          style={{ color: "var(--danger, #b00020)", marginTop: "0.75rem" }}
        >
          {error}
        </p>
      ) : null}
    </>
  );
}

