"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";

const UNSAVED_WARNING =
  "Wenn Sie die Seite verlassen, gehen nicht gespeicherte Änderungen verloren.";
import {
  type ActiveCheckpoint,
} from "@/lib/types";
import { buildCaseM3Path } from "@/lib/flow/caseNavigation";
import {
  buildMfaDocumentationText,
  getMfaDocumentationOptions,
} from "@/lib/logic/mfaDocumentation";
import {
  sanitizePrefillForMode,
  withDefaultOffenForCheckpoints,
  type M2Answer,
  type M2PrefillData,
} from "@/lib/logic/m2Questions";
import {
  M2_ASSESSMENT_GROUP_TITLE,
  selectM2Questionnaire,
} from "@/lib/logic/m2QuestionnaireSelection";

const ANSWER_OPTIONS: { value: M2Answer; label: string }[] = [
  { value: "ja", label: "Ja" },
  { value: "nein", label: "Nein" },
  { value: "unklar", label: "Unklar" },
];

export function M2PrefillClient({
  caseId,
  checkpoints,
  m1SnapshotInitial,
  initialPrefillBySource,
  initialPreparationMode = "none",
}: {
  caseId: string;
  checkpoints: ActiveCheckpoint[];
  m1SnapshotInitial?: unknown;
  initialPrefillBySource: {
    mfa: M2PrefillData;
    conversation: M2PrefillData;
  };
  initialPreparationMode?: string;
}) {
  const router = useRouter();
  const [valuesBySource, setValuesBySource] = useState(() => {
    const initialize = (prefill: M2PrefillData): M2PrefillData => {
      const init: M2PrefillData = {};
      for (const cp of checkpoints) init[cp.id] = prefill[cp.id] ?? {};
      return init;
    };
    return {
      mfa: initialize(initialPrefillBySource.mfa),
      conversation: initialize(initialPrefillBySource.conversation),
    };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirtySources, setDirtySources] = useState({ mfa: false, conversation: false });
  const [documentationActivityIds, setDocumentationActivityIds] = useState<string[]>([]);
  const [documentationNextStepIds, setDocumentationNextStepIds] = useState<string[]>([]);
  const [documentationAdditionalText, setDocumentationAdditionalText] = useState("");
  const [documentationCopied, setDocumentationCopied] = useState(false);
  const [documentationCopyError, setDocumentationCopyError] = useState<string | null>(null);
  const dirtySourcesRef = useRef(dirtySources);
  // Lokaler Modus, der nur die Fragenquelle bestimmt:
  // - "mfa"     → MFA-Standardweg (M2_QUESTIONS_MFA)
  // - "patient" → Patientengespräch in der Praxis (Quelle "conversation")
  // Asynchrone Patientenlink-Antworten (Quelle "patient") sind ein eigener Weg.
  // Persistenz/API/DB bleiben unverändert (immer derselbe Prefill-Endpunkt).
  // Initial wird der zuletzt gespeicherte Vorbereitungsweg übernommen,
  // damit ein bereits abgeschlossener Fall nicht beim erneuten Öffnen
  // unbemerkt vom MFA-Default überschrieben werden kann.
  const [mode, setMode] = useState<"mfa" | "patient">(() =>
    initialPreparationMode === "conversation"
      ? "patient"
      : "mfa",
  );
  const sourceForMode = mode === "patient" ? "conversation" : "mfa";
  const values = valuesBySource[sourceForMode];
  const documentationOptions = getMfaDocumentationOptions(m1SnapshotInitial, checkpoints);
  const documentationText = buildMfaDocumentationText(
    documentationOptions,
    documentationActivityIds,
    documentationNextStepIds,
    documentationAdditionalText,
  );

  async function copyDocumentation() {
    if (!documentationText) return;
    setDocumentationCopyError(null);
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(documentationText);
      setDocumentationActivityIds([]);
      setDocumentationNextStepIds([]);
      setDocumentationAdditionalText("");
      setDocumentationCopied(true);
    } catch {
      setDocumentationCopied(false);
      setDocumentationCopyError("Kurzdokumentation konnte nicht kopiert werden.");
    }
  }

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
    dirtySourcesRef.current = dirtySources;
  }, [dirtySources]);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (dirtySourcesRef.current.mfa || dirtySourcesRef.current.conversation) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!dirtySourcesRef.current.mfa && !dirtySourcesRef.current.conversation) return;
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
    setDirtySources((prev) => ({ ...prev, [sourceForMode]: true }));
    setValuesBySource((prev) => ({
      ...prev,
      [sourceForMode]: {
        ...prev[sourceForMode],
        [checkpointId]: {
          ...(prev[sourceForMode][checkpointId] ?? {}),
          [questionId]: answer,
        },
      },
    }));
  }

  async function handleSave(continueToM3: boolean) {
    setSaving(true);
    setError(null);

    try {
      // Vor dem Senden lokal nach aktivem Modus filtern, damit nie versehentlich
      // Antworten des jeweils anderen Wegs (z. B. nach Modus-Toggle) mitgeschickt
      // werden. Die Server-Route sanitisiert zusätzlich erneut.
      const persistedMode = sourceForMode;
      const cleanValues = sanitizePrefillForMode(valuesBySource[sourceForMode], persistedMode);
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
          draft: !continueToM3,
        }),
      });

      if (!response.ok) {
        setError("Angaben konnten nicht gespeichert werden.");
        return;
      }

      setDirtySources((prev) => ({ ...prev, [sourceForMode]: false }));
      if (continueToM3) router.push(buildCaseM3Path(caseId));
    } catch {
      setError("Angaben konnten nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div id="m2-mfa-form" data-m2-mfa-form>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          flexWrap: "wrap",
          marginBottom: "1rem",
        }}
      >
        <h2 data-m2-form-heading style={{ margin: 0 }}>
          {mode === "patient" ? "Patientengespräch" : "MFA-Vorbereitung"}
        </h2>
        <button
          type="button"
          className="btn-secondary"
          data-m2-print-button={mode === "patient" ? "conversation" : "mfa"}
          onClick={() => {
            const printMode = mode === "patient" ? "conversation" : "mfa";
            window.open(
              `/api/cases/${caseId}/m2/pdf?mode=${printMode}`,
              "_blank",
              "noopener,noreferrer",
            );
          }}
        >
          Druckversion
        </button>
      </div>
      {(() => {
        const selection = selectM2Questionnaire(
          checkpoints,
          mode === "patient" ? "conversation" : "mfa",
        );
        const { visibleCheckpoints, questionsByCheckpoint } = selection;

        if (visibleCheckpoints.length === 0) {
          if (mode === "mfa") {
            return <p>Für die MFA gibt es hier keine vorbereitenden Fragen.</p>;
          }
          return null;
        }

        const { k13EmbeddedInK12, k13Checkpoint, k12K13Groups } = selection;

        const renderQuestionItem = (
          checkpointId: string,
          q: { id: string; text: string },
          cpAnswers: Record<string, M2Answer | undefined>,
        ) => (
          <li
            key={`${checkpointId}:${q.id}`}
            data-m2-question={`${checkpointId}:${q.id}`}
            style={{ marginBottom: "0.5rem" }}
          >
            <div style={{ marginBottom: "0.25rem" }}>{q.text}</div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.4rem",
              }}
            >
              {ANSWER_OPTIONS.map((opt) => {
                const isActive = cpAnswers[q.id] === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`answer-btn${isActive ? " active" : ""}`}
                    data-m2-answer={`${checkpointId}:${q.id}:${opt.value}`}
                    onClick={() => handleAnswer(checkpointId, q.id, opt.value)}
                    style={{
                      minWidth: 0,
                      padding: "0.25rem 0.75rem",
                      fontSize: "0.9rem",
                      fontWeight: isActive ? 600 : 400,
                      background: isActive ? "var(--primary)" : undefined,
                      color: isActive ? "#fff" : undefined,
                      borderColor: isActive ? "var(--primary)" : undefined,
                      outline: isActive ? "none" : undefined,
                      outlineOffset: isActive ? 0 : undefined,
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </li>
        );

        const renderQuestionList = (
          checkpointId: string,
          qs: ReadonlyArray<{ id: string; text: string }>,
        ) => {
          const cpAnswers = values[checkpointId] ?? {};
          return (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {qs.map((q) => renderQuestionItem(checkpointId, q, cpAnswers))}
            </ul>
          );
        };

        const renderGroupedK12K13 = () => {
          const groupBlocks: ReactNode[] = [];
          k12K13Groups.forEach((group, gi) => {
            const groupItems = group.items.map(({ checkpointId, question }) =>
              renderQuestionItem(
                checkpointId,
                question,
                values[checkpointId] ?? {},
              ),
            );
            if (groupItems.length === 0) return;
            // Schritt 3: Sekundäre, ruhigere Darstellung für die reine
            // Status-/Doku-Gruppe "Durchgeführte Assessments". Reines CSS,
            // keine Änderung an Markup-Identitäten oder Antwort-Buttons.
            const isAssessments = group.title === M2_ASSESSMENT_GROUP_TITLE;
            groupBlocks.push(
              <div
                key={`grp-${gi}`}
                data-m2-group={group.title}
                data-m2-group-variant={isAssessments ? "secondary" : "primary"}
                style={{
                  marginTop: gi === 0 ? 0 : "1rem",
                  paddingTop: gi === 0 ? 0 : "0.75rem",
                  borderTop:
                    gi === 0 ? "none" : "1px solid var(--border, #e5e7eb)",
                  ...(isAssessments
                    ? {
                        marginTop: "1rem",
                        padding: "0.6rem 0.75rem",
                        background: "var(--surface-muted, #f5f6f8)",
                        border: "1px solid var(--border, #e5e7eb)",
                        borderRadius: "0.375rem",
                        fontSize: "0.9rem",
                        color: "var(--text-muted, #4b5563)",
                      }
                    : null),
                }}
              >
                <div
                  style={{
                    marginBottom: isAssessments ? "0.35rem" : "0.5rem",
                    fontWeight: 500,
                    fontSize: isAssessments ? "0.85rem" : "0.95rem",
                    textTransform: isAssessments ? "uppercase" : undefined,
                    letterSpacing: isAssessments ? "0.02em" : undefined,
                    color: isAssessments
                      ? "var(--text-muted, #6b7280)"
                      : undefined,
                  }}
                >
                  {group.title}
                </div>
                {isAssessments ? (
                  <div
                    style={{
                      marginBottom: "0.5rem",
                      fontSize: "0.8rem",
                      fontStyle: "italic",
                      color: "var(--text-muted, #6b7280)",
                    }}
                  >
                    Nur Status-/Dokumentationsfragen.
                  </div>
                ) : null}
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {groupItems}
                </ul>
              </div>,
            );
          });

          // Unsichtbare Wrapper, damit K13-Antworten weiterhin DOM-seitig
          // einem Checkpoint-Container zugeordnet werden können (Marker-Attr).
          return (
            <>
              {groupBlocks}
              <span
                hidden
                aria-hidden="true"
                data-m2-checkpoint-embedded="K13"
              />
            </>
          );
        };

        return (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {visibleCheckpoints.map((cp) => {
              // K13 wird in die K12-Karte eingebettet, wenn beide sichtbar sind
              // → keine eigene Hauptkarte für K13 in diesem Fall.
              if (k13EmbeddedInK12 && cp.id === "K13") return null;

              const questions = questionsByCheckpoint[cp.id] ?? [];
              // Im MFA-Modus: Block trotzdem rendern, aber mit Hinweistext statt Fragen.
              // Im Patienten-Modus: Checkpoint ohne Fragen ausblenden (bisheriges Verhalten).
              if (mode !== "mfa" && questions.length === 0) return null;

              const isK12WithK13 = cp.id === "K12" && k13EmbeddedInK12 && k13Checkpoint;
              const k13Questions = isK12WithK13
                ? questionsByCheckpoint[k13Checkpoint!.id] ?? []
                : [];
              // Schritt 2: Grouped-Layout greift nur, wenn beide Checkpoints
              // tatsächlich Fragen liefern (Patientenmodus). Im MFA-Modus
              // (keine K12/K13-Fragen) bleibt das Schritt-1-Fallback aktiv.
              const renderGrouped =
                isK12WithK13 && k12K13Groups.length > 0;
              const showK13Subsection =
                isK12WithK13 && !renderGrouped && (mode === "mfa" || k13Questions.length > 0);

              return (
                <li
                  key={cp.id}
                  data-m2-checkpoint={cp.id}
                  className="card"
                  style={{ marginBottom: "0.75rem", padding: "0.75rem 1rem" }}
                >
                  <div style={{ marginBottom: "0.75rem", fontWeight: 500 }}>
                    {cp.title}
                  </div>
                  {"introText" in cp && cp.introText ? (
                    <div style={{ marginBottom: "0.75rem", fontStyle: "italic" }}>
                      {cp.introText}
                    </div>
                  ) : null}
                  {renderGrouped ? (
                    renderGroupedK12K13()
                  ) : questions.length > 0 ? (
                    renderQuestionList(cp.id, questions)
                  ) : (
                    <p style={{ margin: 0, fontStyle: "italic" }}>
                      Für die MFA gibt es hier keine vorbereitenden Fragen.
                    </p>
                  )}
                  {showK13Subsection ? (
                    <div
                      data-m2-checkpoint-embedded={k13Checkpoint!.id}
                      style={{
                        marginTop: "1rem",
                        paddingTop: "0.75rem",
                        borderTop: "1px solid var(--border, #e5e7eb)",
                      }}
                    >
                      <div
                        style={{
                          marginBottom: "0.5rem",
                          fontWeight: 500,
                          fontSize: "0.95rem",
                        }}
                      >
                        Geriatrische Zusatzfragen
                      </div>
                      {"introText" in k13Checkpoint! && k13Checkpoint!.introText ? (
                        <div
                          style={{
                            marginBottom: "0.75rem",
                            fontStyle: "italic",
                          }}
                        >
                          {k13Checkpoint!.introText}
                        </div>
                      ) : null}
                      {k13Questions.length > 0 ? (
                        renderQuestionList(k13Checkpoint!.id, k13Questions)
                      ) : (
                        <p style={{ margin: 0, fontStyle: "italic" }}>
                          Für die MFA gibt es hier keine vorbereitenden Fragen.
                        </p>
                      )}
                    </div>
                  ) : null}
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
        className="btn-secondary"
        data-m2-save-draft
        onClick={() => void handleSave(false)}
        disabled={saving}
        style={{ marginTop: "1rem", marginRight: "0.5rem" }}
      >
        Entwurf speichern
      </button>
      <button
        type="button"
        className="btn-primary"
        data-m2-save
        onClick={() => void handleSave(true)}
        disabled={saving}
        style={{ marginTop: "1rem" }}
      >
        Speichern und weiter zur ärztlichen Checkliste
      </button>
      {mode === "mfa" && documentationOptions.activities.length > 0 ? (
        <section
          data-mfa-documentation
          aria-label="MFA-Kurzdokumentation"
          style={{ display: "grid", gap: "0.6rem", marginTop: "1.5rem" }}
        >
          <h3 style={{ margin: 0 }}>Kurzdokumentation fürs Krankenblatt</h3>
          <fieldset
            data-mfa-documentation-activities
            style={{ border: 0, margin: 0, padding: 0, display: "grid", gap: "0.25rem" }}
          >
            <legend>Was wurde gemacht?</legend>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 16rem), 1fr))", gap: "0.25rem 0.75rem" }}>
              {documentationOptions.activities.map((option) => (
                <label key={option.id} style={{ display: "flex", gap: "0.4rem", alignItems: "flex-start" }}>
                  <input
                    type="checkbox"
                    data-mfa-documentation-activity-option={option.id}
                    checked={documentationActivityIds.includes(option.id)}
                    onChange={() => {
                      setDocumentationActivityIds((current) =>
                        current.includes(option.id)
                          ? current.filter((id) => id !== option.id)
                          : [...current, option.id],
                      );
                      setDocumentationCopied(false);
                      setDocumentationCopyError(null);
                    }}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset
            data-mfa-documentation-next-steps
            style={{ border: 0, margin: 0, padding: 0, display: "grid", gap: "0.25rem" }}
          >
            <legend>Was ist als nächster organisatorischer Schritt vorgesehen?</legend>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 16rem), 1fr))", gap: "0.25rem 0.75rem" }}>
              {documentationOptions.nextSteps.map((option) => (
                <label key={option.id} style={{ display: "flex", gap: "0.4rem", alignItems: "flex-start" }}>
                  <input
                    type="checkbox"
                    data-mfa-documentation-next-step-option={option.id}
                    checked={documentationNextStepIds.includes(option.id)}
                    onChange={() => {
                      setDocumentationNextStepIds((current) =>
                        current.includes(option.id)
                          ? current.filter((id) => id !== option.id)
                          : [...current, option.id],
                      );
                      setDocumentationCopied(false);
                      setDocumentationCopyError(null);
                    }}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label style={{ display: "grid", gap: "0.25rem" }}>
            Ergänzung (optional)
            <textarea
              data-mfa-documentation-additional
              value={documentationAdditionalText}
              maxLength={160}
              rows={2}
              onChange={(event) => {
                setDocumentationAdditionalText(event.target.value);
                setDocumentationCopied(false);
                setDocumentationCopyError(null);
              }}
            />
          </label>
          <p
            data-mfa-documentation-preview
            aria-live="polite"
            style={{ margin: 0, whiteSpace: "pre-wrap" }}
          >
            {documentationText || "Tätigkeit und nächsten organisatorischen Schritt auswählen."}
          </p>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn-secondary"
              data-mfa-documentation-copy
              disabled={!documentationText}
              onClick={() => void copyDocumentation()}
            >
              {documentationCopied ? "Kopiert ✓" : "Kurzdokumentation kopieren"}
            </button>
            {documentationCopyError ? (
              <span className="text-error" role="alert">{documentationCopyError}</span>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
