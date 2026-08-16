"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isPracticeWorkflowSnapshot } from "@/lib/practiceProcesses/workflowSnapshot";
import type { PracticeWorkflowSnapshot } from "@/lib/practiceProcesses/workflowSnapshot";
import {
  DRAFT_SNAPSHOT_KEY,
  DRAFT_SOURCE_ID_KEY,
  DRAFT_SOURCE_TITLE_KEY,
} from "@/lib/workflow/internalProtocol/workflowSnapshotUpdater";
import { savePracticeWorkflowDraft } from "../_saveDraft";

export default function DraftSaveClient() {
  const router = useRouter();

  const [snapshot, setSnapshot] = useState<PracticeWorkflowSnapshot | null>(null);
  const [title, setTitle] = useState("");
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(DRAFT_SNAPSHOT_KEY);
    if (!raw) {
      router.replace("/workflow-cases/internal-protocol/new");
      return;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isPracticeWorkflowSnapshot(parsed)) {
        setSnapshot(parsed);
      } else {
        router.replace("/workflow-cases/internal-protocol/new");
        return;
      }
    } catch {
      router.replace("/workflow-cases/internal-protocol/new");
      return;
    }

    const sid = sessionStorage.getItem(DRAFT_SOURCE_ID_KEY);
    setSourceId(sid);

    const prefillTitle =
      sessionStorage.getItem(DRAFT_SOURCE_TITLE_KEY) ??
      (JSON.parse(sessionStorage.getItem(DRAFT_SNAPSHOT_KEY) ?? "{}") as { caseProfileTitle?: string }).caseProfileTitle ??
      "";
    if (prefillTitle) setTitle(prefillTitle);
  }, [router]);

  async function handleSave() {
    if (!snapshot || !title.trim()) return;
    setSaving(true);
    setSaveError(null);
    const result = await savePracticeWorkflowDraft(snapshot, title.trim(), sourceId);
    setSaving(false);
    if (!result.ok) {
      setSaveError(result.error);
      return;
    }
    sessionStorage.removeItem(DRAFT_SNAPSHOT_KEY);
    sessionStorage.removeItem(DRAFT_SOURCE_ID_KEY);
    sessionStorage.removeItem(DRAFT_SOURCE_TITLE_KEY);
    router.push("/workflow-cases");
  }

  if (!snapshot) {
    return <p className="text-muted">Entwurf wird geladen…</p>;
  }

  return (
    <article
      className="card"
      style={{ display: "grid", gap: "1rem", maxWidth: "36rem" }}
    >
      <div>
        <h2 style={{ margin: 0 }}>Entwurf speichern</h2>
        {sourceId && (
          <p className="text-small text-muted" style={{ margin: "0.35rem 0 0" }}>
            Die gespeicherte Sitzung wird aktualisiert.
          </p>
        )}
      </div>

      <div style={{ display: "grid", gap: "0.4rem" }}>
        <label htmlFor="draft-title" style={{ fontWeight: 600 }}>
          Titel
        </label>
        <input
          id="draft-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={snapshot.caseProfileTitle}
          maxLength={200}
          style={{
            padding: "0.4rem 0.6rem",
            border: "1px solid #ccc",
            borderRadius: "0.25rem",
            fontFamily: "inherit",
            fontSize: "inherit",
            width: "100%",
          }}
          autoFocus
        />
      </div>

      {saveError && (
        <p style={{ color: "#c00", margin: 0 }} role="alert">
          {saveError}
        </p>
      )}

      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <Link
          href="/workflow-cases/internal-protocol/draft/m3"
          style={{ marginRight: "auto" }}
        >
          ← Zurück
        </Link>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!title.trim() || saving}
        >
          {saving ? "Wird gespeichert…" : "Speichern"}
        </button>
      </div>
    </article>
  );
}

