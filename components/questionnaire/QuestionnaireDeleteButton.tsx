"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  sessionId: string;
  /**
   * Optionale Patientenreferenz, die im Confirm-Dialog mit angezeigt wird,
   * damit die löschende Person die Auswahl noch einmal abgleichen kann.
   * Wenn `null`/leer, wird der Name weggelassen.
   */
  patientReference?: string | null;
};

export default function QuestionnaireDeleteButton({
  sessionId,
  patientReference,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    const trimmedRef =
      typeof patientReference === "string" ? patientReference.trim() : "";
    const message =
      "Fragebogen wirklich löschen?\nDie Daten gehen dabei verloren." +
      (trimmedRef ? `\n\nPatient: ${trimmedRef}` : "");
    const confirmed = window.confirm(message);
    if (!confirmed) return;

    setPending(true);
    try {
      const res = await fetch(`/api/questionnaire/${sessionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Fehler beim Löschen.");
      }
    } catch {
      alert("Fehler beim Löschen.");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      className="btn-danger text-small"
      data-q-delete={sessionId}
      style={{ display: "inline-block", width: "fit-content", marginTop: "0.25rem" }}
    >
      {pending ? "Wird gelöscht…" : "Löschen"}
    </button>
  );
}
