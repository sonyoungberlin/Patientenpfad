"use client";

import React from "react";
import type { ActiveCheckpointMultiSelect } from "@/lib/types";

export type MultiSelectCheckpointSectionProps = {
  checkpoints: ActiveCheckpointMultiSelect[];
  onToggleEnabled: (id: string) => void;
  onToggleOption: (id: string, option: string) => void;
  disabled?: boolean;
  /** Optionen, die Zusatz-Checkpoints auslösen – werden visuell markiert. */
  triggerOptions?: readonly string[];
};

/**
 * Wiederverwendbare Sektion für MULTI_SELECT-Checkpoints (K10/K11).
 *
 * Zeigt Überschrift „Anlass / Besonderheiten" und einen optionalen
 * Untertitel. Pro Checkpoint: Toggle-Checkbox + Optionsliste (nur
 * sichtbar wenn aktiviert). Kein eigener Persistenz-Kanal – der Aufrufer
 * entscheidet, wann und wie Änderungen gespeichert werden.
 */
export default function MultiSelectCheckpointSection({
  checkpoints,
  onToggleEnabled,
  onToggleOption,
  disabled = false,
  triggerOptions,
}: MultiSelectCheckpointSectionProps) {
  if (checkpoints.length === 0) return null;

  return (
    <section data-multi-select-section style={{ marginBottom: "1.5rem" }}>
      <h2 style={{ marginBottom: "0.25rem" }}>Anlass / Besonderheiten</h2>
      <p className="text-muted text-small" style={{ marginBottom: "0.75rem" }}>
        Optional: Markieren Sie besondere Gründe oder Rahmenbedingungen des Falls.
      </p>
      {checkpoints.map((mscp) => (
        <div
          key={mscp.id}
          data-checkpoint-multi={mscp.id}
          className="card"
          style={{ marginBottom: "0.75rem", opacity: disabled ? 0.5 : 1 }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontWeight: 500,
              cursor: disabled ? "default" : "pointer",
            }}
          >
            <input
              type="checkbox"
              data-multi-toggle={mscp.id}
              checked={mscp.enabled}
              onChange={() => onToggleEnabled(mscp.id)}
              disabled={disabled}
            />
            {mscp.title}
          </label>
          {mscp.enabled ? (
            <ul style={{ margin: "0.5rem 0 0 0", padding: 0, listStyle: "none" }}>
              {mscp.options.map((option) => (
                <li key={option} style={{ marginBottom: "0.25rem" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      cursor: disabled ? "default" : "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      data-multi-option={`${mscp.id}:${option}`}
                      checked={mscp.selections.includes(option)}
                      onChange={() => onToggleOption(mscp.id, option)}
                      disabled={disabled}
                    />
                    {option}
                    {triggerOptions?.includes(option) && (
                      <span
                        className="text-muted"
                        style={{ fontSize: "0.8em", fontWeight: 400 }}
                      >
                        · mit Zusatzfragen
                      </span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </section>
  );
}
