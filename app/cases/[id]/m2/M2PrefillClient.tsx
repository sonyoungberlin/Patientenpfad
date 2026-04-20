"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const UNSAVED_WARNING =
  "Wenn Sie die Seite verlassen, gehen nicht gespeicherte Änderungen verloren.";
import type { ActiveCheckpoint } from "@/lib/types";
import { buildCaseM3Path } from "@/lib/flow/caseNavigation";
import {
  M2_QUESTIONS,
  type M2Answer,
  type M2PrefillData,
} from "@/lib/logic/m2Questions";

const ANSWER_OPTIONS: { value: M2Answer; label: string }[] = [
  { value: "ja", label: "Ja" },
  { value: "nein", label: "Nein" },
  { value: "unklar", label: "Unklar" },
];

export function M2PrefillClient({
  caseId,
  checkpoints,
  initialPrefill,
}: {
  caseId: string;
  checkpoints: ActiveCheckpoint[];
  initialPrefill: M2PrefillData;
}) {
  const router = useRouter();
  const [values, setValues] = useState<M2PrefillData>(() => {
    const init: M2PrefillData = {};
    for (const cp of checkpoints) {
      init[cp.id] = initialPrefill[cp.id] ?? {};
    }
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const isDirtyRef = useRef(false);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!isDirtyRef.current) return;
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

  function handleAnswer(checkpointId: string, questionId: string, answer: M2Answer) {
    setIsDirty(true);
    setValues((prev) => ({
      ...prev,
      [checkpointId]: {
        ...(prev[checkpointId] ?? {}),
        [questionId]: answer,
      },
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/cases/${caseId}/m2/prefill`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefill: values }),
      });

      if (!response.ok) {
        setError("Angaben konnten nicht gespeichert werden.");
        return;
      }

      setIsDirty(false);
      router.push(buildCaseM3Path(caseId));
    } catch {
      setError("Angaben konnten nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div id="m2-mfa-form" data-m2-mfa-form>
      {checkpoints.length === 0 ? (
        <p>Keine aktiven Checkpoints vorhanden.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {checkpoints.map((cp) => {
            const questions = M2_QUESTIONS[cp.id] ?? [];
            if (questions.length === 0) return null;
            const cpAnswers = values[cp.id] ?? {};
            return (
              <li
                key={cp.id}
                data-m2-checkpoint={cp.id}
                className="card"
                style={{ marginBottom: "0.75rem" }}
              >
                <div style={{ marginBottom: "0.75rem", fontWeight: 500 }}>
                  {cp.title}
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {questions.map((q) => (
                    <li
                      key={q.id}
                      data-m2-question={`${cp.id}:${q.id}`}
                      style={{ marginBottom: "0.75rem" }}
                    >
                      <div style={{ marginBottom: "0.4rem" }}>
                        {q.text}
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        {ANSWER_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            className={`answer-btn${cpAnswers[q.id] === opt.value ? " active" : ""}`}
                            data-m2-answer={`${cp.id}:${q.id}:${opt.value}`}
                            onClick={() => handleAnswer(cp.id, q.id, opt.value)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
      {error ? (
        <p className="text-error" role="alert" aria-live="polite">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className="btn-primary"
        data-m2-save
        onClick={() => void handleSave()}
        disabled={saving}
        style={{ marginTop: "1rem" }}
      >
        Speichern und weiter zur ärztlichen Checkliste
      </button>
    </div>
  );
}
