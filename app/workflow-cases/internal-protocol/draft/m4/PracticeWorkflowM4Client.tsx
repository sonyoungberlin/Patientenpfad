"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  isPracticeWorkflowDraftSnapshot,
} from "@/lib/practiceProcesses/workflowSnapshot";
import type { PracticeWorkflowDraftSnapshot } from "@/lib/practiceProcesses/workflowSnapshot";
import type { PracticeCheckpointDefinitionSnapshot } from "@/lib/practiceProcesses/practiceDefinition";
import { buildM4Text } from "@/lib/practiceProcesses/buildM4Text";
import { savePracticeWorkflowDraft } from "../_saveDraft";

export default function PracticeWorkflowM4Client() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<PracticeWorkflowDraftSnapshot | null>(null);
  const [definitions, setDefinitions] = useState<PracticeCheckpointDefinitionSnapshot[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyPublished, setAlreadyPublished] = useState(false);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("sessionId");
    if (!id) { router.replace("/workflow-cases/internal-protocol/new"); return; }
    setSessionId(id);
    void fetch(`/api/workflow-cases/${id}/protocol/save`)
      .then(async (res) => {
        const data = await res.json() as { ok?: boolean; snapshot?: unknown };
        if (!res.ok || !data.ok || !isPracticeWorkflowDraftSnapshot(data.snapshot)) throw new Error();
        setSnapshot(data.snapshot);
        const response = await fetch("/api/practice-checkpoint-definitions");
        const definitionsData = await response.json() as { definitions?: PracticeCheckpointDefinitionSnapshot[] };
        if (response.ok && Array.isArray(definitionsData.definitions)) {
          const ids = new Set(data.snapshot.checkpoints.map((checkpoint) => checkpoint.checkpointId));
          setDefinitions(definitionsData.definitions.filter((definition) => ids.has(definition.checkpointId)));
        }
      })
      .catch(() => router.replace("/workflow-cases"));
  }, [router]);

  async function handleCopy() {
    if (!snapshot || !sessionId) return;
    try {
      await navigator.clipboard.writeText(buildM4Text(snapshot, definitions));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard nicht verfügbar — kein Fehler anzeigen
    }
  }

  async function handlePublishToCatalog() {
    if (!snapshot || !sessionId) return;
    setFinishing(true);
    setError(null);
    const title = snapshot.caseProfileTitle;

    // 1. Entwurf speichern
    const saveResult = await savePracticeWorkflowDraft(snapshot, title, sessionId);
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

    if (publishData.alreadyPublished) {
      setAlreadyPublished(true);
      return;
    }

    router.push(`/practice/catalog/${publishData.id}`);
  }

  if (!snapshot) return null;

  const m4Text = buildM4Text(snapshot, definitions);

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
          onClick={() => router.push(`/workflow-cases/internal-protocol/draft/m3?sessionId=${encodeURIComponent(sessionId ?? "")}`)}
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
