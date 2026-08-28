"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  sessionId: string;
  recipientReference?: string | null;
};

export default function OfficeQuestionnaireDeleteButton({
  sessionId,
  recipientReference,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    const trimmedRef =
      typeof recipientReference === "string" ? recipientReference.trim() : "";
    const message =
      "Fragebogen wirklich löschen?\nDie Daten gehen dabei verloren." +
      (trimmedRef ? `\n\nReferenz: ${trimmedRef}` : "");
    if (!window.confirm(message)) return;

    setPending(true);
    try {
      const res = await fetch(`/api/office-cases/questionnaire/${sessionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
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
      data-office-q-delete={sessionId}
      style={{ display: "inline-block", width: "fit-content" }}
    >
      {pending ? "Wird gelöscht…" : "Löschen"}
    </button>
  );
}
