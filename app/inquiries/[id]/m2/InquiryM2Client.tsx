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
  actionCategory?: string;
};

export type M2SectionData = {
  inquiryId: string;
  label: string;
  /** Klärungsfragen des Decision-Checkpoints – werden als reiner Fragenblock angezeigt. */
  decisionQuestions: Array<{ id: string; text: string }>;
  specificCheckpoints: PlainCheckpoint[];
  /** Profil-spezifische ACTION-Checkpoints (boundActionCheckpointIds) – im Mehr-Bereich. */
  actionCheckpoints: PlainCheckpoint[];
};

type Props = {
  sessionId: string;
  sections: M2SectionData[];
  globalCheckpoints: PlainCheckpoint[];
  initialCheckpointStatuses: Record<string, string>;
  initialActionStatuses: Record<string, string>;
  /** M1B – Kommunikationsanlass-Auswahl pro Profil (menschliche Auswahl). Record<inquiryId, communicationReasonId> */
  initialCommunicationReasonSelection: Record<string, string>;
  actionIds: string[];
};

/** Einfache Ja/Nein-Schalter für GLOBAL und SPECIFIC EXPLANATION Checkpoints. */
const YES_NO_OPTIONS = [
  { value: "YES", label: "Ja" },
  { value: "NO", label: "Nein" },
];

/** ACTIVE/INACTIVE-Schalter für ACTION-Checkpoints (boundActionCheckpointIds). */
const ACTIVE_INACTIVE_OPTIONS = [
  { value: "ACTIVE", label: "Aktiv" },
  { value: "INACTIVE", label: "Inaktiv" },
];

/** Menschenlesbare Bezeichnung für actionCategory. */
const ACTION_CATEGORY_LABELS: Record<string, string> = {
  PREPARATION: "Vorbereitung",
  PROCESS: "Ablauf",
  NEXT_STEP: "Nächste Schritte",
  INFO: "Information",
};

