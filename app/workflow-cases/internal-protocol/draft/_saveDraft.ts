import type { PracticeWorkflowDraftSnapshot } from "@/lib/practiceProcesses/workflowSnapshot";

export type SaveResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/**
 * Speichert einen PracticeWorkflowSnapshot per API.
 * Aktualisiert die bereits beim Start angelegte Session.
 */
export async function savePracticeWorkflowDraft(
  snapshot: PracticeWorkflowDraftSnapshot,
  title: string,
  sourceId: string,
): Promise<SaveResult> {
  const res = await fetch(`/api/workflow-cases/${sourceId}/protocol/save`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ snapshot, title }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, error: `Speichern fehlgeschlagen (${res.status})${text ? ": " + text : ""}` };
  }
  return { ok: true, id: sourceId };
}
