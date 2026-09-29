"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  isPracticeWorkflowSnapshot,
} from "@/lib/practiceProcesses/workflowSnapshot";
import type {
  PracticeWorkflowSnapshot,
} from "@/lib/practiceProcesses/workflowSnapshot";
import type { PracticeCheckpointDefinitionView } from "@/lib/practiceProcesses/practiceDefinition";
import {
  toggleAnchorSelection,
  DRAFT_SNAPSHOT_KEY,
  DRAFT_SOURCE_ID_KEY,
  DRAFT_SOURCE_TITLE_KEY,
} from "@/lib/workflow/internalProtocol/workflowSnapshotUpdater";
import { savePracticeWorkflowDraft } from "../_saveDraft";

export default function DraftM2Client() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<PracticeWorkflowSnapshot | null>(null);
  const [definitions, setDefinitions] = useState<Record<string, PracticeCheckpointDefinitionView>>({});
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
      void fetch(`/api/practice-checkpoint-definitions?${(parsed.checkpoints as Array<{ checkpointId: string }>).map((cp) => `checkpointId=${encodeURIComponent(cp.checkpointId)}`).join("&")}`)
        .then((response) => response.json() as Promise<{ ok?: boolean; definitions?: PracticeCheckpointDefinitionView[] }>)
        .then((data) => {
          if (data.ok && data.definitions) setDefinitions(Object.fromEntries(data.definitions.map((definition) => [definition.checkpointId, definition])));
        })
        .catch(() => undefined);
    } catch {
      router.replace("/workflow-cases/internal-protocol/new");
    }
  }, [router]);

  const handleToggle = useCallback(
    (checkpointId: string, anchorId: string) => {
      const current = definitions[checkpointId]?.selectedAnchorIds ?? [];
      const selectedAnchorIds = current.includes(anchorId)
        ? current.filter((id) => id !== anchorId)
        : [...current, anchorId];
      void fetch(`/api/practice-checkpoint-definitions/${encodeURIComponent(checkpointId)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ selectedAnchorIds, implementation: definitions[checkpointId]?.implementation ?? "" }),
      });
      setDefinitions((previous) => ({
        ...previous,
        [checkpointId]: previous[checkpointId]
          ? { ...previous[checkpointId], selectedAnchorIds }
          : previous[checkpointId],
      }));
      setSnapshot((prev) => {
        if (!prev) return prev;
        const next = toggleAnchorSelection(prev, checkpointId, anchorId);
        sessionStorage.setItem(DRAFT_SNAPSHOT_KEY, JSON.stringify(next));
        return next;
      });
    },
    [definitions],
  );

  async function handleSaveAndGoToM3() {
    if (!snapshot) return;
    setSaving(true);
    setError(null);
    const sourceId = sessionStorage.getItem(DRAFT_SOURCE_ID_KEY);
    const title = sessionStorage.getItem(DRAFT_SOURCE_TITLE_KEY) ?? snapshot.caseProfileTitle;
    const result = await savePracticeWorkflowDraft(snapshot, title, sourceId);
    setSaving(false);
    if (!result.ok) { setError(result.error); return; }
    sessionStorage.setItem(DRAFT_SOURCE_ID_KEY, result.id);
    router.push("/workflow-cases/internal-protocol/draft/m3");
  }

  async function handleZwischenspeichern() {
    if (!snapshot) return;
    setSaving(true);
    setError(null);
    const sourceId = sessionStorage.getItem(DRAFT_SOURCE_ID_KEY);
    const title = sessionStorage.getItem(DRAFT_SOURCE_TITLE_KEY) ?? snapshot.caseProfileTitle;
    const result = await savePracticeWorkflowDraft(snapshot, title, sourceId);
    setSaving(false);
    if (!result.ok) { setError(result.error); return; }
    sessionStorage.setItem(DRAFT_SOURCE_ID_KEY, result.id);
    router.push("/workflow-cases/internal-protocol/draft/save");
  }

  if (!snapshot) return null;

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div>
        <h2 style={{ margin: 0 }}>Praxisstandard festlegen</h2>
        <p className="text-small text-muted" style={{ margin: "0.35rem 0 0" }}>
          {snapshot.caseProfileTitle} – Wählen Sie aus, welche Punkte zu Ihrem Praxisstandard gehören sollen.
        </p>
      </div>

      {snapshot.checkpoints.map((cp) => {
        const cpDef = definitions[cp.checkpointId];
        const anchors = cpDef?.checkpointAnchors ?? [];
        return (
          <section key={cp.checkpointId} className="card" style={{ display: "grid", gap: "0.75rem" }}>
            <div style={{ fontWeight: 600 }}>{cp.checkpointTitle}</div>
            {cpDef?.checkpointDescription && (
              <p className="text-small text-muted" style={{ margin: 0 }}>
                {cpDef.checkpointDescription}
              </p>
            )}
            {anchors.length > 0 ? (
              <div style={{ display: "grid", gap: "0.5rem" }}>
                {anchors.map((anchor) => (
                  <label
                    key={anchor.id}
                    style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", cursor: "pointer" }}
                  >
                    <input
                      type="checkbox"
                      checked={cpDef.selectedAnchorIds.includes(anchor.id)}
                      onChange={() => handleToggle(cp.checkpointId, anchor.id)}
                      style={{ marginTop: "0.25rem", flexShrink: 0, accentColor: "var(--primary)" }}
                    />
                    <span className="text-small">{anchor.text}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-small text-muted" style={{ margin: 0 }}>
                Keine Auswahlpunkte für diesen Bereich.
              </p>
            )}
            <p className="text-small text-muted" style={{ margin: 0 }}>
              {cpDef ? "Bereits definiert" : "Noch nicht definiert"}
            </p>
          </section>
        );
      })}

      {error && <p style={{ color: "var(--destructive)", margin: 0 }}>{error}</p>}

      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          alignItems: "center",
          flexWrap: "wrap",
          paddingTop: "0.75rem",
          borderTop: "1px solid var(--muted)",
        }}
      >
        <button type="button" onClick={handleZwischenspeichern} disabled={saving}>
          Zwischenspeichern
        </button>
        <button
          type="button"
          onClick={handleSaveAndGoToM3}
          disabled={saving}
          style={{ marginLeft: "auto" }}
        >
          {saving ? "Speichern…" : "Weiter zu Entscheidungen →"}
        </button>
      </div>
    </div>
  );
}
