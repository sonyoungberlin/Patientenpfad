"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InternalDocumentationStartPage() {
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [workflowId, setWorkflowId] = useState<"care_plan_v1" | "vaccination_review_v1" | "health_check_v1">("care_plan_v1");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function start(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError(null);
    const response = await fetch("/api/questionnaire-kiosk/internal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workflow_id: workflowId, patient_reference: reference }) });
    const data = await response.json() as { link?: string; error?: string };
    if (!response.ok || !data.link) { setError(data.error ?? "Dokumentation konnte nicht gestartet werden."); setSaving(false); return; }
    router.push(new URL(data.link).pathname);
  }
  return <main><h1>Interne Dokumentation</h1><form onSubmit={start} style={{ display: "grid", gap: "0.75rem", maxWidth: "24rem" }}><label>Workflow<select value={workflowId} onChange={(event) => setWorkflowId(event.target.value as typeof workflowId)}><option value="care_plan_v1">Persönlicher Versorgungsplan</option><option value="vaccination_review_v1">Impfpassprüfung und Beratung</option><option value="health_check_v1">Gesundheitsuntersuchung</option></select></label><label>Patientenreferenz<input autoFocus required value={reference} onChange={(event) => setReference(event.target.value)} /></label>{error && <p className="text-error" role="alert">{error}</p>}<button type="submit" disabled={saving || !reference.trim()}>{saving ? "Wird gestartet…" : "Dokumentation starten"}</button></form></main>;
}