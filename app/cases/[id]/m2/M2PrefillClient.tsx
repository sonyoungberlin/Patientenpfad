"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const UNSAVED_WARNING =
  "Wenn Sie die Seite verlassen, gehen nicht gespeicherte Änderungen verloren.";
import {
  CheckpointPerspective,
  isMultiSelectCheckpoint,
  type ActiveCheckpoint,
} from "@/lib/types";
import { buildCaseM3Path } from "@/lib/flow/caseNavigation";
import {
  M2_QUESTIONS,
  M2_QUESTIONS_MFA,
  sanitizePrefillForMode,
  withDefaultOffenForCheckpoints,
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
  initialPreparationMode = "none",
  answeredCheckpointIdsBySource = { mfa: [], conversation: [], patient: [] },
}: {
  caseId: string;
  checkpoints: ActiveCheckpoint[];
  initialPrefill: M2PrefillData;
  initialPreparationMode?: string;
  /**
   * Pro Quelle: Checkpoint-IDs, die bereits in einem eingefrorenen Run
   * dieser Quelle Antworten haben. Diese Checkpoints werden in M2 nicht
   * mehr als aktive Eingabe angezeigt (sie sind im Prefill-Fenster der
   * Quelle bereits ausgefüllt).
   */
  answeredCheckpointIdsBySource?: {
    mfa: string[];
    conversation: string[];
    patient: string[];
  };
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
  // Lokaler Modus, der nur die Fragenquelle bestimmt:
  // - "mfa"     → MFA-Standardweg (M2_QUESTIONS_MFA)
  // - "patient" → Patientengespräch in der Praxis (M2_QUESTIONS)
  // Persistenz/API/DB bleiben unverändert (immer derselbe Prefill-Endpunkt).
  // Initial wird der zuletzt gespeicherte Vorbereitungsweg übernommen,
  // damit ein bereits abgeschlossener Fall nicht beim erneuten Öffnen
  // unbemerkt vom MFA-Default überschrieben werden kann.
  const [mode, setMode] = useState<"mfa" | "patient">(() =>
    initialPreparationMode === "conversation" || initialPreparationMode === "patient"
      ? "patient"
      : "mfa",
  );

  useEffect(() => {
    function handleSetMode(e: Event) {
      const detail = (e as CustomEvent<"mfa" | "patient">).detail;
      if (detail === "mfa" || detail === "patient") {
        setMode(detail);
      }
    }
    window.addEventListener("m2-set-mode", handleSetMode);
    return () => window.removeEventListener("m2-set-mode", handleSetMode);
  }, []);

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
      // Vor dem Senden lokal nach aktivem Modus filtern, damit nie versehentlich
      // Antworten des jeweils anderen Wegs (z. B. nach Modus-Toggle) mitgeschickt
      // werden. Die Server-Route sanitisiert zusätzlich erneut.
      const persistedMode = mode === "patient" ? "conversation" : "mfa";
      const cleanValues = sanitizePrefillForMode(values, persistedMode);
      // Verbindliche Regel: Nach dem Speichern müssen alle Fragen aller
      // aktiven Checkpoints im Prefill enthalten sein. Fehlende Antworten
      // werden hier explizit auf "offen" gesetzt, bevor der Request raus geht.
      const checkpointIds = checkpoints.map((cp) => cp.id);
      const filledValues = withDefaultOffenForCheckpoints(
        cleanValues,
        checkpointIds,
        persistedMode,
      );

      const response = await fetch(`/api/cases/${caseId}/m2/prefill`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prefill: filledValues,
          // Lokaler Modus → persistierter preparation_mode:
          // - "mfa"     → "mfa"
          // - "patient" (Patientengespräch in der Praxis) → "conversation"
          mode: persistedMode,
        }),
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
      <h2 data-m2-form-heading style={{ marginTop: 0, marginBottom: "1rem" }}>
        {mode === "patient" ? "Patientengespräch" : "MFA-Vorbereitung"}
      </h2>
      {(() => {
        // Per-Source-Filter: Nur Checkpoints anzeigen, die für die aktuelle
        // Quelle noch nicht in einem eingefrorenen Run beantwortet wurden.
        // "patient"-Modus nutzt die "conversation"-Quelle (Patientengespräch
        // in der Praxis wird als source="conversation" gespeichert).
        const sourceForMode = mode === "patient" ? "conversation" : "mfa";
        const answeredSet = new Set(
          answeredCheckpointIdsBySource[sourceForMode] ?? [],
        );
        // Primäre Sichtbarkeitsregel: nur Checkpoints rendern, deren perspectives
        // die aktive Vorbereitungsperspektive enthält.
        const perspectiveForMode =
          mode === "patient"
            ? CheckpointPerspective.PATIENT
            : CheckpointPerspective.MFA;
        const visibleCheckpoints = checkpoints.filter((cp) => {
          if (answeredSet.has(cp.id)) return false;
          // MULTI_SELECT-Checkpoints sind M3-only → immer aus M2 ausblenden.
          if (isMultiSelectCheckpoint(cp)) return false;
          // Im MFA-Modus alle nicht beantworteten Standard-Checkpoints anzeigen,
          // auch wenn sie keine MFA-Perspektive haben (Hinweistext statt Fragen).
          if (mode === "mfa") return true;
          return cp.perspectives.includes(perspectiveForMode);
        });

        if (visibleCheckpoints.length === 0) {
          if (mode === "mfa") {
            return <p>Für die MFA gibt es hier keine vorbereitenden Fragen.</p>;
          }
          return null;
        }

        return (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {visibleCheckpoints.map((cp) => {
              const questionCatalog =
                mode === "patient" ? M2_QUESTIONS : M2_QUESTIONS_MFA;
              const questions = questionCatalog[cp.id] ?? [];
              // Im MFA-Modus: Block trotzdem rendern, aber mit Hinweistext statt Fragen.
              // Im Patienten-Modus: Checkpoint ohne Fragen ausblenden (bisheriges Verhalten).
              if (mode !== "mfa" && questions.length === 0) return null;
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
                  {"introText" in cp && cp.introText ? (
                    <div style={{ marginBottom: "0.75rem", fontStyle: "italic" }}>
                      {cp.introText}
                    </div>
                  ) : null}
                  {questions.length > 0 ? (
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
                  ) : (
                    <p style={{ margin: 0, fontStyle: "italic" }}>
                      Für die MFA gibt es hier keine vorbereitenden Fragen.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        );
      })()}
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
