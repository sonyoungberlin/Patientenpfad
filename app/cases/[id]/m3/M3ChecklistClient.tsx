"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CheckpointCategory, type ActiveCheckpoint } from "@/lib/types";
import { M2_QUESTIONS, type M2PrefillData } from "@/lib/logic/m2Questions";

const UNSAVED_WARNING =
  "Wenn Sie die Seite verlassen, gehen nicht gespeicherte Änderungen verloren.";

type CheckpointStatus = "OK" | "TO_DO" | "ZURÜCKSTELLEN";

type M3Checkpoint = Omit<ActiveCheckpoint, "status"> & {
  status: CheckpointStatus;
};

function normalizeStatus(checkpoint: ActiveCheckpoint): CheckpointStatus {
  if (checkpoint.category === CheckpointCategory.M) {
    return checkpoint.status === "OK" ||
      checkpoint.status === "TO_DO" ||
      checkpoint.status === "ZURÜCKSTELLEN"
      ? checkpoint.status
      : "TO_DO";
  }

  return checkpoint.status === "OK" ? "OK" : "TO_DO";
}

function getStatusOptions(category: CheckpointCategory): CheckpointStatus[] {
  if (category === CheckpointCategory.M) {
    return ["OK", "TO_DO", "ZURÜCKSTELLEN"];
  }
  return ["OK", "TO_DO"];
}

function getStatusLabel(status: CheckpointStatus): string {
  if (status === "OK") return "ausreichend";
  if (status === "TO_DO") return "nicht ausreichend";
  return "zurückgestellt";
}

