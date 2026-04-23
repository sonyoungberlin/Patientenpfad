"use client";

import React from "react";
import type { M1BlockStatus, M1Selection } from "@/lib/types";

const BLOCK_LABELS: Record<keyof M1Selection, string> = {
  kommunikation: "Kommunikation",
  medizinische_lage: "Medizinische Lage",
  versorgung_im_alltag: "Versorgung im Alltag",
};

const STATUS_LABELS: Record<M1BlockStatus, string> = {
  klar: "bereits geklärt",
  unklar: "unklar",
};

export type M1SelectionFormProps = {
  selection: M1Selection;
  onBlockChange: (blockId: keyof M1Selection, value: M1BlockStatus) => void;
  onSubmit: () => void;
  loading: boolean;
};

export default function M1SelectionForm({
  selection,
  onBlockChange,
  onSubmit,
  loading,
}: M1SelectionFormProps) {
  return (
    <>
      {/* M1-Blöcke */}
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {(Object.keys(BLOCK_LABELS) as (keyof M1Selection)[]).map((blockId) => (
          <li key={blockId} className="card" style={{ marginBottom: "0.75rem" }}>
            <div style={{ marginBottom: "0.5rem", fontWeight: 500 }}>{BLOCK_LABELS[blockId]}</div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {(["klar", "unklar"] as M1BlockStatus[]).map((val) => (
                <button
                  key={val}
                  type="button"
                  className={`answer-btn${selection[blockId] === val ? " active" : ""}`}
                  onClick={() => onBlockChange(blockId, val)}
                >
                  {STATUS_LABELS[val]}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>

      <button
        className="btn-primary"
        onClick={onSubmit}
        disabled={loading}
        style={{ marginTop: "1rem" }}
      >
        {loading ? "Lädt…" : "Fall anlegen"}
      </button>
    </>
  );
}