function YesNoButtons({
  checkpointId,
  value,
  onChange,
}: {
  checkpointId: string;
  value: string | undefined;
  onChange: (id: string, val: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
      {YES_NO_OPTIONS.map((opt) => (
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

function SwitchRow({
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
      <YesNoButtons checkpointId={checkpoint.id} value={value} onChange={onChange} />
    </div>
  );
}

/** Zeigt einen Checkpoint nur als Fragenblock – keine Status-Buttons. */
function QuestionBlock({ checkpoint }: { checkpoint: PlainCheckpoint }) {
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

/**
 * Zeigt einen SPECIFIC EXPLANATION Checkpoint mit dessen Klärungsfragen als primären Inhalt.
 * Das Label erscheint nur dezent als Kontext. Ja/Nein-Buttons speichern den M2-Status.
 */
function ExplanationQuestionRow({
  checkpoint,
  value,
  onChange,
}: {
  checkpoint: PlainCheckpoint;
  value: string | undefined;
  onChange: (id: string, val: string) => void;
}) {
  const questions = checkpoint.questions ?? [];
  return (
    <div style={{ padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
      {questions.length === 1 ? (
        <div>{questions[0].text}</div>
      ) : questions.length > 1 ? (
        <ul style={{ margin: "0 0 0 1.25rem", padding: 0 }}>
          {questions.map((q) => (
            <li key={q.id}>{q.text}</li>
          ))}
        </ul>
      ) : (
        <div>{checkpoint.label}</div>
      )}
      {questions.length > 0 && (
        <div
          className="text-muted text-small"
          style={{ marginTop: "0.2rem" }}
        >
          {checkpoint.label}
        </div>
      )}
      <YesNoButtons checkpointId={checkpoint.id} value={value} onChange={onChange} />
    </div>
  );
}

/** Zeigt die Klärungsfragen des Decision-Checkpoints – je Frage Ja/Nein-Buttons. */
function DecisionQuestionBlock({
  questions,
  statuses,
  onChange,
}: {
  questions: Array<{ id: string; text: string }>;
  statuses: Record<string, string>;
  onChange: (id: string, val: string) => void;
}) {
  if (questions.length === 0) return null;
  return (
    <>
      {questions.map((q) => (
        <div key={q.id} style={{ padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
          <div className="text-small">{q.text}</div>
          <YesNoButtons checkpointId={q.id} value={statuses[q.id]} onChange={onChange} />
        </div>
      ))}
    </>
  );
}

/**
 * Zeigt einen ACTION-Checkpoint (boundActionCheckpointId) mit ACTIVE/INACTIVE-Schaltern.
 * Klärungsfragen werden als Kontext angezeigt.
 */
function BoundActionRow({
  checkpoint,
  value,
  onChange,
}: {
  checkpoint: PlainCheckpoint;
  value: string | undefined;
  onChange: (id: string, val: string) => void;
}) {
  const questions = checkpoint.questions ?? [];
  return (
    <div style={{ padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
      {questions.length === 1 ? (
        <div>{questions[0].text}</div>
      ) : questions.length > 1 ? (
        <ul style={{ margin: "0 0 0 1.25rem", padding: 0 }}>
          {questions.map((q) => (
            <li key={q.id}>{q.text}</li>
          ))}
        </ul>
      ) : (
        <div>{checkpoint.label}</div>
      )}
      {questions.length > 0 && (
        <div className="text-muted text-small" style={{ marginTop: "0.2rem" }}>
          {checkpoint.label}
        </div>
      )}
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
        {ACTIVE_INACTIVE_OPTIONS.map((opt) => (
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


/** Sektion mit Decision-Fragen; SPECIFIC EXPLANATION Checkpoints hinter "Mehr"/"Weniger" Toggle. */
function SpecificSection({
  section,
  statuses,
  onChange,
}: {
  section: M2SectionData;
  statuses: Record<string, string>;
  onChange: (id: string, val: string) => void;
}) {
  // Auto-expand wenn mindestens ein SPECIFIC EXPLANATION Checkpoint bereits YES/NO hat.
  const hasAnsweredSpecific = section.specificCheckpoints.some(
    (cp) => statuses[cp.id] === "YES" || statuses[cp.id] === "NO",
  );
  // Auto-expand auch wenn ein ACTION Checkpoint gesetzt wurde.
  const hasAnsweredAction = section.actionCheckpoints.some(
    (cp) => statuses[cp.id] === "ACTIVE" || statuses[cp.id] === "INACTIVE",
  );
  const hasMore = section.specificCheckpoints.length > 0 || section.actionCheckpoints.length > 0;
  const [isExpanded, setIsExpanded] = useState(hasAnsweredSpecific || hasAnsweredAction);

  // Bound action checkpoints nach actionCategory gruppieren.
  const actionGroups = (() => {
    const order = ["PREPARATION", "PROCESS", "NEXT_STEP", "INFO"] as const;
    const byCategory = new Map<string, PlainCheckpoint[]>();
    for (const cp of section.actionCheckpoints) {
      const cat = cp.actionCategory ?? "INFO";
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(cp);
    }
    return order
      .map((cat) => ({ cat, cps: byCategory.get(cat) ?? [] }))
      .filter(({ cps }) => cps.length > 0);
  })();

  return (
    <section style={{ marginBottom: "2rem" }}>
      <h2 style={{ marginBottom: "0.5rem" }}>{section.label}</h2>
      {section.decisionQuestions.length === 0 && !hasMore ? (
        <p className="text-muted text-small">Keine Klärfragen für dieses Anliegen.</p>
      ) : (
        <>
          {/* Decision-Questions – immer sichtbar */}
          {section.decisionQuestions.length > 0 && (
            <div
              className="text-muted text-small"
              style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.25rem" }}
            >
              <span aria-hidden="true">? </span>Klärungsfragen
            </div>
          )}
          <DecisionQuestionBlock questions={section.decisionQuestions} statuses={statuses} onChange={onChange} />

          {/* SPECIFIC EXPLANATION + ACTION Checkpoints – hinter Toggle */}
          {hasMore && (
            <>
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                style={{
                  marginTop: "0.75rem",
                  padding: "0.3rem 0.8rem",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  background: "var(--background)",
                  color: "var(--foreground)",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                {isExpanded ? "Weniger" : "Mehr"}
              </button>
              {isExpanded && (
                <div style={{ marginTop: "0.5rem" }}>
                  {section.specificCheckpoints.length > 0 && (
                    <div
                      className="text-muted text-small"
                      style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.25rem" }}
                    >
                      <span aria-hidden="true">+ </span>Zusatzfragen
                    </div>
                  )}
                  {/* SPECIFIC EXPLANATION Checkpoints */}
                  {section.specificCheckpoints.map((cp) =>
                    cp.kind === InquiryCheckpointKind.EXPLANATION ? (
                      <ExplanationQuestionRow key={cp.id} checkpoint={cp} value={statuses[cp.id]} onChange={onChange} />
                    ) : (
                      <QuestionBlock key={cp.id} checkpoint={cp} />
                    ),
                  )}

                  {actionGroups.length > 0 && (
                    <div
                      className="text-muted text-small"
                      style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0.75rem 0 0.25rem" }}
                    >
                      <span aria-hidden="true">→ </span>Aktionen
                    </div>
                  )}
                  {/* Bound ACTION Checkpoints – nach Kategorie gruppiert */}
                  {actionGroups.map(({ cat, cps }) => (
                    <div key={cat} style={{ marginTop: "0.75rem" }}>
                      <div
                        className="text-muted text-small"
                        style={{
                          fontWeight: 600,
                          marginBottom: "0.25rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {ACTION_CATEGORY_LABELS[cat] ?? cat}
                      </div>
                      {cps.map((cp) => (
                        <BoundActionRow
                          key={cp.id}
                          checkpoint={cp}
                          value={statuses[cp.id]}
                          onChange={onChange}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}

export default function InquiryM2Client({
  sessionId,
  sections,
  globalCheckpoints,
  initialCheckpointStatuses,
  initialActionStatuses,
  initialCommunicationReasonSelection,
  actionIds,
}: Props) {
  const router = useRouter();
  const actionIdSet = new Set(actionIds);

  const [statuses, setStatuses] = useState<Record<string, string>>({
    ...initialCheckpointStatuses,
    ...initialActionStatuses,
  });
  const [communicationReasonSelection, setCommunicationReasonSelection] = useState<Record<string, string>>(
    initialCommunicationReasonSelection,
  );
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
        body: JSON.stringify({ checkpointStatuses, actionStatuses, communicationReasonSelection }),
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
      {/* 1. GLOBAL Checkpoints – oben, visuell abgesetzt, Ja/Nein-Schalter */}
      {globalCheckpoints.length > 0 && (
        <section
          style={{
            marginBottom: "2rem",
            background: "#f5f5f5",
            border: "1px solid #e0e0e0",
            borderRadius: "var(--radius)",
            padding: "1rem",
          }}
        >
          <div
            className="text-muted text-small"
            style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.35rem" }}
          >
            <span aria-hidden="true">ⓘ </span>Globale Hinweise
          </div>
          <h2 style={{ marginBottom: "0.5rem" }}>Basisinformationen</h2>
          {globalCheckpoints.map((cp) => (
            <SwitchRow
              key={cp.id}
              checkpoint={cp}
              value={statuses[cp.id]}
              onChange={setStatus}
            />
          ))}
        </section>
      )}

      {/* 2. + 3. SPECIFIC Checkpoints pro Anliegen */}
      {sections.map((section) => (
        <SpecificSection
          key={section.inquiryId}
          section={section}
          statuses={statuses}
          onChange={setStatus}
        />
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
