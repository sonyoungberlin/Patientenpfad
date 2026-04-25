"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";
import { INQUIRY_CHECKPOINT_CATALOG_V2 } from "@/lib/inquiries/inquiryCheckpointCatalog";
import { renderInquiryResponseFromSections } from "@/lib/inquiries/renderInquiryResponse";
import {
  DecisionStatus,
  ExplanationStatus,
  ActionStatus,
  InquiryCheckpointKind,
  type InquirySection,
  type CheckpointStatusValue,
} from "@/lib/inquiries/types";

const DEMO_INQUIRY_IDS = ["AU", "PRESCRIPTION", "LAB"] as const;

const DECISION_OPTIONS: DecisionStatus[] = [
  DecisionStatus.DISABLED,
  DecisionStatus.POSSIBLE,
  DecisionStatus.NOT_POSSIBLE,
];

export default function InquiryDemoClient() {
  const router = useRouter();

  // 1. Ausgewählte Anliegen
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 2. Decision je Anliegen
  const [decisionStatuses, setDecisionStatuses] = useState<Record<string, DecisionStatus>>({});

  // 3. Spezifische Checkpoint-Statuses (nach Checkpoint-ID)
  const [specificStatuses, setSpecificStatuses] = useState<Record<string, CheckpointStatusValue>>({});

  // 4. Globale Checkpoint-Statuses (dedupliziert)
  const [globalStatuses, setGlobalStatuses] = useState<Record<string, ExplanationStatus>>({});

  // 5. Action-Statuses (dedupliziert)
  const [actionStatuses, setActionStatuses] = useState<Record<string, ActionStatus>>({});

  // Deduplizierte globale Checkpoint-IDs über alle ausgewählten Anliegen
  const allGlobalIds = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const id of selectedIds) {
      const profile = INQUIRY_PROFILE_CATALOG_V2[id];
      if (!profile) continue;
      for (const gid of profile.boundGlobalCheckpointIds) {
        if (!seen.has(gid)) {
          seen.add(gid);
          result.push(gid);
        }
      }
    }
    return result;
  }, [selectedIds]);

  // Deduplizierte Action-IDs über alle ausgewählten Anliegen
  const allActionIds = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const id of selectedIds) {
      const profile = INQUIRY_PROFILE_CATALOG_V2[id];
      if (!profile) continue;
      for (const aid of profile.availableActionIds) {
        if (!seen.has(aid)) {
          seen.add(aid);
          result.push(aid);
        }
      }
    }
    return result;
  }, [selectedIds]);

  // Sections für den Renderer aufbauen
  const sections: InquirySection[] = useMemo(() => {
    return selectedIds.map((id) => {
      const profile = INQUIRY_PROFILE_CATALOG_V2[id];
      if (!profile) {
        return { inquiryId: id, decisionStatus: DecisionStatus.DISABLED, checkpointStatuses: {} };
      }
      const checkpointStatuses: Record<string, CheckpointStatusValue> = {};

      // Spezifische Checkpoints
      for (const cpId of profile.specificCheckpointIds) {
        const v = specificStatuses[cpId];
        if (v !== undefined) checkpointStatuses[cpId] = v;
      }

      // Globale Checkpoints – Antworten auf alle passenden Sections übertragen
      for (const gId of profile.boundGlobalCheckpointIds) {
        const v = globalStatuses[gId];
        if (v !== undefined) checkpointStatuses[gId] = v;
      }

      // Actions – auf alle passenden Sections übertragen
      for (const aId of profile.availableActionIds) {
        const v = actionStatuses[aId];
        if (v !== undefined) checkpointStatuses[aId] = v;
      }

      return {
        inquiryId: id,
        decisionStatus: decisionStatuses[id] ?? DecisionStatus.DISABLED,
        checkpointStatuses,
      };
    });
  }, [selectedIds, decisionStatuses, specificStatuses, globalStatuses, actionStatuses]);

  // Output via Renderer
  const output = useMemo(() => {
    if (sections.length === 0) return null;
    return renderInquiryResponseFromSections(sections);
  }, [sections]);

  function toggleInquiry(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <main style={{ maxWidth: "800px" }}>
      <nav style={{ marginBottom: "1rem" }}>
        <button type="button" onClick={() => router.push("/")}>
          ← Zurück
        </button>
      </nav>

      <h1>Anfrage-Demo (V2)</h1>

      {/* 1. Anliegen auswählen */}
      <section style={{ marginBottom: "2rem" }}>
        <h2>1. Anliegen auswählen</h2>
        {DEMO_INQUIRY_IDS.map((id) => {
          const profile = INQUIRY_PROFILE_CATALOG_V2[id];
          if (!profile) return null;
          return (
            <label key={id} style={{ display: "block", marginBottom: "0.4rem" }}>
              <input
                type="checkbox"
                checked={selectedIds.includes(id)}
                onChange={() => toggleInquiry(id)}
                style={{ marginRight: "0.5rem" }}
              />
              {profile.label}
            </label>
          );
        })}
      </section>

      {/* 2. Entscheidung + Spezifische Checkpoints je Anliegen */}
      {selectedIds.length > 0 && (
        <section style={{ marginBottom: "2rem" }}>
          <h2>2. Entscheidung + Spezifische Checkpoints</h2>
          {selectedIds.map((id) => {
            const profile = INQUIRY_PROFILE_CATALOG_V2[id];
            if (!profile) return null;
            return (
              <div
                key={id}
                style={{ border: "1px solid #ccc", padding: "1rem", marginBottom: "1rem" }}
              >
                <h3>{profile.label}</h3>

                {/* Decision */}
                <div style={{ marginBottom: "0.75rem" }}>
                  <strong>Entscheidung:</strong>{" "}
                  {DECISION_OPTIONS.map((s) => (
                    <label key={s} style={{ marginRight: "1rem" }}>
                      <input
                        type="radio"
                        name={`decision_${id}`}
                        value={s}
                        checked={(decisionStatuses[id] ?? DecisionStatus.DISABLED) === s}
                        onChange={() =>
                          setDecisionStatuses((prev) => ({ ...prev, [id]: s }))
                        }
                        style={{ marginRight: "0.25rem" }}
                      />
                      {s}
                    </label>
                  ))}
                </div>

                {/* Spezifische Checkpoints */}
                {profile.specificCheckpointIds.map((cpId) => {
                  const cp = INQUIRY_CHECKPOINT_CATALOG_V2[cpId];
                  if (!cp) return null;

                  const statusOptions: CheckpointStatusValue[] =
                    cp.kind === InquiryCheckpointKind.EXPLANATION
                      ? [ExplanationStatus.YES, ExplanationStatus.NO, ExplanationStatus.UNKNOWN]
                      : [ActionStatus.ACTIVE, ActionStatus.INACTIVE];

                  return (
                    <div
                      key={cpId}
                      style={{
                        marginBottom: "0.75rem",
                        paddingLeft: "1rem",
                        borderLeft: "2px solid #eee",
                      }}
                    >
                      <div>
                        <strong>{cp.label}</strong>{" "}
                        <em style={{ fontSize: "0.8rem", color: "#666" }}>({cp.kind})</em>
                      </div>

                      {/* M2-Fragen: nur als Hilfetext, keine automatische Entscheidung */}
                      {cp.questions && cp.questions.length > 0 && (
                        <div style={{ fontSize: "0.8rem", color: "#888", marginBottom: "0.25rem" }}>
                          M2: {cp.questions.map((q) => q.text).join(" / ")}
                        </div>
                      )}

                      <div>
                        {statusOptions.map((s) => (
                          <label key={String(s)} style={{ marginRight: "0.75rem" }}>
                            <input
                              type="radio"
                              name={`specific_${cpId}`}
                              value={String(s)}
                              checked={specificStatuses[cpId] === s}
                              onChange={() =>
                                setSpecificStatuses((prev) => ({ ...prev, [cpId]: s }))
                              }
                              style={{ marginRight: "0.25rem" }}
                            />
                            {String(s)}
                          </label>
                        ))}
                        <label>
                          <input
                            type="radio"
                            name={`specific_${cpId}`}
                            value=""
                            checked={specificStatuses[cpId] === undefined}
                            onChange={() =>
                              setSpecificStatuses((prev) => {
                                const next = { ...prev };
                                delete next[cpId];
                                return next;
                              })
                            }
                            style={{ marginRight: "0.25rem" }}
                          />
                          (kein Status)
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </section>
      )}

      {/* 3. Globale Checkpoints */}
      {allGlobalIds.length > 0 && (
        <section style={{ marginBottom: "2rem" }}>
          <h2>3. Globale Checkpoints</h2>
          {allGlobalIds.map((gId) => {
            const cp = INQUIRY_CHECKPOINT_CATALOG_V2[gId];
            if (!cp) return null;
            return (
              <div key={gId} style={{ marginBottom: "0.75rem" }}>
                <strong>{cp.label}:</strong>{" "}
                {cp.question && (
                  <em style={{ fontSize: "0.875rem", color: "#666" }}>{cp.question}</em>
                )}
                <div>
                  {([ExplanationStatus.YES, ExplanationStatus.NO] as ExplanationStatus[]).map(
                    (s) => (
                      <label key={s} style={{ marginRight: "0.75rem" }}>
                        <input
                          type="radio"
                          name={`global_${gId}`}
                          value={s}
                          checked={globalStatuses[gId] === s}
                          onChange={() =>
                            setGlobalStatuses((prev) => ({ ...prev, [gId]: s }))
                          }
                          style={{ marginRight: "0.25rem" }}
                        />
                        {s}
                      </label>
                    ),
                  )}
                  <label>
                    <input
                      type="radio"
                      name={`global_${gId}`}
                      value=""
                      checked={globalStatuses[gId] === undefined}
                      onChange={() =>
                        setGlobalStatuses((prev) => {
                          const next = { ...prev };
                          delete next[gId];
                          return next;
                        })
                      }
                      style={{ marginRight: "0.25rem" }}
                    />
                    (kein Status)
                  </label>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* 4. Actions */}
      {allActionIds.length > 0 && (
        <section style={{ marginBottom: "2rem" }}>
          <h2>4. Actions</h2>
          {allActionIds.map((aId) => {
            const cp = INQUIRY_CHECKPOINT_CATALOG_V2[aId];
            if (!cp) return null;
            return (
              <div key={aId} style={{ marginBottom: "0.75rem" }}>
                <strong>{cp.label}:</strong>{" "}
                {([ActionStatus.ACTIVE, ActionStatus.INACTIVE] as ActionStatus[]).map((s) => (
                  <label key={s} style={{ marginRight: "0.75rem" }}>
                    <input
                      type="radio"
                      name={`action_${aId}`}
                      value={s}
                      checked={actionStatuses[aId] === s}
                      onChange={() =>
                        setActionStatuses((prev) => ({ ...prev, [aId]: s }))
                      }
                      style={{ marginRight: "0.25rem" }}
                    />
                    {s}
                  </label>
                ))}
                <label>
                  <input
                    type="radio"
                    name={`action_${aId}`}
                    value=""
                    checked={actionStatuses[aId] === undefined}
                    onChange={() =>
                      setActionStatuses((prev) => {
                        const next = { ...prev };
                        delete next[aId];
                        return next;
                      })
                    }
                    style={{ marginRight: "0.25rem" }}
                  />
                  (kein Status)
                </label>
              </div>
            );
          })}
        </section>
      )}

      {/* 5. Output-Vorschau */}
      {output && (
        <section>
          <h2>5. Output-Vorschau</h2>

          {output.sections.map((sec) => (
            <div
              key={sec.inquiryId}
              style={{ border: "1px solid #ccc", padding: "1rem", marginBottom: "1rem" }}
            >
              <h3>
                {sec.label} <em style={{ fontSize: "0.875rem", color: "#666" }}>({sec.inquiryId})</em>
              </h3>
              <div>
                <strong>mainDecision:</strong> {sec.mainDecision ?? "(null)"}
              </div>
              {sec.attachedParagraphs.length > 0 && (
                <div style={{ marginTop: "0.5rem" }}>
                  <strong>attachedParagraphs:</strong>
                  <ul style={{ marginTop: "0.25rem" }}>
                    {sec.attachedParagraphs.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
              {sec.documentation.length > 0 && (
                <div style={{ marginTop: "0.5rem" }}>
                  <strong>documentation:</strong>
                  <ul style={{ marginTop: "0.25rem" }}>
                    {sec.documentation.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}

          {output.sharedBottom.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              <strong>sharedBottom:</strong>
              <ul style={{ marginTop: "0.25rem" }}>
                {output.sharedBottom.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          {output.documentation.length > 0 && (
            <div>
              <strong>documentation (gesamt):</strong>
              <ul style={{ marginTop: "0.25rem" }}>
                {output.documentation.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
