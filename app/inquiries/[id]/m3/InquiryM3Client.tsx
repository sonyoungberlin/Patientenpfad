"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  DecisionStatus,
  ExplanationOutputStatus,
  InquiryCheckpointKind,
  type CheckpointStatusValue,
  type InquirySection,
  type InquiryResponseV2Output,
} from "@/lib/inquiries/types";
import { renderInquiryResponseFromSections } from "@/lib/inquiries/renderInquiryResponse";

export type M3SpecificCheckpoint = {
  id: string;
  label: string;
  kind: InquiryCheckpointKind;
  questions?: Array<{ id: string; text: string }>;
};

export type M3SectionData = {
  inquiryId: string;
  label: string;
  decisionCheckpointId: string;
  decisionLabel: string;
  decisionQuestions: Array<{ id: string; text: string }>;
  specificCheckpoints: M3SpecificCheckpoint[];
};

export type M3ActionData = {
  id: string;
  label: string;
};

type Props = {
  sessionId: string;
  sections: M3SectionData[];
  actionCheckpoints: M3ActionData[];
  initialCheckpointStatuses: Record<string, string>;
  initialActionStatuses: Record<string, string>;
  /** Gespeicherte outputStatus-Entscheidungen aus M3 (SHOW / HIDE pro EXPLANATION-Checkpoint). */
  initialExplanationOutputStatuses: Record<string, string>;
  actionIds: string[];
  initialGeneratedOutput: InquiryResponseV2Output | null;
  isConfirmed: boolean;
};

const DECISION_OPTIONS = [
  { value: "POSSIBLE", label: "Möglich" },
  { value: "NOT_POSSIBLE", label: "Nicht möglich" },
  { value: "DISABLED", label: "Keine Entscheidung" },
];

const EXPLANATION_OPTIONS = [
  { value: "YES", label: "Ja" },
  { value: "NO", label: "Nein" },
];

/** Ausgabe-Entscheidung in M3 für EXPLANATION-Checkpoints (outputStatus). */
const OUTPUT_OPTIONS = [
  { value: ExplanationOutputStatus.SHOW, label: "Anzeigen" },
  { value: ExplanationOutputStatus.HIDE, label: "Nicht anzeigen" },
];

const ACTION_OPTIONS = [
  { value: "ACTIVE", label: "Aktiv" },
  { value: "INACTIVE", label: "Inaktiv" },
];

const ACTION_GROUPS: Array<{ label: string; ids: string[] }> = [
  {
    label: "Kontakt & Anfrage",
    ids: ["DIGITAL_REQUEST", "ONLINE_ANAMNESIS"],
  },
  {
    label: "Termin & Behandlung",
    ids: ["BOOK_APPOINTMENT", "OPEN_CONSULTATION"],
  },
  {
    label: "Rezept & Einlösung",
    ids: ["E_RECIPE_USE", "PHARMACY_INFORMATION"],
  },
  {
    label: "Organisation & Hinweise",
    ids: ["DOCUMENT_UPLOAD", "PROCESSING_DELAY", "TECHNICAL_ISSUE"],
  },
];

function optionsForKind(kind: InquiryCheckpointKind) {
  switch (kind) {
    case InquiryCheckpointKind.PREPARATION:
      return ACTION_OPTIONS;
    default:
      return EXPLANATION_OPTIONS;
  }
}

