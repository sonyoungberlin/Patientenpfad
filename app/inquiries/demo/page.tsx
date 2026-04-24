"use client";

import { useState } from "react";
import { renderInquiryResponse } from "@/lib/inquiries/renderInquiryResponse";
import { INQUIRY_CHECKPOINT_CATALOGUE } from "@/lib/inquiries/inquiryCheckpointCatalog";
import { INQUIRY_PROFILE_CATALOGUE } from "@/lib/inquiries/inquiryProfileCatalog";
import {
  InquiryCheckpointStatus,
  InquiryType,
  type ConfirmedInquiryCheckpoint,
} from "@/lib/inquiries/types";

const PROFILE = INQUIRY_PROFILE_CATALOGUE[InquiryType.FSME_IMPFUNG];

type StatusMap = Record<string, InquiryCheckpointStatus>;

function buildInitialStatus(): StatusMap {
  const map: StatusMap = {};
  for (const id of PROFILE.checkpointIds) {
    map[id] = InquiryCheckpointStatus.UNGEKLAERT;
  }
  return map;
}

/**
 * Stateless Demo-Seite für den Anfrage-Assistenten (FSME-Pilotprofil).
 *
 * Kein API-Aufruf, kein Login, kein Speichern.
 * Der gesamte State liegt im lokalen React-State dieser Komponente.
 *
 * Layout:
 * - Desktop (≥ 700 px): zweispaltig – links Klärpunkte, rechts Live-Vorschau.
 * - Mobile: untereinander.
 */
export default function InquiryDemoPage() {
  const [statusMap, setStatusMap] = useState<StatusMap>(buildInitialStatus);

  const checkpoints = PROFILE.checkpointIds.map(
    (id) => INQUIRY_CHECKPOINT_CATALOGUE[id]!,
  );

  const hasUnclear = Object.values(statusMap).some(
    (s) => s === InquiryCheckpointStatus.UNGEKLAERT,
  );

  const confirmedCheckpoints: ConfirmedInquiryCheckpoint[] | null = hasUnclear
    ? null
    : checkpoints.map((cp) => ({
        ...cp,
        status: statusMap[cp.id] as ConfirmedInquiryCheckpoint["status"],
      }));

  const output = confirmedCheckpoints
    ? renderInquiryResponse(PROFILE, confirmedCheckpoints)
    : null;

  function setStatus(id: string, status: InquiryCheckpointStatus) {
    setStatusMap((prev) => ({ ...prev, [id]: status }));
  }

  return (
    <main style={{ maxWidth: "72rem" }}>
      <h1 style={{ marginBottom: "0.25rem" }}>Anfrage-Assistent – Demo</h1>
      <p className="text-muted text-small" style={{ marginBottom: "1.5rem" }}>
        FSME-Impfung · Stateless-Prototyp · Kein Speichern, kein Login
      </p>

      {hasUnclear && (
        <div className="banner-warning" style={{ marginBottom: "1.25rem" }}>
          Bitte alle Punkte festlegen, bevor die Vorschau berechnet wird.
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: "2rem",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        {/* ── Left column: Klärpunkte ── */}
        <div style={{ flex: "1 1 20rem", minWidth: 0 }}>
          <h2>Klärpunkte</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {checkpoints.map((cp) => {
              const current = statusMap[cp.id];
              const supportsOptional = cp.hintTextOptional !== undefined;

              return (
                <div key={cp.id} className="card">
                  <p style={{ margin: "0 0 0.25rem", fontWeight: 500 }}>
                    {cp.title}
                  </p>
                  {cp.description && (
                    <p
                      className="text-muted text-small"
                      style={{ margin: "0 0 0.75rem" }}
                    >
                      {cp.description}
                    </p>
                  )}
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className={`answer-btn${current === InquiryCheckpointStatus.GEKLAERT ? " active" : ""}`}
                      onClick={() =>
                        setStatus(cp.id, InquiryCheckpointStatus.GEKLAERT)
                      }
                    >
                      Geklärt
                    </button>
                    <button
                      type="button"
                      className={`answer-btn${current === InquiryCheckpointStatus.HINWEIS ? " active" : ""}`}
                      onClick={() =>
                        setStatus(cp.id, InquiryCheckpointStatus.HINWEIS)
                      }
                    >
                      Hinweis nötig
                    </button>
                    {supportsOptional && (
                      <button
                        type="button"
                        className={`answer-btn${current === InquiryCheckpointStatus.HINWEIS_OPTIONAL ? " active" : ""}`}
                        onClick={() =>
                          setStatus(
                            cp.id,
                            InquiryCheckpointStatus.HINWEIS_OPTIONAL,
                          )
                        }
                      >
                        Optionaler Hinweis
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right column: Live-Vorschau ── */}
        <div style={{ flex: "1 1 20rem", minWidth: 0 }}>
          <h2>Live-Vorschau</h2>
          {!output ? (
            <div className="card" style={{ color: "var(--muted-foreground)" }}>
              <p style={{ margin: 0 }}>
                Bitte alle Klärpunkte festlegen, um die Vorschau zu sehen.
              </p>
            </div>
          ) : (
            <>
              <div className="card" style={{ marginBottom: "1rem" }}>
                <h3 style={{ marginBottom: "0.75rem" }}>Antwort</h3>
                <p style={{ margin: output.paragraphs.length > 0 ? "0 0 0.75rem" : "0" }}>
                  {output.coreAnswer}
                </p>
                {output.paragraphs.map((para, i) => (
                  <p
                    key={para}
                    style={{ margin: i < output.paragraphs.length - 1 ? "0 0 0.75rem" : "0" }}
                  >
                    {para}
                  </p>
                ))}
              </div>

              <div className="card">
                <h3 style={{ marginBottom: "0.75rem" }}>Dokumentation</h3>
                <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                  {output.documentation.map((line, i) => (
                    <li
                      key={i}
                      style={{
                        marginBottom: "0.25rem",
                        fontSize: "0.875rem",
                      }}
                    >
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
