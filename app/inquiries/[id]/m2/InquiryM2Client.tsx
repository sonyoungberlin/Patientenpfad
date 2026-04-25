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
  specificCheckpoints: PlainCheckpoint[];
};

type Props = {
  sessionId: string;
  sections: M2SectionData[];
  globalCheckpoints: PlainCheckpoint[];
  initialCheckpointStatuses: Record<string, string>;
  initialActionStatuses: Record<string, string>;
  actionIds: string[];
};

/** Einfache Ja/Nein-Schalter für GLOBAL Checkpoints. */
const GLOBAL_OPTIONS = [
  { value: "YES", label: "Ja" },
  { value: "NO", label: "Nein" },
];

function GlobalSwitchRow({
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
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
        {GLOBAL_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(checkpoint.id, opt.value)}
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
    </div>
  );
}

/** Zeigt SPECIFIC Checkpoints nur als Fragenblock – keine Status-Buttons. */
function SpecificQuestionBlock({ checkpoint }: { checkpoint: PlainCheckpoint }) {
  return (
    <div style={{ padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ fontWeight: 500 }}>{checkpoint.label}</div>
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
    </div>
  );
}

export default function InquiryM2Client({
  sessionId,
  sections,
  globalCheckpoints,
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
      {/* GLOBAL Checkpoints – einmalig, dedupliziert, Ja/Nein-Schalter */}
      {globalCheckpoints.length > 0 && (
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ marginBottom: "0.5rem" }}>Allgemeine Tatsachen</h2>
          {globalCheckpoints.map((cp) => (
            <GlobalSwitchRow
              key={cp.id}
              checkpoint={cp}
              value={statuses[cp.id]}
              onChange={setStatus}
            />
          ))}
        </section>
      )}

      {/* SPECIFIC Checkpoints pro Anliegen – nur Fragenblöcke, keine Status-Buttons */}
      {sections.map((section) => (
        <section key={section.inquiryId} style={{ marginBottom: "2rem" }}>
          <h2 style={{ marginBottom: "0.5rem" }}>{section.label}</h2>
          {section.specificCheckpoints.length === 0 ? (
            <p className="text-muted text-small">Keine Klärfragen für dieses Anliegen.</p>
          ) : (
            section.specificCheckpoints.map((cp) => (
              <SpecificQuestionBlock key={cp.id} checkpoint={cp} />
            ))
          )}
        </section>
      ))}

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
