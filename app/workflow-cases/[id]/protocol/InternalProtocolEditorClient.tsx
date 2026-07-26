"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  InternalProtocolWorkflowSnapshot,
  ProtocolWorkflowCheckpoint,
  ProtocolWorkflowAnswerValue,
  ProtocolCheckpointStatus,
} from "@/lib/workflow/internalProtocol/workflowAdapter";
import { getPatientWithoutAppointmentSections } from "@/lib/workflow/internalProtocol/patientWithoutAppointment";
import { createProtocolSnapshot } from "@/lib/workflow/internalProtocol/snapshot";
import { createProtocolDocument } from "@/lib/workflow/internalProtocol/document";
import type { ProtocolDocument } from "@/lib/workflow/internalProtocol/document";
import type { ProtocolSection } from "@/lib/workflow/internalProtocol/questions";

type Props = {
  sessionId: string;
  title?: string;
  /** Erstellungszeitpunkt des Workflow-Falls aus der Datenbank (ISO-8601).
   *  Reload-stabil, da aus WorkflowSession.createdAt (persistiert via @default(now())).
   */
  sessionCreatedAt: string;
  snapshot: InternalProtocolWorkflowSnapshot;
};

type Step = "m2" | "m3" | "output";

const CHECKPOINT_STATUS_OPTIONS: { value: ProtocolCheckpointStatus; label: string }[] = [
  { value: "CONFIRMED", label: "Geklärt" },
  { value: "OPEN", label: "Noch offen" },
  { value: "NOT_APPLICABLE", label: "Nicht zutreffend" },
];

function statusLabel(status: ProtocolCheckpointStatus): string {
  switch (status) {
    case "CONFIRMED": return "Geklärt";
    case "OPEN": return "Noch offen";
    case "NOT_APPLICABLE": return "Nicht zutreffend";
  }
}

function answerLabel(value: ProtocolWorkflowAnswerValue): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) return value.length === 0 ? "—" : value.join(", ");
  if (value === "YES") return "Ja";
  if (value === "NO") return "Nein";
  if (value === "UNCLEAR") return "Unklar";
  return value;
}

