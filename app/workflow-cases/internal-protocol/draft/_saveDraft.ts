import type { PracticeWorkflowSnapshot } from "@/lib/practiceProcesses/workflowSnapshot";

export type SaveResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/**
 * Speichert einen PracticeWorkflowSnapshot per API.
 * Wenn sourceId vorhanden → PATCH (Überschreiben),
 * sonst → POST (Neuanlage).
 * Gibt das Ergebnis inkl. der Session-ID zurück.
 */
export async function savePracticeWorkflowDraft(
  snapshot: PracticeWorkflowSnapshot,
  title: string,
  sourceId: string | null,
): Promise<SaveResult> {
  if (sourceId) {
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
  } else {
    const res = await fetch("/api/workflow-cases/internal-protocol/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, snapshot }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `Erstellen fehlgeschlagen (${res.status})${text ? ": " + text : ""}` };
    }
    const data: unknown = await res.json();
    if (
      typeof data !== "object" ||
      data === null ||
      !("id" in data) ||
      typeof (data as { id: unknown }).id !== "string"
    ) {
      return { ok: false, error: "Unerwartete Antwort vom Server" };
    }
    return { ok: true, id: (data as { id: string }).id };
  }
}
