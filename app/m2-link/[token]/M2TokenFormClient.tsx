"use client";

import { useState } from "react";
import { CheckpointPerspective, type ActiveCheckpoint } from "@/lib/types";
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

export function M2TokenFormClient({
  token,
  checkpoints,
}: {
  token: string;
  checkpoints: ActiveCheckpoint[];
}) {
  const [values, setValues] = useState<M2PrefillData>(() => {
    const init: M2PrefillData = {};
    for (const cp of checkpoints) {
      init[cp.id] = {};
    }
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleAnswer(
    checkpointId: string,
    questionId: string,
    answer: M2Answer,
  ) {
    setValues((prev) => ({
      ...prev,
      [checkpointId]: {
        ...(prev[checkpointId] ?? {}),
        [questionId]: answer,
      },
    }));
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/m2-link/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefill: values }),
      });

      if (!response.ok) {
        setError("Angaben konnten nicht übermittelt werden. Bitte versuchen Sie es erneut.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Angaben konnten nicht übermittelt werden. Bitte versuchen Sie es erneut.");
    } finally {
      setSaving(false);
    }
  }

  if (submitted) {
    return (
      <p data-m2-submitted style={{ marginTop: "1.5rem" }}>
        Vielen Dank, Ihre Angaben wurden übermittelt.
      </p>
    );
  }

  return (
    <div>
      {checkpoints.length === 0 ? (
        <p>Keine Fragen vorhanden.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {checkpoints.map((cp) => {
            // Primäre Sichtbarkeitsregel: Patientenformular zeigt nur Checkpoints
            // mit PATIENT-Perspektive (z. B. K10/K11 werden ausgeblendet).
            if (!cp.perspectives.includes(CheckpointPerspective.PATIENT)) return null;
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
                            onClick={() =>
                              handleAnswer(cp.id, q.id, opt.value)
                            }
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
        data-m2-submit
        onClick={() => void handleSubmit()}
        disabled={saving}
        style={{ marginTop: "1rem" }}
      >
        {saving ? "Wird übermittelt…" : "Absenden"}
      </button>
    </div>
  );
}