export function M3ChecklistClient({
  caseId,
  initialCheckpoints,
  prefill = {},
}: {
  caseId: string;
  initialCheckpoints: ActiveCheckpoint[];
  prefill?: M2PrefillData;
}) {
  const router = useRouter();
  const [checkpoints, setCheckpoints] = useState<M3Checkpoint[]>(
    initialCheckpoints.map((checkpoint) => ({
      ...checkpoint,
      status: normalizeStatus(checkpoint),
    })),
  );
  const [savingCheckpointId, setSavingCheckpointId] = useState<string | null>(
    null,
  );
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef<string | null>(null);

  useEffect(() => {
    savingRef.current = savingCheckpointId;
  }, [savingCheckpointId]);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (savingRef.current !== null) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (savingRef.current === null) return;
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor || !anchor.href) return;
      try {
        const url = new URL(anchor.href);
        if (url.origin !== window.location.origin) return;
      } catch {
        return;
      }
      if (!window.confirm(UNSAVED_WARNING)) {
        e.preventDefault();
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);
  const m4Lines = checkpoints
    .filter((cp) => cp.status === "TO_DO")
    .map((cp) => cp.m4?.text ?? "")
    .filter((text) => text.length > 0);
  const m4TextBlock = m4Lines.join("\n");

  const m5Lines = checkpoints.map((cp) => {
    if (cp.category === CheckpointCategory.M) {
      if (cp.status === "OK") return `${cp.title} ist ausreichend geklärt.`;
      if (cp.status === "TO_DO")
        return `${cp.title} ist aktuell nicht ausreichend geklärt.`;
      return `${cp.title} ist unklar.`;
    }
    // category O – only OK | TO_DO
    return cp.status === "OK"
      ? `${cp.title} ist geklärt.`
      : `${cp.title} ist aktuell nicht ausreichend geklärt.`;
  });
  const m5TextBlock = m5Lines.join("\n");

  async function copyM4Text() {
    if (!m4TextBlock) {
      return;
    }

    try {
      await navigator.clipboard.writeText(m4TextBlock);
    } catch {
      setError("Text konnte nicht kopiert werden.");
    }
  }

  async function copyM5Text() {
    if (!m5TextBlock) {
      return;
    }

    try {
      await navigator.clipboard.writeText(m5TextBlock);
    } catch {
      setError("Dokumentation konnte nicht kopiert werden.");
    }
  }

  async function updateStatus(checkpointId: string, status: CheckpointStatus) {
    const previous = checkpoints;

    setError(null);
    setSavingCheckpointId(checkpointId);
    setCheckpoints((current) =>
      current.map((checkpoint) =>
        checkpoint.id === checkpointId ? { ...checkpoint, status } : checkpoint,
      ),
    );

    try {
      const response = await fetch(`/api/cases/${caseId}/checkpoint/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checkpoint_id: checkpointId,
          status,
        }),
      });

      if (!response.ok) {
        setCheckpoints(previous);
        setError("Status konnte nicht gespeichert werden.");
      }
    } catch {
      setCheckpoints(previous);
      setError("Status konnte nicht gespeichert werden.");
    } finally {
      setSavingCheckpointId(null);
    }
  }

  async function closeCase() {
    setClosing(true);
    setError(null);
    try {
      const response = await fetch(`/api/cases/${caseId}/close`, {
        method: "PATCH",
      });
      if (!response.ok) {
        setError("Fall konnte nicht abgeschlossen werden.");
        return;
      }
      router.push("/cases");
    } catch {
      setError("Fall konnte nicht abgeschlossen werden.");
    } finally {
      setClosing(false);
    }
  }

  return (
    <section>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {checkpoints.map((checkpoint) => {
          const cpAnswers = prefill[checkpoint.id];
          const hasAnswers =
            cpAnswers !== undefined && Object.keys(cpAnswers).length > 0;
          const questions = M2_QUESTIONS[checkpoint.id] ?? [];
          return (
            <li
              key={checkpoint.id}
              data-checkpoint-item={checkpoint.id}
              style={{
                border: "1px solid #ddd",
                padding: "0.75rem",
                marginBottom: "0.75rem",
              }}
            >
              <div style={{ marginBottom: "0.5rem" }}>{checkpoint.title}</div>
              {hasAnswers ? (
                <details
                  data-m2-prefill={checkpoint.id}
                  style={{ fontSize: "0.85em", color: "#555", marginBottom: "0.5rem" }}
                >
                  <summary>Aus M2:</summary>
                  <ul style={{ margin: "0.25rem 0 0 0", paddingLeft: "1rem" }}>
                    {Object.entries(cpAnswers).map(([qId, answer]) => {
                      const question = questions.find((q) => q.id === qId);
                      return (
                        <li key={qId}>
                          {question ? question.text : qId}: {answer}
                        </li>
                      );
                    })}
                  </ul>
                </details>
              ) : null}
              <div style={{ marginBottom: "0.5rem" }}>
                Status: {getStatusLabel(checkpoint.status)}
              </div>
              <div>
                {getStatusOptions(checkpoint.category).map((statusOption) => (
                  <button
                    key={statusOption}
                    type="button"
                    data-status-button={`${checkpoint.id}:${statusOption}`}
                    onClick={() => void updateStatus(checkpoint.id, statusOption)}
                    disabled={savingCheckpointId === checkpoint.id}
                    style={{
                      marginRight: "0.5rem",
                      fontWeight:
                        checkpoint.status === statusOption ? "bold" : "normal",
                    }}
                  >
                    {getStatusLabel(statusOption)}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      {error ? (
        <p role="alert" aria-live="polite">
          {error}
        </p>
      ) : null}
      <section style={{ marginTop: "1.5rem" }}>
        <h2>Patientenhinweise / To-dos</h2>
        {m4Lines.length > 0 ? (
          <>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                margin: "0 0 0.75rem 0",
                fontFamily: "inherit",
              }}
            >
              {m4TextBlock}
            </pre>
            <button
              type="button"
              onClick={copyM4Text}
            >
              Text kopieren
            </button>
          </>
        ) : (
          <p>Keine weiteren Schritte erforderlich.</p>
        )}
      </section>
      <section style={{ marginTop: "1.5rem" }}>
        <h2>Dokumentation für das Krankenblatt</h2>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            margin: "0 0 0.75rem 0",
            fontFamily: "inherit",
          }}
        >
          {m5TextBlock}
        </pre>
        <button type="button" onClick={copyM5Text}>
          Dokumentation kopieren
        </button>
      </section>
      <section style={{ marginTop: "2rem", borderTop: "1px solid #ddd", paddingTop: "1.5rem" }}>
        <button
          type="button"
          data-close-case
          onClick={closeCase}
          disabled={closing || savingCheckpointId !== null}
        >
          {closing ? "Wird abgeschlossen…" : "Fall abschließen"}
        </button>
      </section>
    </section>
  );
}
