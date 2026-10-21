"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  isPracticeWorkflowBuilderProjection,
  isPracticeWorkflowDraftSnapshot,
} from "@/lib/practiceProcesses/workflowSnapshot";
import type {
  PracticeWorkflowBuilderCheckpoint,
  PracticeWorkflowDraftSnapshot,
  CheckpointDecision,
} from "@/lib/practiceProcesses/workflowSnapshot";
import {
  isPracticeCheckpointDefinitionDefined,
  getUnresolvedSelectedAnchorIds,
} from "@/lib/practiceProcesses/practiceDefinition";
import {
  setCheckpointDecision,
} from "@/lib/workflow/internalProtocol/workflowSnapshotUpdater";
import { allDecided } from "@/lib/workflow/internalProtocol/sessionStatus";
import { savePracticeWorkflowDraft } from "../_saveDraft";

const DECISION_OPTIONS: { value: CheckpointDecision; label: string }[] = [
  { value: "PFLICHT", label: "Pflicht" },
  { value: "OPTIONAL", label: "Optional" },
  { value: "NICHT_RELEVANT", label: "Nicht relevant" },
];

export default function DraftM3Client() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<PracticeWorkflowDraftSnapshot | null>(null);
  const [builderCheckpoints, setBuilderCheckpoints] = useState<PracticeWorkflowBuilderCheckpoint[]>([]);
  const [saving, setSaving] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
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
      })
      .catch(() => router.replace("/workflow-cases"));
  }, [router]);

  const handleDecision = useCallback(
    (checkpointId: string, decision: CheckpointDecision) => {
      setSnapshot((prev) => {
        if (!prev) return prev;
        const next = setCheckpointDecision(prev, checkpointId, decision);
        return next;
      });
    },
    [],
  );

  async function handleSaveAndGoToM4() {
    if (!snapshot || !sessionId) return;
    setSaving(true);
    setError(null);
    const result = await savePracticeWorkflowDraft(snapshot, snapshot.caseProfileTitle, sessionId);
    setSaving(false);
    if (!result.ok) { setError(result.error); return; }
    router.push(`/workflow-cases/internal-protocol/draft/m4?sessionId=${encodeURIComponent(result.id)}`);
  }

  async function handleSpeichernWeiterarbeiten() {
    if (!snapshot || !sessionId) return;
    setSaving(true);
    setError(null);
    const result = await savePracticeWorkflowDraft(snapshot, snapshot.caseProfileTitle, sessionId);
    setSaving(false);
    if (!result.ok) { setError(result.error); return; }
    // Bleibt auf M3
  }

  const cpDefinitions = useMemo(
    () => Object.fromEntries(builderCheckpoints.map((checkpoint) => [
      checkpoint.checkpointId,
      {
        description: checkpoint.description,
        orientationHint: checkpoint.orientationHint,
        orientationAnchors: checkpoint.orientationAnchors,
        selectedAnchorIds: checkpoint.definition?.selectedAnchorIds ?? [],
        implementation: checkpoint.definition?.implementation ?? "",
        isDefined: checkpoint.definition
          ? isPracticeCheckpointDefinitionDefined(checkpoint.definition)
          : false,
      },
    ])),
    [builderCheckpoints],
  );

  if (!snapshot) return null;

  const canGoToM4 = allDecided(snapshot);

  return (
    <article className="card" style={{ display: "grid", gap: "1.5rem", maxWidth: "44rem" }}>
      <div>
        <h2 style={{ margin: 0 }}>Entscheidungen</h2>
        <p className="text-small text-muted" style={{ margin: "0.35rem 0 0" }}>
          Praxisfall: {snapshot.caseProfileTitle}
        </p>
      </div>

      {snapshot.checkpoints.map((cp) => {
        const builderCheckpoint = builderCheckpoints.find((item) => item.checkpointId === cp.checkpointId)!;
        const cpDefinition = cpDefinitions[cp.checkpointId];
        const selectedIds = cpDefinition?.selectedAnchorIds ?? [];
        const selected = (cpDefinition?.orientationAnchors ?? []).filter((anchor) =>
          selectedIds.includes(anchor.id),
        );
        const unresolvedAnchorIds = getUnresolvedSelectedAnchorIds(
          selectedIds,
          builderCheckpoint.orientationAnchors,
        );
        return (
        <div
          key={cp.checkpointId}
          style={{
            display: "grid",
            gap: "0.75rem",
            padding: "1rem",
            border: "1px solid #e0e0e0",
            borderRadius: "0.4rem",
            background: cp.decision ? "#f8fffe" : "#fff",
          }}
        >
          <div style={{ fontWeight: 600 }}>{builderCheckpoint.title}</div>

          {cpDefinition?.description && (
            <p className="text-small text-muted" style={{ margin: 0 }}>
              {cpDefinition.description}
            </p>
          )}
          {cpDefinition?.orientationHint && (
            <p className="text-small text-muted" style={{ margin: 0 }}>
              Orientierung – keine verbindliche Praxisdefinition: {cpDefinition.orientationHint}
            </p>
          )}

          {/* Ausgewählte Anchors aus M2 als Kontext */}
          {selected.length > 0 && (
              <div>
                <div className="text-small text-muted" style={{ marginBottom: "0.35rem" }}>
                  Für den Standard ausgewählt:
                </div>
                <div style={{ display: "grid", gap: "0.2rem", paddingLeft: "0.5rem" }}>
                  {selected.map((anchor) => (
                    <div key={anchor.id} className="text-small">
                      – {anchor.text}
                    </div>
                  ))}
                </div>
              </div>
          )}
          {unresolvedAnchorIds.length > 0 && (
            <p role="alert" className="text-small" style={{ color: "var(--destructive)", margin: 0 }}>
              Gespeicherte Auswahl enthält nicht mehr aktuelle Anchor-ID(s): {unresolvedAnchorIds.join(", ")}.
              Sie werden nicht durch statische Anker ersetzt.
            </p>
          )}

          {/* Entscheidungsknöpfe */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {DECISION_OPTIONS.map((opt) => {
              const isSelected = cp.decision === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleDecision(cp.checkpointId, opt.value)}
                  style={{
                    fontWeight: isSelected ? 700 : 400,
                    outline: isSelected ? "2px solid currentColor" : "1px solid #d0d0d0",
                    background: isSelected ? "#f0f7ff" : "#fff",
                    minWidth: "8rem",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div style={{ display: "grid", gap: "0.35rem", padding: "0.65rem", background: "#f7f9fb", border: "1px solid #dfe5ea" }}>
            <strong className="text-small">Aktueller Praxisstandard</strong>
            {cpDefinitions[cp.checkpointId]?.isDefined ? (
              cpDefinitions[cp.checkpointId]?.implementation ? (
                <span className="text-small">{cpDefinitions[cp.checkpointId]!.implementation}</span>
              ) : (
                <span className="text-small text-muted">Nur ausgewählte Kriterien</span>
              )
            ) : (
              <span className="text-small text-muted">Noch nicht definiert.</span>
            )}
          </div>
        </div>
        );
      })}

      {error && <p style={{ color: "red" }}>{error}</p>}

      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => router.push(`/workflow-cases/internal-protocol/draft/m2?sessionId=${encodeURIComponent(sessionId ?? "")}`)}
        >
          ← Zurück zu M2
        </button>

        <button
          type="button"
          onClick={handleSpeichernWeiterarbeiten}
          disabled={saving}
          style={{ marginLeft: "auto" }}
        >
          Speichern und weiterarbeiten
        </button>

        <button
          type="button"
          onClick={handleSaveAndGoToM4}
          disabled={saving || !canGoToM4}
          title={canGoToM4 ? undefined : "Bitte für alle Checkpoints eine Entscheidung treffen"}
        >
          {saving ? "Speichern…" : "Zu M4 →"}
        </button>
      </div>
    </article>
  );
}
