"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  isPracticeWorkflowSnapshot,
  markSnapshotCompleted,
} from "@/lib/practiceProcesses/workflowSnapshot";
import type { PracticeWorkflowSnapshot } from "@/lib/practiceProcesses/workflowSnapshot";
import { buildM4Text } from "@/lib/practiceProcesses/buildM4Text";
import {
  DRAFT_SNAPSHOT_KEY,
  DRAFT_SOURCE_ID_KEY,
  DRAFT_SOURCE_TITLE_KEY,
} from "@/lib/workflow/internalProtocol/workflowSnapshotUpdater";
import { savePracticeWorkflowDraft } from "../_saveDraft";

export default function PracticeWorkflowM4Client() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<PracticeWorkflowSnapshot | null>(null);
  const [copied, setCopied] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyPublished, setAlreadyPublished] = useState(false);

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

  async function handleCopy() {
    if (!snapshot) return;
    try {
      await navigator.clipboard.writeText(buildM4Text(snapshot));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard nicht verfügbar — kein Fehler anzeigen
    }
  }

  async function handlePublishToCatalog() {
    if (!snapshot) return;
    setFinishing(true);
    setError(null);
    const completed = markSnapshotCompleted(snapshot);
    sessionStorage.setItem(DRAFT_SNAPSHOT_KEY, JSON.stringify(completed));
    const sourceId = sessionStorage.getItem(DRAFT_SOURCE_ID_KEY);
    const title =
      sessionStorage.getItem(DRAFT_SOURCE_TITLE_KEY) ?? snapshot.caseProfileTitle;

    // 1. Entwurf speichern (PATCH oder POST)
    const saveResult = await savePracticeWorkflowDraft(completed, title, sourceId);
    if (!saveResult.ok) {
      setFinishing(false);
      setError(saveResult.error);
      return;
    }

    // 2. In Praxiskatalog publizieren
    let publishRes: Response;
    try {
      publishRes = await fetch("/api/practice-catalog/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: saveResult.id, title }),
      });
    } catch {
      setFinishing(false);
      setError("Netzwerkfehler beim Publizieren.");
      return;
    }

    const publishData = await publishRes.json() as {
      ok: boolean;
      id?: string;
      alreadyPublished?: boolean;
      error?: string;
    };

    setFinishing(false);

    if (!publishRes.ok || !publishData.ok) {
      setError(publishData.error ?? "Fehler beim Publizieren.");
      return;
    }

    // Entwurfsdaten aus sessionStorage bereinigen
    sessionStorage.removeItem(DRAFT_SNAPSHOT_KEY);
    sessionStorage.removeItem(DRAFT_SOURCE_ID_KEY);
    sessionStorage.removeItem(DRAFT_SOURCE_TITLE_KEY);

    if (publishData.alreadyPublished) {
      setAlreadyPublished(true);
      return;
    }

    router.push(`/practice/catalog/${publishData.id}`);
  }

  if (!snapshot) return null;

  const m4Text = buildM4Text(snapshot);

  return (
    <article className="card" style={{ display: "grid", gap: "1.25rem", maxWidth: "44rem" }}>
      <div>
        <h2 style={{ margin: 0 }}>Dokumentation</h2>
        <p className="text-small text-muted" style={{ margin: "0.35rem 0 0" }}>
          Praxisfall: {snapshot.caseProfileTitle}
        </p>
      </div>

      <p className="text-small text-muted" style={{ margin: 0 }}>
        Kopieren Sie den folgenden Text für Ihre Praxis-Dokumentation.
      </p>

      <pre
        style={{
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          background: "#f5f7fa",
          padding: "1rem",
          borderRadius: "0.35rem",
          fontFamily: "inherit",
          fontSize: "0.9rem",
          margin: 0,
          border: "1px solid #e0e0e0",
        }}
      >
        {m4Text}
      </pre>

      <div>
        <button type="button" onClick={() => void handleCopy()}>
          {copied ? "✓ Kopiert" : "Text kopieren"}
        </button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {alreadyPublished && (
        <p style={{ color: "#555", fontStyle: "italic", margin: 0 }}>
          Dieser Prozess wurde bereits in Ihren Praxiskatalog aufgenommen.
        </p>
      )}

      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <button
          type="button"
          onClick={() => router.push("/workflow-cases/internal-protocol/draft/m3")}
        >
          ← Zurück zu M3
        </button>

        {!alreadyPublished && (
          <button
            type="button"
            onClick={() => void handlePublishToCatalog()}
            disabled={finishing}
            style={{ marginLeft: "auto", fontWeight: 700 }}
          >
            {finishing ? "Wird veröffentlicht…" : "In Praxiskatalog aufnehmen"}
          </button>
        )}
      </div>
    </article>
  );
}
