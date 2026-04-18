"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buildCaseM3Path } from "@/lib/flow/caseNavigation";

export function M2SkipButtonClient({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSkip() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/cases/${caseId}/m2-skip`, {
        method: "PATCH",
      });
      if (!response.ok) {
        setError("Überspringen fehlgeschlagen.");
        return;
      }
      router.push(buildCaseM3Path(caseId));
    } catch {
      setError("Überspringen fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: "1rem" }}>
      <button
        type="button"
        data-m2-skip
        onClick={() => void handleSkip()}
        disabled={loading}
      >
        {loading ? "Wird übersprungen…" : "Patientenfragebogen überspringen und ärztlich fortfahren"}
      </button>
      {error ? (
        <p role="alert" aria-live="polite" style={{ color: "red", marginTop: "0.25rem" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
