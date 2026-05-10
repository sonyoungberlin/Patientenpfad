"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CopyTextButton from "@/components/inquiries/CopyTextButton";
import { buildOfficeSummaryText } from "@/lib/office/summary";
import { isOfficeTopicId } from "@/lib/office/checkpointCatalog";
import { getM2QuestionsForCheckpoint, type OfficeM2Question } from "@/lib/office/m2Questions";
import {
  OfficeCheckpointKind,
  OfficeCheckpointState,
  type M2AnswerValue,
  type OfficeCheckpointSnapshot,
} from "@/lib/office/types";

type OfficeCaseData = {
  id: string;
  title: string | null;
  trigger_note: string | null;
  topicId: string | null;
  topicTitle: string | null;
  checkpoint_snapshot: {
    topicId: string | null;
    checkpoints: OfficeCheckpointSnapshot[];
  };
};

type Props = {
  officeCase: OfficeCaseData;
  mode: "m2" | "m3";
};

function cloneCheckpoints(checkpoints: OfficeCheckpointSnapshot[]) {
  return checkpoints.map((checkpoint) => ({ ...checkpoint }));
}

function kindLabel(kind: OfficeCheckpointKind) {
  switch (kind) {
    case OfficeCheckpointKind.FACT:
      return "FACT";
    case OfficeCheckpointKind.RULE:
      return "RULE";
    case OfficeCheckpointKind.ASSESSMENT:
      return "ASSESSMENT";
    case OfficeCheckpointKind.DECISION:
      return "DECISION";
    case OfficeCheckpointKind.SOURCE:
      return "SOURCE";
    case OfficeCheckpointKind.DEPENDENCY:
      return "DEPENDENCY";
  }
}

function getQuestionsForCheckpoint(topicId: string | null, checkpointId: string): readonly OfficeM2Question[] {
  if (!topicId || !isOfficeTopicId(topicId)) return [];
  return getM2QuestionsForCheckpoint(topicId, checkpointId);
}

