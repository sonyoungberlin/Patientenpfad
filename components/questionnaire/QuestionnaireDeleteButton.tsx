"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  sessionId: string;
};

export default function QuestionnaireDeleteButton({ sessionId }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm("Diesen Fragebogen wirklich löschen?");
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
