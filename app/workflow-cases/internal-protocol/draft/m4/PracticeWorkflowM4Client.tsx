"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  isPracticeWorkflowSnapshot,
  markSnapshotCompleted,
} from "@/lib/practiceProcesses/workflowSnapshot";
import type { PracticeWorkflowSnapshot } from "@/lib/practiceProcesses/workflowSnapshot";
import {
  DRAFT_SNAPSHOT_KEY,
  DRAFT_SOURCE_ID_KEY,
  DRAFT_SOURCE_TITLE_KEY,
} from "@/lib/workflow/internalProtocol/workflowSnapshotUpdater";
import { savePracticeWorkflowDraft } from "../_saveDraft";

function buildM4Text(snapshot: PracticeWorkflowSnapshot): string {
  const lines: string[] = [];
  lines.push(`Praxisfall: ${snapshot.caseProfileTitle}`);
  lines.push("");

  const pflicht = snapshot.checkpoints.filter((cp) => cp.decision === "PFLICHT");
  const optional = snapshot.checkpoints.filter((cp) => cp.decision === "OPTIONAL");
  const nichtRelevant = snapshot.checkpoints.filter((cp) => cp.decision === "NICHT_RELEVANT");

  if (pflicht.length > 0) {
    lines.push("Pflicht:");
    for (const cp of pflicht) {
      lines.push(`- ${cp.checkpointTitle}`);
      if (cp.praxisprozess) lines.push(`  ${cp.praxisprozess}`);
    }
  }

  if (optional.length > 0) {
    if (pflicht.length > 0) lines.push("");
    lines.push("Optional:");
    for (const cp of optional) {
      lines.push(`- ${cp.checkpointTitle}`);
      if (cp.praxisprozess) lines.push(`  ${cp.praxisprozess}`);
    }
  }

  if (nichtRelevant.length > 0) {
    if (pflicht.length > 0 || optional.length > 0) lines.push("");
    lines.push("Nicht relevant:");
    for (const cp of nichtRelevant) {
      lines.push(`- ${cp.checkpointTitle}`);
    }
  }

  return lines.join("\n");
}

export default function PracticeWorkflowM4Client() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<PracticeWorkflowSnapshot | null>(null);
  const [copied, setCopied] = useState(false);
  const [finishing, setFinishing] = useState(false);
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

  async function handleAbschliessen() {
    if (!snapshot) return;
    setFinishing(true);
    setError(null);
    const completed = markSnapshotCompleted(snapshot);
    sessionStorage.setItem(DRAFT_SNAPSHOT_KEY, JSON.stringify(completed));
    const sourceId = sessionStorage.getItem(DRAFT_SOURCE_ID_KEY);
    const title =
      sessionStorage.getItem(DRAFT_SOURCE_TITLE_KEY) ?? snapshot.caseProfileTitle;
    const result = await savePracticeWorkflowDraft(completed, title, sourceId);
    setFinishing(false);
    if (!result.ok) { setError(result.error); return; }
    sessionStorage.removeItem(DRAFT_SNAPSHOT_KEY);
    sessionStorage.removeItem(DRAFT_SOURCE_ID_KEY);
    sessionStorage.removeItem(DRAFT_SOURCE_TITLE_KEY);
    router.push("/workflow-cases");
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

      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <button
          type="button"
          onClick={() => router.push("/workflow-cases/internal-protocol/draft/m3")}
        >
          ← Zurück zu M3
        </button>

        <button
          type="button"
          onClick={() => void handleAbschliessen()}
          disabled={finishing}
          style={{ marginLeft: "auto", fontWeight: 700 }}
        >
          {finishing ? "Wird gespeichert…" : "Abschließen"}
        </button>
      </div>
    </article>
  );
}
