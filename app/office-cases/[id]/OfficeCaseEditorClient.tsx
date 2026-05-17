"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CopyTextButton from "@/components/inquiries/CopyTextButton";
import { buildOfficeSummaryText } from "@/lib/office/summary";
import { deriveTopicActions, type DerivedActionStatus } from "@/lib/office/derivedActions";
import {
  buildOfficeBlocks,
  getPrimaryOpenTextForBlock,
  getTopNextSteps,
} from "@/lib/office/officeBlocks";
import { isOfficeTopicId } from "@/lib/office/checkpointCatalog";
import { getM2QuestionsForCheckpoint, type OfficeM2Question } from "@/lib/office/m2Questions";
import type { CheckpointComplianceView } from "@/lib/office/checkpointCompliance";
import OfficeComplianceFooter from "@/components/office/OfficeComplianceFooter";
import OfficeWritePanel from "@/components/office/OfficeWritePanel";
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
  /**
   * Optional: Map von Checkpoint-ID zu Compliance-View fuer den M3-Footer.
   * Wird ausschliesslich im M3-Modus gerendert. Fehlt der Prop oder ein
   * Eintrag, wird kein Footer fuer den betroffenen Checkpoint angezeigt.
   */
  complianceByCheckpointId?: Record<string, CheckpointComplianceView>;
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

function m2AnswerLabel(value: M2AnswerValue | null | undefined): string {
  if (value === "YES") return "Ja";
  if (value === "NO") return "Nein";
  if (value === "UNCLEAR") return "Unklar";
  return "—";
}

