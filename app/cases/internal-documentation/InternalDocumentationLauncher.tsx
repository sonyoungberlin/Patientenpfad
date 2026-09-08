"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type WorkflowOption = {
  id: string;
  title: string;
};

export default function InternalDocumentationLauncher({
  workflows,
}: {
  workflows: WorkflowOption[];
}) {
  const router = useRouter();
  const [workflowId, setWorkflowId] = useState(workflows[0]?.id ?? "");
  const [patientReference, setPatientReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/internal-documentation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflow_id: workflowId,
          patient_reference: patientReference,
        }),
      });
      const data = await response.json() as { link?: string; error?: string };
      if (!response.ok || !data.link) {
        setError(data.error ?? "Dokumentation konnte nicht gestartet werden.");
        return;
      }
      router.push(new URL(data.link).pathname);
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={start}
      style={{ display: "grid", gap: "0.75rem", maxWidth: "28rem" }}
    >
      <label>
        Workflow
        <select
          value={workflowId}
          onChange={(event) => setWorkflowId(event.target.value)}
          disabled={saving}
          style={{ marginTop: "0.5rem" }}
        >
          {workflows.map((workflow) => (
            <option key={workflow.id} value={workflow.id}>
              {workflow.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        Patientenreferenz
        <input
          autoFocus
          required
          autoComplete="off"
          value={patientReference}
          onChange={(event) => setPatientReference(event.target.value)}
          disabled={saving}
          style={{ marginTop: "0.5rem" }}
        />
      </label>
      <p className="text-muted text-small" style={{ margin: 0 }}>
        Verwenden Sie nach Möglichkeit Ihre interne Praxisreferenz und keine unnötigen personenbezogenen Angaben.
      </p>
      {error && <p className="text-error" role="alert">{error}</p>}
      <button type="submit" disabled={saving || !workflowId || !patientReference.trim()}>
        {saving ? "Wird gestartet…" : "Starten"}
      </button>
    </form>
  );
}