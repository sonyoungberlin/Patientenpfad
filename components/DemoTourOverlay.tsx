"use client";

import { DOCTOR_TOUR, type TourStep } from "@/lib/tours/doctorTour";

type DemoTourOverlayProps = {
  /** Index des aktuell angezeigten Schritts. */
  currentStep: number;
  /** Callback zum Navigieren: positiver Wert = vorwärts, negativer = rückwärts. */
  onNavigate: (delta: number) => void;
  /** Callback zum Beenden der Tour. */
  onClose: () => void;
};

/**
 * Einfaches Tour-Overlay für die Arzt-Demo-Tour (v1).
 *
 * Zeigt title + body des aktuellen Schritts, Schrittzähler und
 * Navigations-Buttons (Zurück / Weiter / Beenden).
 * Kein externes Highlighting – nur informierender Textinhalt.
 */
export default function DemoTourOverlay({
  currentStep,
  onNavigate,
  onClose,
}: DemoTourOverlayProps) {
  const steps: TourStep[] = DOCTOR_TOUR;
  const total = steps.length;
  const step = steps[currentStep];

  if (!step) return null;

  const isFirst = currentStep === 0;
  const isLast = currentStep === total - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      className="tour-overlay"
    >
      <div
        className="card tour-overlay-panel"
      >
        {/* Schrittzähler */}
        <p
          className="text-muted text-small"
          style={{ margin: 0 }}
          aria-live="polite"
        >
          Schritt {currentStep + 1} von {total}
        </p>

        {/* Titel */}
        <h2 id="tour-title" style={{ margin: 0, fontSize: "1.125rem" }}>
          {step.title}
        </h2>

        {/* Erklärungstext */}
        <p style={{ margin: 0 }}>{step.body}</p>

        {/* Navigation */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            justifyContent: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{ marginRight: "auto" }}
          >
            Tour beenden
          </button>

          {!isFirst && (
            <button type="button" onClick={() => onNavigate(-1)}>
              ← Zurück
            </button>
          )}

          {isLast ? (
            <button
              type="button"
              className="btn-primary"
              onClick={onClose}
            >
              Fertig
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary"
              onClick={() => onNavigate(1)}
            >
              Weiter →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
