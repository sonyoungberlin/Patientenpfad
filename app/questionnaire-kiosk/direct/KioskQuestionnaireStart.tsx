"use client";

import { useState } from "react";
import { QuestionnaireRequestSection } from "@/app/inquiries/[id]/m3/InquiryM3Client";
import type { PracticeConfirmationSlot } from "@/lib/questionnaire/confirmation";

export function KioskQuestionnaireStart({
  practiceConfirmationSlots,
}: {
  practiceConfirmationSlots: PracticeConfirmationSlot[];
}) {
  const [patientReference, setPatientReference] = useState("");
  const [referenceTouched, setReferenceTouched] = useState(false);
  const [showQuestionnaireSelection, setShowQuestionnaireSelection] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmedReference = patientReference.trim();
  const hasReference = trimmedReference.length > 0;

  function validateReference() {
    if (hasReference) return true;
    setReferenceTouched(true);
    setError("Bitte Patientennummer / Referenz eintragen.");
    return false;
  }

  async function startCheckIn() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/questionnaire-kiosk/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await response.json() as { ok: boolean; link?: string; error?: string };
      if (!response.ok || !data.ok || !data.link) {
        setError(data.error ?? "Check-in konnte nicht gestartet werden.");
        return;
      }
      window.location.replace(data.link);
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  function openQuestionnaireSelection() {
    if (!validateReference()) return;
    setError(null);
    setShowQuestionnaireSelection(true);
  }

  if (showQuestionnaireSelection) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setShowQuestionnaireSelection(false)}
          style={{ marginBottom: "0.75rem" }}
        >
          Zurück
        </button>
        <QuestionnaireRequestSection
          practiceConfirmationSlots={practiceConfirmationSlots}
          initialOpen
          initialPatientReference={trimmedReference}
          hidePatientReference
          mode="direct"
          createEndpoint="/api/questionnaire-kiosk/direct"
        />
      </div>
    );
  }

  return (
    <section style={{ display: "grid", gap: "1.25rem", maxWidth: "32rem" }}>
      <div>
        <label htmlFor="kiosk-patient-reference">
          Patientennummer / Referenz (für Fragebogen)
        </label>
        <input
          id="kiosk-patient-reference"
          type="text"
          name="patient_reference"
          autoComplete="off"
          value={patientReference}
          onChange={(event) => setPatientReference(event.target.value)}
          onBlur={() => setReferenceTouched(true)}
          disabled={loading}
          placeholder="z.B. PAT-12345"
          aria-invalid={referenceTouched && !hasReference}
          style={{ marginTop: "0.3rem" }}
        />
      </div>

      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 500, marginBottom: "0.5rem" }}>Vorgang auswählen</legend>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn-primary"
            onClick={startCheckIn}
            disabled={loading}
            data-kiosk-start-check-in
          >
            {loading ? "Wird gestartet …" : "Check-in"}
          </button>
          <button
            type="button"
            onClick={openQuestionnaireSelection}
            disabled={loading}
            data-kiosk-open-questionnaire
          >
            Fragebogen ausfüllen
          </button>
        </div>
      </fieldset>

      {error && <p role="alert" style={{ color: "var(--destructive)", margin: 0 }}>{error}</p>}
    </section>
  );
}