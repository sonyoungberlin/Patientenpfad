"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  isPracticeWorkflowSnapshot,
} from "@/lib/practiceProcesses/workflowSnapshot";
import type {
  PracticeWorkflowSnapshot,
  OrientationAnswer,
} from "@/lib/practiceProcesses/workflowSnapshot";
import {
  updateOrientationAnswer,
  DRAFT_SNAPSHOT_KEY,
  DRAFT_SOURCE_ID_KEY,
  DRAFT_SOURCE_TITLE_KEY,
} from "@/lib/workflow/internalProtocol/workflowSnapshotUpdater";
import { savePracticeWorkflowDraft } from "../_saveDraft";
import { getCheckpoint } from "@/lib/practiceProcesses";

const ANSWER_OPTIONS: { value: OrientationAnswer; label: string }[] = [
  { value: "YES", label: "Ja" },
  { value: "NO", label: "Nein" },
  { value: "UNCLEAR", label: "Unklar" },
];

function answerSymbol(answer: OrientationAnswer): string {
  if (answer === "YES") return "✓";
  if (answer === "NO") return "✗";
  if (answer === "UNCLEAR") return "?";
  return "–";
}

export default function DraftM2Client() {
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

  // Catalog lookup; only rebuilt when checkpoint set changes
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

  const handleAnswer = useCallback(
    (anchorId: string, answer: OrientationAnswer) => {
      setSnapshot((prev) => {
        if (!prev) return prev;
        const next = updateOrientationAnswer(prev, anchorId, answer);
        sessionStorage.setItem(DRAFT_SNAPSHOT_KEY, JSON.stringify(next));
        return next;
      });
    },
    [],
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
    <article className="card" style={{ display: "grid", gap: "2rem", maxWidth: "44rem" }}>
      <div>
        <h2 style={{ margin: 0 }}>Orientierungsfragen</h2>
        <p className="text-small text-muted" style={{ margin: "0.35rem 0 0" }}>
          Praxisfall: {snapshot.caseProfileTitle}
        </p>
      </div>

      {snapshot.checkpoints.map((cp) => {
        const cpDef = cpDefinitions[cp.checkpointId];
        const anchors = cpDef?.orientationAnchors ?? [];
        return (
          <section key={cp.checkpointId} style={{ display: "grid", gap: "0.75rem" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>
              {cp.checkpointTitle}
            </h3>
            {cpDef?.description && (
              <p className="text-small text-muted" style={{ margin: 0 }}>
                {cpDef.description}
              </p>
            )}
            {cpDef?.orientationHint && (
              <p className="text-small" style={{ margin: 0, fontStyle: "italic", color: "var(--muted-foreground)" }}>
                {cpDef.orientationHint}
              </p>
            )}
            {anchors.length > 0 ? (
              <div style={{ display: "grid", gap: "0.75rem" }}>
                {anchors.map((anchor) => {
                  const answer = cp.orientationAnswers[anchor.id] ?? null;
                  return (
                    <div key={anchor.id} style={{ display: "grid", gap: "0.35rem" }}>
                      <div className="text-small">{anchor.text}</div>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        {ANSWER_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleAnswer(anchor.id, opt.value)}
                            style={{
                              minWidth: "5rem",
                              fontWeight: answer === opt.value ? 700 : 400,
                              outline:
                                answer === opt.value
                                  ? "2px solid currentColor"
                                  : "1px solid #d0d0d0",
                              background: answer === opt.value ? "#f0f7ff" : "#fff",
                            }}
                          >
                            {answerSymbol(opt.value)} {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-small text-muted" style={{ margin: 0 }}>
                Keine Orientierungsfragen für diesen Bereich.
              </p>
            )}
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
    </article>
  );
}
