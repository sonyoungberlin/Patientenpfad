"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  InternalProtocolWorkflowSnapshot,
  ProtocolWorkflowCheckpoint,
  ProtocolWorkflowAnswerValue,
} from "@/lib/workflow/internalProtocol/workflowAdapter";
import { getPatientWithoutAppointmentSections } from "@/lib/workflow/internalProtocol/patientWithoutAppointment";
import type { ProtocolSection } from "@/lib/workflow/internalProtocol/questions";

type Props = {
  sessionId: string;
  snapshot: InternalProtocolWorkflowSnapshot;
};

// ---------------------------------------------------------------------------
// Fragen-Eingabe
// ---------------------------------------------------------------------------

function QuestionInput({
  section,
  checkpoint,
  onChange,
}: {
  section: ProtocolSection;
  checkpoint: ProtocolWorkflowCheckpoint;
  onChange: (questionId: string, value: ProtocolWorkflowAnswerValue) => void;
}) {
  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {section.questions.map((q) => {
        const answer = checkpoint.answers[q.id] ?? null;
        return (
          <div key={q.id} style={{ display: "grid", gap: "0.4rem" }}>
            <div style={{ display: "flex", gap: "0.35rem", alignItems: "baseline" }}>
              <span className="text-small" style={{ fontWeight: 600 }}>
                {q.text}
              </span>
              {!q.required && (
                <span className="text-small text-muted">(optional)</span>
              )}
            </div>
            {q.hint && (
              <p className="text-small text-muted" style={{ margin: 0 }}>
                {q.hint}
              </p>
            )}

            {/* YES_NO_UNCLEAR */}
            {q.kind === "YES_NO_UNCLEAR" && (
              <div style={{ display: "flex", gap: "0.4rem" }}>
                {(["YES", "NO", "UNCLEAR"] as const).map((val) => {
                  const isActive = answer === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => onChange(q.id, isActive ? null : val)}
                      style={{
                        fontWeight: isActive ? 700 : 400,
                        outline: isActive ? "2px solid currentColor" : undefined,
                      }}
                    >
                      {val === "YES" ? "Ja" : val === "NO" ? "Nein" : "Unklar"}
                    </button>
                  );
                })}
              </div>
            )}

            {/* SINGLE_SELECT */}
            {q.kind === "SINGLE_SELECT" && (
              <div style={{ display: "grid", gap: "0.3rem" }}>
                {q.options.map((opt) => {
                  const isActive = answer === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onChange(q.id, isActive ? null : opt.id)}
                      style={{
                        textAlign: "left",
                        fontWeight: isActive ? 700 : 400,
                        outline: isActive ? "2px solid currentColor" : undefined,
                        padding: "0.35rem 0.6rem",
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* MULTI_SELECT */}
            {q.kind === "MULTI_SELECT" && (
              <div style={{ display: "grid", gap: "0.3rem" }}>
                {q.options.map((opt) => {
                  const selected = Array.isArray(answer) ? answer : [];
                  const isActive = selected.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        const next = isActive
                          ? selected.filter((id) => id !== opt.id)
                          : [...selected, opt.id];
                        onChange(q.id, next.length > 0 ? next : null);
                      }}
                      style={{
                        textAlign: "left",
                        fontWeight: isActive ? 700 : 400,
                        outline: isActive ? "2px solid currentColor" : undefined,
                        padding: "0.35rem 0.6rem",
                      }}
                    >
                      {isActive ? "☑ " : "☐ "}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* FREE_TEXT */}
            {q.kind === "FREE_TEXT" && (
              <textarea
                value={typeof answer === "string" ? answer : ""}
                onChange={(e) => onChange(q.id, e.target.value || null)}
                placeholder={q.placeholder ?? ""}
                rows={3}
                style={{
                  width: "100%",
                  padding: "0.4rem",
                  border: "1px solid #ccc",
                  borderRadius: "0.25rem",
                  fontFamily: "inherit",
                  fontSize: "inherit",
                  resize: "vertical",
                }}
              />
            )}
          </div>
        );
      })}

      {/* Rechtlicher und fachlicher Hintergrund */}
      {section.officialRules.length > 0 && (
        <details style={{ marginTop: "0.25rem" }}>
          <summary
            className="text-small text-muted"
            style={{ cursor: "pointer", userSelect: "none" }}
          >
            Rechtlicher und fachlicher Hintergrund
          </summary>
          <div
            style={{
              display: "grid",
              gap: "0.5rem",
              padding: "0.75rem",
              background: "#f5f7fa",
              borderRadius: "0.25rem",
              marginTop: "0.35rem",
            }}
          >
            {section.officialRules.map((rule) => (
              <div key={rule.id} style={{ display: "grid", gap: "0.2rem" }}>
                <span
                  className="text-small"
                  style={{
                    fontWeight: 600,
                    color:
                      rule.bindingLevel === "MANDATORY"
                        ? "#c00"
                        : rule.bindingLevel === "RECOMMENDED"
                          ? "#555"
                          : "#777",
                  }}
                >
                  {rule.bindingLevel === "MANDATORY"
                    ? "Verbindlich"
                    : rule.bindingLevel === "RECOMMENDED"
                      ? "Empfohlen"
                      : "Orientierung"}{" "}
                  – {rule.source.reference ?? rule.source.author}
                </span>
                <span className="text-small">{rule.text}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Haupt-Komponente
// ---------------------------------------------------------------------------

export default function InternalProtocolM2Client({
  sessionId,
  snapshot,
}: Props) {
  const router = useRouter();
  const sections = useMemo(() => getPatientWithoutAppointmentSections(), []);

  const [checkpoints, setCheckpoints] = useState<ProtocolWorkflowCheckpoint[]>(
    () => snapshot.checkpoints,
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleAnswerChange = useCallback(
    (checkpointId: string, questionId: string, value: ProtocolWorkflowAnswerValue) => {
      setCheckpoints((prev) =>
        prev.map((cp) =>
          cp.id === checkpointId
            ? { ...cp, answers: { ...cp.answers, [questionId]: value } }
            : cp,
        ),
      );
    },
    [],
  );

  async function handleSaveAndContinue() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/workflow-cases/${sessionId}/protocol/save`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkpoints }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !(data as { ok?: boolean }).ok) {
        setSaveError((data as { error?: string }).error ?? "Speichern fehlgeschlagen.");
        return;
      }
      router.push(`/workflow-cases/${sessionId}/protocol/m3`);
    } catch {
      setSaveError("Netzwerkfehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card" style={{ display: "grid", gap: "1rem" }}>
      <header style={{ display: "grid", gap: "0.25rem" }}>
        <div className="text-small text-muted">Patienten ohne Termin</div>
        <h1 style={{ margin: 0 }}>Klärungsfragen</h1>
        <p className="text-small text-muted" style={{ margin: 0 }}>
          Beantworten Sie die Fragen für jeden Klärungsaspekt. Prefill-Werte
          dienen als Ausgangspunkt und können angepasst werden.
        </p>
      </header>

      {checkpoints.map((checkpoint) => {
        const section = sections.find((s) => s.id === checkpoint.id);
        if (!section) return null;
        return (
          <article
            key={checkpoint.id}
            className="card"
            style={{ display: "grid", gap: "0.75rem" }}
          >
            <strong>{checkpoint.title}</strong>
            <QuestionInput
              section={section}
              checkpoint={checkpoint}
              onChange={(qId, val) => handleAnswerChange(checkpoint.id, qId, val)}
            />
          </article>
        );
      })}

      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          alignItems: "center",
          flexWrap: "wrap",
          borderTop: "1px solid #e0e0e0",
          paddingTop: "0.75rem",
        }}
      >
        <Link
          href={`/workflow-cases/${sessionId}/protocol`}
          className="text-small"
        >
          ← Fallstart
        </Link>
        <button
          type="button"
          onClick={() => void handleSaveAndContinue()}
          disabled={saving}
          style={{ marginLeft: "auto" }}
        >
          {saving ? "Speichert…" : "Speichern und weiter zum Klärungsstand →"}
        </button>
      </div>
      {saveError && (
        <p className="text-small text-muted" style={{ margin: 0, color: "#c44" }}>
          {saveError}
        </p>
      )}
    </section>
  );
}
