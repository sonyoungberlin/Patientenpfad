"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  ProcessPointStatus,
  WorkflowM2AnswerValue,
  WorkflowM3CheckpointSnapshot,
  WorkflowRole,
} from "@/lib/workflow/types";
import { formatProcessOutput } from "@/lib/workflow/formatOutput";
import { isWorkflowTopicId, getWorkflowTopic, type WorkflowTopicId } from "@/lib/workflow/processCatalog";
import { buildInitialM3Checkpoints } from "@/lib/workflow/m3Checkpoints";
import { getM2QuestionsForCheckpoint, type WorkflowM2Question } from "@/lib/workflow/m2Questions";

type Props = {
  topicId: WorkflowTopicId;
  role: WorkflowRole;
  title?: string;
};

const STATUS_OPTIONS: { value: ProcessPointStatus; label: string }[] = [
  { value: "ERKENNBAR", label: "Merken" },
  { value: "NICHT_ERFASST", label: "Nicht merken" },
  { value: "UNKLAR", label: "Noch offen" },
];

const M2_ANSWER_OPTIONS: { value: WorkflowM2AnswerValue; label: string }[] = [
  { value: "YES", label: "Ja" },
  { value: "NO", label: "Nein" },
  { value: "UNCLEAR", label: "Unklar" },
];

function m2AnswerLabel(value: WorkflowM2AnswerValue | null | undefined): string {
  if (value === "YES") return "Ja";
  if (value === "NO") return "Nein";
  if (value === "UNCLEAR") return "Unklar";
  return "—";
}

