"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  InternalProtocolWorkflowSnapshot,
  ProtocolWorkflowCheckpoint,
  ProtocolWorkflowAnswerValue,
  ProtocolWorkflowAnswers,
  PracticeProcessMode,
} from "@/lib/workflow/internalProtocol/workflowAdapter";
import { getPracticeProcessMode } from "@/lib/workflow/internalProtocol/workflowAdapter";
import {
  getPatientWithoutAppointmentSections,
  TARGET_STATE_QUESTION_TEXTS,
} from "@/lib/workflow/internalProtocol/patientWithoutAppointment";
import {
  M2_STEP_CONFIGS,
  TARGET_STATE_KERNFRAGEN,
  getM2StepConfig,
} from "@/lib/workflow/internalProtocol/synthesis";
import type { ProtocolSection } from "@/lib/workflow/internalProtocol/questions";

type Props = {
  sessionId: string;
  step: number;
  snapshot: InternalProtocolWorkflowSnapshot;
};

// ---------------------------------------------------------------------------
// Fragen-Eingabe (ein Aspekt)
// ---------------------------------------------------------------------------

function QuestionInput({
  section,
  checkpoint,
  mode,
  inheritedQuestionIds,
  onChange,
}: {
  section: ProtocolSection;
  checkpoint: ProtocolWorkflowCheckpoint;
  mode: PracticeProcessMode;
  inheritedQuestionIds?: string[];
  onChange: (questionId: string, value: ProtocolWorkflowAnswerValue) => void;
}) {
  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      {section.questions.map((q) => {
        const answer = checkpoint.answers[q.id] ?? null;
        const questionText =
          mode === "TARGET_STATE"
            ? (TARGET_STATE_QUESTION_TEXTS[q.id] ?? q.text)
            : q.text;
        // Herkunftslabel erscheint nur, wenn die Frage-ID noch in inheritedQuestionIds ist
        // (d. h. die Antwort wurde seit der Übernahme nicht geändert)
        const isInherited =
          inheritedQuestionIds !== undefined &&
          inheritedQuestionIds.includes(q.id);
        return (
          <div key={q.id} style={{ display: "grid", gap: "0.5rem" }}>
            <div style={{ display: "flex", gap: "0.35rem", alignItems: "baseline" }}>
              <span style={{ fontWeight: 600 }}>{questionText}</span>
              {!q.required && (
                <span className="text-small text-muted">(optional)</span>
              )}
            </div>
            {q.hint && (
              <p className="text-small text-muted" style={{ margin: 0 }}>
                {q.hint}
              </p>
            )}
            {isInherited && (
              <p className="text-small text-muted" style={{ margin: 0 }}>
                Aus der Bestandsaufnahme übernommen – kann geändert werden.
              </p>
            )}

            {/* YES_NO_UNCLEAR */}
            {q.kind === "YES_NO_UNCLEAR" && (
              <div style={{ display: "flex", gap: "0.4rem" }}>
                {(["YES", "NO", "UNCLEAR"] as const).map((val) => {
                  const isActive = answer === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => onChange(q.id, isActive ? null : val)}
                      style={{
                        fontWeight: isActive ? 700 : 400,
                        outline: isActive ? "2px solid currentColor" : undefined,
                      }}
                    >
                      {val === "YES" ? "Ja" : val === "NO" ? "Nein" : "Unklar"}
                    </button>
                  );
                })}
              </div>
            )}

            {/* SINGLE_SELECT */}
            {q.kind === "SINGLE_SELECT" && (
              <div style={{ display: "grid", gap: "0.3rem" }}>
                {q.options.map((opt) => {
                  const isActive = answer === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onChange(q.id, isActive ? null : opt.id)}
                      style={{
                        textAlign: "left",
                        fontWeight: isActive ? 700 : 400,
                        outline: isActive ? "2px solid currentColor" : undefined,
                        padding: "0.35rem 0.6rem",
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* MULTI_SELECT */}
            {q.kind === "MULTI_SELECT" && (
              <div style={{ display: "grid", gap: "0.3rem" }}>
                {q.options.map((opt) => {
                  const selected = Array.isArray(answer) ? answer : [];
                  const isActive = selected.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        const next = isActive
                          ? selected.filter((id) => id !== opt.id)
                          : [...selected, opt.id];
                        onChange(q.id, next.length > 0 ? next : null);
                      }}
                      style={{
                        textAlign: "left",
                        fontWeight: isActive ? 700 : 400,
                        outline: isActive ? "2px solid currentColor" : undefined,
                        padding: "0.35rem 0.6rem",
                      }}
                    >
                      {isActive ? "☑ " : "☐ "}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* FREE_TEXT */}
            {q.kind === "FREE_TEXT" && (
              <textarea
                value={typeof answer === "string" ? answer : ""}
                onChange={(e) => onChange(q.id, e.target.value || null)}
                placeholder={q.placeholder ?? ""}
                rows={3}
                style={{
                  width: "100%",
                  padding: "0.4rem",
                  border: "1px solid #ccc",
                  borderRadius: "0.25rem",
                  fontFamily: "inherit",
                  fontSize: "inherit",
                  resize: "vertical",
                }}
              />
            )}
          </div>
        );
      })}

      {/* Rechtlicher und fachlicher Hintergrund (einklappbar) */}
      {section.officialRules.length > 0 && (
        <details style={{ marginTop: "0.25rem" }}>
          <summary
            className="text-small text-muted"
            style={{ cursor: "pointer", userSelect: "none" }}
          >
            Rechtlicher und fachlicher Hintergrund
          </summary>
          <div
            style={{
              display: "grid",
              gap: "0.5rem",
              padding: "0.75rem",
              background: "#f5f7fa",
              borderRadius: "0.25rem",
              marginTop: "0.35rem",
            }}
          >
            {section.officialRules.map((rule) => (
              <div key={rule.id} style={{ display: "grid", gap: "0.2rem" }}>
                <span
                  className="text-small"
                  style={{
                    fontWeight: 600,
                    color:
                      rule.bindingLevel === "MANDATORY"
                        ? "#c00"
                        : rule.bindingLevel === "RECOMMENDED"
                          ? "#555"
                          : "#777",
                  }}
                >
                  {rule.bindingLevel === "MANDATORY"
                    ? "Verbindlich"
                    : rule.bindingLevel === "RECOMMENDED"
                      ? "Empfohlen"
                      : "Orientierung"}{" "}
                  – {rule.source.reference ?? rule.source.author}
                </span>
                <span className="text-small">{rule.text}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Haupt-Komponente
// ---------------------------------------------------------------------------

const TOTAL_STEPS = M2_STEP_CONFIGS.length;

export default function InternalProtocolM2StepClient({
  sessionId,
  step,
  snapshot,
}: Props) {
  const router = useRouter();
  const allSections = useMemo(() => getPatientWithoutAppointmentSections(), []);

  const mode = getPracticeProcessMode(snapshot);
  const stepConfig = getM2StepConfig(step);
  const section = stepConfig
    ? allSections.find((s) => s.id === stepConfig.sectionId)
    : undefined;

  const perspectiveHint =
    mode === "TARGET_STATE"
      ? "Legen Sie fest, wie Ihre Praxis in dieser Situation künftig vorgehen soll."
      : "Beschreiben Sie, wie Ihre Praxis heute in dieser Situation vorgeht.";

  const kernfrage =
    mode === "TARGET_STATE" && stepConfig
      ? (TARGET_STATE_KERNFRAGEN[stepConfig.sectionId] ?? stepConfig.kernfrage)
      : stepConfig?.kernfrage;

  // Kompletter Checkpoint-State für alle Aspekte (wird beim Speichern vollständig übermittelt)
  const [checkpoints, setCheckpoints] = useState<ProtocolWorkflowCheckpoint[]>(
    () => snapshot.checkpoints,
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const currentCheckpoint = checkpoints.find(
    (cp) => cp.id === stepConfig?.sectionId,
  );

  const handleAnswerChange = useCallback(
    (questionId: string, value: ProtocolWorkflowAnswerValue) => {
      if (!stepConfig) return;
      setCheckpoints((prev) =>
        prev.map((cp) =>
          cp.id === stepConfig.sectionId
            ? { ...cp, answers: { ...cp.answers, [questionId]: value } }
            : cp,
        ),
      );
    },
    [stepConfig],
  );

  async function saveCheckpoints(): Promise<boolean> {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/workflow-cases/${sessionId}/protocol/save`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkpoints }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !(data as { ok?: boolean }).ok) {
        setSaveError(
          (data as { error?: string }).error ?? "Speichern fehlgeschlagen.",
        );
        return false;
      }
      return true;
    } catch {
      setSaveError("Netzwerkfehler beim Speichern.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleForward() {
    const ok = await saveCheckpoints();
    if (!ok) return;
    if (step < TOTAL_STEPS) {
      router.push(`/workflow-cases/${sessionId}/protocol/m2/${step + 1}`);
    } else {
      router.push(`/workflow-cases/${sessionId}/protocol/m3`);
    }
  }

  if (!stepConfig || !section || !currentCheckpoint) {
    return (
      <section className="card">
        <p className="text-muted">Aspekt nicht gefunden.</p>
      </section>
    );
  }

  const isLastStep = step === TOTAL_STEPS;
  const backHref =
    step === 1
      ? `/workflow-cases/${sessionId}/protocol`
      : `/workflow-cases/${sessionId}/protocol/m2/${step - 1}`;

  return (
    <section className="card" style={{ display: "grid", gap: "1.25rem" }}>
      {/* Fortschrittsanzeige */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span className="text-small text-muted">
          Aspekt {step} von {TOTAL_STEPS}
        </span>
        <div style={{ display: "flex", gap: "0.25rem" }}>
          {M2_STEP_CONFIGS.map((c) => (
            <div
              key={c.step}
              style={{
                width: "1.5rem",
                height: "0.25rem",
                borderRadius: "0.125rem",
                background: c.step <= step ? "#0070f3" : "#e0e0e0",
              }}
            />
          ))}
        </div>
      </div>

      {/* Aspekt-Header */}
      <header style={{ display: "grid", gap: "0.35rem" }}>
        <div className="text-small text-muted">Patienten ohne Termin</div>
        <h1 style={{ margin: 0 }}>{stepConfig.title}</h1>
        <p
          style={{
            margin: 0,
            fontStyle: "italic",
            color: "#555",
            fontSize: "0.95rem",
          }}
        >
          {kernfrage}
        </p>
      </header>

      {/* Perspektiv-Hinweis */}
      <p
        className="text-small text-muted"
        style={{ margin: 0, fontStyle: "italic" }}
      >
        {perspectiveHint}
      </p>

      {/* Fragen dieses Aspekts */}
      <QuestionInput
        section={section}
        checkpoint={currentCheckpoint}
        mode={mode}
        inheritedQuestionIds={
          snapshot.inheritedQuestionIds ??
          // Rückwärtskompatibilität: Altdaten mit inheritedAnswers
          (snapshot.inheritedAnswers
            ? Object.keys(snapshot.inheritedAnswers).filter(
                (k) => snapshot.inheritedAnswers![k] !== null,
              )
            : undefined)
        }
        onChange={handleAnswerChange}
      />

      {/* Navigation */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          alignItems: "center",
          flexWrap: "wrap",
          borderTop: "1px solid #e0e0e0",
          paddingTop: "0.75rem",
        }}
      >
        <Link href={backHref} className="text-small">
          ←{" "}
          {step === 1
            ? "Zur Situation"
            : `Zurück: ${getM2StepConfig(step - 1)?.title ?? ""}`}
        </Link>
        <button
          type="button"
          onClick={() => void handleForward()}
          disabled={saving}
          style={{ marginLeft: "auto" }}
        >
          {saving
            ? "Speichert…"
            : isLastStep
              ? "Klärungsstand beurteilen →"
              : `Weiter: ${getM2StepConfig(step + 1)?.title ?? ""} →`}
        </button>
      </div>
      {saveError && (
        <p
          className="text-small"
          style={{ margin: 0, color: "#c44" }}
        >
          {saveError}
        </p>
      )}
    </section>
  );
}
