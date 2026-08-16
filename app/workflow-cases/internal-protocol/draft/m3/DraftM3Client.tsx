"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  isPracticeWorkflowSnapshot,
} from "@/lib/practiceProcesses/workflowSnapshot";
import type {
  PracticeWorkflowSnapshot,
  CheckpointDecision,
} from "@/lib/practiceProcesses/workflowSnapshot";
import {
  setCheckpointDecision,
  setUmsetzung,
  DRAFT_SNAPSHOT_KEY,
  DRAFT_SOURCE_ID_KEY,
  DRAFT_SOURCE_TITLE_KEY,
} from "@/lib/workflow/internalProtocol/workflowSnapshotUpdater";
import { allDecided } from "@/lib/workflow/internalProtocol/sessionStatus";
import { savePracticeWorkflowDraft } from "../_saveDraft";
import { getCheckpoint } from "@/lib/practiceProcesses";

const DECISION_OPTIONS: { value: CheckpointDecision; label: string }[] = [
  { value: "PFLICHT", label: "Pflicht" },
  { value: "OPTIONAL", label: "Optional" },
  { value: "NICHT_RELEVANT", label: "Nicht relevant" },
];

export default function DraftM3Client() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<PracticeWorkflowSnapshot | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(DRAFT_SNAPSHOT_KEY);
    if (!raw) { router.replace("/workflow-cases/internal-protocol/new"); return; }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isPracticeWorkflowSnapshot(parsed)) {
        router.replace("/workflow-cases/internal-protocol/new");
        return;
      }
      setSnapshot(parsed);
    } catch {
      router.replace("/workflow-cases/internal-protocol/new");
    }
  }, [router]);

  const handleDecision = useCallback(
    (checkpointId: string, decision: CheckpointDecision) => {
      setSnapshot((prev) => {
        if (!prev) return prev;
        const next = setCheckpointDecision(prev, checkpointId, decision);
        sessionStorage.setItem(DRAFT_SNAPSHOT_KEY, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  const handleUmsetzung = useCallback(
    (checkpointId: string, value: string) => {
      setSnapshot((prev) => {
        if (!prev) return prev;
        const next = setUmsetzung(prev, checkpointId, value);
        sessionStorage.setItem(DRAFT_SNAPSHOT_KEY, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  async function handleSaveAndGoToM4() {
    if (!snapshot) return;
    setSaving(true);
    setError(null);
    const sourceId = sessionStorage.getItem(DRAFT_SOURCE_ID_KEY);
    const title =
      sessionStorage.getItem(DRAFT_SOURCE_TITLE_KEY) ?? snapshot.caseProfileTitle;
    const result = await savePracticeWorkflowDraft(snapshot, title, sourceId);
    setSaving(false);
    if (!result.ok) { setError(result.error); return; }
    sessionStorage.setItem(DRAFT_SOURCE_ID_KEY, result.id);
    router.push("/workflow-cases/internal-protocol/draft/m4");
  }

  async function handleSpeichernWeiterarbeiten() {
    if (!snapshot) return;
    setSaving(true);
    setError(null);
    const sourceId = sessionStorage.getItem(DRAFT_SOURCE_ID_KEY);
    const title =
      sessionStorage.getItem(DRAFT_SOURCE_TITLE_KEY) ?? snapshot.caseProfileTitle;
    const result = await savePracticeWorkflowDraft(snapshot, title, sourceId);
    setSaving(false);
    if (!result.ok) { setError(result.error); return; }
    sessionStorage.setItem(DRAFT_SOURCE_ID_KEY, result.id);
    // Bleibt auf M3
  }

  const cpDefinitions = useMemo(
    () =>
      Object.fromEntries(
        (snapshot?.checkpoints ?? []).map((cp) => [
          cp.checkpointId,
          getCheckpoint(cp.checkpointId),
        ]),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [snapshot?.checkpoints.map((cp) => cp.checkpointId).join(",")],
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

      {snapshot.checkpoints.map((cp) => (
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
          <div style={{ fontWeight: 600 }}>{cp.checkpointTitle}</div>

          {cpDefinitions[cp.checkpointId]?.description && (
            <p className="text-small text-muted" style={{ margin: 0 }}>
              {cpDefinitions[cp.checkpointId]!.description}
            </p>
          )}

          {/* Ausgewählte Anchors aus M2 als Kontext */}
          {(() => {
            const cpDef = cpDefinitions[cp.checkpointId];
            const selectedIds = cp.selectedAnchorIds ?? [];
            const selected = (cpDef?.orientationAnchors ?? []).filter((a) =>
              selectedIds.includes(a.id),
            );
            if (selected.length === 0) return null;
            return (
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
            );
          })()}

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

          {(cp.decision === "PFLICHT" || cp.decision === "OPTIONAL") && (
            <textarea
              value={cp.umsetzung ?? ""}
              onChange={(e) => handleUmsetzung(cp.checkpointId, e.target.value)}
              placeholder="Wie setzt unsere Praxis diesen Checkpoint konkret um?"
              rows={2}
              style={{
                width: "100%",
                resize: "vertical",
                fontFamily: "inherit",
                fontSize: "0.875rem",
                padding: "0.4rem 0.5rem",
                border: "1px solid #d0d0d0",
                borderRadius: "0.3rem",
                boxSizing: "border-box",
              }}
            />
          )}
        </div>
      ))}

      {error && <p style={{ color: "red" }}>{error}</p>}

      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => router.push("/workflow-cases/internal-protocol/draft/m2")}
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

