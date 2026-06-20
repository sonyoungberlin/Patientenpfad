"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  WorkflowProcessSnapshot,
  ProcessPointStatus,
  WorkflowM2AnswerValue,
  WorkflowM3CheckpointSnapshot,
} from "@/lib/workflow/types";
import { formatProcessOutput } from "@/lib/workflow/formatOutput";
import { isWorkflowTopicId, getWorkflowTopic } from "@/lib/workflow/processCatalog";
import { buildInitialM3Checkpoints } from "@/lib/workflow/m3Checkpoints";
import { getM2QuestionsForCheckpoint, type WorkflowM2Question } from "@/lib/workflow/m2Questions";

type Props = {
  sessionId: string;
  title?: string;
  snapshot: WorkflowProcessSnapshot;
  mode: "m2" | "m3";
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

function compactQuestionLabel(text: string, maxLength = 48): string {
  const normalized = text.trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

function getCompactPrefillItems(
  checkpoint: WorkflowM3CheckpointSnapshot,
  questions: readonly WorkflowM2Question[],
): Array<{ question: string; answer: WorkflowM2AnswerValue | null }> {
  const answers = checkpoint.m2_answers;
  if (!answers || questions.length === 0) return [];

  const answered = questions
    .map((q) => ({ question: q.text, answer: answers[q.id] ?? null }))
    .filter((item) => item.answer !== null);

  if (answered.length === 0) return [];
  const highPriority = answered.filter((i) => i.answer === "NO" || i.answer === "UNCLEAR");
  if (highPriority.length > 0) return highPriority.slice(0, 3);
  return answered.filter((i) => i.answer === "YES").slice(0, 3);
}

export default function WorkflowEditorClient({ sessionId, title, snapshot: initialSnapshot, mode }: Props) {
  const router = useRouter();

  const role = initialSnapshot.role;
  const topicId = initialSnapshot.topicId;

  // M3-Checkpoints tragen sowohl m2_answers (M2-Ebene) als auch status (M3-Ebene).
  const [m3Checkpoints, setM3Checkpoints] = useState<WorkflowM3CheckpointSnapshot[]>(() => {
    const stored = initialSnapshot.m3Checkpoints;
    if (stored && stored.length > 0) return stored;
    return isWorkflowTopicId(topicId) ? buildInitialM3Checkpoints(topicId) : [];
  });

  const [m2Saving, setM2Saving] = useState(false);
  const [m2Saved, setM2Saved] = useState(false);
  const [m2Error, setM2Error] = useState<string | null>(null);
  const [m3Saving, setM3Saving] = useState(false);
  const [m3Saved, setM3Saved] = useState(false);
  const [m3Error, setM3Error] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // M2-Fragen pro Checkpoint
  const m2QuestionsMap = useMemo(() => {
    const map = new Map<string, readonly WorkflowM2Question[]>();
    if (!isWorkflowTopicId(topicId)) return map;
    for (const cp of m3Checkpoints) {
      map.set(cp.id, getM2QuestionsForCheckpoint(topicId, cp.id, role));
    }
    return map;
  }, [topicId, role, m3Checkpoints]);

  // --- M2 handlers ---

  function handleM2AnswerChange(checkpointId: string, questionId: string, value: WorkflowM2AnswerValue) {
    setM3Checkpoints((prev) =>
      prev.map((c) =>
        c.id === checkpointId
          ? { ...c, m2_answers: { ...(c.m2_answers ?? {}), [questionId]: value } }
          : c,
      ),
    );
    setM2Saved(false);
  }

  async function handleM2Save() {
    setM2Saving(true);
    setM2Error(null);
    setM2Saved(false);
    try {
      const res = await fetch(`/api/workflow-cases/${sessionId}/m2/prefill`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          m3Checkpoints: m3Checkpoints.map((c) => ({ id: c.id, m2_answers: c.m2_answers ?? {} })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !(data as { ok?: boolean }).ok) {
        setM2Error((data as { error?: string }).error ?? "Speichern fehlgeschlagen.");
        return;
      }
      setM2Saved(true);
      router.refresh();
    } catch {
      setM2Error("Netzwerkfehler beim Speichern.");
    } finally {
      setM2Saving(false);
    }
  }

  // --- M3 handlers ---

  function handleM3StatusChange(checkpointId: string, status: ProcessPointStatus) {
    setM3Checkpoints((prev) =>
      prev.map((c) => (c.id === checkpointId ? { ...c, status } : c)),
    );
    setM3Saved(false);
  }

  async function handleM3Save() {
    setM3Saving(true);
    setM3Error(null);
    setM3Saved(false);
    try {
      const res = await fetch(`/api/workflow-cases/${sessionId}/m3/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ m3Checkpoints }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !(data as { ok?: boolean }).ok) {
        setM3Error((data as { error?: string }).error ?? "Speichern fehlgeschlagen.");
        return;
      }
      setM3Saved(true);
      router.refresh();
    } catch {
      setM3Error("Netzwerkfehler beim Speichern.");
    } finally {
      setM3Saving(false);
    }
  }

  function handleCopy() {
    const text = formatProcessOutput({ ...initialSnapshot, m3Checkpoints });
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const outputText = formatProcessOutput({ ...initialSnapshot, m3Checkpoints });
  const roleLabel = role === "MFA" ? "MFA" : "Arzt / Ärztin";
  const topicTitle = isWorkflowTopicId(topicId) ? getWorkflowTopic(topicId).title : "Musterprozess";
  const topicSources = isWorkflowTopicId(topicId) ? getWorkflowTopic(topicId).sources : [];

  return (
    <section className="card" style={{ display: "grid", gap: "1rem" }}>
      <header style={{ display: "grid", gap: "0.25rem" }}>
        <div className="text-small text-muted">{topicTitle}</div>
        <h1 style={{ margin: 0 }}>
          {title ? `${title} – ` : ""}{roleLabel}
        </h1>

      </header>

      {/* ── M2: Vorbereitung ── */}
      {mode === "m2" ? (
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
        </div>
      ) : null}

      {/* ── M3: Klärungsstand ── */}
      {mode === "m3" ? (
        <section className="card" style={{ display: "grid", gap: "0.75rem" }}>
          <h2 style={{ marginTop: 0 }}>Klärungsstand je Bereich</h2>
          <div style={{ display: "grid", gap: "0.6rem" }}>
            {m3Checkpoints.map((checkpoint) => {
              const questions = m2QuestionsMap.get(checkpoint.id) ?? [];
              const compactPrefill = getCompactPrefillItems(checkpoint, questions);

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
      ) : null}

      {/* ── Merkzettel (nur M3) ── */}
      {mode === "m3" ? (
        <>
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
        </>
      ) : null}

      {/* ── Aktionszeile ── */}
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
        {mode === "m2" ? (
          <>
            <button type="button" onClick={() => void handleM2Save()} disabled={m2Saving}>
              {m2Saving ? "Speichert…" : "Speichern"}
            </button>
            {m2Saved ? (
              <button type="button" onClick={() => router.push(`/workflow-cases/${sessionId}/m3`)}>
                Weiter zu Klärungsstand
              </button>
            ) : null}
            {m2Error ? <span className="text-muted">{m2Error}</span> : null}
          </>
        ) : (
          <>
            <button type="button" onClick={() => void handleM3Save()} disabled={m3Saving}>
              {m3Saving ? "Speichert…" : "Speichern"}
            </button>
            {m3Saved ? <span className="text-muted">Klärungsstand gespeichert.</span> : null}
            {m3Error ? <span className="text-muted">{m3Error}</span> : null}
          </>
        )}
      </div>
    </section>
  );
}