export default function OfficeCaseEditorClient({ officeCase, mode }: Props) {
  const router = useRouter();
  const [checkpoints, setCheckpoints] = useState<OfficeCheckpointSnapshot[]>(
    cloneCheckpoints(officeCase.checkpoint_snapshot.checkpoints),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const summaryText = useMemo(
    () =>
      buildOfficeSummaryText({
        topicTitle: officeCase.topicTitle ?? officeCase.title ?? "Office-Snapshot",
        checkpoints,
      }),
    [checkpoints, officeCase.title, officeCase.topicTitle],
  );

  function updateCheckpoint(id: string, patch: Partial<OfficeCheckpointSnapshot>) {
    setCheckpoints((prev) =>
      prev.map((checkpoint) => (checkpoint.id === id ? { ...checkpoint, ...patch } : checkpoint)),
    );
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setStatus(null);

    try {
      if (mode === "m2") {
        const res = await fetch(`/api/office-cases/${officeCase.id}/m2/prefill`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            checkpoints: checkpoints.map((checkpoint) => ({
              id: checkpoint.id,
              m2_answers: checkpoint.m2_answers ?? {},
            })),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          setError(data.error ?? "Speichern fehlgeschlagen.");
          return;
        }
        setStatus("M2 gespeichert.");
      } else {
        for (const checkpoint of checkpoints) {
          const res = await fetch(`/api/office-cases/${officeCase.id}/checkpoint/update`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              checkpoint_id: checkpoint.id,
              state: checkpoint.state,
              known_note: checkpoint.known_note ?? "",
              missing_note: checkpoint.missing_note ?? "",
              answer_source: checkpoint.answer_source ?? "",
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.ok) {
            setError(data.error ?? `Checkpoint ${checkpoint.id} konnte nicht gespeichert werden.`);
            return;
          }
        }
        setStatus("M3 gespeichert.");
      }

      router.refresh();
    } catch {
      setError("Netzwerkfehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card" style={{ display: "grid", gap: "1rem" }}>
      <header style={{ display: "grid", gap: "0.25rem" }}>
        <div className="text-small text-muted">{officeCase.topicTitle ?? "Officefall"}</div>
        <h1 style={{ margin: 0 }}>{officeCase.title ?? officeCase.topicTitle ?? "Officefall"}</h1>
        {officeCase.trigger_note ? <p style={{ margin: 0 }}>{officeCase.trigger_note}</p> : null}
      </header>

      <div style={{ display: "grid", gap: "0.75rem" }}>
        {checkpoints.map((checkpoint) => {
          const isOpen = checkpoint.state === OfficeCheckpointState.OPEN;

          return (
            <article key={checkpoint.id} className="card" style={{ display: "grid", gap: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <div>
                  <strong>{checkpoint.title}</strong>
                  {mode === "m2" ? (
                    <div className="text-small text-muted">{kindLabel(checkpoint.kind)} · {checkpoint.id}</div>
                  ) : (
                    <div className="text-small text-muted">{checkpoint.id}</div>
                  )}
                </div>
                {mode === "m3" ? (
                  <label style={{ display: "grid", gap: "0.25rem" }}>
                    <span className="text-small text-muted">Entscheidung</span>
                    <select
                      value={checkpoint.state}
                      onChange={(e) =>
                        updateCheckpoint(checkpoint.id, {
                          state: e.target.value as OfficeCheckpointState,
                        })
                      }
                    >
                      <option value={OfficeCheckpointState.YES}>Geklaert</option>
                      <option value={OfficeCheckpointState.NO}>Nicht ausreichend geklaert</option>
                      <option value={OfficeCheckpointState.OPEN}>Noch offen</option>
                    </select>
                  </label>
                ) : null}
              </div>

              {mode === "m2" ? (
                <>
                  {(() => {
                    const questions = getQuestionsForCheckpoint(officeCase.topicId, checkpoint.id);
                    return questions.length > 0 ? (
                      <div style={{ display: "grid", gap: "0.5rem" }}>
                        {questions.map((q) => {
                          const answer = checkpoint.m2_answers?.[q.id] ?? null;
                          return (
                            <div key={q.id} style={{ display: "grid", gap: "0.35rem" }}>
                              <div className="text-small" style={{ fontWeight: 500 }}>{q.text}</div>
                              <div style={{ display: "flex", gap: "0.5rem" }}>
                                {(["YES", "NO", "UNCLEAR"] as M2AnswerValue[]).map((val) => {
                                  const labels: Record<M2AnswerValue, string> = { YES: "Ja", NO: "Nein", UNCLEAR: "Unklar" };
                                  const isActive = answer === val;
                                  return (
                                    <button
                                      key={val}
                                      type="button"
                                      onClick={() => {
                                        const next = { ...(checkpoint.m2_answers ?? {}), [q.id]: val };
                                        updateCheckpoint(checkpoint.id, { m2_answers: next });
                                      }}
                                      style={{
                                        fontWeight: isActive ? 700 : 400,
                                        outline: isActive ? "2px solid currentColor" : undefined,
                                      }}
                                    >
                                      {labels[val]}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null;
                  })()}
                </>
              ) : (
                <>
                  {(() => {
                    const questions = getQuestionsForCheckpoint(officeCase.topicId, checkpoint.id);
                    const answers = checkpoint.m2_answers;
                    return questions.length > 0 && answers ? (
                      <div style={{ display: "grid", gap: "0.35rem", padding: "0.6rem", backgroundColor: "#f5f7fa", borderRadius: "0.25rem" }}>
                        <div className="text-small text-muted" style={{ fontWeight: 600 }}>Vorbereitung (M2)</div>
                        {questions.map((q) => {
                          const val = answers[q.id];
                          const labels: Record<string, string> = { YES: "Ja", NO: "Nein", UNCLEAR: "Unklar" };
                          return (
                            <div key={q.id} style={{ display: "flex", gap: "0.5rem", alignItems: "baseline" }}>
                              <span className="text-small">{q.text}</span>
                              {val ? (
                                <span className="text-small" style={{ fontWeight: 700, marginLeft: "auto", whiteSpace: "nowrap" }}>{labels[val] ?? val}</span>
                              ) : (
                                <span className="text-small text-muted" style={{ marginLeft: "auto", whiteSpace: "nowrap" }}>—</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : null;
                  })()}
                  {isOpen ? (
                    <>
                      <label style={{ display: "grid", gap: "0.25rem" }}>
                        <span>Was fehlt noch? *</span>
                        <textarea
                          value={checkpoint.missing_note ?? ""}
                          placeholder="Welche Information fehlt fuer die Entscheidung?"
                          onChange={(e) => updateCheckpoint(checkpoint.id, { missing_note: e.target.value })}
                          rows={2}
                          required
                        />
                      </label>
                      <label style={{ display: "grid", gap: "0.25rem" }}>
                        <span>Wer kann das klaeren? *</span>
                        <input
                          type="text"
                          value={checkpoint.answer_source ?? ""}
                          placeholder="Person, Stelle oder Dokument"
                          onChange={(e) => updateCheckpoint(checkpoint.id, { answer_source: e.target.value })}
                          required
                        />
                      </label>
                    </>
                  ) : null}
                </>
              )}
            </article>
          );
        })}
      </div>

      {mode === "m3" ? (
        <section className="card" style={{ display: "grid", gap: "0.75rem" }}>
          <h2 style={{ marginTop: 0 }}>Summary</h2>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{summaryText}</pre>
          <CopyTextButton label="Summary kopieren" text={summaryText} />
        </section>
      ) : null}

      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <button type="button" onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Speichert…" : "Speichern"}
        </button>
        {mode === "m2" && status === "M2 gespeichert." ? (
          <button type="button" onClick={() => router.push(`/office-cases/${officeCase.id}/m3`)}>
            Weiter zu M3
          </button>
        ) : null}
        {status ? <span className="text-muted">{status}</span> : null}
        {error ? <span className="text-muted">{error}</span> : null}
      </div>
    </section>
  );
}