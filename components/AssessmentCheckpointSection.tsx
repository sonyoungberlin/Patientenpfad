"use client";

import React from "react";

export type AssessmentCheckpoint = {
  id: string;
  title: string;
  enabled: boolean;
  /**
   * Optionale neutrale Erklärung (z. B. `introText` aus dem Katalog).
   * Reine Anzeige; daraus wird keine Logik abgeleitet.
   */
  description?: string;
};

export type AssessmentCheckpointSectionProps = {
  checkpoints: AssessmentCheckpoint[];
  onToggleEnabled: (id: string) => void;
  disabled?: boolean;
};

/**
 * Sektion für ASSESSMENT-Checkpoints (z. B. K12, K13) in M1.
 *
 * Zeigt jeden ASSESSMENT-Checkpoint als Checkbox an – bewusstes Zuschalten
 * durch den Nutzer. Kein klar/unklar-Toggle, keine Optionsliste.
 * Erscheint optisch bei den Themenbereichen (nicht bei Anlass/Besonderheiten).
 *
 * Wenn aktiviert (enabled = true): Checkpoint erscheint in M2, M3 und M5.
 * Wenn nicht aktiviert (enabled = false): Checkpoint erscheint nicht in M2/M3/M5.
 *
 * Die Liste wird generisch aus `ALWAYS_PRESENT_ASSESSMENT_IDS` gespeist –
 * neue ASSESSMENT-Checkpoints werden automatisch unterstützt, sobald sie im
 * Katalog stehen.
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
          {cp.description ? (
            <p
              className="text-muted text-small"
              style={{ marginTop: "0.35rem", marginBottom: 0 }}
            >
              {cp.description}
            </p>
          ) : null}
        </div>
      ))}
    </section>
  );
}
