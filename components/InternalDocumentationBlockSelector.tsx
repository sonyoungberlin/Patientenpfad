"use client";

import { useEffect, useRef } from "react";
import {
  getInternalBlockLabel,
  INTERNAL_BLOCK_GROUPS,
} from "@/lib/questionnaire/internalBlockPresentation";
import { INTERNAL_BLOCK_ORDER } from "@/lib/questionnaire/internalWorkflowRegistry";

type Props = {
  selectedBlockIds: Set<string>;
  onToggleBlock: (blockId: string) => void;
  onToggleGroup: (blockIds: string[]) => void;
  disabled?: boolean;
};

function GroupCheckbox({
  groupBlockIds,
  selectedBlockIds,
  disabled,
  onToggle,
}: {
  groupBlockIds: string[];
  selectedBlockIds: Set<string>;
  disabled: boolean;
  onToggle: () => void;
}) {
  const checkboxRef = useRef<HTMLInputElement>(null);
  const selectedCount = groupBlockIds.filter((id) => selectedBlockIds.has(id)).length;
  const checked = selectedCount === groupBlockIds.length;
  const indeterminate = selectedCount > 0 && !checked;

  useEffect(() => {
    if (checkboxRef.current) checkboxRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={checkboxRef}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onToggle}
      aria-label="Alle Abschnitte dieser Gruppe auswählen"
    />
  );
}

export default function InternalDocumentationBlockSelector({
  selectedBlockIds,
  onToggleBlock,
  onToggleGroup,
  disabled = false,
}: Props) {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: "1rem" }}>
      <legend style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
        Abschnitte auswählen
      </legend>
      {INTERNAL_BLOCK_GROUPS.map((group) => (
        <section key={group.id} style={{ display: "grid", gap: "0.5rem", minWidth: 0 }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", fontWeight: 600, minWidth: 0 }}>
            <GroupCheckbox
              groupBlockIds={group.blockIds}
              selectedBlockIds={selectedBlockIds}
              disabled={disabled}
              onToggle={() => onToggleGroup(group.blockIds)}
            />
            <span style={{ overflowWrap: "anywhere" }}>{group.label}</span>
          </label>
          <div style={{ display: "grid", gap: "0.35rem", paddingLeft: "1.75rem", minWidth: 0 }}>
            {group.blockIds.map((blockId) => (
              <label
                key={blockId}
                style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", minWidth: 0, cursor: disabled ? "not-allowed" : "pointer" }}
              >
                <input
                  type="checkbox"
                  checked={selectedBlockIds.has(blockId)}
                  disabled={disabled}
                  onChange={() => onToggleBlock(blockId)}
                  data-internal-block={blockId}
                />
                <span style={{ overflowWrap: "anywhere" }}>{getInternalBlockLabel(blockId)}</span>
              </label>
            ))}
          </div>
        </section>
      ))}
      <span className="text-muted text-small">
        {selectedBlockIds.size} von {INTERNAL_BLOCK_ORDER.length} Abschnitten ausgewählt
      </span>
    </fieldset>
  );
}
