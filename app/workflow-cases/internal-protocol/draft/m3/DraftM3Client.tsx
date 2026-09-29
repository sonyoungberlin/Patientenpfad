"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  isPracticeWorkflowSnapshot,
} from "@/lib/practiceProcesses/workflowSnapshot";
import type {
  PracticeWorkflowSnapshot,
  CheckpointDecision,
} from "@/lib/practiceProcesses/workflowSnapshot";
import type { PracticeCheckpointDefinitionVersionSnapshot } from "@/lib/practiceProcesses/practiceDefinition";
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
  const [versionsByCheckpoint, setVersionsByCheckpoint] = useState<Record<string, PracticeCheckpointDefinitionVersionSnapshot[]>>({});
  const [selectedVersions, setSelectedVersions] = useState<Record<string, string>>({});
  const [attachingCheckpoint, setAttachingCheckpoint] = useState<string | null>(null);
  const [draftPersisted, setDraftPersisted] = useState(false);

  async function refreshDefinitionVersions(checkpointIds: string[]) {
    const entries = await Promise.all(checkpointIds.map(async (checkpointId) => {
      const response = await fetch(`/api/practice-checkpoint-definitions/${checkpointId}`);
      const data = await response.json() as { ok?: boolean; versions?: PracticeCheckpointDefinitionVersionSnapshot[] };
      return [checkpointId, response.ok && data.ok && Array.isArray(data.versions) ? data.versions : []] as const;
    }));
    setVersionsByCheckpoint(Object.fromEntries(entries));
  }
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const revisionId = new URLSearchParams(window.location.search).get("sessionId");
    const raw = sessionStorage.getItem(DRAFT_SNAPSHOT_KEY);
    if (revisionId) {
      void fetch(`/api/workflow-cases/${revisionId}/protocol/save`)
        .then(async (res) => {
          const data = await res.json() as {
            ok?: boolean;
            id?: string;
            title?: string | null;
            snapshot?: unknown;
          };
          if (!res.ok || !data.ok || typeof data.id !== "string" || !isPracticeWorkflowSnapshot(data.snapshot)) {
            throw new Error("Revision konnte nicht geladen werden.");
          }
          sessionStorage.setItem(DRAFT_SNAPSHOT_KEY, JSON.stringify(data.snapshot));
          sessionStorage.setItem(DRAFT_SOURCE_ID_KEY, data.id);
          setDraftPersisted(true);
          if (data.title) sessionStorage.setItem(DRAFT_SOURCE_TITLE_KEY, data.title);
          setSnapshot(data.snapshot);
        })
        .catch(() => router.replace("/workflow-cases"));
      return;
    }
    if (!raw) { router.replace("/workflow-cases/internal-protocol/new"); return; }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isPracticeWorkflowSnapshot(parsed)) {
        router.replace("/workflow-cases/internal-protocol/new");
        return;
      }
      setSnapshot(parsed);
      setDraftPersisted(Boolean(sessionStorage.getItem(DRAFT_SOURCE_ID_KEY)));
    } catch {
      router.replace("/workflow-cases/internal-protocol/new");
    }
  }, [router]);

  useEffect(() => {
    if (!snapshot) return;
    let cancelled = false;
    const checkpointIds = [...new Set(snapshot.checkpoints.map((checkpoint) => checkpoint.checkpointId))];
    void refreshDefinitionVersions(checkpointIds).catch(() => {
      if (!cancelled) setVersionsByCheckpoint({});
    });
    return () => { cancelled = true; };
  }, [snapshot]);

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
    setDraftPersisted(true);
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
    setDraftPersisted(true);
    // Bleibt auf M3
  }

  async function handleAttachDefinition(checkpointId: string) {
    const sourceId = sessionStorage.getItem(DRAFT_SOURCE_ID_KEY);
    const versionId = selectedVersions[checkpointId];
    if (!sourceId || !versionId) return;
    setAttachingCheckpoint(checkpointId);
    setError(null);
    try {
      const response = await fetch(`/api/workflow-cases/${sourceId}/practice-definition`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkpointId, versionId }),
      });
      const data = await response.json() as { ok?: boolean; error?: string; version?: PracticeCheckpointDefinitionVersionSnapshot };
      if (!response.ok || !data.ok || !data.version) {
        setError(data.error ?? "Definitionsversion konnte nicht übernommen werden.");
        return;
      }
      setSnapshot((previous) => {
        if (!previous) return previous;
        const next = {
          ...previous,
          checkpoints: previous.checkpoints.map((checkpoint) =>
            checkpoint.checkpointId === checkpointId
              ? { ...checkpoint, practiceDefinitionVersion: data.version }
              : checkpoint,
          ),
        };
        sessionStorage.setItem(DRAFT_SNAPSHOT_KEY, JSON.stringify(next));
        return next;
      });
    } catch {
      setError("Netzwerkfehler beim Übernehmen der Definitionsversion.");
    } finally {
      setAttachingCheckpoint(null);
    }
  }

  const cpDefinitions = useMemo(
    () =>
      Object.fromEntries(
        (snapshot?.checkpoints ?? []).map((cp) => {
          const catalogDef = getCheckpoint(cp.checkpointId);
          return [
            cp.checkpointId,
            {
              description: cp.checkpointDescription ?? catalogDef?.description,
              orientationAnchors:
                cp.checkpointAnchors ?? catalogDef?.orientationAnchors ?? [],
            },
          ];
        }),
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
        <button
          type="button"
          className="text-small"
          onClick={() => void refreshDefinitionVersions(snapshot.checkpoints.map((checkpoint) => checkpoint.checkpointId))}
        >
          Freigegebene Definitionsversionen aktualisieren
        </button>
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

          {cp.decision !== "NICHT_RELEVANT" && (
            <div style={{ display: "grid", gap: "0.45rem", padding: "0.65rem", background: "#f7f9fb", border: "1px solid #dfe5ea" }}>
              <strong className="text-small">Praxisdefinition</strong>
              {cp.practiceDefinitionVersion ? (
                <span className="text-small text-muted">
                  Version {cp.practiceDefinitionVersion.version} übernommen
                </span>
              ) : (
                <span className="text-small text-muted">Noch keine Version in diesen Entwurf übernommen.</span>
              )}
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                <Link href={`/practice/checkpoint-definitions/${cp.checkpointId}`} target="_blank" className="text-small">
                  Definition bearbeiten/freigeben
                </Link>
                <select
                  aria-label={`Definitionsversion für ${cp.checkpointTitle}`}
                  value={selectedVersions[cp.checkpointId] ?? ""}
                  onChange={(event) => setSelectedVersions((previous) => ({ ...previous, [cp.checkpointId]: event.target.value }))}
                  disabled={!draftPersisted || (versionsByCheckpoint[cp.checkpointId] ?? []).length === 0}
                >
                  <option value="">Version auswählen</option>
                  {(versionsByCheckpoint[cp.checkpointId] ?? []).map((version) => (
                    <option key={version.versionId} value={version.versionId}>
                      Version {version.version}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void handleAttachDefinition(cp.checkpointId)}
                  disabled={attachingCheckpoint !== null || !selectedVersions[cp.checkpointId] || !draftPersisted}
                >
                  {attachingCheckpoint === cp.checkpointId ? "Übernahme…" : "Ausgewählte Version übernehmen"}
                </button>
              </div>
            </div>
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

