"use client";

import { useState, useMemo } from "react";
import {
  DecisionStatus,
  ExplanationStatus,
  ActionStatus,
  InquiryCheckpointKind,
  type CheckpointStatusValue,
} from "@/lib/inquiries/types";
import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";
import { INQUIRY_CHECKPOINT_CATALOG_V2 } from "@/lib/inquiries/inquiryCheckpointCatalog";
import { renderInquiryResponseFromSections } from "@/lib/inquiries/renderInquiryResponse";

// ---------------------------------------------------------------------------
// AU-Profil aus V2-Katalog
// ---------------------------------------------------------------------------

const AU_PROFILE = INQUIRY_PROFILE_CATALOG_V2["AU"];

/** Baut den initialen Checkpoint-Status-State aus dem AU-Profil.
 *  Explanation-Checkpoints: NO (kein automatischer Text)
 *  Action-Checkpoints:      INACTIVE
 */
function buildInitialStatuses(): Record<string, CheckpointStatusValue> {
  const result: Record<string, CheckpointStatusValue> = {};
  const allIds = [
    ...AU_PROFILE.specificCheckpointIds,
    ...AU_PROFILE.boundGlobalCheckpointIds,
    ...AU_PROFILE.availableActionIds,
  ];
  for (const id of allIds) {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2[id];
    if (!cp) continue;
    result[id] =
      cp.kind === InquiryCheckpointKind.ACTION
        ? ActionStatus.INACTIVE
        : ExplanationStatus.NO;
  }
  return result;
}

/**
 * Demo-Seite: AU / Krankschreibung aus INQUIRY_PROFILE_CATALOG_V2 und
 * INQUIRY_CHECKPOINT_CATALOG_V2 rendern.
 *
 * Kein API-Aufruf, kein Login, kein Speichern.
 */
