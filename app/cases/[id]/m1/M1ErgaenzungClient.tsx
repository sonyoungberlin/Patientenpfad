"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import M1SelectionForm from "@/components/M1SelectionForm";
import type { M1BlockId, M1BlockStatus, M1Selection } from "@/lib/types";

const INITIAL_SELECTION: M1Selection = {
  kommunikation: "klar",
  medizinische_lage: "klar",
  versorgung_im_alltag: "klar",
};

export type M1ErgaenzungClientProps = {
  /** Case-ID für den Ergänzungs-Endpoint. */
  caseId: string;
  /** Block-IDs, die im aktuellen Fall bereits aktiv sind. */
  lockedBlocks: ReadonlyArray<M1BlockId>;
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
 */
export default function M1ErgaenzungClient({
  caseId,
  lockedBlocks,
}: M1ErgaenzungClientProps) {
  const router = useRouter();
  const [selection, setSelection] = useState<M1Selection>(INITIAL_SELECTION);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleSubmit() {
    if (loading) return;
    if (newlySelectedBlocks.length === 0) return;
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
      <M1SelectionForm
        selection={selection}
        onBlockChange={handleBlockChange}
        onSubmit={handleSubmit}
        loading={loading}
        lockedBlocks={lockedBlocks}
        submitDisabled={newlySelectedBlocks.length === 0}
      />
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
