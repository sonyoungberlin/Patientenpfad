"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import InternalDocumentationBlockSelector from "@/components/InternalDocumentationBlockSelector";
import { INTERNAL_BLOCK_UI_ORDER } from "@/lib/questionnaire/internalBlockPresentation";
import {
  reconcileInternalBlockPlacements,
  type InternalBlockPlacement,
} from "@/lib/questionnaire/internalBlockLayout";

export default function InternalDocumentationLauncher() {
  const router = useRouter();
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());
  const [blockLayout, setBlockLayout] = useState<InternalBlockPlacement[]>([]);
  const [layoutManuallyArranged, setLayoutManuallyArranged] = useState(false);
  const [patientReference, setPatientReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(event: React.FormEvent) {
    event.preventDefault();
    const blockIds = Array.from(selectedBlockIds);
    if (blockIds.length === 0) {
      setError("Bitte mindestens einen Abschnitt auswählen.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/internal-documentation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedBlockIds: blockIds,
          blockLayout,
          patientReference: patientReference.trim(),
        }),
      });
      const data = await response.json() as { link?: string; error?: string };
      if (!response.ok || !data.link) {
        setError(data.error ?? "Dokumentation konnte nicht gestartet werden.");
        return;
      }
      router.push(new URL(data.link).pathname);
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  }

  function toggleBlock(blockId: string) {
    const next = new Set(selectedBlockIds);
    const select = !next.has(blockId);
    if (select) next.add(blockId);
    else next.delete(blockId);
    setSelectedBlockIds(next);
    setBlockLayout(reconcileInternalBlockPlacements(
      blockLayout,
      next,
      INTERNAL_BLOCK_UI_ORDER,
      layoutManuallyArranged,
    ));
  }

  function toggleGroup(blockIds: string[]) {
    const next = new Set(selectedBlockIds);
    const select = blockIds.some((blockId) => !next.has(blockId));
    for (const blockId of blockIds) {
      if (select) next.add(blockId);
      else next.delete(blockId);
    }
    setSelectedBlockIds(next);
    setBlockLayout(reconcileInternalBlockPlacements(
      blockLayout,
      next,
      INTERNAL_BLOCK_UI_ORDER,
      layoutManuallyArranged,
    ));
  }

  return (
    <form
      onSubmit={start}
      style={{ display: "grid", gap: "0.75rem", maxWidth: "28rem" }}
    >
      <InternalDocumentationBlockSelector
        selectedBlockIds={selectedBlockIds}
        onToggleBlock={toggleBlock}
        onToggleGroup={toggleGroup}
        blockLayout={blockLayout}
        onBlockLayoutChange={(layout) => {
          setLayoutManuallyArranged(true);
          setBlockLayout(layout);
        }}
        disabled={saving}
      />
      <label>
        Patientenreferenz
        <input
          autoFocus
          required
          autoComplete="off"
          value={patientReference}
          onChange={(event) => setPatientReference(event.target.value)}
          disabled={saving}
          style={{ marginTop: "0.5rem" }}
        />
      </label>
      <p className="text-muted text-small" style={{ margin: 0 }}>
        Verwenden Sie nach Möglichkeit Ihre interne Praxisreferenz und keine unnötigen personenbezogenen Angaben.
      </p>
      {error && <p className="text-error" role="alert">{error}</p>}
      <button type="submit" disabled={saving || selectedBlockIds.size === 0 || !patientReference.trim()}>
        {saving ? "Wird gestartet…" : "Starten"}
      </button>
    </form>
  );
}