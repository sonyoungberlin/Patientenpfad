"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CheckpointCategory, type ActiveCheckpoint } from "@/lib/types";
import { M2_QUESTIONS, type M2PrefillData } from "@/lib/logic/m2Questions";
import { resolveM5Text } from "@/lib/logic/deriveM5Output";

const UNSAVED_WARNING =
  "Wenn Sie die Seite verlassen, gehen nicht gespeicherte Änderungen verloren.";

const MESSAGE_INTRO =
  "Liebe Patientin, lieber Patient,\n" +
  "für Ihre weitere Versorgung bitten wir Sie, folgende Punkte zu beachten:";

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

function getAnswerSymbol(answer: string): string {
  if (answer === "ja") return "✓";
  if (answer === "nein") return "✗";
  if (answer === "unklar") return "?";
  return "";
}

export function M3ChecklistClient({
  caseId,
  initialCheckpoints,
  prefill = {},
  m2Status = "none",
  messageSignature = "",
}: {
  caseId: string;
  initialCheckpoints: ActiveCheckpoint[];
  prefill?: M2PrefillData;
  m2Status?: string;
  messageSignature?: string;
}) {
  const router = useRouter();
  const isLocked = m2Status === "waiting_for_patient";
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
  const [skipping, setSkipping] = useState(false);
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
        e.stopImmediatePropagation();
      }
    }
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);
  const m4Lines = checkpoints
    .filter((cp) => cp.status === "TO_DO")
    .map((cp) => cp.m4?.text ?? "")
    .filter((text) => text.length > 0);
  const m4TextBlock = m4Lines.join("\n");

  const m5Lines = checkpoints.map((cp) => resolveM5Text(cp));
  const m5TextBlock = m5Lines.join("\n");

  const [copiedM4, setCopiedM4] = useState(false);
  const [copiedM5, setCopiedM5] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  const hasSignature = messageSignature.trim().length > 0;

  const messagePreview = hasSignature
    ? `${MESSAGE_INTRO}\n\n${m4TextBlock}\n\n${messageSignature.trim()}`
    : `${MESSAGE_INTRO}\n\n${m4TextBlock}`;

  function fallbackCopyText(text: string): boolean {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    document.body.removeChild(textarea);
    return ok;
  }

  async function copyToClipboard(text: string): Promise<boolean> {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // fall through to fallback
      }
    }
    return fallbackCopyText(text);
  }

  async function copyM4Text() {
    if (!m4TextBlock) return;
    const ok = await copyToClipboard(m4TextBlock);
    if (ok) {
      setCopiedM4(true);
      setTimeout(() => setCopiedM4(false), 2000);
    } else {
      setError("Text konnte nicht kopiert werden.");
    }
  }

  async function copyMessageText() {
    if (!m4TextBlock || !hasSignature) return;
    const messageText = `${MESSAGE_INTRO}\n\n${m4TextBlock}\n\n${messageSignature.trim()}`;
    const ok = await copyToClipboard(messageText);
    if (ok) {
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2000);
    } else {
      setError("Nachricht konnte nicht kopiert werden.");
    }
  }

  async function copyM5Text() {
    if (!m5TextBlock) return;
    const ok = await copyToClipboard(m5TextBlock);
    if (ok) {
      setCopiedM5(true);
      setTimeout(() => setCopiedM5(false), 2000);
    } else {
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

  async function skipM2Waiting() {
    setSkipping(true);
    setError(null);
    try {
      const response = await fetch(`/api/cases/${caseId}/m2-skip`, {
        method: "PATCH",
      });
      if (!response.ok) {
        setError("Freischalten fehlgeschlagen.");
        return;
      }
      router.refresh();
    } catch {
      setError("Freischalten fehlgeschlagen.");
    } finally {
      setSkipping(false);
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
      {m2Status === "waiting_for_patient" ? (
        <div
          data-m2-waiting-banner
          role="status"
          className="banner-warning"
        >
          <strong>Patientenfragebogen-Link wurde versendet. Es wird auf Antworten gewartet.</strong>
          <div style={{ marginTop: "0.5rem" }}>
            <button
              type="button"
              data-skip-m2-waiting
              onClick={() => void skipM2Waiting()}
              disabled={skipping}
            >
              {skipping ? "Wird freigeschaltet…" : "Patientenfragen überspringen und ärztlich fortfahren"}
            </button>
          </div>
        </div>
      ) : null}
      {m2Status === "skipped" ? (
        <p
          data-m2-skipped-notice
          className="text-muted"
          style={{ marginBottom: "1rem", fontStyle: "italic" }}
        >
          Patientenfragebogen wurde übersprungen.
        </p>
      ) : null}
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
              className="card"
              style={{
                marginBottom: "0.75rem",
                opacity: isLocked ? 0.5 : 1,
              }}
            >
              <div style={{ marginBottom: "0.5rem", fontWeight: 500 }}>{checkpoint.title}</div>
              {hasAnswers ? (
                <details
                  data-m2-prefill={checkpoint.id}
                  style={{ marginBottom: "0.5rem" }}
                >
                  <summary>Aus M2:</summary>
                  <ul style={{ margin: "0.25rem 0 0 0", paddingLeft: "1rem", listStyle: "none" }}>
                    {Object.entries(cpAnswers).map(([qId, answer]) => {
                      const question = questions.find((q) => q.id === qId);
                      const symbol = getAnswerSymbol(answer);
                      return (
                        <li key={qId} style={{ marginBottom: "0.25rem" }}>
                          <span>{question ? question.text : qId}</span>
                          {" — "}
                          <span style={{ fontWeight: 500 }}>{symbol} {answer}</span>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              ) : null}
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {getStatusOptions(checkpoint.category).map((statusOption) => (
                  <button
                    key={statusOption}
                    type="button"
                    className={`answer-btn${checkpoint.status === statusOption ? " active" : ""}`}
                    data-status-button={`${checkpoint.id}:${statusOption}`}
                    onClick={() => void updateStatus(checkpoint.id, statusOption)}
                    disabled={savingCheckpointId === checkpoint.id || isLocked}
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
        <p className="text-error" role="alert" aria-live="polite">
          {error}
        </p>
      ) : null}
      <section style={{ marginTop: "1.5rem" }}>
        <h2>Patientenhinweise / To-dos</h2>
        {m4Lines.length > 0 ? (
          <>
            <pre
              data-message-preview
              style={{
                marginBottom: "0.75rem",
                padding: "1rem",
                border: "1px solid #e0e0e0",
                borderRadius: "0.5rem",
                backgroundColor: "#fafafa",
                userSelect: "text",
                cursor: "text",
                whiteSpace: "pre-wrap",
              }}
            >
              {messagePreview}
            </pre>
            <button
              type="button"
              onClick={() => void copyM4Text()}
            >
              {copiedM4 ? "Kopiert ✓" : "Text kopieren"}
            </button>
            <div style={{ marginTop: "0.5rem" }}>
              <button
                type="button"
                data-copy-message
                onClick={() => void copyMessageText()}
                disabled={!hasSignature}
              >
                {copiedMessage ? "Kopiert ✓" : "Nachricht kopieren"}
              </button>
              {!hasSignature && (
                <p
                  data-signature-hint
                  className="text-muted text-small"
                  style={{ marginTop: "0.25rem", marginBottom: 0 }}
                >
                  Bitte hinterlegen Sie zuerst eine Signatur in der Fallübersicht.
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="text-muted">Keine weiteren Schritte erforderlich.</p>
        )}
      </section>
      <section style={{ marginTop: "1.5rem" }}>
        <h2>Dokumentation für das Krankenblatt</h2>
        <pre style={{ marginBottom: "0.75rem", userSelect: "text", cursor: "text" }}>
          {m5TextBlock}
        </pre>
        <button type="button" onClick={() => void copyM5Text()}>
          {copiedM5 ? "Kopiert ✓" : "Dokumentation kopieren"}
        </button>
      </section>
      <section className="section-divider">
        <button
          type="button"
          className="btn-primary"
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
