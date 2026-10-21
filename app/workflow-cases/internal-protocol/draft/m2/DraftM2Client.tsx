"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  isPracticeWorkflowBuilderProjection,
  isPracticeWorkflowDraftSnapshot,
} from "@/lib/practiceProcesses/workflowSnapshot";
import type {
  PracticeWorkflowBuilderCheckpoint,
  PracticeWorkflowDraftSnapshot,
} from "@/lib/practiceProcesses/workflowSnapshot";
import type { PracticeCheckpointDefinitionRecord } from "@/lib/practiceProcesses/practiceDefinition";
import { getUnresolvedSelectedAnchorIds } from "@/lib/practiceProcesses/practiceDefinition";
import { savePracticeWorkflowDraft } from "../_saveDraft";

type EditableDefinition = Pick<PracticeCheckpointDefinitionRecord, "selectedAnchorIds" | "implementation">;

export default function DraftM2Client() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<PracticeWorkflowDraftSnapshot | null>(null);
  const [builderCheckpoints, setBuilderCheckpoints] = useState<PracticeWorkflowBuilderCheckpoint[]>([]);
  const [definitions, setDefinitions] = useState<Record<string, EditableDefinition>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("sessionId");
    if (!id) { router.replace("/workflow-cases/internal-protocol/new"); return; }
    setSessionId(id);
    void fetch(`/api/workflow-cases/${id}/protocol/save`)
      .then(async (res) => {
        const data = await res.json() as { ok?: boolean; snapshot?: unknown; builderCheckpoints?: unknown };
        if (
          !res.ok ||
          !data.ok ||
          !isPracticeWorkflowDraftSnapshot(data.snapshot) ||
          !isPracticeWorkflowBuilderProjection(data.snapshot, data.builderCheckpoints)
        ) throw new Error();
        setSnapshot(data.snapshot);
        setBuilderCheckpoints(data.builderCheckpoints);
        setDefinitions(Object.fromEntries(data.builderCheckpoints.map((checkpoint) => [
          checkpoint.checkpointId,
          checkpoint.definition ?? { selectedAnchorIds: [], implementation: "" },
        ])));
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
      setBuilderCheckpoints((current) => current.map((checkpoint) =>
        checkpoint.checkpointId === checkpointId
          ? { ...checkpoint, definition: data.definition! }
          : checkpoint,
      ));
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
        const builderCheckpoint = builderCheckpoints.find((item) => item.checkpointId === checkpoint.checkpointId)!;
        const current = definitions[checkpoint.checkpointId] ?? { selectedAnchorIds: [], implementation: "" };
        const isDefined = builderCheckpoint.definition !== null;
        const canDefine = current.selectedAnchorIds.length > 0 || current.implementation.trim().length > 0;
        const unresolvedAnchorIds = getUnresolvedSelectedAnchorIds(
          current.selectedAnchorIds,
          builderCheckpoint.orientationAnchors,
        );
        return (
          <section key={checkpoint.checkpointId} className="card" style={{ display: "grid", gap: "0.75rem" }}>
            <div style={{ fontWeight: 600 }}>{builderCheckpoint.title}</div>
            {builderCheckpoint.description && <p className="text-small text-muted" style={{ margin: 0 }}>{builderCheckpoint.description}</p>}
            {builderCheckpoint.orientationHint && (
              <p className="text-small text-muted" style={{ margin: 0 }}>
                Orientierung – keine verbindliche Praxisdefinition: {builderCheckpoint.orientationHint}
              </p>
            )}
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
            {unresolvedAnchorIds.length > 0 && (
              <div role="alert" className="text-small" style={{ color: "var(--destructive)" }}>
                Nicht mehr aktuelle Anchor-ID(s): {unresolvedAnchorIds.join(", ")}. Sie werden nicht auf statische
                Anker abgebildet.
                <button
                  type="button"
                  onClick={() => updateDefinition(checkpoint.checkpointId, {
                    selectedAnchorIds: current.selectedAnchorIds.filter((id) => !unresolvedAnchorIds.includes(id)),
                  })}
                  style={{ display: "block", marginTop: "0.35rem" }}
                >
                  Nicht mehr aktuelle Auswahl entfernen
                </button>
              </div>
            )}
            {builderCheckpoint.orientationAnchors.map((anchor) => (
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
        <button type="button" onClick={() => void saveAndNavigate("/workflow-cases/internal-protocol/new")} disabled={saving}>Zwischenspeichern</button>
        <button type="button" onClick={() => void saveAndNavigate("/workflow-cases/internal-protocol/draft/m3")} disabled={saving} style={{ marginLeft: "auto" }}>
          {saving ? "Speichern…" : "Weiter zu Entscheidungen →"}
        </button>
      </div>
    </div>
  );
}