function compactQuestionLabel(text: string, maxLength = 42): string {
  const normalized = text.trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

function getCompactPrefillItems(
  topicId: string | null,
  checkpoint: OfficeCheckpointSnapshot,
): Array<{ question: string; answer: M2AnswerValue | null }> {
  const questions = getQuestionsForCheckpoint(topicId, checkpoint.id);
  const answers = checkpoint.m2_answers;
  if (questions.length === 0 || !answers) return [];

  const answered = questions
    .map((question) => {
      const answer = answers[question.id] ?? null;
      return {
        question: question.text,
        answer,
      };
    })
    .filter((item) => item.answer !== null);

  if (answered.length === 0) return [];

  const highPriority = answered.filter(
    (item) => item.answer === "NO" || item.answer === "UNCLEAR",
  );
  if (highPriority.length > 0) return highPriority.slice(0, 2);

  return answered.filter((item) => item.answer === "YES").slice(0, 2);
}

function statusLabel(status: DerivedActionStatus | OfficeCheckpointState): string {
  if (status === "geklaert" || status === OfficeCheckpointState.YES) return "geklaert";
  if (status === "offen" || status === OfficeCheckpointState.OPEN) return "offen";
  return "nicht vollstaendig";
}

export default function OfficeCaseEditorClient({
  officeCase,
  mode,
  complianceByCheckpointId,
}: Props) {
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
        topicId: officeCase.topicId,
        checkpoints,
      }),
    [checkpoints, officeCase.title, officeCase.topicId, officeCase.topicTitle],
  );

  const actionsByCheckpoint = useMemo(() => {
    const actions = deriveTopicActions({
      topicId: officeCase.topicId,
      checkpoints,
    });

    const grouped = new Map<string, typeof actions>();
    for (const action of actions) {
      const list = grouped.get(action.checkpointId) ?? [];
      list.push(action);
      grouped.set(action.checkpointId, list);
    }
    return grouped;
  }, [checkpoints, officeCase.topicId]);

  const blocks = useMemo(
    () =>
      buildOfficeBlocks({
        topicId: officeCase.topicId,
        checkpoints,
      }),
    [checkpoints, officeCase.topicId],
  );

  const topNextSteps = useMemo(() => getTopNextSteps(blocks, 5), [blocks]);

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

      {mode === "m3" ? (
        <section className="card" style={{ display: "grid", gap: "0.75rem" }}>
          <h2 style={{ marginTop: 0 }}>Bereichscheckliste</h2>
          {blocks.length > 0 ? (
            <div style={{ display: "grid", gap: "0.6rem" }}>
              {blocks.map((block) => {
                const primaryText = getPrimaryOpenTextForBlock(block);

                return (
                  <article
                    key={block.id}
                    style={{
                      border: "1px solid #d8e0ea",
                      borderRadius: "0.4rem",
                      padding: "0.7rem",
                      display: "grid",
                      gap: "0.4rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                      <strong>{block.title}</strong>
                      <span className="text-small" style={{ fontWeight: 600 }}>
                        {block.status === "offen" ? "Offen" : "Geklaert"}
                      </span>
                    </div>
                    {primaryText ? (
                      <div className="text-small text-muted">Offen: {primaryText}</div>
                    ) : (
                      <div className="text-small text-muted">Bereich ist geklaert.</div>
                    )}
                    <div style={{ display: "grid", gap: "0.5rem", marginTop: "0.2rem" }}>
                      {block.checkpoints.map((checkpoint) => {
                        const checkpointActions = actionsByCheckpoint.get(checkpoint.id) ?? [];
                        const shortStatus = checkpointActions[0]?.text ?? statusLabel(checkpoint.state);
                        const compactPrefill = getCompactPrefillItems(officeCase.topicId, checkpoint);

                        return (
                          <div
                            key={checkpoint.id}
                            style={{
                              border: "1px solid #e3e8ef",
                              borderRadius: "0.35rem",
                              padding: "0.55rem",
                              display: "grid",
                              gap: "0.45rem",
                              backgroundColor: "#fbfcfd",
                            }}
                          >
                            <div style={{ display: "grid", gap: "0.2rem" }}>
                              <strong>{checkpoint.title}</strong>
                              <div className="text-small text-muted">Klaerungsstand: {shortStatus}</div>
                              <div className="text-small text-muted">
                                Vorbereitung:{" "}
                                {compactPrefill.length > 0
                                  ? compactPrefill
                                      .map(
                                        (item) =>
                                          `${compactQuestionLabel(item.question)}: ${m2AnswerLabel(item.answer)}`,
                                      )
                                      .join(" | ")
                                  : "Keine Vorbereitung erfasst."}
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                              <button
                                type="button"
                                onClick={() =>
                                  updateCheckpoint(checkpoint.id, {
                                    state: OfficeCheckpointState.YES,
                                  })
                                }
                                style={{
                                  fontWeight: checkpoint.state === OfficeCheckpointState.YES ? 700 : 400,
                                  outline:
                                    checkpoint.state === OfficeCheckpointState.YES
                                      ? "2px solid currentColor"
                                      : undefined,
                                }}
                              >
                                Geklaert
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateCheckpoint(checkpoint.id, {
                                    state: OfficeCheckpointState.NO,
                                  })
                                }
                                style={{
                                  fontWeight: checkpoint.state === OfficeCheckpointState.NO ? 700 : 400,
                                  outline:
                                    checkpoint.state === OfficeCheckpointState.NO
                                      ? "2px solid currentColor"
                                      : undefined,
                                }}
                              >
                                Nicht vollstaendig
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateCheckpoint(checkpoint.id, {
                                    state: OfficeCheckpointState.OPEN,
                                  })
                                }
                                style={{
                                  fontWeight: checkpoint.state === OfficeCheckpointState.OPEN ? 700 : 400,
                                  outline:
                                    checkpoint.state === OfficeCheckpointState.OPEN
                                      ? "2px solid currentColor"
                                      : undefined,
                                }}
                              >
                                Offen
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="text-small text-muted" style={{ margin: 0 }}>
              Keine Blockzuordnung verfuegbar.
            </p>
          )}
        </section>
      ) : null}

      {mode === "m3" ? (
        <section className="card" style={{ display: "grid", gap: "0.75rem" }}>
          <h2 style={{ marginTop: 0 }}>Interne To-dos / naechste Schritte</h2>
          {topNextSteps.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "grid", gap: "0.25rem" }}>
              {topNextSteps.map((step) => (
                <li key={step} className="text-small">{step}</li>
              ))}
            </ul>
          ) : (
            <p className="text-small text-muted" style={{ margin: 0 }}>
              Keine offenen Schritte erkennbar.
            </p>
          )}
        </section>
      ) : null}

      {mode === "m3" ? (
        <section className="card" style={{ display: "grid", gap: "0.75rem" }}>
          <h2 style={{ marginTop: 0 }}>Dokumentation fuer Praxisakte</h2>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{summaryText}</pre>
          <CopyTextButton label="Dokumentation kopieren" text={summaryText} />
        </section>
      ) : null}

      {mode === "m3" ? (
        <OfficeWritePanel
          topicId={officeCase.topicId}
          checkpoints={checkpoints}
        />
      ) : null}

      {mode === "m3" ? (
        <details>
          <summary className="text-small text-muted" style={{ cursor: "pointer", fontWeight: 600 }}>
            Details je Checkpoint anzeigen
          </summary>
          <div className="text-small text-muted" style={{ marginTop: "0.35rem" }}>
            Diese fachliche M3-Entscheidung steuert die Blockuebersicht und die Summary direkt.
          </div>
          <div style={{ display: "grid", gap: "0.75rem", marginTop: "0.6rem" }}>
            {checkpoints.map((checkpoint) => {
              const questions = getQuestionsForCheckpoint(officeCase.topicId, checkpoint.id);
              const checkpointActions = actionsByCheckpoint.get(checkpoint.id) ?? [];

              return (
                <article key={checkpoint.id} className="card" style={{ display: "grid", gap: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                    <div>
                      <strong>{checkpoint.title}</strong>
                      <div className="text-small text-muted">{checkpoint.id}</div>
                    </div>
                    <div className="text-small text-muted" style={{ fontWeight: 600 }}>
                      Fachliche M3-Freigabe: {statusLabel(checkpoint.state)}
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: "0.35rem", padding: "0.6rem", backgroundColor: "#f5f7fa", borderRadius: "0.25rem" }}>
                    <div className="text-small text-muted" style={{ fontWeight: 600 }}>Klaerungsstand</div>
                    {checkpointActions.length > 0 ? (
                      checkpointActions.map((action) => (
                        <div key={action.id} className="text-small" style={{ display: "grid", gap: "0.2rem" }}>
                          <div style={{ display: "flex", gap: "0.4rem", alignItems: "baseline" }}>
                            <strong>{statusLabel(action.status)}</strong>
                            <span>{action.text}</span>
                          </div>
                          <div className="text-muted">Antwortquelle: {action.answerOwner}</div>
                        </div>
                      ))
                    ) : checkpoint.state === OfficeCheckpointState.YES ? (
                      <div className="text-small">geklaert</div>
                    ) : (
                      <div className="text-small text-muted">keine offenen Punkte erkennbar</div>
                    )}
                  </div>
                  {mode === "m3" && complianceByCheckpointId?.[checkpoint.id] ? (
                    <OfficeComplianceFooter
                      compliance={complianceByCheckpointId[checkpoint.id]}
                      checkpointId={checkpoint.id}
                    />
                  ) : null}
                  {(() => {
                    const answers = checkpoint.m2_answers;
                    return questions.length > 0 && answers ? (
                      <details style={{ opacity: 0.82 }}>
                        <summary className="text-small text-muted" style={{ cursor: "pointer", fontWeight: 600 }}>
                          Vorbereitung (M2)
                        </summary>
                        <div style={{ display: "grid", gap: "0.35rem", padding: "0.6rem", backgroundColor: "#f5f7fa", borderRadius: "0.25rem", marginTop: "0.35rem" }}>
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
                      </details>
                    ) : null;
                  })()}
                </article>
              );
            })}
          </div>
        </details>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {checkpoints.map((checkpoint) => {
            const questions = getQuestionsForCheckpoint(officeCase.topicId, checkpoint.id);

            return (
              <article key={checkpoint.id} className="card" style={{ display: "grid", gap: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                  <div>
                    <strong>{checkpoint.title}</strong>
                    <div className="text-small text-muted">{kindLabel(checkpoint.kind)} · {checkpoint.id}</div>
                  </div>
                </div>

                <>
                  {(() => {
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
              </article>
            );
          })}
        </div>
      )}

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