"use client";

import { useState, useMemo } from "react";
import {
  DecisionStatus,
  ExplanationStatus,
} from "@/lib/inquiries/types";
import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";
import {
  INQUIRY_FACT_CATALOG,
  INQUIRY_OUTPUT_BLOCK_CATALOG,
} from "@/lib/inquiries/inquiryCheckpointCatalog";
import { renderInquiryResponseFromSections } from "@/lib/inquiries/renderInquiryResponse";

// ---------------------------------------------------------------------------
// AU-Profil
// ---------------------------------------------------------------------------

const AU_PROFILE = INQUIRY_PROFILE_CATALOG_V2["AU"];
if (!AU_PROFILE) throw new Error("AU-Profil nicht gefunden.");

// ---------------------------------------------------------------------------
// Fact-Labels (M2 – spezifische Button-Beschriftungen)
// ---------------------------------------------------------------------------

const FACT_LABELS: Partial<Record<string, Partial<Record<ExplanationStatus, string>>>> = {
  AU_BACKDATE_IN_RANGE: {
    [ExplanationStatus.YES]: "im zulässigen Bereich",
    [ExplanationStatus.NO]: "außerhalb",
    [ExplanationStatus.UNKNOWN]: "unklar",
  },
  AU_DURATION_IN_RANGE: {
    [ExplanationStatus.YES]: "im zulässigen Bereich",
    [ExplanationStatus.NO]: "zu lang",
    [ExplanationStatus.UNKNOWN]: "unklar",
  },
  DOCTOR_ASSESSMENT_CONTEXT: {
    [ExplanationStatus.YES]: "erforderlich",
    [ExplanationStatus.NO]: "nicht erforderlich",
    [ExplanationStatus.UNKNOWN]: "unklar",
  },
};

const DEFAULT_FACT_LABELS: Record<ExplanationStatus, string> = {
  [ExplanationStatus.YES]: "Ja",
  [ExplanationStatus.NO]: "Nein",
  [ExplanationStatus.UNKNOWN]: "Unklar",
};

function getFactLabel(id: string, status: ExplanationStatus): string {
  return FACT_LABELS[id]?.[status] ?? DEFAULT_FACT_LABELS[status];
}

// ---------------------------------------------------------------------------
// Demo-Komponente
// ---------------------------------------------------------------------------

/**
 * Demo-Seite: M2/M3-Trennung für AU / Krankschreibung.
 *
 * M2 – Facts: sammeln Kontext, erzeugen KEINEN Patiententext.
 * M3 – OutputBlocks: werden explizit ausgewählt und erzeugen die Live-Vorschau.
 *
 * Kein API-Aufruf, kein Login, kein Speichern.
 */
