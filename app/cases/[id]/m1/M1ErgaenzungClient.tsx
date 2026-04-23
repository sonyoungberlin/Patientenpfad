"use client";

import React, { useState } from "react";
import M1SelectionForm from "@/components/M1SelectionForm";
import type { M1BlockId, M1BlockStatus, M1Selection } from "@/lib/types";

const INITIAL_SELECTION: M1Selection = {
  kommunikation: "unklar",
  medizinische_lage: "unklar",
  versorgung_im_alltag: "unklar",
};

export type M1ErgaenzungClientProps = {
  /** Block-IDs, die im aktuellen Fall bereits aktiv sind. */
  lockedBlocks: ReadonlyArray<M1BlockId>;
};

/**
 * Schritt B des Ergänzungs-Flows: Per-Case-Einstieg.
 *
 * Reine Sicht-/Vorbereitungsseite. Es gibt:
 *   * keinen echten Schreibpfad,
 *   * keine Merge-Logik,
 *   * keinen neuen Run.
 *
 * Bereits aktive Blöcke werden via `lockedBlocks` an `M1SelectionForm`
 * gegeben und dort als „bereits aktiv" / nicht erneut auswählbar
 * dargestellt. Der Submit-Button ist als Platzhalter deaktiviert.
 */
export default function M1ErgaenzungClient({
  lockedBlocks,
}: M1ErgaenzungClientProps) {
  const [selection, setSelection] = useState<M1Selection>(INITIAL_SELECTION);

  function handleBlockChange(blockId: keyof M1Selection, value: M1BlockStatus) {
    setSelection((prev) => ({ ...prev, [blockId]: value }));
  }

  function handleSubmit() {
    // Schritt B: noch kein echter Schreibpfad.
  }

  return (
    <M1SelectionForm
      selection={selection}
      onBlockChange={handleBlockChange}
      onSubmit={handleSubmit}
      loading={false}
      lockedBlocks={lockedBlocks}
      submitDisabled
    />
  );
}
