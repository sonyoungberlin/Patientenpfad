"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  sessionId: string;
  restoreUrl?: string;
};

/**
 * Stellt einen soft-gelöschten Fragebogen wieder her. Bewusst ohne
 * Confirm-Dialog: Restore ist eine harmlose, jederzeit wiederholbare
 * Operation (Gegenstück zum Löschen). Nach Erfolg wird die Liste neu
 * geladen, wodurch der Eintrag aus der Papierkorb-Ansicht in die aktive
 * Liste wandert.
 */
export default function QuestionnaireRestoreButton({
  sessionId,
  restoreUrl = `/api/questionnaire/${sessionId}/restore`,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleRestore() {
    setPending(true);
    try {
      const res = await fetch(restoreUrl, {
        method: "POST",
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Fehler beim Wiederherstellen.");
      }
    } catch {
      alert("Fehler beim Wiederherstellen.");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleRestore}
      disabled={pending}
      className="btn-secondary text-small"
      data-q-restore={sessionId}
      style={{ display: "inline-block", width: "fit-content", marginTop: "0.25rem" }}
    >
      {pending ? "Wird wiederhergestellt…" : "Wiederherstellen"}
    </button>
  );
}
