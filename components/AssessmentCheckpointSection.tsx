"use client";

import React from "react";

export type AssessmentCheckpoint = {
  id: string;
  title: string;
  enabled: boolean;
};

export type AssessmentCheckpointSectionProps = {
  checkpoints: AssessmentCheckpoint[];
  onToggleEnabled: (id: string) => void;
  disabled?: boolean;
};

/**
 * Sektion für ASSESSMENT-Checkpoints (z. B. K12) in M1.
 *
 * Zeigt jeden ASSESSMENT-Checkpoint als Checkbox an – bewusstes Zuschalten
 * durch den Nutzer. Kein klar/unklar-Toggle, keine Optionsliste.
 * Erscheint optisch bei den Themenbereichen (nicht bei Anlass/Besonderheiten).
 *
 * Wenn aktiviert (enabled = true): Checkpoint erscheint in M2, M3 und M5.
 * Wenn nicht aktiviert (enabled = false): Checkpoint erscheint nicht in M2/M3/M5.
 */
export default function AssessmentCheckpointSection({
  checkpoints,
  onToggleEnabled,
  disabled = false,
}: AssessmentCheckpointSectionProps) {
  if (checkpoints.length === 0) return null;

  return (
    <section data-assessment-section style={{ marginBottom: "0.75rem" }}>
      {checkpoints.map((cp) => (
        <div
          key={cp.id}
          data-checkpoint-assessment={cp.id}
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
              data-assessment-toggle={cp.id}
              checked={cp.enabled}
              onChange={() => onToggleEnabled(cp.id)}
              disabled={disabled}
            />
            {cp.title}
          </label>
          <p
            className="text-muted text-small"
            style={{ marginTop: "0.35rem", marginBottom: 0 }}
          >
            Rückmeldung einholen, wenn die Alltagssituation durch eine
            Kontaktperson eingeschätzt werden soll.
          </p>
        </div>
      ))}
    </section>
  );
}