// ---------------------------------------------------------------------------
// M2: Einzelne Fragen-Eingabe
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
      {/* Offizielle Leitplanken */}
      {section.officialRules.length > 0 && (
        <details>
          <summary
            className="text-small text-muted"
            style={{ cursor: "pointer", fontWeight: 600 }}
          >
            Offizielle Leitplanken ({section.officialRules.length})
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

      {/* Praxisfragen */}
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
                      style={{ fontWeight: isActive ? 700 : 400, outline: isActive ? "2px solid currentColor" : undefined }}
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// M4/M5: ProtocolDocument-Darstellung
// ---------------------------------------------------------------------------

function ProtocolDocumentView({ doc }: { doc: ProtocolDocument }) {
  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <header style={{ display: "grid", gap: "0.25rem" }}>
        <h2 style={{ margin: 0 }}>{doc.title}</h2>
        <div className="text-small text-muted">
          Version {doc.version} · Erstellt {doc.createdAt.slice(0, 10)}
        </div>
      </header>

      {doc.sections.map((section) => (
        <article
          key={section.id}
          style={{
            border: "1px solid #d8e0ea",
            borderRadius: "0.5rem",
            padding: "1rem",
            display: "grid",
            gap: "0.75rem",
          }}
        >
          <h3 style={{ margin: 0 }}>
            {section.id}: {section.title}
          </h3>

          {/* Offizielle Leitplanken */}
          {section.officialRules.length > 0 && (
            <details>
              <summary
                className="text-small"
                style={{ cursor: "pointer", fontWeight: 600, color: "#444" }}
              >
                Offizielle Leitplanken ({section.officialRules.length})
              </summary>
              <div style={{ display: "grid", gap: "0.5rem", marginTop: "0.5rem" }}>
                {section.officialRules.map((rule) => (
                  <div
                    key={rule.id}
                    style={{
                      padding: "0.5rem 0.75rem",
                      background: "#f5f7fa",
                      borderRadius: "0.25rem",
                      borderLeft: `3px solid ${
                        rule.bindingLevel === "MANDATORY"
                          ? "#c00"
                          : rule.bindingLevel === "RECOMMENDED"
                            ? "#0070f3"
                            : "#888"
                      }`,
                    }}
                  >
                    <div
                      className="text-small"
                      style={{ fontWeight: 600, marginBottom: "0.2rem" }}
                    >
                      {rule.bindingLevel === "MANDATORY"
                        ? "Verbindlich"
                        : rule.bindingLevel === "RECOMMENDED"
                          ? "Empfohlen"
                          : "Orientierung"}{" "}
                      – {rule.source.reference ?? rule.source.author}
                    </div>
                    <div className="text-small">{rule.text}</div>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Praxisfragen mit Antworten */}
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <div className="text-small" style={{ fontWeight: 600, color: "#444" }}>
              Praxisfragen
            </div>
            {section.questions.map((q) => {
              const isAnswered =
                q.answer !== null &&
                q.answer !== undefined &&
                !(Array.isArray(q.answer) && (q.answer as string[]).length === 0) &&
                q.answer !== "";
              return (
                <div
                  key={q.id}
                  style={{
                    display: "grid",
                    gap: "0.2rem",
                    padding: "0.4rem 0.6rem",
                    background: isAnswered ? "#f0f7f0" : "#fdf5f5",
                    borderRadius: "0.25rem",
                    borderLeft: `3px solid ${isAnswered ? "#2a7" : "#e88"}`,
                  }}
                >
                  <div className="text-small" style={{ fontWeight: 600 }}>
                    {q.text}
                    {!q.required && (
                      <span className="text-muted" style={{ fontWeight: 400 }}>
                        {" "}(optional)
                      </span>
                    )}
                  </div>
                  <div className="text-small">
                    {isAnswered ? (
                      <span style={{ color: "#1a6" }}>
                        {answerLabel(q.answer as ProtocolWorkflowAnswerValue)}
                      </span>
                    ) : (
                      <span style={{ color: "#c44" }}>Noch nicht beantwortet</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Haupt-Editor-Component
// ---------------------------------------------------------------------------

export default function InternalProtocolEditorClient({
  sessionId,
  title,
  sessionCreatedAt,
  snapshot: initialSnapshot,
}: Props) {
  const router = useRouter();

  const sections = useMemo(() => getPatientWithoutAppointmentSections(), []);

  // Stabile Metadaten für das ProtocolDocument:
  // - protocolId: sessionId (stabil per prop, unveränderlich)
  // - createdAt: aus WorkflowSession.createdAt (DB-persistiert, reload-stabil)
  // Beide werden einmalig als Ref gehalten und ändern sich nie.
  const protocolIdRef = useRef<string>(sessionId);
  const createdAtRef = useRef<string>(sessionCreatedAt);

  const [checkpoints, setCheckpoints] = useState<ProtocolWorkflowCheckpoint[]>(
    () => initialSnapshot.checkpoints,
  );
  const [step, setStep] = useState<Step>("m2");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // M2: Antwort-Handling
  // ---------------------------------------------------------------------------

  const handleAnswerChange = useCallback(
    (checkpointId: string, questionId: string, value: ProtocolWorkflowAnswerValue) => {
      setCheckpoints((prev) =>
        prev.map((cp) =>
          cp.id === checkpointId
            ? { ...cp, answers: { ...cp.answers, [questionId]: value } }
            : cp,
        ),
      );
      setSaved(false);
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // M3: Status-Handling
  // ---------------------------------------------------------------------------

  const handleStatusChange = useCallback(
    (checkpointId: string, status: ProtocolCheckpointStatus) => {
      setCheckpoints((prev) =>
        prev.map((cp) => (cp.id === checkpointId ? { ...cp, status } : cp)),
      );
      setSaved(false);
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Speichern
  // ---------------------------------------------------------------------------

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
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
      setSaved(true);
      router.refresh();
    } catch {
      setSaveError("Netzwerkfehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------------------------------
  // M4/M5: ProtocolDocument erzeugen
  // ---------------------------------------------------------------------------

  const protocolDocument = useMemo((): ProtocolDocument => {
    // Stabile Metadaten injizieren: protocolId = sessionId, createdAt einmalig
    // erfasst. So bleibt das Dokument bei Antwortänderungen ID-stabil.
    const ipSnapshot = createProtocolSnapshot(sections, {
      protocolId: protocolIdRef.current,
      createdAt: createdAtRef.current,
    });
    for (const cp of checkpoints) {
      for (const [qId, answer] of Object.entries(cp.answers)) {
        if (answer !== null) {
          ipSnapshot.answers[qId] = Array.isArray(answer) ? [...answer] : answer;
        }
      }
    }
    return createProtocolDocument(
      ipSnapshot,
      `Patienten ohne Termin – Praxisinternes Regelungsdokument`,
    );
  }, [sections, checkpoints]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const topicTitle = "Umgang mit Patienten ohne Termin";

  return (
    <section className="card" style={{ display: "grid", gap: "1rem" }}>
      <header style={{ display: "grid", gap: "0.25rem" }}>
        <div className="text-small text-muted">{topicTitle}</div>
        {title && <h1 style={{ margin: 0 }}>{title}</h1>}
      </header>

      {/* Schritt-Navigation */}
      <nav style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid #e0e0e0", paddingBottom: "0.5rem" }}>
        {(["m2", "m3", "output"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(s)}
            style={{
              fontWeight: step === s ? 700 : 400,
              borderBottom: step === s ? "2px solid currentColor" : undefined,
              borderRadius: 0,
              padding: "0.25rem 0.5rem",
            }}
          >
            {s === "m2" ? "Vorbereitung" : s === "m3" ? "Klärungsstand" : "Ergebnis"}
          </button>
        ))}
      </nav>

      {/* ── M2: Praxisfragen ── */}
      {step === "m2" && (
        <div style={{ display: "grid", gap: "1rem" }}>
          {checkpoints.map((checkpoint) => {
            const section = sections.find((s) => s.id === checkpoint.id);
            if (!section) return null;
            return (
              <article key={checkpoint.id} className="card" style={{ display: "grid", gap: "0.75rem" }}>
                <strong>
                  {checkpoint.id}: {checkpoint.title}
                </strong>
                <QuestionInput
                  section={section}
                  checkpoint={checkpoint}
                  onChange={(qId, val) => handleAnswerChange(checkpoint.id, qId, val)}
                />
              </article>
            );
          })}
        </div>
      )}

      {/* ── M3: Klärungsstand ── */}
      {step === "m3" && (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {checkpoints.map((checkpoint) => {
            const answered = Object.values(checkpoint.answers).filter(
              (v) => v !== null && !(Array.isArray(v) && v.length === 0) && v !== "",
            ).length;
            const total = Object.keys(checkpoint.answers).length;

            return (
              <article
                key={checkpoint.id}
                style={{
                  border: "1px solid #d8e0ea",
                  borderRadius: "0.4rem",
                  padding: "0.7rem",
                  display: "grid",
                  gap: "0.5rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                  <strong>
                    {checkpoint.id}: {checkpoint.title}
                  </strong>
                  <span className="text-small" style={{ fontWeight: 600 }}>
                    {statusLabel(checkpoint.status)}
                  </span>
                </div>
                <div className="text-small text-muted">
                  {answered}/{total} Fragen beantwortet
                </div>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  {CHECKPOINT_STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleStatusChange(checkpoint.id, opt.value)}
                      style={{
                        fontWeight: checkpoint.status === opt.value ? 700 : 400,
                        outline: checkpoint.status === opt.value ? "2px solid currentColor" : undefined,
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ── Output: Regelungsdokument (M4/M5) ── */}
      {step === "output" && (
        <div style={{ display: "grid", gap: "1rem" }}>
          <ProtocolDocumentView doc={protocolDocument} />
        </div>
      )}

      {/* ── Aktionszeile ── */}
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
        >
          {saving ? "Speichert…" : "Speichern"}
        </button>
        {saved && step === "m2" && (
          <button type="button" onClick={() => setStep("m3")}>
            Weiter zu Klärungsstand
          </button>
        )}
        {saved && step === "m3" && (
          <button type="button" onClick={() => setStep("output")}>
            Ergebnis anzeigen
          </button>
        )}
        {saveError && <span className="text-muted">{saveError}</span>}
      </div>
    </section>
  );
}
