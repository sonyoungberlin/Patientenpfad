"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CopyTextButton from "@/components/inquiries/CopyTextButton";
import { buildOfficeSummaryText } from "@/lib/office/summary";
import { OFFICE_TOPIC_HIRING_REPLACEMENT, isOfficeTopicId } from "@/lib/office/checkpointCatalog";
import { getM2QuestionsForCheckpoint, type OfficeM2Question } from "@/lib/office/m2Questions";
import { evaluateHrGovernance, type HrGovernanceEvaluation } from "@/lib/office/hrGovernance";
import {
  OfficeCheckpointKind,
  OfficeCheckpointState,
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

function isHrTopic(topicId: string | null, topicTitle: string | null, title: string | null): boolean {
  if (topicId === OFFICE_TOPIC_HIRING_REPLACEMENT) return true;

  const haystack = [topicTitle, title]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  return haystack.includes("arzt anstellen") || haystack.includes("nachbesetzung");
}

function hrStateLabel(state: OfficeCheckpointState): string {
  if (state === OfficeCheckpointState.YES) return "Freigegeben";
  if (state === OfficeCheckpointState.NO) return "Blockiert";
  return "Offen";
}

function hrStateTone(state: OfficeCheckpointState): string {
  if (state === OfficeCheckpointState.YES) return "#1f6b3a";
  if (state === OfficeCheckpointState.NO) return "#8a1f1f";
  return "#7a5b00";
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

  const isHrGovernanceTopic = isHrTopic(officeCase.topicId, officeCase.topicTitle, officeCase.title);

  const hrGovernance = useMemo<HrGovernanceEvaluation | null>(() => {
    if (mode !== "m3" || !isHrGovernanceTopic) return null;
    return evaluateHrGovernance(checkpoints);
  }, [checkpoints, isHrGovernanceTopic, mode]);

  const hrEvaluationByNormalizedId = useMemo(() => {
    if (!hrGovernance) return new Map<string, HrGovernanceEvaluation["checkpoints"][number]>();
    return new Map(hrGovernance.checkpoints.map((item) => [item.normalizedId, item]));
  }, [hrGovernance]);

  const hrTitleByNormalizedId = useMemo(() => {
    const titles = new Map<string, string>();
    if (!hrGovernance) return titles;

    for (const checkpoint of checkpoints) {
      const normalizedId = hrGovernance.checkpoints.find(
        (item) => item.checkpointId === checkpoint.id || item.normalizedId === checkpoint.id,
      )?.normalizedId;

      if (normalizedId && !titles.has(normalizedId)) {
        titles.set(normalizedId, checkpoint.title);
      }
    }

    return titles;
  }, [checkpoints, hrGovernance]);

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
              known_note: checkpoint.known_note ?? "",
              missing_note: checkpoint.missing_note ?? "",
              answer_source: checkpoint.answer_source ?? "",
              deadline: checkpoint.deadline ?? "",
              responsible_role: checkpoint.responsible_role ?? "",
              authority: checkpoint.authority ?? "",
              required_documents: checkpoint.required_documents ?? [],
              escalation_needed: checkpoint.escalation_needed ?? false,
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

      {hrGovernance ? (
        <section className="card" style={{ display: "grid", gap: "0.75rem", backgroundColor: "#f7f8fb" }}>
          <div style={{ display: "grid", gap: "0.25rem" }}>
            <h2 style={{ margin: 0 }}>Governance-Freigabe</h2>
            <div className="text-small text-muted">Gesamtstatus: {hrGovernance.summaryStatus.status}</div>
          </div>

          {hrGovernance.summaryStatus.reasons.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: "1.25rem", lineHeight: 1.5 }}>
              {hrGovernance.summaryStatus.reasons.map((reason) => (
                <li key={reason} className="text-small">
                  {reason}
                </li>
              ))}
            </ul>
          ) : null}

          <div style={{ display: "grid", gap: "0.5rem" }}>
            {hrGovernance.checkpoints.map((checkpoint) => {
              const title = hrTitleByNormalizedId.get(checkpoint.normalizedId) ?? checkpoint.normalizedId;
              const sourceLabel = checkpoint.checkpointId !== checkpoint.normalizedId
                ? `Quelle: ${checkpoint.checkpointId}`
                : null;

              return (
                <article
                  key={`${checkpoint.normalizedId}-${checkpoint.checkpointId}`}
                  className="card"
                  style={{ display: "grid", gap: "0.35rem", borderColor: hrStateTone(checkpoint.state) }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "baseline" }}>
                    <strong>{title}</strong>
                    <span className="text-small" style={{ color: hrStateTone(checkpoint.state), fontWeight: 600 }}>
                      {hrStateLabel(checkpoint.state)}
                    </span>
                  </div>
                  <div className="text-small text-muted">{checkpoint.normalizedId}</div>
                  {sourceLabel ? <div className="text-small text-muted">{sourceLabel}</div> : null}
                </article>
              );
            })}
          </div>

          {hrGovernance.m4Actions.length > 0 ? (
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <h3 style={{ margin: 0 }}>Nächste Klärungsschritte</h3>
              <ul style={{ margin: 0, paddingLeft: "1.25rem", lineHeight: 1.5 }}>
                {hrGovernance.m4Actions.map((action) => (
                  <li key={`${action.normalizedId}-${action.actionType}-${action.message}`} className="text-small">
                    {action.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      <div style={{ display: "grid", gap: "0.75rem" }}>
        {checkpoints.map((checkpoint) => {
          const isOpen = checkpoint.state === OfficeCheckpointState.OPEN;
          const hrCheckpoint = hrEvaluationByNormalizedId.get(checkpoint.id) ?? hrGovernance?.checkpoints.find((item) => item.checkpointId === checkpoint.id);

          return (
            <article key={checkpoint.id} className="card" style={{ display: "grid", gap: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <div>
                  <strong>{checkpoint.title}</strong>
                  {mode === "m2" ? (
                    <div className="text-small text-muted">{kindLabel(checkpoint.kind)} · {checkpoint.id}</div>
                  ) : hrCheckpoint ? (
                    <div className="text-small text-muted">{hrCheckpoint.normalizedId} · {hrStateLabel(checkpoint.state)}</div>
                  ) : null}
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

              {mode === "m3" && hrCheckpoint ? (
                <div className="text-small text-muted">Governance-Status: {hrStateLabel(checkpoint.state)}</div>
              ) : null}

              {mode === "m2" ? (
                <>
                  {(() => {
                    const questions = getQuestionsForCheckpoint(officeCase.topicId, checkpoint.id);
                    return questions.length > 0 ? (
                      <div style={{ display: "grid", gap: "0.5rem", padding: "0.75rem", backgroundColor: "#f9f9f9", borderRadius: "0.25rem" }}>
                        <div className="text-small" style={{ fontWeight: "500" }}>Leitfragen für M2:</div>
                        <ul style={{ margin: "0.5rem 0", paddingLeft: "1.5rem", lineHeight: "1.5" }}>
                          {questions.map((q) => (
                            <li key={q.id} className="text-small">{q.text}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null;
                  })()}
                  <label style={{ display: "grid", gap: "0.25rem" }}>
                    <span>Bereits geklaert</span>
                    <textarea
                      value={checkpoint.known_note ?? ""}
                      placeholder="Was wissen wir sicher?"
                      onChange={(e) => updateCheckpoint(checkpoint.id, { known_note: e.target.value })}
                      rows={2}
                    />
                  </label>
                  <label style={{ display: "grid", gap: "0.25rem" }}>
                    <span>Noch offen</span>
                    <textarea
                      value={checkpoint.missing_note ?? ""}
                      placeholder="Was fehlt noch?"
                      onChange={(e) => updateCheckpoint(checkpoint.id, { missing_note: e.target.value })}
                      rows={2}
                    />
                  </label>
                  <label style={{ display: "grid", gap: "0.25rem" }}>
                    <span>Wer kann das klaeren?</span>
                    <input
                      type="text"
                      value={checkpoint.answer_source ?? ""}
                      placeholder="Person, Stelle oder Dokument"
                      onChange={(e) => updateCheckpoint(checkpoint.id, { answer_source: e.target.value })}
                    />
                  </label>
                </>
              ) : (
                <>
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
        {status ? <span className="text-muted">{status}</span> : null}
        {error ? <span className="text-muted">{error}</span> : null}
      </div>
    </section>
  );
}