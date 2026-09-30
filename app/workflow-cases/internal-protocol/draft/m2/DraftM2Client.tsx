"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCheckpoint } from "@/lib/practiceProcesses";
import { isPracticeWorkflowDraftSnapshot } from "@/lib/practiceProcesses/workflowSnapshot";
import type { PracticeWorkflowDraftSnapshot } from "@/lib/practiceProcesses/workflowSnapshot";
import type { PracticeCheckpointDefinitionRecord } from "@/lib/practiceProcesses/practiceDefinition";
import { savePracticeWorkflowDraft } from "../_saveDraft";

type EditableDefinition = Pick<PracticeCheckpointDefinitionRecord, "selectedAnchorIds" | "implementation">;

export default function DraftM2Client() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<PracticeWorkflowDraftSnapshot | null>(null);
  const [definitions, setDefinitions] = useState<Record<string, EditableDefinition>>({});
  const [definedCheckpointIds, setDefinedCheckpointIds] = useState<Set<string>>(new Set());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("sessionId");
    if (!id) { router.replace("/workflow-cases/internal-protocol/new"); return; }
    setSessionId(id);
    void fetch(`/api/workflow-cases/${id}/protocol/save`)
      .then(async (res) => {
        const data = await res.json() as { ok?: boolean; snapshot?: unknown };
        if (!res.ok || !data.ok || !isPracticeWorkflowDraftSnapshot(data.snapshot)) throw new Error();
        setSnapshot(data.snapshot);
        const definitionResponse = await fetch("/api/practice-checkpoint-definitions");
        const definitionData = await definitionResponse.json() as { definitions?: PracticeCheckpointDefinitionRecord[] };
        if (definitionResponse.ok && Array.isArray(definitionData.definitions)) {
          setDefinedCheckpointIds(new Set(definitionData.definitions.map((definition) => definition.checkpointId)));
          setDefinitions(Object.fromEntries(definitionData.definitions.map((definition) => [
            definition.checkpointId,
            { selectedAnchorIds: definition.selectedAnchorIds, implementation: definition.implementation },
          ])));
        }
      })
      .catch(() => router.replace("/workflow-cases"));
  }, [router]);

  function updateDefinition(checkpointId: string, update: Partial<EditableDefinition>) {
    setDefinitions((current) => ({
      ...current,
      [checkpointId]: {
        selectedAnchorIds: current[checkpointId]?.selectedAnchorIds ?? [],
        implementation: current[checkpointId]?.implementation ?? "",
        ...update,
      },
    }));
  }

  async function saveDefinition(checkpointId: string) {
    const definition = definitions[checkpointId] ?? { selectedAnchorIds: [], implementation: "" };
    if (definition.selectedAnchorIds.length === 0 && definition.implementation.trim().length === 0) {
      setError("Bitte mindestens ein Kriterium auswählen oder eine zusätzliche Umsetzung beschreiben.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/practice-checkpoint-definitions/${checkpointId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(definition),
      });
      const data = await response.json() as {
        ok?: boolean;
        error?: string;
        definition?: EditableDefinition;
      };
      if (!response.ok || !data.ok || !data.definition) {
        setError(data.error ?? "Definition konnte nicht gespeichert werden.");
        return;
      }
      setDefinitions((current) => ({ ...current, [checkpointId]: data.definition! }));
      setDefinedCheckpointIds((current) => new Set(current).add(checkpointId));
    } catch {
      setError("Definition konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  }

  async function saveAndNavigate(destination: string) {
    if (!snapshot || !sessionId) return;
    setSaving(true);
    setError(null);
    const result = await savePracticeWorkflowDraft(snapshot, snapshot.caseProfileTitle, sessionId);
    setSaving(false);
    if (!result.ok) { setError(result.error); return; }
    router.push(`${destination}?sessionId=${encodeURIComponent(result.id)}`);
  }

  if (!snapshot) return null;

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div>
        <h2 style={{ margin: 0 }}>Praxisstandard festlegen</h2>
        <p className="text-small text-muted" style={{ margin: "0.35rem 0 0" }}>
          {snapshot.caseProfileTitle} – fehlende Definitionen dürfen später ergänzt werden.
        </p>
      </div>

      {snapshot.checkpoints.map((checkpoint) => {
        const catalogCheckpoint = getCheckpoint(checkpoint.checkpointId);
        const current = definitions[checkpoint.checkpointId] ?? { selectedAnchorIds: [], implementation: "" };
        const isDefined = definedCheckpointIds.has(checkpoint.checkpointId);
        const canDefine = current.selectedAnchorIds.length > 0 || current.implementation.trim().length > 0;
        return (
          <section key={checkpoint.checkpointId} className="card" style={{ display: "grid", gap: "0.75rem" }}>
            <div style={{ fontWeight: 600 }}>{checkpoint.checkpointTitle}</div>
            {catalogCheckpoint?.description && <p className="text-small text-muted" style={{ margin: 0 }}>{catalogCheckpoint.description}</p>}
            <div className="text-small text-muted">
              Praxisstandard: {isDefined ? "Definiert" : "Noch nicht definiert"}
            </div>
            <label>
              Zusätzliche Umsetzung (optional)
              <textarea
                value={current.implementation}
                onChange={(event) => updateDefinition(checkpoint.checkpointId, { implementation: event.target.value })}
                rows={3}
                style={{ width: "100%", boxSizing: "border-box", font: "inherit" }}
                placeholder="Optional ergänzen"
              />
            </label>
            {(catalogCheckpoint?.orientationAnchors ?? []).map((anchor) => (
              <label key={anchor.id} style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  checked={current.selectedAnchorIds.includes(anchor.id)}
                  onChange={() => updateDefinition(checkpoint.checkpointId, {
                    selectedAnchorIds: current.selectedAnchorIds.includes(anchor.id)
                      ? current.selectedAnchorIds.filter((id) => id !== anchor.id)
                      : [...current.selectedAnchorIds, anchor.id],
                  })}
                />
                <span>{anchor.text}</span>
              </label>
            ))}
            <button
              type="button"
              onClick={() => void saveDefinition(checkpoint.checkpointId)}
              disabled={saving || !canDefine}
            >
              {isDefined ? "Definition ändern" : "Definition übernehmen"}
            </button>
          </section>
        );
      })}

      {error && <p role="alert" style={{ color: "var(--destructive)", margin: 0 }}>{error}</p>}
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap", paddingTop: "0.75rem", borderTop: "1px solid var(--muted)" }}>
        <button type="button" onClick={() => void saveAndNavigate("/workflow-cases")} disabled={saving}>Zwischenspeichern</button>
        <button type="button" onClick={() => void saveAndNavigate("/workflow-cases/internal-protocol/draft/m3")} disabled={saving} style={{ marginLeft: "auto" }}>
          {saving ? "Speichern…" : "Weiter zu Entscheidungen →"}
        </button>
      </div>
    </div>
  );
}