export default function InquiryDemoClient() {
  const [decisionStatus, setDecisionStatus] = useState<DecisionStatus>(
    DecisionStatus.DISABLED,
  );
  const [checkpointStatuses, setCheckpointStatuses] = useState<
    Record<string, CheckpointStatusValue>
  >(buildInitialStatuses);

  function setStatus(id: string, status: CheckpointStatusValue) {
    setCheckpointStatuses((prev) => ({ ...prev, [id]: status }));
  }

  // Statuses für den Renderer: NO-Explanations werden ausgeblendet, damit
  // kein automatischer Text bei Default-Zustand erscheint.
  const renderStatuses = useMemo(() => {
    const filtered: Record<string, CheckpointStatusValue> = {};
    for (const [id, status] of Object.entries(checkpointStatuses)) {
      if (status !== ExplanationStatus.NO) {
        filtered[id] = status;
      }
    }
    return filtered;
  }, [checkpointStatuses]);

  // Ausgabe erst zeigen, wenn Decision gesetzt oder mindestens ein
  // Explanation-/Action-Checkpoint aktiv ist.
  const hasActiveInput =
    decisionStatus !== DecisionStatus.DISABLED ||
    Object.entries(checkpointStatuses).some(([id, status]) => {
      const cp = INQUIRY_CHECKPOINT_CATALOG_V2[id];
      if (!cp) return false;
      if (cp.kind === InquiryCheckpointKind.ACTION)
        return status === ActionStatus.ACTIVE;
      return (
        status === ExplanationStatus.YES || status === ExplanationStatus.UNKNOWN
      );
    });

  const output = useMemo(() => {
    if (!hasActiveInput) return null;
    return renderInquiryResponseFromSections([
      {
        inquiryId: "AU",
        decisionStatus,
        checkpointStatuses: renderStatuses,
      },
    ]);
  }, [hasActiveInput, decisionStatus, renderStatuses]);

  const decisionCp = INQUIRY_CHECKPOINT_CATALOG_V2[AU_PROFILE.decisionCheckpointId];
  if (!decisionCp) {
    throw new Error(
      `InquiryDemoClient: Decision-Checkpoint "${AU_PROFILE.decisionCheckpointId}" nicht im Katalog gefunden.`,
    );
  }

  const explanationIds = [
    ...AU_PROFILE.specificCheckpointIds,
    ...AU_PROFILE.boundGlobalCheckpointIds,
  ];

  const hasOutputContent =
    output !== null &&
    (output.sections.some((s) => s.attachedParagraphs.length > 0) ||
      output.sharedBottom.length > 0);

  return (
    <main style={{ maxWidth: "72rem" }}>
      <h1 style={{ marginBottom: "0.25rem" }}>Anfrage-Assistent – Demo</h1>
      <p className="text-muted text-small" style={{ marginBottom: "1.5rem" }}>
        AU / Krankschreibung · V2-Katalog · Kein Speichern, kein Login
      </p>

      <div
        style={{
          display: "flex",
          gap: "2rem",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        {/* ── Left column: controls ── */}
        <div style={{ flex: "1 1 20rem", minWidth: 0 }}>
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ marginBottom: "0.75rem" }}>{AU_PROFILE.label}</h2>

            {/* Decision */}
            <h3 style={{ marginBottom: "0.5rem" }}>{decisionCp.label}</h3>
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                flexWrap: "wrap",
                marginBottom: "1rem",
              }}
            >
              {(
                [
                  DecisionStatus.POSSIBLE,
                  DecisionStatus.NOT_POSSIBLE,
                  DecisionStatus.DISABLED,
                ] as const
              ).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`answer-btn${decisionStatus === s ? " active" : ""}`}
                  onClick={() => setDecisionStatus(s)}
                >
                  {s === DecisionStatus.POSSIBLE
                    ? "möglich"
                    : s === DecisionStatus.NOT_POSSIBLE
                      ? "nicht möglich"
                      : "deaktiviert"}
                </button>
              ))}
            </div>

            {/* Explanation checkpoints (specific + bound global) */}
            <h3 style={{ marginBottom: "0.5rem" }}>Klärpunkte</h3>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                marginBottom: "1rem",
              }}
            >
              {explanationIds.map((id) => {
                const cp = INQUIRY_CHECKPOINT_CATALOG_V2[id];
                if (!cp) return null;
                const current = checkpointStatuses[id] as ExplanationStatus;
                return (
                  <div key={id} className="card">
                    <p style={{ margin: "0 0 0.5rem", fontWeight: 500 }}>
                      {cp.label}
                    </p>
                    <div
                      style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
                    >
                      {(
                        [
                          ExplanationStatus.YES,
                          ExplanationStatus.NO,
                          ExplanationStatus.UNKNOWN,
                        ] as const
                      ).map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={`answer-btn${current === s ? " active" : ""}`}
                          onClick={() => setStatus(id, s)}
                        >
                          {s === ExplanationStatus.YES
                            ? "Ja"
                            : s === ExplanationStatus.NO
                              ? "Nein"
                              : "Unklar"}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action checkpoints */}
            <h3 style={{ marginBottom: "0.5rem" }}>Aktionen</h3>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {AU_PROFILE.availableActionIds.map((id) => {
                const cp = INQUIRY_CHECKPOINT_CATALOG_V2[id];
                if (!cp) return null;
                const isActive = checkpointStatuses[id] === ActionStatus.ACTIVE;
                return (
                  <div key={id} className="card">
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) =>
                          setStatus(
                            id,
                            e.target.checked
                              ? ActionStatus.ACTIVE
                              : ActionStatus.INACTIVE,
                          )
                        }
                      />
                      <span className="text-small">{cp.label}</span>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Right column: Live-Vorschau ── */}
        <div style={{ flex: "1 1 20rem", minWidth: 0 }}>
          <h2>Live-Vorschau</h2>

          <div className="card" style={{ marginBottom: "1rem" }}>
            <h3 style={{ marginBottom: "0.75rem" }}>Antwort</h3>
            {!hasOutputContent ? (
              <p style={{ margin: 0, color: "var(--muted-foreground)" }}>
                Bitte Entscheidung oder Klärpunkte auswählen.
              </p>
            ) : (
              <>
                {output!.sections.map((sec, idx) =>
                  sec.attachedParagraphs.length > 0 ? (
                    <div
                      key={sec.inquiryId}
                      style={
                        idx > 0
                          ? {
                              borderTop: "1px solid var(--border, #e5e7eb)",
                              paddingTop: "1rem",
                              marginTop: "1rem",
                            }
                          : undefined
                      }
                    >
                      <p
                        style={{
                          margin: "0 0 0.25rem",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        {sec.label}
                      </p>
                      {sec.attachedParagraphs.map((p, i) => (
                        <p key={i} style={{ margin: i > 0 ? "0.5rem 0 0" : 0 }}>
                          {p}
                        </p>
                      ))}
                    </div>
                  ) : null,
                )}
                {output!.sharedBottom.length > 0 && (
                  <div
                    style={{
                      borderTop: "1px solid var(--border, #e5e7eb)",
                      paddingTop: "1rem",
                      marginTop: "1rem",
                    }}
                  >
                    {output!.sharedBottom.map((p, i) => (
                      <p key={i} style={{ margin: i > 0 ? "0.5rem 0 0" : 0 }}>
                        {p}
                      </p>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {output !== null && output.documentation.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: "0.75rem" }}>Dokumentation</h3>
              <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                {output.documentation.map((line, i) => (
                  <li
                    key={i}
                    style={{ marginBottom: "0.25rem", fontSize: "0.875rem" }}
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

