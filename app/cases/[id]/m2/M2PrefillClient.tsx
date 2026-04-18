"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ActiveCheckpoint } from "@/lib/types";
import { buildCaseM3Path } from "@/lib/flow/caseNavigation";

export function M2PrefillClient({
  caseId,
  checkpoints,
  initialPrefill,
}: {
  caseId: string;
  checkpoints: ActiveCheckpoint[];
  initialPrefill: Record<string, string>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const cp of checkpoints) {
      init[cp.id] = initialPrefill[cp.id] ?? "";
    }
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(checkpointId: string, value: string) {
    setValues((prev) => ({ ...prev, [checkpointId]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/cases/${caseId}/m2/prefill`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefill: values }),
      });

      if (!response.ok) {
        setError("Angaben konnten nicht gespeichert werden.");
        return;
      }

      router.push(buildCaseM3Path(caseId));
    } catch {
      setError("Angaben konnten nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {checkpoints.length === 0 ? (
        <p>Keine aktiven Checkpoints vorhanden.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {checkpoints.map((cp) => (
            <li
              key={cp.id}
              data-m2-checkpoint={cp.id}
              style={{
                border: "1px solid #ddd",
                padding: "0.75rem",
                marginBottom: "0.75rem",
              }}
            >
              <div style={{ marginBottom: "0.5rem", fontWeight: "bold" }}>
                {cp.title}
              </div>
              <label
                htmlFor={`prefill-${cp.id}`}
                style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.9em" }}
              >
                Was ist dazu bereits bekannt?
              </label>
              <textarea
                id={`prefill-${cp.id}`}
                data-m2-input={cp.id}
                value={values[cp.id] ?? ""}
                onChange={(e) => handleChange(cp.id, e.target.value)}
                rows={3}
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </li>
          ))}
        </ul>
      )}
      {error ? (
        <p role="alert" aria-live="polite">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        data-m2-save
        onClick={() => void handleSave()}
        disabled={saving}
        style={{ marginTop: "1rem" }}
      >
        Speichern und weiter zur ärztlichen Checkliste
      </button>
    </div>
  );
}
