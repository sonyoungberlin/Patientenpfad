"use client";

import { useMemo, useState } from "react";
import {
  DecisionStatus,
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
  specificCheckpoints: M3SpecificCheckpoint[];
};

export type M3ActionData = {
  id: string;
  label: string;
};

export type M3GlobalContextCheckpoint = {
  id: string;
  label: string;
};

type Props = {
  sessionId: string;
  sections: M3SectionData[];
  actionCheckpoints: M3ActionData[];
  globalContextCheckpoints: M3GlobalContextCheckpoint[];
  initialCheckpointStatuses: Record<string, string>;
  initialActionStatuses: Record<string, string>;
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
  { value: "UNKNOWN", label: "Unbekannt" },
];

const ACTION_OPTIONS = [
  { value: "ACTIVE", label: "Aktiv" },
  { value: "INACTIVE", label: "Inaktiv" },
];

function optionsForKind(kind: InquiryCheckpointKind) {
  switch (kind) {
    case InquiryCheckpointKind.PREPARATION:
      return ACTION_OPTIONS;
    default:
      return EXPLANATION_OPTIONS;
  }
}

function globalStatusLabel(status: string | undefined): string {
  if (status === "YES") return "Ja";
  if (status === "NO") return "Nein";
  return "—";
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
          <h3 style={{ marginBottom: "0.5rem" }}>{sec.label}</h3>
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
          <h3 style={{ marginBottom: "0.5rem" }}>Allgemeine Hinweise</h3>
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
  globalContextCheckpoints,
  initialCheckpointStatuses,
  initialActionStatuses,
  actionIds,
  initialGeneratedOutput,
  isConfirmed,
}: Props) {
  const actionIdSet = new Set(actionIds);

  const [statuses, setStatuses] = useState<Record<string, string>>({
    ...initialCheckpointStatuses,
    ...initialActionStatuses,
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
      }));
      return renderInquiryResponseFromSections(inquirySections);
    } catch {
      return null;
    }
  }, [confirmed, statuses, sections]);

  function setStatus(checkpointId: string, value: string) {
    setStatuses((prev) => ({ ...prev, [checkpointId]: value }));
  }

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      // 1. Save current decision + specific + action statuses
      const checkpointStatuses: Record<string, string> = {};
      const actionStatuses: Record<string, string> = {};
      for (const [k, v] of Object.entries(statuses)) {
        if (actionIdSet.has(k)) {
          actionStatuses[k] = v;
        } else {
          checkpointStatuses[k] = v;
        }
      }

      const patchRes = await fetch(`/api/inquiries/${sessionId}/checkpoints`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkpointStatuses, actionStatuses }),
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
          {/* M2-Kontext: GLOBAL Checkpoints (read-only) */}
          {globalContextCheckpoints.length > 0 && (
            <section
              style={{
                marginBottom: "2rem",
                padding: "0.75rem 1rem",
                background: "var(--muted-bg, #f8fafc)",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
              }}
            >
              <h2 style={{ marginBottom: "0.5rem", fontSize: "1rem" }}>
                Kontext aus M2 (Tatsachen)
              </h2>
              <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                {globalContextCheckpoints.map((cp) => (
                  <li key={cp.id} className="text-small" style={{ marginBottom: "0.2rem" }}>
                    <span style={{ fontWeight: 500 }}>{cp.label}:</span>{" "}
                    {globalStatusLabel(statuses[cp.id])}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Decision + SPECIFIC Checkpoints per inquiry */}
          {sections.map((section) => (
            <section key={section.inquiryId} style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ marginBottom: "0.5rem" }}>{section.label}</h2>

              {/* Decision */}
              <div style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontWeight: 500 }}>{section.decisionLabel}</div>
                <StatusButtons
                  checkpointId={section.decisionCheckpointId}
                  options={DECISION_OPTIONS}
                  value={statuses[section.decisionCheckpointId]}
                  onChange={setStatus}
                  disabled={false}
                />
              </div>

              {/* SPECIFIC Checkpoints */}
              {section.specificCheckpoints.map((cp) => (
                <div
                  key={cp.id}
                  style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}
                >
                  <div style={{ fontWeight: 500 }}>{cp.label}</div>
                  {cp.questions && cp.questions.length > 0 && (
                    <ul
                      className="text-muted text-small"
                      style={{ margin: "0.2rem 0 0.2rem 1.25rem", padding: 0 }}
                    >
                      {cp.questions.map((q) => (
                        <li key={q.id}>{q.text}</li>
                      ))}
                    </ul>
                  )}
                  <StatusButtons
                    checkpointId={cp.id}
                    options={optionsForKind(cp.kind)}
                    value={statuses[cp.id]}
                    onChange={setStatus}
                    disabled={false}
                  />
                </div>
              ))}
            </section>
          ))}

          {/* Action checkpoints */}
          {actionCheckpoints.length > 0 && (
            <section style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ marginBottom: "0.5rem" }}>Aktionen</h2>
              {actionCheckpoints.map((cp) => (
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