export default function WorkflowDraftClient({ topicId, role, title }: Props) {
  const router = useRouter();

  const [step, setStep] = useState<"m2" | "m3">("m2");
  const [m3Checkpoints, setM3Checkpoints] = useState<WorkflowM3CheckpointSnapshot[]>(
    () => (isWorkflowTopicId(topicId) ? buildInitialM3Checkpoints(topicId) : []),
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // M2-Fragen pro Checkpoint
  const m2QuestionsMap = useMemo(() => {
    const map = new Map<string, readonly WorkflowM2Question[]>();
    for (const cp of m3Checkpoints) {
      map.set(cp.id, getM2QuestionsForCheckpoint(topicId, cp.id, role));
    }
    return map;
  }, [topicId, role, m3Checkpoints]);

  function handleM2AnswerChange(checkpointId: string, questionId: string, value: WorkflowM2AnswerValue) {
    setM3Checkpoints((prev) =>
      prev.map((c) =>
        c.id === checkpointId
          ? { ...c, m2_answers: { ...(c.m2_answers ?? {}), [questionId]: value } }
          : c,
      ),
    );
  }

  function handleM3StatusChange(checkpointId: string, status: ProcessPointStatus) {
    setM3Checkpoints((prev) =>
      prev.map((c) => (c.id === checkpointId ? { ...c, status } : c)),
    );
  }

  async function handleFinalSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/workflow-cases/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId,
          role,
          title: title || undefined,
          m3Checkpoints,
        }),
      });
      const data = (await res.json()) as { ok: boolean; id?: string; error?: string };
      if (!data.ok) {
        setSaveError(data.error ?? "Speichern fehlgeschlagen.");
        return;
      }
      router.push("/workflow-cases");
    } catch {
      setSaveError("Netzwerkfehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  }

  function handleCopy() {
    const text = formatProcessOutput({
      topicId,
      role,
      processPoints: [],
      m3Checkpoints,
    });
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const roleLabel = role === "MFA" ? "MFA" : "Arzt / Ärztin";
  const outputText = formatProcessOutput({ topicId, role, processPoints: [], m3Checkpoints });
  const topic = getWorkflowTopic(topicId);
  const topicSources = topic.sources;

  return (
    <section className="card" style={{ display: "grid", gap: "1rem" }}>
      <header style={{ display: "grid", gap: "0.25rem" }}>
        <div className="text-small text-muted">{topic.title}</div>
        <h1 style={{ margin: 0 }}>
          {title ? `${title} – ` : ""}{roleLabel}
        </h1>
      </header>

      {/* ── M2: Vorbereitung ── */}
      {step === "m2" ? (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {m3Checkpoints.map((checkpoint) => {
            const questions = m2QuestionsMap.get(checkpoint.id) ?? [];
            return (
              <article key={checkpoint.id} className="card" style={{ display: "grid", gap: "0.75rem" }}>
                <strong>{checkpoint.title}</strong>
                {questions.length > 0 ? (
                  <div style={{ display: "grid", gap: "0.5rem" }}>
                    {questions.map((q) => {
                      const answer = checkpoint.m2_answers?.[q.id] ?? null;
                      return (
                        <div key={q.id} style={{ display: "grid", gap: "0.35rem" }}>
                          <div className="text-small" style={{ fontWeight: 500 }}>{q.text}</div>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            {M2_ANSWER_OPTIONS.map((opt) => {
                              const isActive = answer === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => handleM2AnswerChange(checkpoint.id, q.id, opt.value)}
                                  style={{
                                    fontWeight: isActive ? 700 : 400,
                                    outline: isActive ? "2px solid currentColor" : undefined,
                                  }}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-small text-muted" style={{ margin: 0 }}>
                    Keine Fragen für diese Rolle hinterlegt.
                  </p>
                )}
              </article>
            );
          })}

          <div>
            <button type="button" onClick={() => setStep("m3")}>
              Weiter zu Klärungsstand
            </button>
          </div>
        </div>
      ) : null}

      {/* ── M3: Klärungsstand ── */}
      {step === "m3" ? (
        <>
          <section className="card" style={{ display: "grid", gap: "0.75rem" }}>
            <h2 style={{ marginTop: 0 }}>Klärungsstand je Bereich</h2>
            <div style={{ display: "grid", gap: "0.6rem" }}>
              {m3Checkpoints.map((checkpoint) => {
                const questions = m2QuestionsMap.get(checkpoint.id) ?? [];
                return (
                  <article
                    key={checkpoint.id}
                    style={{
                      border: "1px solid #d8e0ea",
                      borderRadius: "0.4rem",
                      padding: "0.7rem",
                      display: "grid",
                      gap: "0.4rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                      <strong>{checkpoint.title}</strong>
                      <span className="text-small" style={{ fontWeight: 600 }}>
                        {checkpoint.status === "ERKENNBAR"
                          ? "Merken"
                          : checkpoint.status === "NICHT_ERFASST"
                            ? "Nicht merken"
                            : "Noch offen"}
                      </span>
                    </div>
                    {checkpoint.m2_answers && Object.keys(checkpoint.m2_answers).length > 0 ? (
                      <details style={{ opacity: 0.85 }}>
                        <summary className="text-small text-muted" style={{ cursor: "pointer", fontWeight: 600 }}>
                          Vorbereitung (M2)
                        </summary>
                        <div style={{ display: "grid", gap: "0.35rem", padding: "0.6rem", background: "#f5f7fa", borderRadius: "0.25rem", marginTop: "0.35rem" }}>
                          {questions.map((q) => {
                            const val = checkpoint.m2_answers?.[q.id];
                            return (
                              <div key={q.id} style={{ display: "flex", gap: "0.5rem", alignItems: "baseline" }}>
                                <span className="text-small">{q.text}</span>
                                <span className="text-small" style={{ fontWeight: val ? 700 : 400, marginLeft: "auto", whiteSpace: "nowrap", color: val ? undefined : "#aaa" }}>
                                  {m2AnswerLabel(val)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    ) : null}
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      {STATUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleM3StatusChange(checkpoint.id, opt.value)}
                          style={{
                            fontWeight: checkpoint.status === opt.value ? 700 : 400,
                            outline: checkpoint.status === opt.value ? "2px solid currentColor" : undefined,
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Merkzettel */}
          <section className="card" style={{ display: "grid", gap: "0.75rem" }}>
            <h2 style={{ marginTop: 0 }}>Merkzettel für ähnliche Fälle</h2>
            <pre
              style={{
                background: "#f9f9f9",
                border: "1px solid #ddd",
                borderRadius: "0.375rem",
                padding: "0.75rem",
                whiteSpace: "pre-wrap",
                fontFamily: "inherit",
                fontSize: "0.9em",
                lineHeight: "1.6",
                margin: 0,
              }}
            >
              {outputText}
            </pre>
            <div>
              <button type="button" onClick={handleCopy}>
                {copied ? "Kopiert ✓" : "In Zwischenablage kopieren"}
              </button>
            </div>
          </section>
          <section className="card" style={{ display: "grid", gap: "0.5rem" }}>
            <h2 style={{ marginTop: 0 }}>Quellenhinweise</h2>
            <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
              {topicSources.map((src) => (
                <li key={src}>{src}</li>
              ))}
            </ul>
          </section>

          {/* Aktionszeile */}
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={() => setStep("m2")}>
              ← Vorbereitung (M2)
            </button>
            <button type="button" onClick={() => void handleFinalSave()} disabled={saving}>
              {saving ? "Speichert…" : "Speichern"}
            </button>
            {saveError ? <span className="text-muted" style={{ color: "#a00" }}>{saveError}</span> : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
