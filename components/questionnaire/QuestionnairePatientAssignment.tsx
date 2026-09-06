"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  sessionId: string;
};

export default function QuestionnairePatientAssignment({ sessionId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [patientReference, setPatientReference] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function cancel() {
    setOpen(false);
    setPatientReference("");
    setError(null);
  }

  async function replacePdf() {
    const trimmedReference = patientReference.trim();
    if (!trimmedReference) {
      setError("Bitte geben Sie eine Patientennummer ein.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/questionnaire/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_reference: trimmedReference }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Patient konnte nicht zugeordnet werden.");
        return;
      }

      cancel();
      router.refresh();
      window.location.href = `/api/questionnaire/${sessionId}/pdf`;
    } catch {
      setError("Patient konnte nicht zugeordnet werden.");
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className="btn-secondary text-small"
        data-q-assign={sessionId}
        onClick={() => setOpen(true)}
        style={{ display: "inline-block", width: "fit-content", marginTop: "0.25rem" }}
      >
        Patient zuordnen
      </button>
    );
  }

  return (
    <div data-q-assign-form={sessionId} style={{ display: "grid", gap: "0.35rem", maxWidth: "22rem" }}>
      <label htmlFor={`patient-reference-${sessionId}`} className="text-small">
        Patientennummer
      </label>
      <input
        id={`patient-reference-${sessionId}`}
        value={patientReference}
        onChange={(event) => setPatientReference(event.target.value)}
        disabled={pending}
        autoFocus
      />
      {error && <div className="text-small" role="alert">{error}</div>}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button type="button" className="btn-secondary text-small" onClick={cancel} disabled={pending}>
          Abbrechen
        </button>
        <button type="button" className="btn text-small" onClick={replacePdf} disabled={pending}>
          {pending ? "Wird erstellt…" : "PDF ersetzen"}
        </button>
      </div>
    </div>
  );
}