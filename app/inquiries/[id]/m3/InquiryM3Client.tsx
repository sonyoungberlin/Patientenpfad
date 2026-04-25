"use client";

import { useState } from "react";
import { type InquiryResponseV2Output } from "@/lib/inquiries/types";

export type M3SectionData = {
  inquiryId: string;
  label: string;
  decisionCheckpointId: string;
  decisionLabel: string;
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
  actionIds: string[];
  initialGeneratedOutput: InquiryResponseV2Output | null;
  isConfirmed: boolean;
};

const DECISION_OPTIONS = [
  { value: "POSSIBLE", label: "Möglich" },
  { value: "NOT_POSSIBLE", label: "Nicht möglich" },
  { value: "DISABLED", label: "Keine Entscheidung" },
];

const ACTION_OPTIONS = [
  { value: "ACTIVE", label: "Aktiv" },
  { value: "INACTIVE", label: "Inaktiv" },
];

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

function OutputView({ output }: { output: InquiryResponseV2Output }) {
  return (
    <div
      className="card"
      style={{ marginTop: "2rem", display: "grid", gap: "1rem" }}
    >
      <h2 style={{ marginTop: 0 }}>Generierter Output</h2>

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
  const [output, setOutput] = useState<InquiryResponseV2Output | null>(
    initialGeneratedOutput,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setStatus(checkpointId: string, value: string) {
    if (confirmed) return;
    setStatuses((prev) => ({ ...prev, [checkpointId]: value }));
  }

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      // 1. Save current decision + action statuses
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

      setOutput(confirmData.output as InquiryResponseV2Output);
      setConfirmed(true);
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: "42rem" }}>
      {confirmed && (
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
      )}

      {/* Decision per inquiry */}
      {sections.map((section) => (
        <section key={section.inquiryId} style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ marginBottom: "0.5rem" }}>{section.label}</h2>
          <div>
            <div style={{ fontWeight: 500 }}>{section.decisionLabel}</div>
            <StatusButtons
              checkpointId={section.decisionCheckpointId}
              options={DECISION_OPTIONS}
              value={statuses[section.decisionCheckpointId]}
              onChange={setStatus}
              disabled={confirmed}
            />
          </div>
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
                disabled={confirmed}
              />
            </div>
          ))}
        </section>
      )}

      {!confirmed && (
        <>
          {error && (
            <p style={{ color: "var(--destructive)", margin: "0 0 1rem" }}>{error}</p>
          )}
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={submitting}
            style={{ fontWeight: 500 }}
          >
            {submitting ? "Wird bestätigt…" : "Anfrage bestätigen"}
          </button>
        </>
      )}

      {output && <OutputView output={output} />}
    </div>
  );
}
