"use client";

import { useState } from "react";
import InternalDocumentationBlockOrganizer from "@/components/InternalDocumentationBlockOrganizer";
import type { InternalBlockPlacement } from "@/lib/questionnaire/internalBlockLayout";
import type { PracticeDocumentationBlockSummary } from "@/lib/practice/documentationBlocks";

export default function InternalDocumentationLauncherBlocks({
  availableBlocks,
  blockLayout,
  onToggleBlock,
  onBlockLayoutChange,
  disabled = false,
}: {
  availableBlocks: PracticeDocumentationBlockSummary[];
  blockLayout: InternalBlockPlacement[];
  onToggleBlock: (blockId: string) => void;
  onBlockLayoutChange: (layout: InternalBlockPlacement[]) => void;
  disabled?: boolean;
}) {
  const [addingBlocks, setAddingBlocks] = useState(false);
  const selectedIds = new Set(blockLayout.map(({ blockId }) => blockId));
  const labels = Object.fromEntries(availableBlocks.map((block) => [block.id, block.title]));
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: "0.65rem" }}>
      <legend style={{ fontWeight: 600, marginBottom: "0.25rem" }}>Bausteine</legend>
      {blockLayout.length === 0 ? <p className="text-muted text-small" style={{ margin: 0 }}>Noch keine Bausteine ausgewählt.</p> : (
        <div style={{ display: "grid", gap: "0.4rem" }}>
          {blockLayout.map(({ blockId }) => <label key={blockId} style={{ display: "flex", gap: "0.5rem" }}>
            <input type="checkbox" checked onChange={() => onToggleBlock(blockId)} disabled={disabled} data-selected-internal-block={blockId} />
            {labels[blockId] ?? blockId}
          </label>)}
        </div>
      )}
      {availableBlocks.some((block) => !selectedIds.has(block.id)) && <button type="button" disabled={disabled} aria-expanded={addingBlocks} onClick={() => setAddingBlocks((current) => !current)} style={{ justifySelf: "start" }}>
        {addingBlocks ? "Auswahl schließen" : "+ Baustein hinzufügen"}
      </button>}
      {addingBlocks && <div aria-label="Verfügbare Bausteine" style={{ display: "grid", gap: "0.4rem" }}>
        {availableBlocks.filter((block) => !selectedIds.has(block.id)).map((block) => <label key={block.id} style={{ display: "flex", gap: "0.5rem" }}>
          <input type="checkbox" checked={false} onChange={() => onToggleBlock(block.id)} disabled={disabled} data-available-internal-block={block.id} />
          {block.title}
        </label>)}
      </div>}
      {blockLayout.length > 0 && <InternalDocumentationBlockOrganizer placements={blockLayout} blockLabels={labels} onChange={onBlockLayoutChange} disabled={disabled} />}
    </fieldset>
  );
}