export default function InquiryDemoClient() {
  // M2 – Faktstatus (nur Kontext, kein Output)
  const [factStatuses, setFactStatuses] = useState<Record<string, ExplanationStatus>>({});

  // M3 – Entscheidung
  const [decisionStatus, setDecisionStatus] = useState<DecisionStatus>(DecisionStatus.DISABLED);

  // M3 – gewählte ATTACHED-Ausgabebausteine
  const [selectedOutputBlockIds, setSelectedOutputBlockIds] = useState<Set<string>>(new Set());

  // M3 – gewählte SHARED_BOTTOM-Aktionsbausteine
  const [selectedActionIds, setSelectedActionIds] = useState<Set<string>>(new Set());

  function setFactStatus(id: string, status: ExplanationStatus) {
    setFactStatuses((prev) => ({ ...prev, [id]: status }));
  }

  function toggleOutputBlock(id: string) {
    setSelectedOutputBlockIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAction(id: string) {
    setSelectedActionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Live-Vorschau – nur aus M3-Auswahl
  const hasM3Input =
    decisionStatus !== DecisionStatus.DISABLED ||
    selectedOutputBlockIds.size > 0 ||
    selectedActionIds.size > 0;

  const output = useMemo(() => {
    if (!hasM3Input) return null;
    return renderInquiryResponseFromSections([
      {
        inquiryId: "AU",
        decisionStatus,
        selectedOutputBlockIds: Array.from(selectedOutputBlockIds),
        selectedActionIds: Array.from(selectedActionIds),
        factStatuses,
      },
    ]);
  }, [hasM3Input, decisionStatus, selectedOutputBlockIds, selectedActionIds, factStatuses]);

  const hasOutputContent =
    output !== null &&
    (output.sections.some((s) => s.attachedParagraphs.length > 0) ||
      output.sharedBottom.length > 0);

  const allFactIds = [
    ...AU_PROFILE.specificFactIds,
    ...AU_PROFILE.boundGlobalFactIds,
  ];

  return (
    <main style={{ maxWidth: "80rem" }}>
      <h1 style={{ marginBottom: "0.25rem" }}>Anfrage-Assistent – Demo</h1>
      <p className="text-muted text-small" style={{ marginBottom: "1.5rem" }}>
        AU / Krankschreibung · M2/M3-Trennung · Kein Speichern, kein Login
      </p>

      <div
        style={{
          display: "flex",
          gap: "2rem",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        {/* ── Left column: M2 + M3 controls ── */}
        <div style={{ flex: "1 1 22rem", minWidth: 0 }}>

          {/* ── M2: Facts ── */}
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ marginBottom: "0.25rem" }}>M2 – Fakten / Klärfragen</h2>
            <p
              className="text-small"
              style={{ margin: "0 0 0.75rem", color: "var(--muted-foreground)" }}
            >
              Sammeln Kontext für M3. Erzeugen keinen Antworttext.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {allFactIds.map((id) => {
                const fact = INQUIRY_FACT_CATALOG[id];
                if (!fact) return null;
                const current = factStatuses[id] ?? ExplanationStatus.UNKNOWN;
                return (
                  <div key={id} className="card">
                    <p style={{ margin: "0 0 0.5rem", fontWeight: 500 }}>
                      {fact.label}
                    </p>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      {([ExplanationStatus.YES, ExplanationStatus.NO, ExplanationStatus.UNKNOWN] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={`answer-btn${current === s ? " active" : ""}`}
                          onClick={() => setFactStatus(id, s)}
                        >
                          {getFactLabel(id, s)}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── M3: Decision + OutputBlocks + Actions ── */}
          <div className="card">
            <h2 style={{ marginBottom: "0.25rem" }}>M3 – Entscheidung und Bausteine</h2>
            <p
              className="text-small"
              style={{ margin: "0 0 0.75rem", color: "var(--muted-foreground)" }}
            >
              Auswahl erzeugt direkt die Live-Vorschau.
            </p>

            {/* Decision */}
            <h3 style={{ marginBottom: "0.5rem" }}>Entscheidung</h3>
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

            {/* ATTACHED output blocks */}
            <h3 style={{ marginBottom: "0.5rem" }}>Begründungen / Informationen</h3>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                marginBottom: "1rem",
              }}
            >
              {AU_PROFILE.availableOutputBlockIds.map((id) => {
                const block = INQUIRY_OUTPUT_BLOCK_CATALOG[id];
                if (!block) return null;
                const isSelected = selectedOutputBlockIds.has(id);
                return (
                  <div key={id} className="card">
                    <label
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.5rem",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOutputBlock(id)}
                        style={{ marginTop: "0.2rem", flexShrink: 0 }}
                      />
                      <span className="text-small">
                        <strong>{block.label}</strong>
                        <br />
                        <span style={{ color: "var(--muted-foreground)" }}>{block.text}</span>
                      </span>
                    </label>
                  </div>
                );
              })}
            </div>

            {/* SHARED_BOTTOM action blocks */}
            <h3 style={{ marginBottom: "0.5rem" }}>Wege / Aktionen</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {AU_PROFILE.availableActionIds.map((id) => {
                const block = INQUIRY_OUTPUT_BLOCK_CATALOG[id];
                if (!block) return null;
                const isSelected = selectedActionIds.has(id);
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
                        checked={isSelected}
                        onChange={() => toggleAction(id)}
                      />
                      <span className="text-small">{block.label}</span>
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
                Bitte Entscheidung oder Bausteine auswählen (M3).
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

