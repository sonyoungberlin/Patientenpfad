"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { InquiryCheckpointKind, InquiryCheckpointScope } from "@/lib/inquiries/types";

export type PlainCheckpoint = {
  id: string;
  label: string;
  kind: InquiryCheckpointKind;
  scope: InquiryCheckpointScope;
  question?: string;
  questions?: Array<{ id: string; text: string }>;
};

export type M2SectionData = {
  inquiryId: string;
  label: string;
  decisionCheckpoint: PlainCheckpoint;
  specificCheckpoints: PlainCheckpoint[];
};

type Props = {
  sessionId: string;
  sections: M2SectionData[];
  globalCheckpoints: PlainCheckpoint[];
  actionCheckpoints: PlainCheckpoint[];
  initialCheckpointStatuses: Record<string, string>;
  initialActionStatuses: Record<string, string>;
  actionIds: string[];
};

const EXPLANATION_OPTIONS = [
  { value: "YES", label: "Ja" },
  { value: "NO", label: "Nein" },
  { value: "UNKNOWN", label: "Unbekannt" },
];

const DECISION_OPTIONS = [
  { value: "POSSIBLE", label: "Möglich" },
  { value: "NOT_POSSIBLE", label: "Nicht möglich" },
  { value: "DISABLED", label: "—" },
];

const ACTION_OPTIONS = [
  { value: "ACTIVE", label: "Aktiv" },
  { value: "INACTIVE", label: "Inaktiv" },
];

const PREPARATION_OPTIONS = ACTION_OPTIONS;

function optionsForKind(kind: InquiryCheckpointKind) {
  switch (kind) {
    case InquiryCheckpointKind.DECISION:
      return DECISION_OPTIONS;
    case InquiryCheckpointKind.ACTION:
      return ACTION_OPTIONS;
    case InquiryCheckpointKind.PREPARATION:
      return PREPARATION_OPTIONS;
    default:
      return EXPLANATION_OPTIONS;
  }
}

function StatusButtons({
  checkpointId,
  kind,
  value,
  onChange,
}: {
  checkpointId: string;
  kind: InquiryCheckpointKind;
  value: string | undefined;
  onChange: (id: string, val: string) => void;
}) {
  const options = optionsForKind(kind);
  return (
    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(checkpointId, opt.value)}
          style={{
            padding: "0.25rem 0.75rem",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            background: value === opt.value ? "var(--primary, #2563eb)" : "var(--background)",
            color: value === opt.value ? "#fff" : "var(--foreground)",
            fontWeight: value === opt.value ? 600 : 400,
            cursor: "pointer",
            fontSize: "0.85rem",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function CheckpointRow({
  checkpoint,
  value,
  onChange,
}: {
  checkpoint: PlainCheckpoint;
  value: string | undefined;
  onChange: (id: string, val: string) => void;
}) {
  return (
    <div style={{ padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ fontWeight: 500 }}>{checkpoint.label}</div>
      {checkpoint.question && (
        <div className="text-muted text-small" style={{ marginTop: "0.25rem" }}>
          {checkpoint.question}
        </div>
      )}
      {checkpoint.questions && checkpoint.questions.length > 0 && (
        <ul
          className="text-muted text-small"
          style={{ margin: "0.25rem 0 0 1.25rem", padding: 0 }}
        >
          {checkpoint.questions.map((q) => (
            <li key={q.id}>{q.text}</li>
          ))}
        </ul>
      )}
      <StatusButtons
        checkpointId={checkpoint.id}
        kind={checkpoint.kind}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

export default function InquiryM2Client({
  sessionId,
  sections,
  globalCheckpoints,
  actionCheckpoints,
  initialCheckpointStatuses,
  initialActionStatuses,
  actionIds,
}: Props) {
  const router = useRouter();
  const actionIdSet = new Set(actionIds);

  const [statuses, setStatuses] = useState<Record<string, string>>({
    ...initialCheckpointStatuses,
    ...initialActionStatuses,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setStatus(checkpointId: string, value: string) {
    setStatuses((prev) => ({ ...prev, [checkpointId]: value }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const checkpointStatuses: Record<string, string> = {};
      const actionStatuses: Record<string, string> = {};
      for (const [k, v] of Object.entries(statuses)) {
        if (actionIdSet.has(k)) {
          actionStatuses[k] = v;
        } else {
          checkpointStatuses[k] = v;
        }
      }
      const res = await fetch(`/api/inquiries/${sessionId}/checkpoints`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkpointStatuses, actionStatuses }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Speichern fehlgeschlagen.");
        return;
      }
      router.push(`/inquiries/${sessionId}/m3`);
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: "42rem" }}>
      {/* Per-inquiry sections */}
      {sections.map((section) => (
        <section key={section.inquiryId} style={{ marginBottom: "2rem" }}>
          <h2 style={{ marginBottom: "0.5rem" }}>{section.label}</h2>

          {/* Decision (optional in M2) */}
          <CheckpointRow
            checkpoint={section.decisionCheckpoint}
            value={statuses[section.decisionCheckpoint.id]}
            onChange={setStatus}
          />

          {/* Specific Explanation Checkpoints */}
          {section.specificCheckpoints.map((cp) => (
            <CheckpointRow
              key={cp.id}
              checkpoint={cp}
              value={statuses[cp.id]}
              onChange={setStatus}
            />
          ))}
        </section>
      ))}

      {/* Deduplicated Global EXPLANATION Checkpoints */}
      {globalCheckpoints.length > 0 && (
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ marginBottom: "0.5rem" }}>Allgemeine Klärpunkte</h2>
          {globalCheckpoints.map((cp) => (
            <CheckpointRow
              key={cp.id}
              checkpoint={cp}
              value={statuses[cp.id]}
              onChange={setStatus}
            />
          ))}
        </section>
      )}

      {/* Action Checkpoints */}
      {actionCheckpoints.length > 0 && (
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ marginBottom: "0.5rem" }}>Aktionen</h2>
          {actionCheckpoints.map((cp) => (
            <CheckpointRow
              key={cp.id}
              checkpoint={cp}
              value={statuses[cp.id]}
              onChange={setStatus}
            />
          ))}
        </section>
      )}

      {error && (
        <p style={{ color: "var(--destructive)", margin: "0 0 1rem" }}>{error}</p>
      )}

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={submitting}
        style={{ fontWeight: 500 }}
      >
        {submitting ? "Wird gespeichert…" : "Weiter zu Entscheidung →"}
      </button>
    </div>
  );
}