function StatusButtons({
  checkpointId,
  options,
  value,
  onChange,
  disabled,
}: {
  checkpointId: string;
  options: Array<{ value: string; label: string }>;
  value: string | undefined;
  onChange: (id: string, val: string) => void;
  disabled: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(checkpointId, opt.value)}
          style={{
            padding: "0.25rem 0.75rem",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            background: value === opt.value ? "var(--primary, #2563eb)" : "var(--background)",
            color: value === opt.value ? "#fff" : "var(--foreground)",
            fontWeight: value === opt.value ? 600 : 400,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.6 : 1,
            fontSize: "0.85rem",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function OutputView({
  output,
  heading,
}: {
  output: InquiryResponseV2Output;
  heading: string;
}) {
  return (
    <div
      className="card"
      style={{ marginTop: "2rem", display: "grid", gap: "1rem" }}
    >
      <h2 style={{ marginTop: 0 }}>{heading}</h2>

      {output.sections.map((sec) => (
        <section key={sec.inquiryId}>
          {sec.mainDecision && (
            <p style={{ fontWeight: 600, margin: "0 0 0.5rem" }}>{sec.mainDecision}</p>
          )}
          {sec.attachedParagraphs.map((p, i) => (
            <p key={i} style={{ margin: "0.25rem 0" }}>
              {p}
            </p>
          ))}
        </section>
      ))}

      {output.sharedBottom.length > 0 && (
        <section>
          {output.sharedBottom.map((p, i) => (
            <p key={i} style={{ margin: "0.25rem 0" }}>
              {p}
            </p>
          ))}
        </section>
      )}

      {output.documentation.length > 0 && (
        <section>
          <h3 style={{ marginBottom: "0.5rem" }}>Dokumentation</h3>
          <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
            {output.documentation.map((d, i) => (
              <li key={i} className="text-small">
                {d}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function InquiryM3Client({
  sessionId,
  sections,
  actionCheckpoints,
  initialCheckpointStatuses,
  initialActionStatuses,
  initialExplanationOutputStatuses,
  actionIds,
  initialGeneratedOutput,
  isConfirmed,
}: Props) {
  const actionIdSet = new Set(actionIds);

  // IDs aller EXPLANATION-Checkpoints aus allen Sections (für outputStatus-Initialisierung).
  const explanationCheckpointIds = useMemo(
    () =>
      new Set(
        sections
          .flatMap((s) => s.specificCheckpoints)
          .filter((cp) => cp.kind === InquiryCheckpointKind.EXPLANATION)
          .map((cp) => cp.id),
      ),
    [sections],
  );

  const [statuses, setStatuses] = useState<Record<string, string>>({
    ...initialCheckpointStatuses,
    ...initialActionStatuses,
  });

  // outputStatuses: M3-Ausgabeentscheidung (SHOW / HIDE) pro EXPLANATION-Checkpoint.
  // Initialisierung: gespeicherte Werte haben Vorrang; fehlende Werte werden aus factStatus abgeleitet.
  //   factStatus YES → SHOW vorausgewählt
  //   factStatus NO  → HIDE vorausgewählt
  const [outputStatuses, setOutputStatuses] = useState<Record<string, string>>(() => {
    const result: Record<string, string> = { ...initialExplanationOutputStatuses };
    for (const id of explanationCheckpointIds) {
      if (!result[id]) {
        const factStatus = initialCheckpointStatuses[id];
        if (factStatus === "YES") result[id] = ExplanationOutputStatus.SHOW;
        else if (factStatus === "NO") result[id] = ExplanationOutputStatus.HIDE;
      }
    }
    return result;
  });

  const [actionsOpen, setActionsOpen] = useState(() => {
    // Automatisch aufklappen, wenn bereits ein Action-Status gesetzt ist.
    return actionIds.some(
      (id) => initialActionStatuses[id] === "ACTIVE" || initialActionStatuses[id] === "INACTIVE",
    );
  });

  const [confirmed, setConfirmed] = useState(isConfirmed);
  const [frozenOutput, setFrozenOutput] = useState<InquiryResponseV2Output | null>(
    initialGeneratedOutput,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live preview: computed from current statuses on every render before confirm.
  // renderInquiryResponseFromSections is a pure function (no network, no side effects).
  const livePreview = useMemo((): InquiryResponseV2Output | null => {
    if (confirmed) return null;
    try {
      const inquirySections: InquirySection[] = sections.map((sec) => ({
        inquiryId: sec.inquiryId,
        decisionStatus:
          (statuses[sec.decisionCheckpointId] as DecisionStatus | undefined) ??
          DecisionStatus.DISABLED,
        checkpointStatuses: statuses as Record<string, CheckpointStatusValue>,
        explanationOutputStatuses: outputStatuses as Record<string, ExplanationOutputStatus>,
      }));
      return renderInquiryResponseFromSections(inquirySections);
    } catch {
      return null;
    }
  }, [confirmed, statuses, outputStatuses, sections]);

  function setStatus(checkpointId: string, value: string) {
    setStatuses((prev) => ({ ...prev, [checkpointId]: value }));
  }

  function setOutputStatus(checkpointId: string, value: string) {
    setOutputStatuses((prev) => ({ ...prev, [checkpointId]: value }));
  }

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      // 1. Save current decision + specific + action statuses + explanationOutputStatuses
      const checkpointStatuses: Record<string, string> = {};
      const actionStatuses: Record<string, string> = {};
      for (const [k, v] of Object.entries(statuses)) {
        if (actionIdSet.has(k)) {
          actionStatuses[k] = v;
        } else {
          checkpointStatuses[k] = v;
        }
      }

      // Nur tatsächlich gesetzte outputStatuses senden.
      const explanationOutputStatuses: Record<string, string> = {};
      for (const [k, v] of Object.entries(outputStatuses)) {
        if (v) explanationOutputStatuses[k] = v;
      }

      const patchRes = await fetch(`/api/inquiries/${sessionId}/checkpoints`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkpointStatuses, actionStatuses, explanationOutputStatuses }),
      });
      if (!patchRes.ok) {
        const data = await patchRes.json().catch(() => null);
        setError(data?.error ?? "Speichern fehlgeschlagen.");
        return;
      }

      // 2. Confirm session
      const confirmRes = await fetch(`/api/inquiries/${sessionId}/confirm`, {
        method: "POST",
      });
      const confirmData = await confirmRes.json().catch(() => null);
      if (!confirmRes.ok || !confirmData?.ok) {
        setError(confirmData?.error ?? "Bestätigen fehlgeschlagen.");
        return;
      }

      setFrozenOutput(confirmData.output as InquiryResponseV2Output);
      setConfirmed(true);
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: "42rem" }}>
      {confirmed ? (
        <>
          <div
            style={{
              padding: "0.5rem 1rem",
              background: "var(--success-bg, #dcfce7)",
              borderRadius: "var(--radius)",
              marginBottom: "1.5rem",
              color: "var(--success-fg, #166534)",
              fontWeight: 500,
            }}
          >
            ✓ Anfrage bestätigt – Ansicht ist schreibgeschützt.
          </div>
          {frozenOutput && (
            <OutputView output={frozenOutput} heading="Bestätigter Output" />
          )}
        </>
      ) : (
        <>
          {/* Decision + SPECIFIC Checkpoints per inquiry */}
          {sections.map((section) => (
            <section key={section.inquiryId} style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ marginBottom: "0.5rem" }}>{section.label}</h2>

              {/* Decision */}
              <div style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontWeight: 500 }}>{section.decisionLabel}</div>
                {section.decisionQuestions.length > 0 && (
                  <div className="text-muted text-small" style={{ marginTop: "0.2rem" }}>
                    {section.decisionQuestions
                      .filter((q) => statuses[q.id] === "YES" || statuses[q.id] === "NO")
                      .map((q) => {
                        const answer = statuses[q.id] === "YES" ? "Ja" : "Nein";
                        return (
                          <div key={q.id}>
                            {q.text}
                            <span style={{ fontWeight: 500 }}> — {answer}</span>
                          </div>
                        );
                      })}
                  </div>
                )}
                <StatusButtons
                  checkpointId={section.decisionCheckpointId}
                  options={DECISION_OPTIONS}
                  value={statuses[section.decisionCheckpointId]}
                  onChange={setStatus}
                  disabled={false}
                />
              </div>

              {/* SPECIFIC Checkpoints */}
              {section.specificCheckpoints
                .filter((cp) =>
                  cp.kind !== InquiryCheckpointKind.EXPLANATION ||
                  statuses[cp.id] === "YES" ||
                  statuses[cp.id] === "NO",
                )
                .map((cp) => {
                const m2Status = statuses[cp.id];
                const m2Label =
                  m2Status === "YES" ? "Ja" : m2Status === "NO" ? "Nein" : undefined;
                return (
                  <div
                    key={cp.id}
                    style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}
                  >
                    <div style={{ fontWeight: 500 }}>{cp.label}</div>
                    {/* M2 Prefill – zeigt Fragen + M2-Antwort als Kontext (schreibgeschützt) */}
                    {cp.kind === InquiryCheckpointKind.EXPLANATION &&
                      cp.questions &&
                      cp.questions.length > 0 && (
                        <div
                          className="text-muted text-small"
                          style={{ marginTop: "0.2rem" }}
                        >
                          {cp.questions.map((q) => (
                            <div key={q.id}>
                              {q.text}
                              {m2Label !== undefined && (
                                <span style={{ fontWeight: 500 }}> — {m2Label}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    {/* Legacy: non-EXPLANATION questions (informational only) */}
                    {cp.kind !== InquiryCheckpointKind.EXPLANATION &&
                      cp.questions &&
                      cp.questions.length > 0 && (
                        <ul
                          className="text-muted text-small"
                          style={{ margin: "0.2rem 0 0.2rem 1.25rem", padding: 0 }}
                        >
                          {cp.questions.map((q) => (
                            <li key={q.id}>{q.text}</li>
                          ))}
                        </ul>
                      )}
                    {/* EXPLANATION: outputStatus-Buttons (SHOW / HIDE) statt factStatus-Buttons */}
                    {cp.kind === InquiryCheckpointKind.EXPLANATION ? (
                      <StatusButtons
                        checkpointId={cp.id}
                        options={OUTPUT_OPTIONS}
                        value={outputStatuses[cp.id]}
                        onChange={setOutputStatus}
                        disabled={false}
                      />
                    ) : (
                      <StatusButtons
                        checkpointId={cp.id}
                        options={optionsForKind(cp.kind)}
                        value={statuses[cp.id]}
                        onChange={setStatus}
                        disabled={false}
                      />
                    )}
                    {/* Hinweis bei outputStatus HIDE */}
                    {cp.kind === InquiryCheckpointKind.EXPLANATION &&
                      outputStatuses[cp.id] === ExplanationOutputStatus.HIDE && (
                        <div
                          className="text-muted text-small"
                          style={{ marginTop: "0.25rem", fontStyle: "italic" }}
                        >
                          keine Erklärung erforderlich
                        </div>
                      )}
                  </div>
                );
              })}
            </section>
          ))}

          {/* Action checkpoints */}
          {actionCheckpoints.length > 0 && (
            <section style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: actionsOpen ? "0.5rem" : 0 }}>
                <h2 style={{ margin: 0 }}>Aktionen</h2>
                <button
                  type="button"
                  onClick={() => setActionsOpen((o) => !o)}
                  style={{
                    padding: "0.15rem 0.6rem",
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--border)",
                    background: "var(--background)",
                    color: "var(--foreground)",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                  }}
                >
                  {actionsOpen ? "Weniger ▲" : "Mehr ▼"}
                </button>
              </div>
              {actionsOpen && (() => {
                const cpById = Object.fromEntries(actionCheckpoints.map((cp) => [cp.id, cp]));
                const renderedIds = new Set<string>();
                const groupElements: ReactNode[] = [];

                for (const group of ACTION_GROUPS) {
                  const groupCps = group.ids
                    .map((id) => cpById[id])
                    .filter((cp): cp is M3ActionData => !!cp);
                  if (groupCps.length === 0) continue;
                  groupCps.forEach((cp) => renderedIds.add(cp.id));
                  groupElements.push(
                    <div key={group.label} style={{ marginTop: "0.75rem" }}>
                      <div
                        className="text-muted text-small"
                        style={{ fontWeight: 600, marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.04em" }}
                      >
                        {group.label}
                      </div>
                      {groupCps.map((cp) => (
                        <div
                          key={cp.id}
                          style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}
                        >
                          <div style={{ fontWeight: 500 }}>{cp.label}</div>
                          <StatusButtons
                            checkpointId={cp.id}
                            options={ACTION_OPTIONS}
                            value={statuses[cp.id]}
                            onChange={setStatus}
                            disabled={false}
                          />
                        </div>
                      ))}
                    </div>,
                  );
                }

                // Ungrouped fallback: actions not covered by any group
                const ungrouped = actionCheckpoints.filter((cp) => !renderedIds.has(cp.id));
                if (ungrouped.length > 0) {
                  groupElements.push(
                    <div key="__ungrouped__" style={{ marginTop: "0.75rem" }}>
                      {ungrouped.map((cp) => (
                        <div
                          key={cp.id}
                          style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}
                        >
                          <div style={{ fontWeight: 500 }}>{cp.label}</div>
                          <StatusButtons
                            checkpointId={cp.id}
                            options={ACTION_OPTIONS}
                            value={statuses[cp.id]}
                            onChange={setStatus}
                            disabled={false}
                          />
                        </div>
                      ))}
                    </div>,
                  );
                }

                return groupElements;
              })()}
            </section>
          )}

          {/* Live preview */}
          {livePreview && (
            <OutputView output={livePreview} heading="Vorschau" />
          )}

          {error && (
            <p style={{ color: "var(--destructive)", margin: "1rem 0 0.5rem" }}>{error}</p>
          )}

          <div style={{ marginTop: "1.5rem" }}>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={submitting}
              style={{ fontWeight: 500 }}
            >
              {submitting ? "Wird bestätigt…" : "Anfrage bestätigen"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
